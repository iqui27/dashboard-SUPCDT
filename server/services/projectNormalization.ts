/**
 * Project Normalization Utilities
 * Shared normalization logic for Fomento project data
 * Used by CRUD routes and AI suggestion services
 */

import { ObjectId } from 'mongodb';

/**
 * Date fields that need parsing from string/number to Date
 */
export const PROJECT_DATE_FIELDS = [
  'vigenciaInicio',
  'vigenciaEvento',
  'vigenciaFinal',
  'statusDesde',
  'dataPrestacaoContasOSC',
  'createdAt',
  'updatedAt'
] as const;

export type ProjectDateField = typeof PROJECT_DATE_FIELDS[number];

/**
 * Parse a date value from various formats into a Date object or null
 */
export function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  
  // Already a Date
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  
  // String or number
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Parse a monetary value from Brazilian format (R$ 1.234,56) to number
 * Handles multiple formats:
 * - "1.234,56" -> 1234.56
 * - "1234,56" -> 1234.56
 * - "R$ 1.234,56" -> 1234.56
 * - 1234.56 (number) -> 1234.56
 */
export function parseMonetaryValue(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? 0 : value;
  }
  
  if (!value || typeof value !== 'string') {
    return 0;
  }
  
  // Remove R$ prefix and trim
  let cleaned = value.replace(/R\$/g, '').trim();
  
  // Handle Brazilian format
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Format like 1.234,56 - dots are thousand separators
    cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
  } else if (cleaned.includes(',')) {
    // Format like 1234,56 - comma is decimal separator
    cleaned = cleaned.replace(/,/g, '.');
  } else {
    // Format like 1234.56 or 1234 - check for multiple dots (thousand separators)
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }
  
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse a status project value into normalized form
 */
export function normalizeStatusProjeto(value: unknown): string {
  if (!value || typeof value !== 'string') {
    return 'Em andamento'; // Default
  }
  
  const normalized = value.trim();
  
  // Map common variations to standard values
  const statusMap: Record<string, string> = {
    'assinado': 'Assinado',
    'não assinado': 'Não assinado',
    'nao assinado': 'Não assinado',
    'reprovado': 'Reprovado',
    'em andamento': 'Em andamento',
    'andamento': 'Em andamento',
    'encerrado': 'Encerrado',
  };
  
  const lower = normalized.toLowerCase();
  return statusMap[lower] || normalized;
}

/**
 * Parse a category value into normalized form
 */
export function normalizeCategoria(value: unknown): string {
  if (!value || typeof value !== 'string') {
    return 'Outro'; // Default
  }
  
  const normalized = value.trim();
  
  const categoryMap: Record<string, string> = {
    'emenda': 'Emenda',
    'inex': 'INEX',
    'convenio': 'Convênio',
    'convênio': 'Convênio',
    'outro': 'Outro',
    'recurso proprio': 'Recurso Proprio',
    'recurso próprio': 'Recurso Proprio',
  };
  
  const lower = normalized.toLowerCase();
  return categoryMap[lower] || normalized;
}

/**
 * Parse an array of strings, filtering empty values
 */
export function parseStringArray(value: unknown): string[] {
  if (!value) return [];
  
  if (!Array.isArray(value)) {
    // Single string -> single-element array
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }
    return [];
  }
  
  return value
    .map(item => typeof item === 'string' ? item.trim() : '')
    .filter(item => item.length > 0);
}

/**
 * Parse parlamentares array from AI extraction
 */
export function parseParlamentaresArray(value: unknown): Array<{ nome: string; valor?: number }> {
  if (!value || !Array.isArray(value)) {
    return [];
  }
  
  return value
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      
      const nome = typeof (item as Record<string, unknown>).nome === 'string'
        ? ((item as Record<string, unknown>).nome as string).trim()
        : undefined;
      
      if (!nome) return null;
      
      const valorRaw = (item as Record<string, unknown>).valor;
      const valor = parseMonetaryValue(valorRaw);
      
      return { nome, ...(valor > 0 ? { valor } : {}) };
    })
    .filter((item): item is { nome: string; valor?: number } => Boolean(item));
}

/**
 * Parse historicoMovimentacoes array with date normalization
 */
export function parseHistoricoMovimentacoes(value: unknown): Array<{
  id: string;
  data: Date | null;
  statusProjeto?: string;
  situacao?: string;
  etapaProjeto?: string;
  notas?: string;
}> {
  if (!value || !Array.isArray(value)) {
    return [];
  }
  
  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      
      const raw = item as Record<string, unknown>;
      
      return {
        id: typeof raw.id === 'string' && raw.id 
          ? raw.id 
          : `hist-${Date.now()}-${index}`,
        data: parseDateValue(raw.data),
        statusProjeto: typeof raw.statusProjeto === 'string' 
          ? normalizeStatusProjeto(raw.statusProjeto) 
          : undefined,
        situacao: typeof raw.situacao === 'string' 
          ? raw.situacao.trim() 
          : undefined,
        etapaProjeto: typeof raw.etapaProjeto === 'string' 
          ? raw.etapaProjeto.trim() 
          : undefined,
        notas: typeof raw.notas === 'string' 
          ? raw.notas.trim() 
          : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

/**
 * Normalize a project payload for MongoDB storage
 * Applies all field transformations: dates, monetary values, arrays, defaults
 */
export function normalizeProjectPayload(
  payload: Record<string, unknown>,
  defaults?: {
    origin?: 'custom' | 'sheet';
    createdBy?: string;
    responsavelAlteracao?: string;
  }
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    ...payload,
    origin: defaults?.origin ?? payload.origin ?? 'custom',
  };
  
  // Apply defaults
  if (defaults?.createdBy) {
    doc.createdBy = defaults.createdBy;
  }
  if (defaults?.responsavelAlteracao) {
    doc.responsavelAlteracao = defaults.responsavelAlteracao;
  }
  
  // Parse date fields
  for (const field of PROJECT_DATE_FIELDS) {
    if (field in doc) {
      doc[field] = parseDateValue(doc[field]);
    }
  }
  
  // Parse monetary fields
  if ('valorTotal' in doc) {
    doc.valorTotal = parseMonetaryValue(doc.valorTotal);
  }
  
  // Parse parcela fields
  const parcelaFields = ['financeiroParcela1', 'financeiroParcela2', 'financeiroParcela3', 'financeiroParcela4'];
  for (const field of parcelaFields) {
    if (field in doc && typeof doc[field] === 'string') {
      const parsed = parseMonetaryValue(doc[field]);
      doc[field] = parsed > 0 ? parsed : doc[field]; // Keep original if parse failed
    }
  }
  
  // Normalize status fields
  if ('statusProjeto' in doc) {
    doc.statusProjeto = normalizeStatusProjeto(doc.statusProjeto);
  }
  if ('categoria' in doc) {
    doc.categoria = normalizeCategoria(doc.categoria);
  }
  
  // Parse array fields
  if ('regioesAdministrativas' in doc) {
    doc.regioesAdministrativas = parseStringArray(doc.regioesAdministrativas);
  }
  if ('parlamentares' in doc) {
    doc.parlamentares = parseParlamentaresArray(doc.parlamentares);
  }
  if ('historicoMovimentacoes' in doc) {
    doc.historicoMovimentacoes = parseHistoricoMovimentacoes(doc.historicoMovimentacoes);
  }
  
  // Ensure string fields are trimmed and UPPERCASE (only short fields)
  // Long text fields stay normal (notasObs, situacao, tipoPublicoPrevisto, etc.)
  const uppercaseFields = [
    'projeto', 'osc', 'parlamentar', 'presidenteOSC', 'coordenadorProjeto',
    'regiaoAdministrativa', 'setor', 'responsavelParecer', 'responsavelAlteracao',
    'responsavelPlanilha', 'numeroTermoFomento', 'cnpjOSC'
  ];
  
  for (const field of uppercaseFields) {
    if (field in doc && typeof doc[field] === 'string') {
      doc[field] = (doc[field] as string).trim().toUpperCase();
    }
  }
  
  // Trim-only fields (keep normal case)
  const trimOnlyFields = [
    'notasObs', 'situacao', 'etapaProjeto', 'tipoPublicoPrevisto',
    'assinaturaPublicacao', 'statusPlanilha', 'statusDocumentacao',
    'statusEscopoParecer', 'processoSEI'
  ];
  
  for (const field of trimOnlyFields) {
    if (field in doc && typeof doc[field] === 'string') {
      doc[field] = (doc[field] as string).trim();
    }
  }
  
  // Uppercase array string fields
  if ('regioesAdministrativas' in doc && Array.isArray(doc.regioesAdministrativas)) {
    doc.regioesAdministrativas = doc.regioesAdministrativas.map(r => 
      typeof r === 'string' ? r.trim().toUpperCase() : r
    );
  }
  
  // Uppercase emendasParlamentares names
  if ('emendasParlamentares' in doc && Array.isArray(doc.emendasParlamentares)) {
    doc.emendasParlamentares = doc.emendasParlamentares.map(e => ({
      ...e,
      nome: typeof e.nome === 'string' ? e.nome.trim().toUpperCase() : e.nome
    }));
  }
  
  // Ensure required fields have defaults
  if (!doc.processoSEI || (doc.processoSEI as string).trim() === '') {
    console.warn('[Project Normalization] Missing processoSEI - this may cause deduplication issues');
  }
  
  return doc;
}

/**
 * Serialize a MongoDB document for API response
 * Converts ObjectId to string id
 */
export function serializeProjectDoc(
  doc: Record<string, unknown> & { _id?: ObjectId | string }
): Record<string, unknown> & { id: string } {
  const { _id, ...rest } = doc;
  
  const serializedId = _id instanceof ObjectId
    ? _id.toHexString()
    : typeof _id === 'string'
      ? _id
      : '';
  
  // Ensure createdBy is present, falling back to responsavelAlteracao if missing
  const responsavelAlteracao = rest.responsavelAlteracao as string | undefined;
  const createdBy = rest.createdBy as string | undefined;
  
  return {
    id: serializedId,
    ...rest,
    createdBy: createdBy || responsavelAlteracao
  };
}

/**
 * Check if a value is a MongoDB ObjectId
 */
export function isMongoObjectId(value: unknown): value is ObjectId {
  return value instanceof ObjectId;
}