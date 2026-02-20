import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { bulkUpsertOscs } from '../services/oscs.js';
import type { OSCInput } from '../types/osc.js';

interface ParsedOptions {
  csvPath: string;
  dryRun: boolean;
  search?: string;
}

function parseArguments(): ParsedOptions {
  const args = process.argv.slice(2);
  const options: ParsedOptions = {
    csvPath: '',
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (!options.csvPath) {
      options.csvPath = arg;
    }
  }

  if (!options.csvPath) {
    options.csvPath = path.resolve(process.cwd(), '2025 - CONTROLE INTERNO_ SUAG  - fomentos 2025.csv');
  }

  return options;
}

function parseCsv(content: string): string[][] {
  let normalized = content;
  if (normalized.charCodeAt(0) === 0xfeff) {
    normalized = normalized.slice(1);
  }

  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    if (inQuotes) {
      if (char === '"') {
        const nextChar = normalized[i + 1];
        if (nextChar === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    if (char === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      continue;
    }

    currentField += char;
  }

  if (inQuotes) {
    throw new Error('Arquivo CSV inválido: campo com aspas não foi fechado.');
  }

  currentRow.push(currentField);
  if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim().length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

const headerAliases: Record<string, string> = {
  processo: 'processo',
  'numero do processo': 'processo',
  osc: 'osc',
  'nome da osc': 'osc',
  projeto: 'projeto',
  'nome do projeto': 'projeto',
  parlamentar: 'parlamentar',
  'nome do parlamentar': 'parlamentar',
  valor: 'valor',
  'valor total': 'valor',
  'valor aprovado': 'valor',
  cnpj: 'cnpj',
  status: 'status',
  situacao: 'status'
};

function mapRow(headers: string[], row: string[]): OSCInput | null {
  const data: Partial<OSCInput> = {};

  headers.forEach((header, index) => {
    const raw = row[index] ?? '';
    const normalizedHeader = normalizeHeader(header);
    const canonical = headerAliases[normalizedHeader] ?? normalizedHeader;

    switch (canonical) {
      case 'processo':
        data.processo = raw.trim();
        break;
      case 'osc':
        data.osc = raw.trim();
        break;
      case 'projeto':
        data.projeto = raw.trim();
        break;
      case 'parlamentar':
        data.parlamentar = raw.trim();
        break;
      case 'valor':
        data.valor = raw.trim();
        break;
      case 'cnpj':
        data.cnpj = raw.trim();
        break;
      case 'status':
        data.status = raw.trim();
        break;
      default:
        break;
    }
  });

  if (!data.processo || !data.osc || !data.projeto) {
    return null;
  }

  return data as OSCInput;
}

async function main() {
  const { csvPath, dryRun } = parseArguments();

  console.log(`📄 Lendo CSV: ${csvPath}`);
  const content = await readFile(csvPath, 'utf-8');
  const rows = parseCsv(content);
  if (rows.length < 2) {
    throw new Error('O arquivo CSV não possui registros suficientes.');
  }

  const headers = rows[0];
  const inputs: OSCInput[] = [];

  rows.slice(1).forEach((row, index) => {
    const mapped = mapRow(headers, row);
    if (mapped) {
      inputs.push(mapped);
    } else {
      console.warn(`⚠️ Linha ${index + 2} ignorada: campos obrigatórios ausentes.`);
    }
  });

  console.log(`➡️  Registros válidos: ${inputs.length}`);

  if (inputs.length === 0) {
    console.log('Nenhum registro válido para importar.');
    return;
  }

  if (dryRun) {
    console.log('Modo DRY-RUN: importação não executada.');
    return;
  }

  const result = await bulkUpsertOscs(inputs);
  console.log(`✅ Importação concluída. Inseridos: ${result.inserted}, Atualizados: ${result.updated}`);
  if (result.errors.length > 0) {
    console.log('⚠️ Ocorreram erros durante a importação:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }
}

main().catch(error => {
  console.error('❌ Falha ao importar OSCs:', error);
  process.exit(1);
});
