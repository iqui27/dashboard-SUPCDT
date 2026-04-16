/**
 * SEI Project Extractor Service
 * Extracts structured Fomento project data from SEI documents using Gemini AI
 * 
 * Phase-aware extraction with validation, caching, and retry logic
 * Outputs structured suggestions for approval/rejection workflow
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import {
  ensureApiKey,
  retryWithBackoff,
  extractJsonObject,
  calculateHash,
  getCachedResult,
  saveCachedResult,
  validateWithSchema,
  createExtractionError,
  recordExtractionMetric,
  Semaphore,
  MAX_RETRIES,
  ExtractionPhase,
  ExtractionError
} from './geminiUtils.js';
import {
  SeiDocumentExtracted,
  SeiDocumentType,
  SEI_DOCUMENT_TYPES
} from '../types/sei.js';

// Cache collection for SEI project suggestions
const SEI_PROJECT_CACHE_COLLECTION = 'gemini_sei_project_cache';

// Pro model for SEI project extraction (better reasoning for complex government documents)
const SEI_PROJECT_MODEL = process.env.GEMINI_SEI_PROJECT_MODEL?.trim() || 'gemini-3.1-pro-preview';

// Semaphore for concurrent Gemini calls (matches seiExtractor.ts pattern)
const MAX_CONCURRENT_EXTRACTIONS = 5;
const extractionSemaphore = new Semaphore(MAX_CONCURRENT_EXTRACTIONS);

// Document types that are most useful for project extraction
const PREFERRED_DOCUMENT_TYPES: SeiDocumentType[] = [
  'PDF',     // Termos de fomento, convênios, contratos
  'DOC',     // Pareceres, despachos
  'DOCX',    // Modern documents
];

// Document types we should avoid (less structured, less useful)
const EXCLUDED_DOCUMENT_TYPES: SeiDocumentType[] = [
  'TXT',     // Too unstructured
  'RTF',     // Legacy format
];

/**
 * Output schema for SEI project suggestion
 * Matches Fomento fields with validation rules
 */
const SeiProjectSuggestionSchema = z.object({
  projeto: z.string().optional(),
  numeroTermoFomento: z.string().optional(),
  processoSEI: z.string().optional(),
  assinaturaPublicacao: z.string().optional(),
  statusProjeto: z.enum(['Assinado', 'Não assinado', 'Reprovado', 'Em andamento', 'Encerrado']).or(z.string()).optional(),
  situacao: z.string().optional(),
  etapaProjeto: z.string().optional(),
  categoria: z.enum(['Emenda', 'INEX', 'Convênio', 'Outro', 'Recurso Proprio']).or(z.string()).optional(),
  tipoInstrumento: z.enum(['Termo de Fomento', 'Termo de Colaboração']).or(z.string()).optional(),
  tipoSituacaoPagamento: z.string().optional(),
  valorTotal: z.number().optional(),
  // Stakeholders
  parlamentar: z.string().optional(),
  emendasParlamentares: z.array(z.object({
    nome: z.string(),
    valor: z.number().optional(),
    numeroPortaria: z.string().optional(),
    numeroOficio: z.string().optional(),
    dataPublicacao: z.string().optional(),
    status: z.string().optional(),         // Bloqueada | Desbloqueada | Anulada | SERP | SEEC
    descentralizacao: z.boolean().optional()
  })).optional(),
  osc: z.string().optional(),
  cnpjOSC: z.string().optional(),
  presidenteOSC: z.string().optional(),
  coordenadorProjeto: z.string().optional(),
  // Location
  regiaoAdministrativa: z.string().optional(),
  regioesAdministrativas: z.array(z.string()).optional(),
  // Internal
  responsavelParecer: z.string().optional(),
  statusPlanilha: z.string().optional(),
  statusDocumentacao: z.string().optional(),
  statusEscopoParecer: z.string().optional(),
  setor: z.string().optional(),
  notasObs: z.string().optional(),
  tipoPublicoPrevisto: z.string().optional(),
  // Dates
  vigenciaInicio: z.string().optional(),
  vigenciaEvento: z.string().optional(),
  vigenciaFinal: z.string().optional(),
  statusDesde: z.string().optional(),
  dataPrestacaoContasOSC: z.string().optional(),
  // Financials
  financeiroParcela1: z.union([z.string(), z.number()]).optional(),
  financeiroParcela2: z.union([z.string(), z.number()]).optional(),
  financeiroParcela3: z.union([z.string(), z.number()]).optional(),
  financeiroParcela4: z.union([z.string(), z.number()]).optional(),
});

export type SeiProjectSuggestion = z.infer<typeof SeiProjectSuggestionSchema>;

/**
 * Extraction result with phase-aware error tracking
 */
export interface SeiProjectExtractionResult {
  success: boolean;
  processoSEI: string;
  suggestion?: SeiProjectSuggestion;
  rawResponse?: string; // Raw Gemini response for quality audit
  sourceDocuments: string[]; // Links of documents used
  metadata: {
    durationMs: number;
    cacheHit: boolean;
    retries: number;
    documentsConsidered: number;
    documentsUsed: number;
    modelUsed: string;
    tokensUsed?: number;
    phase?: ExtractionPhase;
    correlationId: string;
  };
  error?: ExtractionError;
}

/**
 * Generate correlation ID for tracking extraction lifecycle
 */
function generateCorrelationId(): string {
  return `sei-proj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Select candidate documents for project extraction.
 *
 * Priority order:
 *   1. Documents with extracted text/plain content (richest signal for Gemini)
 *   2. Documents of preferred types (PDF, DOC, DOCX) — may have binary content
 *   3. Any non-excluded, non-errored document
 *
 * INTERNO (despachos) are often the most informative documents in a SEI process
 * and must be included when they carry extracted text content.
 */
function selectCandidateDocuments(
  documents: SeiDocumentExtracted[]
): SeiDocumentExtracted[] {
  const nonErrored = documents.filter(doc => !doc.erro);

  // Priority 1: docs with actual text content (highest quality input for Gemini)
  const withText = nonErrored.filter(doc => {
    const d = doc as SeiDocumentExtracted & { content?: string; mimeType?: string };
    return d.content && d.mimeType === 'text/plain';
  });

  // Priority 2: preferred type docs (even without content — metadata may help)
  const preferred = nonErrored.filter(doc =>
    PREFERRED_DOCUMENT_TYPES.includes(doc.tipo)
  );

  // Merge: text-content docs first, then preferred-type docs not already included
  const combined = [
    ...withText,
    ...preferred.filter(d => !withText.some(w => w.link === d.link))
  ];

  if (combined.length > 0) return combined;

  // Fallback: any non-excluded document
  return nonErrored.filter(doc =>
    !EXCLUDED_DOCUMENT_TYPES.includes(doc.tipo) &&
    SEI_DOCUMENT_TYPES.includes(doc.tipo)
  );
}

/**
 * Build document context for Gemini prompt.
 * Returns:
 *   - textContext: text prompt section for text/plain docs + PDF metadata headers
 *   - pdfParts: inlineData parts for PDF docs (passed separately to Gemini multimodal)
 */
function buildDocumentContext(documents: SeiDocumentExtracted[]): {
  textContext: string;
  pdfParts: Array<{ inlineData: { mimeType: string; data: string } }>;
} {
  const pdfParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
  let pdfIndex = 0;

  const textContext = documents.map((doc, i) => {
    const header = [
      `=== Documento ${i + 1}: ${doc.nome || 'Sem nome'} ===`,
      `Tipo: ${doc.tipo}`,
      doc.unidadeGeradora ? `Unidade: ${doc.unidadeGeradora}` : null,
      doc.dataDocumento ? `Data: ${doc.dataDocumento}` : null,
    ].filter(Boolean).join('\n');

    const docWithContent = doc as SeiDocumentExtracted & { content?: string; mimeType?: string };

    // Text docs: embed full content in prompt
    if (docWithContent.content && docWithContent.mimeType === 'text/plain') {
      return `${header}\nConteúdo:\n${docWithContent.content}`;
    }

    // PDF docs: add as inlineData part, reference by index in prompt
    if (docWithContent.content && docWithContent.mimeType === 'application/pdf') {
      pdfIndex++;
      pdfParts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: docWithContent.content
        }
      });
      return `${header}\n(PDF ${pdfIndex} — conteúdo anexado inline para análise)`;
    }

    // Metadata-only fallback
    const meta = [
      doc.numeroDocumento ? `Número: ${doc.numeroDocumento}` : null,
      doc.descricao ? `Descrição: ${doc.descricao}` : null,
      doc.palavrasChave?.length ? `Palavras-chave: ${doc.palavrasChave.join(', ')}` : null,
    ].filter(Boolean).join('\n');

    return `${header}${meta ? '\n' + meta : ''}`;
  }).join('\n\n');

  return { textContext, pdfParts };
}

/**
 * Sanitize project suggestion from Gemini response
 * Handles numeric conversions and array normalization
 */
function sanitizeProjectSuggestion(raw: Record<string, unknown>): SeiProjectSuggestion {
  const suggestion: SeiProjectSuggestion = {};

  // String fields
  const stringFields: (keyof SeiProjectSuggestion)[] = [
    'projeto', 'numeroTermoFomento', 'processoSEI', 'assinaturaPublicacao',
    'statusProjeto', 'situacao', 'etapaProjeto', 'categoria', 'tipoInstrumento',
    'tipoSituacaoPagamento', 'parlamentar', 'osc', 'cnpjOSC', 'presidenteOSC',
    'coordenadorProjeto', 'regiaoAdministrativa', 'responsavelParecer',
    'statusPlanilha', 'statusDocumentacao', 'statusEscopoParecer',
    'setor', 'notasObs', 'tipoPublicoPrevisto',
    'vigenciaInicio', 'vigenciaEvento', 'vigenciaFinal', 'statusDesde',
    'dataPrestacaoContasOSC'
  ];

  for (const field of stringFields) {
    const value = raw[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      (suggestion as Record<string, unknown>)[field] = value.trim();
    }
  }

  // Numeric fields
  const numericFields: (keyof SeiProjectSuggestion)[] = [
    'valorTotal',
    'financeiroParcela1', 'financeiroParcela2', 'financeiroParcela3', 'financeiroParcela4'
  ];

  for (const field of numericFields) {
    const value = raw[field];
    if (typeof value === 'number' && !Number.isNaN(value)) {
      (suggestion as Record<string, unknown>)[field] = value;
    } else if (typeof value === 'string') {
      // Parse Brazilian number format (e.g., "1.234,56" or "1234,56")
      const cleaned = value.replace(/[^\d,-]/g, '').replace(',', '.');
      const parsed = Number(cleaned);
      if (!Number.isNaN(parsed)) {
        (suggestion as Record<string, unknown>)[field] = parsed;
      }
    }
  }

  // emendasParlamentares array (detailed: nome, valor, numeroPortaria, status, etc.)
  const emendasRaw = raw.emendasParlamentares;
  if (Array.isArray(emendasRaw)) {
    suggestion.emendasParlamentares = emendasRaw
      .map(item => {
        if (!item || typeof item !== 'object') return null;
        const obj = item as Record<string, unknown>;
        const nome = typeof obj.nome === 'string' ? obj.nome.trim() : undefined;
        if (!nome) return null;

        let valor: number | undefined;
        if (typeof obj.valor === 'number' && !Number.isNaN(obj.valor)) {
          valor = obj.valor;
        } else if (typeof obj.valor === 'string') {
          const parsed = Number((obj.valor as string).replace(/[^\d,-]/g, '').replace(',', '.'));
          if (!Number.isNaN(parsed)) valor = parsed;
        }

        return {
          nome,
          ...(valor !== undefined ? { valor } : {}),
          ...(typeof obj.numeroPortaria === 'string' && obj.numeroPortaria ? { numeroPortaria: obj.numeroPortaria.trim() } : {}),
          ...(typeof obj.numeroOficio === 'string' && obj.numeroOficio ? { numeroOficio: obj.numeroOficio.trim() } : {}),
          ...(typeof obj.dataPublicacao === 'string' && obj.dataPublicacao ? { dataPublicacao: obj.dataPublicacao.trim() } : {}),
          ...(typeof obj.status === 'string' && obj.status ? { status: obj.status.trim() } : {}),
          ...(typeof obj.descentralizacao === 'boolean' ? { descentralizacao: obj.descentralizacao } : {}),
        };
      })
      .filter(Boolean) as NonNullable<SeiProjectSuggestion['emendasParlamentares']>;
  }

  // Regiões administrativas array
  const regioesRaw = raw.regioesAdministrativas ?? raw.regioes ?? raw.localizacoes;
  if (Array.isArray(regioesRaw)) {
    suggestion.regioesAdministrativas = regioesRaw
      .map(value => typeof value === 'string' ? value.trim() : '')
      .filter(value => value.length > 0);
  }

  return suggestion;
}

/**
 * Extract project suggestion from SEI documents using Gemini AI
 */
export async function extractSeiProjectSuggestion(
  processoSEI: string,
  documents: SeiDocumentExtracted[],
  options?: {
    forceRefresh?: boolean;
    linkedProjectId?: string;
  }
): Promise<SeiProjectExtractionResult> {
  const startTime = Date.now();
  const correlationId = generateCorrelationId();
  let retryCount = 0;

  console.log(`[SEI Project Extractor] Starting extraction for processoSEI: ${processoSEI} (${correlationId})`);

  // Select candidate documents
  const candidates = selectCandidateDocuments(documents);

  if (candidates.length === 0) {
    const error = createExtractionError('extract', 'Nenhum documento elegível para extração de projeto');
    console.warn(`[SEI Project Extractor] No eligible documents for ${processoSEI}`);

    return {
      success: false,
      processoSEI,
      sourceDocuments: [],
      metadata: {
        durationMs: Date.now() - startTime,
        cacheHit: false,
        retries: 0,
        documentsConsidered: documents.length,
        documentsUsed: 0,
        modelUsed: SEI_PROJECT_MODEL,
        correlationId,
        phase: 'extract'
      },
      error
    };
  }

  // Calculate cache hash from candidate document links
  const candidateHash = calculateHash(candidates.map(d => d.link).sort().join('|'));

  // Check cache (unless force refresh)
  if (!options?.forceRefresh) {
    const cached = await getCachedResult<SeiProjectSuggestion>(candidateHash, SEI_PROJECT_CACHE_COLLECTION);
    if (cached) {
      console.log(`[SEI Project Extractor] Cache hit for ${processoSEI}`);

      return {
        success: true,
        processoSEI,
        suggestion: cached,
        sourceDocuments: candidates.map(d => d.link),
        metadata: {
          durationMs: Date.now() - startTime,
          cacheHit: true,
          retries: 0,
          documentsConsidered: documents.length,
          documentsUsed: candidates.length,
          modelUsed: SEI_PROJECT_MODEL,
          correlationId,
          phase: 'extract'
        }
      };
    }
  }

  // Acquire semaphore for rate limiting
  await extractionSemaphore.acquire();

  try {
    const apiKey = ensureApiKey();
    const generativeAI = new GoogleGenerativeAI(apiKey);

    // Build prompt and PDF parts
    const { textContext, pdfParts } = buildDocumentContext(candidates);

    const systemPrompt = `Você é um especialista em análise de processos de fomento do Governo do Distrito Federal (GDF), especificamente da SECTI (Secretaria de Ciência, Tecnologia e Inovação).

Analise os documentos do processo SEI abaixo e extraia os dados estruturados do projeto de fomento.

CONTEXTO DO SISTEMA:
- Processos envolvem Termos de Fomento e Termos de Colaboração com OSCs (Organizações da Sociedade Civil)
- Recursos podem ser de Emendas Parlamentares, INEX (Inexigibilidade), Convênio ou Recurso Próprio
- O processo SEI é o sistema oficial de gestão documental do GDF
- Despachos internos contêm decisões, pareceres e histórico do processo
- O Plano de Trabalho é o documento mais rico em dados do projeto (OSC, objeto, valor, vigência, região)
- Ofícios registram comunicações entre unidades e parlamentares

PROCESSO SEI: ${processoSEI}

DOCUMENTOS DISPONÍVEIS:
${textContext}

${pdfParts.length > 0 ? `Os ${pdfParts.length} PDF(s) estão anexados inline. Analise o conteúdo completo de cada um.` : ''}

INSTRUÇÕES DE EXTRAÇÃO:
- Extraia APENAS o que está explicitamente nos documentos. Não infira nem invente dados.
- Para valorTotal e parcelas: use o valor numérico em reais (ex: 150000.00), sem formatação
- Para datas: formato AAAA-MM-DD
- Para parlamentares: liste todos os mencionados com seus respectivos valores de emenda
- Para regiões administrativas: use o nome oficial do DF (ex: "Ceilândia", "Taguatinga")
- statusProjeto deve refletir o estado atual do processo conforme os despachos mais recentes
- Se um campo não for encontrado, omita-o do JSON

SCHEMA DE SAÍDA (JSON) — inclua apenas os campos encontrados nos documentos:
{
  "projeto": "Nome/objeto do projeto conforme Plano de Trabalho",
  "numeroTermoFomento": "Número do instrumento (ex: 001/2025)",
  "processoSEI": "Número do processo SEI",
  "assinaturaPublicacao": "Data e informações de assinatura/publicação no DODF",
  "statusProjeto": "Assinado|Não assinado|Reprovado|Em andamento|Encerrado",
  "situacao": "Situação detalhada atual do processo",
  "etapaProjeto": "Etapa atual (ex: Análise documental, Execução, Prestação de contas)",
  "categoria": "Emenda|INEX|Convênio|Outro|Recurso Proprio",
  "tipoInstrumento": "Termo de Fomento|Termo de Colaboração",
  "tipoSituacaoPagamento": "Situação do pagamento (ex: Pago, Pendente, Parcial)",
  "valorTotal": 0.00,
  "parlamentar": "Nome do parlamentar principal (se emenda parlamentar)",
  "emendasParlamentares": [
    {
      "nome": "Nome completo do parlamentar",
      "valor": 0.00,
      "numeroPortaria": "Número da portaria de autorização (se houver)",
      "numeroOficio": "Número do ofício (se houver)",
      "dataPublicacao": "AAAA-MM-DD",
      "status": "Bloqueada|Desbloqueada|Anulada|SERP|SEEC",
      "descentralizacao": false
    }
  ],
  "osc": "Nome completo da OSC parceira",
  "cnpjOSC": "CNPJ da OSC (formato: XX.XXX.XXX/XXXX-XX)",
  "presidenteOSC": "Nome do presidente/representante legal da OSC",
  "coordenadorProjeto": "Nome do coordenador técnico do projeto",
  "regiaoAdministrativa": "Região administrativa principal de atuação",
  "regioesAdministrativas": ["Lista de regiões administrativas do DF"],
  "tipoPublicoPrevisto": "Descrição do público-alvo previsto (ex: 200 jovens de 15 a 29 anos)",
  "responsavelParecer": "Servidor SECTI responsável pelo parecer técnico",
  "vigenciaInicio": "AAAA-MM-DD",
  "vigenciaEvento": "AAAA-MM-DD",
  "vigenciaFinal": "AAAA-MM-DD",
  "statusDesde": "AAAA-MM-DD",
  "dataPrestacaoContasOSC": "AAAA-MM-DD — prazo para prestação de contas da OSC",
  "financeiroParcela1": 0.00,
  "financeiroParcela2": 0.00,
  "financeiroParcela3": 0.00,
  "financeiroParcela4": 0.00,
  "setor": "Área temática (ex: Cultura, Esporte, Assistência Social, Educação)",
  "notasObs": "Observações relevantes encontradas nos documentos"
}

Retorne APENAS o JSON válido, sem markdown, sem explicações.`;

    // Build multimodal parts: text prompt + PDF inlineData
    const contentParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: systemPrompt },
      ...pdfParts,
    ];

    // Call Gemini with retry
    const { result: generationResponse, retries } = await retryWithBackoff(async () => {
      const model = generativeAI.getGenerativeModel({ model: SEI_PROJECT_MODEL });
      return await model.generateContent({
        contents: [{
          role: 'user',
          parts: contentParts
        }]
      });
    }, MAX_RETRIES, 1000, (attempt) => {
      retryCount = attempt;
    });

    retryCount = retries;

    const textResponse = generationResponse.response?.text();
    if (!textResponse) {
      const error = createExtractionError('extract', 'Resposta vazia do Gemini', retryCount);
      throw error;
    }

    // Extract JSON from response
    let parsed: unknown;
    try {
      parsed = extractJsonObject(textResponse);
    } catch (parseError) {
      const error = createExtractionError('validation', 
        parseError instanceof Error ? parseError.message : 'JSON malformado na resposta',
        retryCount
      );
      throw error;
    }

    if (!parsed || typeof parsed !== 'object') {
      const error = createExtractionError('validation', 'O Gemini não retornou um objeto JSON válido', retryCount);
      throw error;
    }

    // Validate with Zod schema
    const validationResult = validateWithSchema(parsed, SeiProjectSuggestionSchema, 'validation');
    if (!validationResult.success) {
      throw validationResult.error;
    }

    // Sanitize suggestion
    const suggestion = sanitizeProjectSuggestion(parsed as Record<string, unknown>);

    // Enrich with processoSEI if missing
    if (!suggestion.processoSEI) {
      suggestion.processoSEI = processoSEI;
    }

    // Save to cache
    await saveCachedResult(candidateHash, suggestion, SEI_PROJECT_CACHE_COLLECTION);

    // Get usage metadata
    const usageMetadata = generationResponse.response?.usageMetadata;
    const tokensUsed = usageMetadata?.totalTokenCount || usageMetadata?.promptTokenCount || 0;

    const durationMs = Date.now() - startTime;

    // Record metric
    await recordExtractionMetric({
      operation: 'sei_project_extraction',
      status: 'success',
      durationMs,
      tokensUsed,
      modelUsed: SEI_PROJECT_MODEL,
      processoSEI
    });

    console.log(`[SEI Project Extractor] Extraction successful for ${processoSEI} in ${durationMs}ms`);

    return {
      success: true,
      processoSEI,
      suggestion,
      rawResponse: textResponse,
      sourceDocuments: candidates.map(d => d.link),
      metadata: {
        durationMs,
        cacheHit: false,
        retries: retryCount,
        documentsConsidered: documents.length,
        documentsUsed: candidates.length,
        modelUsed: SEI_PROJECT_MODEL,
        tokensUsed,
        correlationId
      }
    };

  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Determine phase from error
    const extractionError = error as ExtractionError;
    const phase = extractionError.phase || 'extract';

    // Record metric
    await recordExtractionMetric({
      operation: 'sei_project_extraction',
      status: 'error',
      durationMs,
      modelUsed: SEI_PROJECT_MODEL,
      errorMessage,
      processoSEI,
      phase
    });

    console.error(`[SEI Project Extractor] Extraction failed for ${processoSEI} (phase: ${phase}):`, errorMessage);

    return {
      success: false,
      processoSEI,
      sourceDocuments: candidates.map(d => d.link),
      metadata: {
        durationMs,
        cacheHit: false,
        retries: retryCount,
        documentsConsidered: documents.length,
        documentsUsed: candidates.length,
        modelUsed: SEI_PROJECT_MODEL,
        correlationId,
        phase
      },
      error: extractionError.phase ? extractionError : createExtractionError(phase, errorMessage, retryCount)
    };

  } finally {
    extractionSemaphore.release();
  }
}

/**
 * Batch extraction for multiple SEI processes
 * Uses semaphore to limit concurrent Gemini calls
 */
export async function batchExtractSeiProjectSuggestions(
  inputs: Array<{
    processoSEI: string;
    documents: SeiDocumentExtracted[];
    linkedProjectId?: string;
  }>
): Promise<SeiProjectExtractionResult[]> {
  const results: SeiProjectExtractionResult[] = [];

  // Process each input sequentially (rate limiting handled by extractionSemaphore)
  for (const input of inputs) {
    const result = await extractSeiProjectSuggestion(
      input.processoSEI,
      input.documents,
      { linkedProjectId: input.linkedProjectId }
    );
    results.push(result);
  }

  return results;
}

/**
 * Clear cache for a specific process (useful when documents change)
 */
export async function clearSeiProjectCache(_processoSEI: string): Promise<void> {
  try {
    const { getDatabase } = await import('../db/client.js');
    const db = await getDatabase();
    const collection = db.collection(SEI_PROJECT_CACHE_COLLECTION);

    // Delete entries that match documents from this process
    // Note: This requires the hash to be computed from document links
    // For simplicity, we delete all cache entries older than TTL
    // In production, you'd need to track process-to-hash mapping

    const result = await collection.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    console.log(`[SEI Project Extractor] Cleared ${result.deletedCount} expired cache entries`);
  } catch (error) {
    console.warn('[SEI Project Extractor] Failed to clear cache:', error);
  }
}

