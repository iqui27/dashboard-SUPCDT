import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { getDatabase } from '../db/client.js';
import { recordMetric } from './geminiMetrics.js';
import {
  SeiDocument,
  SeiDocumentExtracted,
  SeiExtractionResult,
  SeiExtractionMetadata,
  SeiDocumentInput
} from '../types/sei.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
  ?? process.env.GOOGLE_GEMINI_API_KEY
  ?? process.env.GOOGLE_API_KEY
  ?? '';

const RAW_MODEL = process.env.GEMINI_MODEL?.trim();
const FALLBACK_MODEL = process.env.GEMINI_MODEL_FALLBACK?.trim() || 'gemini-3.1-flash-lite-preview';
const MODEL_CANDIDATES = Array.from(
  new Set(
    [
      RAW_MODEL,
      FALLBACK_MODEL,
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite-preview',
      'gemini-2.5-flash',
      'models/gemini-2.5-flash',
      'gemini-1.5-flash',
      'models/gemini-1.5-flash',
    ].filter((value): value is string => Boolean(value && value.length > 0))
  )
);

const DEFAULT_MODEL = MODEL_CANDIDATES[0] ?? 'gemini-3-flash-preview';
const MAX_RETRIES = Number(process.env.GEMINI_MAX_RETRIES) || 3;
const RETRY_DELAY_MS = Number(process.env.GEMINI_RETRY_DELAY_MS) || 1000;
const CACHE_ENABLED = process.env.GEMINI_CACHE_ENABLED !== 'false';
const CACHE_TTL_DAYS = Number(process.env.GEMINI_CACHE_TTL_DAYS) || 7;
const CACHE_COLLECTION = 'gemini_sei_cache';
const MAX_CONCURRENT_EXTRACTIONS = 5;

interface CacheEntry {
  hash: string;
  link: string;
  tipo: string;
  extracted: Partial<SeiDocumentExtracted>;
  createdAt: Date;
  expiresAt: Date;
}

// Gemini response schema for SEI document extraction
const GeminiSeiDocumentSchema = z.object({
  numeroDocumento: z.string().optional(),
  numeroProcedimento: z.string().optional(),
  dataDocumento: z.string().optional(),
  descricao: z.string().optional(),
  palavrasChave: z.array(z.string()).optional()
});

function ensureApiKey(): string {
  const key = GEMINI_API_KEY;

  if (!key) {
    console.error('[SEI Extractor] No API key found in environment variables');
    throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY in the environment.');
  }

  return key;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = RETRY_DELAY_MS,
  onRetry?: (attempt: number) => void
): Promise<{ result: T; retries: number }> {
  let lastError: Error | undefined;
  let retries = 0;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, retries };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retries = attempt + 1;

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`SEI extraction failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
        onRetry?.(attempt + 1);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

function calculateLinkHash(link: string): string {
  return crypto.createHash('sha256').update(link).digest('hex');
}

async function getCachedResult(link: string): Promise<Partial<SeiDocumentExtracted> | null> {
  if (!CACHE_ENABLED) return null;

  try {
    const db = await getDatabase();
    const collection = db.collection<CacheEntry>(CACHE_COLLECTION);

    const cached = await collection.findOne({
      hash: calculateLinkHash(link),
      expiresAt: { $gt: new Date() }
    });

    if (cached) {
      console.log(`[SEI Extractor] Cache hit for: ${link}`);
      return cached.extracted;
    }

    return null;
  } catch (error) {
    console.warn('[SEI Extractor] Failed to read from cache:', error);
    return null;
  }
}

async function saveCachedResult(
  link: string,
  tipo: string,
  extracted: Partial<SeiDocumentExtracted>
): Promise<void> {
  if (!CACHE_ENABLED) return;

  try {
    const db = await getDatabase();
    const collection = db.collection<CacheEntry>(CACHE_COLLECTION);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

    await collection.updateOne(
      { hash: calculateLinkHash(link) },
      {
        $set: {
          hash: calculateLinkHash(link),
          link,
          tipo,
          extracted,
          createdAt: now,
          expiresAt
        }
      },
      { upsert: true }
    );

    console.log(`[SEI Extractor] Cached result for: ${link}`);
  } catch (error) {
    console.warn('[SEI Extractor] Failed to save to cache:', error);
  }
}

function extractJsonObject(text: string): unknown {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('A resposta do Gemini não contém um objeto JSON válido.');
  }

  const jsonText = jsonMatch[1] ?? jsonMatch[0];
  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error('Falha ao interpretar a resposta do Gemini: JSON inválido.');
  }
}

async function extractMetadataFromDocument(
  document: SeiDocumentInput,
  apiKey: string,
  _retryCount: number = 0
): Promise<SeiDocumentExtracted> {
  const prompt = `Extraia metadados estruturados de um documento do SEI.

Documento:
- Tipo: ${document.tipo}
- Link: ${document.link}
- Nome: ${document.nome || 'Não informado'}
- Processo SEI: ${document.processoSEI}

Retorne APENAS um JSON válido com os seguintes campos (campos opcionais podem ser omitidos):
{
  "numeroDocumento": "string (número de identificação do documento)",
  "numeroProcedimento": "string (número do procedimento)",
  "dataDocumento": "string (data do documento, idealmente AAAA-MM-DD)",
  "descricao": "string (breve descrição do conteúdo)",
  "palavrasChave": ["array de strings (palavras-chave)"]
}

Retorne apenas JSON válido, sem explicações adicionais.`;

  const generativeAI = new GoogleGenerativeAI(apiKey);
  const model = generativeAI.getGenerativeModel({ model: DEFAULT_MODEL });

  const { result: generationResponse } = await retryWithBackoff(async () => {
    return await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    });
  }, MAX_RETRIES, RETRY_DELAY_MS);

  const textResponse = generationResponse.response?.text();
  if (!textResponse) {
    throw new Error('Resposta vazia do Gemini ao processar documento SEI.');
  }

  const parsed = extractJsonObject(textResponse);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('O Gemini não retornou um objeto JSON válido.');
  }

  const validationResult = GeminiSeiDocumentSchema.safeParse(parsed);
  if (!validationResult.success) {
    console.warn('[SEI Extractor] Gemini response validation failed:', validationResult.error.format());
    // Return basic info if validation fails, but log the issue
    return {
      ...document,
      erro: `Validação falhou: ${validationResult.error.message}`
    };
  }

  return {
    ...document,
    ...validationResult.data
  };
}

/**
 * Extract metadata from a single SEI document using Gemini AI
 */
async function extractSingleDocument(
  document: SeiDocumentInput,
  apiKey: string
): Promise<SeiDocumentExtracted> {
  const startTime = Date.now();
  const correlationId = crypto.randomUUID();

  console.log(`[SEI Extractor] Processing document: ${document.link} (${correlationId})`);

  // If the browser extension already fetched the content, skip Gemini entirely
  const docWithContent = document as SeiDocumentInput & { content?: string; mimeType?: string };
  if (docWithContent.content && docWithContent.mimeType === 'text/plain') {
    console.log(`[SEI Extractor] Using browser-provided content for: ${document.nome || document.link}`);
    await recordMetric({
      operation: 'sei_document_extraction',
      status: 'cache_hit',
      durationMs: Date.now() - startTime,
      tokensUsed: 0,
      modelUsed: 'browser',
      cacheHit: true
    });
    return { ...document, content: docWithContent.content, mimeType: docWithContent.mimeType };
  }

  // Check cache first
  const cached = await getCachedResult(document.link);
  if (cached) {
    const durationMs = Date.now() - startTime;
    await recordMetric({
      operation: 'sei_document_extraction',
      status: 'cache_hit',
      durationMs,
      tokensUsed: 0,
      modelUsed: DEFAULT_MODEL,
      cacheHit: true
    });

    return {
      ...document,
      ...cached
    };
  }

  try {
    const extracted = await extractMetadataFromDocument(document, apiKey);

    // Save to cache
    await saveCachedResult(document.link, document.tipo, extracted);

    const durationMs = Date.now() - startTime;
    await recordMetric({
      operation: 'sei_document_extraction',
      status: 'success',
      durationMs,
      tokensUsed: 0,
      modelUsed: DEFAULT_MODEL,
      cacheHit: false
    });

    return extracted;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    await recordMetric({
      operation: 'sei_document_extraction',
      status: 'error',
      durationMs,
      tokensUsed: 0,
      modelUsed: DEFAULT_MODEL,
      cacheHit: false,
      errorMessage
    });

    console.error(`[SEI Extractor] Failed to extract document: ${document.link}`, error);

    return {
      ...document,
      erro: errorMessage
    };
  }
}

/**
 * Semaphore for limiting concurrent Gemini calls
 */
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>(resolve => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    const next = this.queue.shift();
    if (next) {
      this.permits--;
      next();
    }
  }
}

const extractionSemaphore = new Semaphore(MAX_CONCURRENT_EXTRACTIONS);

/**
 * Extract metadata from multiple SEI documents with rate limiting
 */
export async function extractFromSeiDocuments(
  processoSEI: string,
  documents: SeiDocument[]
): Promise<SeiExtractionResult> {
  const startTime = Date.now();
  const correlationId = crypto.randomUUID();
  let totalRetries = 0;
  const errors: string[] = [];

  console.log(`[SEI Extractor] Starting batch extraction for processoSEI: ${processoSEI}, ${documents.length} documents (${correlationId})`);

  // Ensure API key
  const apiKey = ensureApiKey();

  const extractedDocuments: SeiDocumentExtracted[] = [];
  let documentsSucceeded = 0;
  let documentsFailed = 0;

  // Process documents with rate limiting
  const extractionPromises = documents.map(async (doc): Promise<SeiDocumentExtracted> => {
    // Acquire semaphore for rate limiting
    await extractionSemaphore.acquire();

    try {
      const inputDoc: SeiDocumentInput = {
        tipo: doc.tipo,
        link: doc.link,
        nome: doc.nome,
        processoSEI: processoSEI,
        dataInclusao: doc.dataInclusao,
        sequencial: doc.sequencial,
        // Preserve content fetched by the browser extension
        content: (doc as SeiDocument & { content?: string; mimeType?: string }).content,
        mimeType: (doc as SeiDocument & { content?: string; mimeType?: string }).mimeType
      };

      const result = await extractSingleDocument(inputDoc, apiKey);

      if (result.erro) {
        documentsFailed++;
        errors.push(`Documento ${doc.link}: ${result.erro}`);
      } else {
        documentsSucceeded++;
      }

      return result;
    } finally {
      extractionSemaphore.release();
    }
  });

  // Wait for all extractions to complete
  const results = await Promise.all(extractionPromises);
  extractedDocuments.push(...results);

  const durationMs = Date.now() - startTime;

  // Build metadata
  const metadata: SeiExtractionMetadata = {
    durationMs,
    modelUsed: DEFAULT_MODEL,
    documentsProcessed: documents.length,
    documentsSucceeded,
    documentsFailed,
    retryCount: totalRetries,
    cacheHit: false, // Would need to track this properly
    correlationId,
    errors: errors.length > 0 ? errors : undefined
  };

  console.log(`[SEI Extractor] Batch extraction complete for ${processoSEI}: ${documentsSucceeded}/${documents.length} succeeded in ${durationMs}ms`);

  return {
    sucesso: documentsSucceeded > 0,
    processoSEI,
    documents: extractedDocuments,
    metadata,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Store or update SEI process in MongoDB
 */
export async function storeSeiProcess(
  processoSEI: string,
  documents: SeiDocumentExtracted[],
  createdBy?: string
): Promise<void> {
  try {
    const db = await getDatabase();
    const collection = db.collection('sei_processes');

    const now = new Date();

    await collection.updateOne(
      { processoSEI },
      {
        $set: {
          processoSEI,
          documents,
          ultimaAtualizacao: now,
          lastExtractionAt: now,
          createdBy: createdBy || 'Sistema'
        },
        $setOnInsert: {
          dataCriacao: now
        }
      },
      { upsert: true }
    );

    console.log(`[SEI Extractor] Stored process ${processoSEI} with ${documents.length} documents`);
  } catch (error) {
    console.error(`[SEI Extractor] Failed to store process ${processoSEI}:`, error);
    throw error;
  }
}

/**
 * Get stored SEI process from MongoDB
 */
export async function getStoredSeiProcess(processoSEI: string): Promise<{
  processoSEI: string;
  documents: SeiDocumentExtracted[];
  lastExtractionAt?: Date;
} | null> {
  try {
    const db = await getDatabase();
    const collection = db.collection('sei_processes');

    const process = await collection.findOne({ processoSEI });

    if (!process) {
      return null;
    }

    return {
      processoSEI: process.processoSEI,
      documents: process.documents || [],
      lastExtractionAt: process.lastExtractionAt
    };
  } catch (error) {
    console.error(`[SEI Extractor] Failed to get process ${processoSEI}:`, error);
    return null;
  }
}
