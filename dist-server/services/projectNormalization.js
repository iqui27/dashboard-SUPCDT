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
];
/**
 * Parse a date value from various formats into a Date object or null
 */
export function parseDateValue(value) {
    if (!value)
        return null;
    // Already a Date
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    // String or number
    const date = new Date(value);
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
export function parseMonetaryValue(value) {
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
    }
    else if (cleaned.includes(',')) {
        // Format like 1234,56 - comma is decimal separator
        cleaned = cleaned.replace(/,/g, '.');
    }
    else {
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
export function normalizeStatusProjeto(value) {
    if (!value || typeof value !== 'string') {
        return 'Em andamento'; // Default
    }
    const normalized = value.trim();
    // Map common variations to standard values
    const statusMap = {
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
export function normalizeCategoria(value) {
    if (!value || typeof value !== 'string') {
        return 'Outro'; // Default
    }
    const normalized = value.trim();
    const categoryMap = {
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
export function parseStringArray(value) {
    if (!value)
        return [];
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
export function parseParlamentaresArray(value) {
    if (!value || !Array.isArray(value)) {
        return [];
    }
    return value
        .map(item => {
        if (!item || typeof item !== 'object')
            return null;
        const nome = typeof item.nome === 'string'
            ? item.nome.trim()
            : undefined;
        if (!nome)
            return null;
        const valorRaw = item.valor;
        const valor = parseMonetaryValue(valorRaw);
        return { nome, ...(valor > 0 ? { valor } : {}) };
    })
        .filter((item) => Boolean(item));
}
/**
 * Parse historicoMovimentacoes array with date normalization
 */
export function parseHistoricoMovimentacoes(value) {
    if (!value || !Array.isArray(value)) {
        return [];
    }
    return value
        .map((item, index) => {
        if (!item || typeof item !== 'object')
            return null;
        const raw = item;
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
        .filter((item) => Boolean(item));
}
/**
 * Normalize a project payload for MongoDB storage
 * Applies all field transformations: dates, monetary values, arrays, defaults
 */
export function normalizeProjectPayload(payload, defaults) {
    const doc = {
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
            doc[field] = doc[field].trim().toUpperCase();
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
            doc[field] = doc[field].trim();
        }
    }
    // Uppercase array string fields
    if ('regioesAdministrativas' in doc && Array.isArray(doc.regioesAdministrativas)) {
        doc.regioesAdministrativas = doc.regioesAdministrativas.map(r => typeof r === 'string' ? r.trim().toUpperCase() : r);
    }
    // Uppercase emendasParlamentares names
    if ('emendasParlamentares' in doc && Array.isArray(doc.emendasParlamentares)) {
        doc.emendasParlamentares = doc.emendasParlamentares.map(e => ({
            ...e,
            nome: typeof e.nome === 'string' ? e.nome.trim().toUpperCase() : e.nome
        }));
    }
    // Ensure required fields have defaults
    if (!doc.processoSEI || doc.processoSEI.trim() === '') {
        console.warn('[Project Normalization] Missing processoSEI - this may cause deduplication issues');
    }
    return doc;
}
/**
 * Serialize a MongoDB document for API response
 * Converts ObjectId to string id
 */
export function serializeProjectDoc(doc) {
    const { _id, ...rest } = doc;
    const serializedId = _id instanceof ObjectId
        ? _id.toHexString()
        : typeof _id === 'string'
            ? _id
            : '';
    // Ensure createdBy is present, falling back to responsavelAlteracao if missing
    const responsavelAlteracao = rest.responsavelAlteracao;
    const createdBy = rest.createdBy;
    return {
        id: serializedId,
        ...rest,
        createdBy: createdBy || responsavelAlteracao
    };
}
/**
 * Check if a value is a MongoDB ObjectId
 */
export function isMongoObjectId(value) {
    return value instanceof ObjectId;
}
