import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { ObjectId } from 'mongodb';
import { getMongoClient } from '../db/client.js';
import { convertRowsToFomentos } from '../services/googleSheetImport.js';
import type { Fomento } from '../types/fomento.js';

type PlainObject = Record<string, unknown>;

type ParsedOptions = {
  csvPath: string;
  dryRun: boolean;
};

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
    options.csvPath = path.resolve(process.cwd(), 'ACOMPANHAMENTO PROJETOS SICID - FOMENTOS 2025.csv');
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

  // Push last field/row if content did not end with newline
  if (inQuotes) {
    throw new Error('Arquivo CSV inválido: campo com aspas não foi fechado.');
  }

  currentRow.push(currentField);
  if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim().length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeDocument(doc: PlainObject): PlainObject {
  const result: PlainObject = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value === undefined) continue;
    result[key] = value;
  }
  return result;
}

function shouldReplace(current: unknown, incoming: unknown): boolean {
  if (incoming === undefined || incoming === null) {
    return false;
  }

  if (Array.isArray(incoming)) {
    const incomingLength = incoming.length;
    if (incomingLength === 0) return false;
    if (!Array.isArray(current)) return true;
    return current.length === 0;
  }

  if (incoming instanceof Date) {
    if (!(current instanceof Date)) return true;
    return Number.isNaN(current.getTime());
  }

  if (typeof incoming === 'number') {
    if (!Number.isFinite(incoming)) return false;
    if (typeof current !== 'number' || !Number.isFinite(current)) return true;
    return current === 0;
  }

  if (typeof incoming === 'boolean') {
    return current === undefined || current === null;
  }

  if (typeof incoming === 'string') {
    const trimmedIncoming = incoming.trim();
    if (!trimmedIncoming) return false;
    if (current === undefined || current === null) return true;
    if (typeof current !== 'string') return true;
    return current.trim().length === 0;
  }

  if (typeof incoming === 'object') {
    if (!incoming) return false;
    if (!current || typeof current !== 'object') return true;
    return Object.keys(current as PlainObject).length === 0;
  }

  return false;
}

function mergeDocuments(existing: PlainObject, updates: PlainObject): PlainObject {
  const merged: PlainObject = { ...existing };
  delete merged._id;
  delete merged.createdAt;

  for (const [key, incoming] of Object.entries(updates)) {
    if (key === '_id' || key === 'createdAt') continue;

    const current = merged[key];
    if (shouldReplace(current, incoming)) {
      merged[key] = incoming;
    }
  }

  if (!merged.id) {
    if (existing.id && typeof existing.id === 'string') {
      merged.id = existing.id;
    } else if (existing._id instanceof ObjectId) {
      merged.id = existing._id.toHexString();
    }
  }

  return merged;
}

function normalizeFomento(fomento: Fomento): PlainObject {
  const plain = fomento as unknown as PlainObject;
  const { id: _ignoredId, origin, diasParado, diasLimite, ...rest } = plain;
  const base: PlainObject = {
    ...rest,
    diasParado,
    diasLimite,
    origin: origin ?? 'sheet'
  };

  Object.keys(base).forEach(key => {
    const value = base[key];
    if (value === null || value === undefined) return;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      base[key] = trimmed;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const rounded = Number(value.toFixed(2));
      base[key] = rounded;
    }
  });

  return sanitizeDocument(base);
}

async function main() {
  const { csvPath, dryRun } = parseArguments();

  console.log(`Lendo dados do CSV: ${csvPath}`);
  const content = await readFile(csvPath, 'utf-8');
  const rows = parseCsv(content);
  if (rows.length < 4) {
    throw new Error('O arquivo CSV não possui linhas suficientes para processar os cabeçalhos.');
  }

  const fomentos = convertRowsToFomentos(rows).filter(fomento => fomento.projeto && fomento.projeto.trim().length > 0);
  console.log(`Projetos identificados na planilha: ${fomentos.length}`);

  const client = await getMongoClient();
  const db = client.db('secti-dashboard');
  const collection = db.collection<PlainObject>('custom_projects');

  let updatedCount = 0;
  let insertedCount = 0;

  for (const fomento of fomentos) {
    const normalized = normalizeFomento(fomento);
    const projectName = String(normalized.projeto ?? '').trim();
    if (!projectName) {
      continue;
    }

    const now = new Date();
    const existing = await collection.findOne({ projeto: { $regex: `^${escapeRegExp(projectName)}$`, $options: 'i' } });

    if (existing) {
      const merged = mergeDocuments(existing, {
        ...normalized,
        origin: existing.origin ?? normalized.origin,
        updatedAt: now
      });

      if (dryRun) {
        console.log(`[DRY-RUN] Atualizaria projeto: ${projectName}`);
        continue;
      }

      await collection.updateOne({ _id: existing._id }, {
        $set: merged,
        $setOnInsert: { createdAt: existing.createdAt ?? now }
      });
      updatedCount += 1;
    } else {
      const newId = new ObjectId();
      const documentToInsert = {
        _id: newId,
        id: newId.toHexString(),
        ...normalized,
        origin: normalized.origin ?? 'sheet',
        createdAt: now,
        updatedAt: now,
        migratedAt: now
      };

      if (dryRun) {
        console.log(`[DRY-RUN] Inseriria projeto: ${projectName}`);
        continue;
      }

      await collection.insertOne(documentToInsert);
      insertedCount += 1;
    }
  }

  console.log(`Processamento concluído. Atualizados: ${updatedCount}, Inseridos: ${insertedCount}`);
}

main().catch(error => {
  console.error('Falha ao completar dados a partir do CSV:', error);
  process.exit(1);
});
