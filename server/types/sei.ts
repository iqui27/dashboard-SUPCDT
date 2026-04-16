import crypto from 'crypto';
import { ObjectId } from 'mongodb';
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
  'INTERNO',  // SEI internal documents (despachos, memorandos, etc.)
  'EXTERNO'   // SEI external documents (PDFs attached from outside)
] as const;

export type SeiDocumentType = typeof SEI_DOCUMENT_TYPES[number];

// Individual SEI Document
export interface SeiDocument {
  tipo: SeiDocumentType;
  link: string;
  nome?: string;
  processoSEI: string;
  dataInclusao?: string;
  sequencial?: number;
  // Content fetched by the extension using the user's active SEI session
  content?: string;
  mimeType?: 'text/plain' | 'application/pdf';
}

// SEI Document with extracted metadata from AI
export interface SeiDocumentExtracted {
  tipo: SeiDocumentType;
  link: string;
  nome?: string;
  processoSEI: string;
  dataInclusao?: string;
  sequencial?: number;
  content?: string;
  mimeType?: 'text/plain' | 'application/pdf';
  unidadeGeradora?: string;
  numeroDocumento?: string;
  numeroProcedimento?: string;
  dataDocumento?: string;
  descricao?: string;
  palavrasChave?: string[];
  erro?: string;
}

// Batch request for importing SEI documents
export interface SeiDocumentBatch {
  processoSEI: string;
  documents: SeiDocument[];
}

// SEI Movement/History entry
export interface SeiMovement {
  data: string;
  descricao: string;
  responsavel?: string;
  tipoMovimento?: string;
}

// SEI Process state stored in MongoDB
export interface SeiProcess {
  _id?: string;
  processoSEI: string;
  dataCriacao: Date;
  ultimaAtualizacao: Date;
  documents: SeiDocumentExtracted[];
  movements: SeiMovement[];
  lastExtractionAt?: Date;
  extractionMetadata?: SeiExtractionMetadata;
  createdBy?: string;
  error?: string;
}

// Metadata about the extraction operation
export interface SeiExtractionMetadata {
  durationMs: number;
  tokensUsed?: number;
  modelUsed?: string;
  documentsProcessed: number;
  documentsSucceeded: number;
  documentsFailed: number;
  retryCount: number;
  cacheHit: boolean;
  correlationId: string;
  errors?: string[];
}

// Result of SEI extraction operation
export interface SeiExtractionResult {
  sucesso: boolean;
  processoSEI: string;
  documents: SeiDocumentExtracted[];
  metadata: SeiExtractionMetadata;
  errors?: string[];
}

// Document movement types for detecting changes between extractions
export type SeiMovementType = 'document_added' | 'document_removed' | 'document_modified';

export interface SeiDocumentMovement {
  type: SeiMovementType;
  documentId: string; // Generated from link
  document: SeiDocumentExtracted;
  previousDocument?: SeiDocumentExtracted; // Only for modified documents
  detectedAt: string; // ISO timestamp
}

// State hash for quick comparison
export function generateStateHash(documents: SeiDocumentExtracted[]): string {
  // Sort by document ID (link) for consistent hashing
  const sortedIds = documents
    .map(d => d.link || `${d.tipo}-${d.nome || 'unnamed'}`)
    .sort();
  
  const hashContent = sortedIds.join('|');
  return crypto.createHash('sha256').update(hashContent).digest('hex').substring(0, 16);
}

// SEI Process State stored in MongoDB sei_processes collection
export interface SeiProcessState {
  processoSEI: string;
  documents: SeiDocumentExtracted[];
  extractedAt: Date;
  stateHash: string;
  linkedProjectId?: string; // For linking to Fomento projects
  extractedDocLinks?: string[]; // Links of docs already processed by project extractor (incremental)
}

// Full persisted record in MongoDB
export interface SeiProcessRecord extends SeiProcessState {
  _id?: string;
  createdAt: Date;
  updatedAt: Date;
  firstExtractionAt: Date;
  extractionCount: number;
  lastMetadata?: SeiExtractionMetadata;
}

// Update proposal: diff between AI suggestion and current project, awaiting confirmation
export type UpdateProposalStatus = 'pending' | 'confirmed' | 'rejected';

export interface SeiUpdateProposal {
  _id?: ObjectId | string;
  processoSEI: string;
  linkedProjectId: string;         // ID of the custom_project to be updated
  status: UpdateProposalStatus;
  proposedChanges: Record<string, { from: unknown; to: unknown }>;
  newDocLinks: string[];           // Links of the new docs that triggered this proposal
  suggestionId?: string;
  rawResponse?: string;            // Raw Gemini response for audit
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  confirmedBy?: string;
  confirmedFields?: string[];      // If partial confirmation, which fields were applied
  rejectedAt?: Date;
  rejectedBy?: string;
}

// Movement detection result
export interface SeiMovementDetectionResult {
  hasChanges: boolean;
  isFirstExtraction: boolean;
  movements: SeiDocumentMovement[];
  previousStateHash?: string;
  newStateHash: string;
  changesSummary: {
    added: number;
    removed: number;
    modified: number;
  };
}

// Extend SeiExtractionResult to include movement detection
export interface SeiExtractionResultWithMovements extends SeiExtractionResult {
  movements?: SeiDocumentMovement[];
  movementDetection?: {
    hasChanges: boolean;
    isFirstExtraction: boolean;
    changesSummary: {
      added: number;
      removed: number;
      modified: number;
    };
  };
  previousStateHash?: string;
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
  content: z.string().optional(),   // plain text or base64 PDF
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

// Type exports for convenience
export type SeiDocumentInput = z.infer<typeof SeiDocumentSchema>;
export type SeiDocumentBatchInput = z.infer<typeof SeiDocumentBatchSchema>;
export type SeiExtractionResultInput = z.infer<typeof SeiExtractionResultSchema>;
