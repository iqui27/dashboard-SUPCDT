import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/client.js';
import type { OSC, OSCInput } from '../types/osc.js';

const COLLECTION_NAME = 'oscs';

type OscDocument = {
  _id?: ObjectId | string;
  id?: string;
  processo: string;
  osc: string;
  projeto: string;
  parlamentar?: string;
  valor: number;
  valorRaw?: string;
  cnpj?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

function parseCurrency(value: string | number | null | undefined): { number: number; raw?: string } {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { number: value, raw: undefined };
  }

  if (typeof value !== 'string') {
    return { number: 0, raw: undefined };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { number: 0, raw: undefined };
  }

  let normalized = trimmed.replace(/R\$/gi, '').replace(/\s+/g, '');
  normalized = normalized.replace(/\./g, '').replace(/,/g, '.');
  const parsed = Number.parseFloat(normalized);

  return {
    number: Number.isFinite(parsed) ? parsed : 0,
    raw: trimmed
  };
}

function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function sanitizeOptional(value: unknown): string | undefined {
  const sanitized = sanitizeString(value);
  return sanitized.length > 0 ? sanitized : undefined;
}

function sanitizeWithFallback(value: unknown, fallback: string): string {
  const sanitized = sanitizeString(value);
  return sanitized.length > 0 ? sanitized : fallback;
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return true;
}

function resolveValor(input: OSCInput, fallbackValor = 0, fallbackRaw?: string): { valor: number; valorRaw?: string } {
  let source: string | number | null | undefined = undefined;

  if (hasValue(input.valor)) {
    source = input.valor as string | number | null | undefined;
  } else if (hasValue(input.valorRaw)) {
    source = input.valorRaw as string | number | null | undefined;
  }

  if (!hasValue(source)) {
    return {
      valor: fallbackValor,
      valorRaw: fallbackRaw
    };
  }

  const { number: valor, raw } = parseCurrency(source as string | number | null | undefined);

  let valorRaw: string | undefined = fallbackRaw;

  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (trimmed.length > 0) {
      valorRaw = trimmed;
    }
  } else if (typeof input.valorRaw === 'string') {
    const trimmed = input.valorRaw.trim();
    if (trimmed.length > 0) {
      valorRaw = trimmed;
    }
  } else if (typeof raw === 'string' && raw.trim().length > 0) {
    valorRaw = raw.trim();
  }

  return {
    valor,
    valorRaw
  };
}

function serializeDocument(doc: OscDocument): OSC {
  const { _id, id: legacyId, createdAt, updatedAt, valorRaw, ...rest } = doc;
  const id = typeof legacyId === 'string' && legacyId
    ? legacyId
    : _id instanceof ObjectId
      ? _id.toHexString()
      : typeof _id === 'string'
        ? _id
        : '';

  return {
    id,
    processo: sanitizeString(rest.processo),
    osc: sanitizeString(rest.osc),
    projeto: sanitizeString(rest.projeto),
    parlamentar: sanitizeOptional(rest.parlamentar),
    valor: Number.isFinite(rest.valor) ? Number(rest.valor) : 0,
    valorRaw: valorRaw,
    cnpj: sanitizeOptional(rest.cnpj),
    status: sanitizeOptional(rest.status),
    createdAt,
    updatedAt
  };
}

function buildDocument(input: OSCInput, now: Date): OscDocument {
  const { valor, valorRaw } = resolveValor(input);
  const processo = sanitizeString(input.processo);
  const osc = sanitizeString(input.osc);
  const projeto = sanitizeString(input.projeto);

  return {
    processo,
    osc,
    projeto,
    parlamentar: sanitizeOptional(input.parlamentar),
    valor,
    valorRaw,
    cnpj: sanitizeOptional(input.cnpj),
    status: sanitizeOptional(input.status),
    createdAt: now,
    updatedAt: now
  };
}

function applyUpdates(existing: OscDocument, input: OSCInput, now: Date): OscDocument {
  const updated: OscDocument = {
    ...existing,
    updatedAt: now
  };

  updated.processo = sanitizeWithFallback(input.processo, existing.processo);
  updated.osc = sanitizeWithFallback(input.osc, existing.osc);
  updated.projeto = sanitizeWithFallback(input.projeto, existing.projeto);
  updated.parlamentar = sanitizeOptional(input.parlamentar) ?? existing.parlamentar;

  if (hasValue(input.valor) || hasValue(input.valorRaw)) {
    const { valor, valorRaw } = resolveValor(input, existing.valor, existing.valorRaw);
    updated.valor = valor;
    updated.valorRaw = valorRaw;
  }

  updated.cnpj = sanitizeOptional(input.cnpj) ?? existing.cnpj;
  updated.status = sanitizeOptional(input.status) ?? existing.status;

  return updated;
}

export async function getOscCollection() {
  const db = await getDatabase();
  return db.collection<OscDocument>(COLLECTION_NAME);
}

export async function listOscs(search?: string): Promise<OSC[]> {
  const collection = await getOscCollection();
  const filter = search && search.trim().length > 0
    ? {
        $or: [
          { processo: { $regex: search, $options: 'i' } },
          { osc: { $regex: search, $options: 'i' } },
          { projeto: { $regex: search, $options: 'i' } },
          { parlamentar: { $regex: search, $options: 'i' } }
        ]
      }
    : {};

  const documents = await collection
    .find(filter)
    .sort({ osc: 1, projeto: 1 })
    .toArray();

  return documents.map(serializeDocument);
}

export async function createOsc(input: OSCInput): Promise<OSC> {
  const now = new Date();
  const doc = buildDocument(input, now);

  if (!doc.osc) {
    throw new Error('Campo "OSC" é obrigatório.');
  }

  const collection = await getOscCollection();
  const result = await collection.insertOne(doc);
  const saved = await collection.findOne({ _id: result.insertedId });
  if (!saved) {
    throw new Error('Falha ao salvar OSC.');
  }

  if (!saved.id) {
    await collection.updateOne(
      { _id: result.insertedId },
      { $set: { id: result.insertedId instanceof ObjectId ? result.insertedId.toHexString() : String(result.insertedId) } }
    );
    const reloaded = await collection.findOne({ _id: result.insertedId });
    if (reloaded) {
      return serializeDocument(reloaded);
    }
  }

  return serializeDocument(saved);
}

export async function updateOsc(id: string, input: OSCInput): Promise<OSC> {
  const collection = await getOscCollection();

  const filters = [] as Record<string, unknown>[];
  if (ObjectId.isValid(id)) {
    filters.push({ _id: new ObjectId(id) });
  }
  filters.push({ id });
  filters.push({ _id: id });

  const existing = await collection.findOne({ $or: filters });
  if (!existing) {
    throw new Error('OSC não encontrada.');
  }

  const now = new Date();
  const updatedDoc = applyUpdates(existing, input, now);
  await collection.updateOne({ $or: filters }, { $set: updatedDoc });

  const reloaded = await collection.findOne({ $or: filters });
  if (!reloaded) {
    throw new Error('OSC não encontrada após atualização.');
  }

  return serializeDocument(reloaded);
}

export async function deleteOsc(id: string): Promise<void> {
  const collection = await getOscCollection();

  const filters = [] as Record<string, unknown>[];
  if (ObjectId.isValid(id)) {
    filters.push({ _id: new ObjectId(id) });
  }
  filters.push({ id });
  filters.push({ _id: id });

  const result = await collection.deleteOne({ $or: filters });
  if (result.deletedCount === 0) {
    throw new Error('OSC não encontrada.');
  }
}

export async function upsertOscByProcesso(input: OSCInput): Promise<{ osc: OSC; action: 'inserted' | 'updated' }> {
  const collection = await getOscCollection();
  const processo = sanitizeString(input.processo);
  const oscName = sanitizeString(input.osc);
  const projeto = sanitizeString(input.projeto);

  if (!oscName) {
    throw new Error('Campo "OSC" é obrigatório.');
  }

  const existing = await collection.findOne({ processo: processo, osc: oscName, projeto: projeto });
  const now = new Date();

  if (!existing) {
    const doc = buildDocument(input, now);
    const result = await collection.insertOne(doc);
    const saved = await collection.findOne({ _id: result.insertedId });
    if (!saved) {
      throw new Error('Falha ao salvar OSC.');
    }
    if (!saved.id) {
      await collection.updateOne(
        { _id: result.insertedId },
        { $set: { id: result.insertedId instanceof ObjectId ? result.insertedId.toHexString() : String(result.insertedId) } }
      );
      const reloaded = await collection.findOne({ _id: result.insertedId });
      if (reloaded) {
        return { osc: serializeDocument(reloaded), action: 'inserted' };
      }
    }
    return { osc: serializeDocument(saved), action: 'inserted' };
  }

  const updatedDoc = applyUpdates(existing, input, now);
  await collection.updateOne({ _id: existing._id }, { $set: updatedDoc });
  const reloaded = await collection.findOne({ _id: existing._id });
  if (!reloaded) {
    throw new Error('OSC não encontrada após atualização.');
  }
  return { osc: serializeDocument(reloaded), action: 'updated' };
}

export async function bulkUpsertOscs(inputs: OSCInput[]): Promise<{ inserted: number; updated: number; errors: string[] }> {
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const input of inputs) {
    try {
      const result = await upsertOscByProcesso(input);
      if (result.action === 'inserted') {
        inserted += 1;
      } else {
        updated += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${input.processo ?? 'sem-processo'}: ${message}`);
    }
  }

  return { inserted, updated, errors };
}
