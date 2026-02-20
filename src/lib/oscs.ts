import type { OSC, GroupedOSC } from '../types/osc';

// Usa URL relativa para funcionar com o proxy do Vite, ou variável de ambiente
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const OSCS_ENDPOINT = API_BASE_URL 
  ? `${API_BASE_URL.replace(/\/$/, '')}/api/oscs`
  : '/api/oscs';

export interface OscPayload {
  processo: string;
  osc: string;
  projeto: string;
  parlamentar?: string;
  valor?: string | number | null;
  valorRaw?: string | null;
  cnpj?: string;
  status?: string;
}

export interface BulkOscImportResult {
  inserted: number;
  updated: number;
  errors: string[];
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json() as { error?: string };
      if (body?.error) {
        message = body.error;
      }
    } catch {
      // ignore json parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchOscs(search?: string): Promise<OSC[]> {
  const url = search && search.trim().length > 0
    ? `${OSCS_ENDPOINT}?search=${encodeURIComponent(search.trim())}`
    : OSCS_ENDPOINT;
  const response = await fetch(url);
  return handleResponse<OSC[]>(response);
}

export async function createOsc(payload: OscPayload): Promise<OSC> {
  const response = await fetch(OSCS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<OSC>(response);
}

export async function updateOsc(id: string, payload: OscPayload): Promise<OSC> {
  const response = await fetch(`${OSCS_ENDPOINT}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<OSC>(response);
}

export async function deleteOsc(id: string): Promise<void> {
  const response = await fetch(`${OSCS_ENDPOINT}/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  await handleResponse<undefined>(response);
}

export async function bulkImportOscs(items: OscPayload[]): Promise<BulkOscImportResult> {
  const response = await fetch(`${OSCS_ENDPOINT}/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ items })
  });
  return handleResponse<BulkOscImportResult>(response);
}

export function normalizeCnpj(cnpj: string): string {
  // Remove todos os caracteres não numéricos
  return cnpj.replace(/\D/g, '');
}

export function formatCnpj(cnpj: string): string {
  // Formata CNPJ: 00.000.000/0000-00
  const digits = normalizeCnpj(cnpj);
  if (digits.length !== 14) return cnpj; // Retorna original se não tiver 14 dígitos
  
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function groupOscsByCnpj(oscs: OSC[]): GroupedOSC[] {
  const groups = new Map<string, OSC[]>();

  for (const osc of oscs) {
    const rawCnpj = (osc.cnpj ?? '').trim();
    const normalizedCnpj = rawCnpj ? normalizeCnpj(rawCnpj) : '';
    
    // Só usa CNPJ como chave se tiver pelo menos 11 dígitos (CNPJ tem 14)
    // Caso contrário, usa o nome normalizado da OSC
    const key = normalizedCnpj.length >= 11
      ? normalizedCnpj
      : (osc.osc ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    if (!key) continue;

    const existing = groups.get(key);
    if (existing) {
      existing.push(osc);
    } else {
      groups.set(key, [osc]);
    }
  }

  const result: GroupedOSC[] = [];

  for (const records of groups.values()) {
    const freq = new Map<string, number>();
    for (const r of records) {
      const name = (r.osc ?? '').trim();
      if (name) freq.set(name, (freq.get(name) ?? 0) + 1);
    }
    let nome = '';
    let maxCount = 0;
    for (const [name, count] of freq) {
      if (count > maxCount) {
        maxCount = count;
        nome = name;
      }
    }

    const projetos = Array.from(
      new Set(records.map(r => (r.projeto ?? '').trim()).filter(Boolean))
    );

    // Pega o CNPJ normalizado do primeiro registro que tiver CNPJ válido
    const firstWithCnpj = records.find(r => {
      const cnpj = normalizeCnpj((r.cnpj ?? '').trim());
      return cnpj.length >= 11;
    });
    const cnpj = firstWithCnpj ? normalizeCnpj(firstWithCnpj.cnpj ?? '') : '';

    result.push({ cnpj, nome, records, projetos });
  }

  result.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return result;
}
