import crypto from 'crypto';
import { z } from 'zod';
/**
 * SEI Document Types
 * Defines types for SEI (Sistema Eletrônico de Informações) document extraction
 */
// Valid document types in SEI
export const SEI_DOCUMENT_TYPES = [
    'PDF',
    'HTML',
    'DOC',
    'DOCX',
    'XLS',
    'XLSX',
    'XML',
    'TXT',
    'RTF',
    'ODT',
    'ODS',
    'INTERNO', // SEI internal documents (despachos, memorandos, etc.)
    'EXTERNO' // SEI external documents (PDFs attached from outside)
];
// State hash for quick comparison
export function generateStateHash(documents) {
    // Sort by document ID (link) for consistent hashing
    const sortedIds = documents
        .map(d => d.link || `${d.tipo}-${d.nome || 'unnamed'}`)
        .sort();
    const hashContent = sortedIds.join('|');
    return crypto.createHash('sha256').update(hashContent).digest('hex').substring(0, 16);
}
// Zod Schemas for validation
// Document input schema (without processoSEI, as it's inherited from the batch)
export const SeiDocumentInputSchema = z.object({
    tipo: z.enum(SEI_DOCUMENT_TYPES, {
        error: () => ({ message: `Tipo deve ser um dos: ${SEI_DOCUMENT_TYPES.join(', ')}` })
    }),
    link: z.string().url({ message: 'Link deve ser uma URL válida' }),
    nome: z.string().optional(),
    dataInclusao: z.string().optional(),
    sequencial: z.number().int().positive().optional(),
    // Content fetched by the extension using the active SEI session
    content: z.string().optional(), // plain text or base64 PDF
    mimeType: z.enum(['text/plain', 'application/pdf']).optional()
});
// Full document schema (with processoSEI) - used for output
export const SeiDocumentSchema = z.object({
    tipo: z.enum(SEI_DOCUMENT_TYPES, {
        error: () => ({ message: `Tipo deve ser um dos: ${SEI_DOCUMENT_TYPES.join(', ')}` })
    }),
    link: z.string().url({ message: 'Link deve ser uma URL válida' }),
    nome: z.string().optional(),
    processoSEI: z.string().min(1, { message: 'processoSEI é obrigatório' }),
    dataInclusao: z.string().optional(),
    sequencial: z.number().int().positive().optional(),
    content: z.string().optional(),
    mimeType: z.enum(['text/plain', 'application/pdf']).optional()
});
export const SeiDocumentBatchSchema = z.object({
    processoSEI: z.string().min(1, { message: 'processoSEI é obrigatório e não pode estar vazio' }),
    documents: z.array(SeiDocumentInputSchema)
        .min(1, { message: 'Ao menos um documento é obrigatório' })
        .max(20, { message: 'Máximo de 20 documentos por lote' })
});
export const SeiDocumentExtractedSchema = z.object({
    tipo: z.enum(SEI_DOCUMENT_TYPES),
    link: z.string().url(),
    nome: z.string().optional(),
    processoSEI: z.string(),
    dataInclusao: z.string().optional(),
    sequencial: z.number().int().positive().optional(),
    numeroDocumento: z.string().optional(),
    numeroProcedimento: z.string().optional(),
    dataDocumento: z.string().optional(),
    descricao: z.string().optional(),
    palavrasChave: z.array(z.string()).optional(),
    erro: z.string().optional()
});
export const SeiExtractionResultSchema = z.object({
    sucesso: z.boolean(),
    processoSEI: z.string(),
    documents: z.array(SeiDocumentExtractedSchema),
    metadata: z.object({
        durationMs: z.number(),
        tokensUsed: z.number().optional(),
        modelUsed: z.string().optional(),
        documentsProcessed: z.number(),
        documentsSucceeded: z.number(),
        documentsFailed: z.number(),
        retryCount: z.number(),
        cacheHit: z.boolean(),
        correlationId: z.string(),
        errors: z.array(z.string()).optional()
    }),
    errors: z.array(z.string()).optional()
});
