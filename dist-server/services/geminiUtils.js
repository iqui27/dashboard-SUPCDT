/**
 * Shared Gemini utilities for AI extraction operations
 * Reused by geminiImport.ts (PDF extraction) and seiProjectExtractor.ts (SEI document extraction)
 */
import crypto from 'crypto';
import { getDatabase } from '../db/client.js';
import { recordMetric } from './geminiMetrics.js';
// Shared configuration (also used by seiExtractor.ts)
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    ?? process.env.GOOGLE_GEMINI_API_KEY
    ?? process.env.GOOGLE_API_KEY
    ?? '';
export const RAW_MODEL = process.env.GEMINI_MODEL?.trim();
export const FALLBACK_MODEL = process.env.GEMINI_MODEL_FALLBACK?.trim() || 'gemini-3.1-flash-lite-preview';
export const MODEL_CANDIDATES = Array.from(new Set([
    RAW_MODEL,
    FALLBACK_MODEL,
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-flash',
    'models/gemini-2.5-flash',
    'gemini-1.5-flash',
    'models/gemini-1.5-flash',
].filter((value) => Boolean(value && value.length > 0))));
export const DEFAULT_MODEL = MODEL_CANDIDATES[0] ?? 'gemini-3-flash-preview';
export const MAX_RETRIES = Number(process.env.GEMINI_MAX_RETRIES) || 3;
export const RETRY_DELAY_MS = Number(process.env.GEMINI_RETRY_DELAY_MS) || 1000;
export const CACHE_ENABLED = process.env.GEMINI_CACHE_ENABLED !== 'false';
export const CACHE_TTL_DAYS = Number(process.env.GEMINI_CACHE_TTL_DAYS) || 7;
/**
 * Ensure Gemini API key is available
 */
export function ensureApiKey() {
    const key = GEMINI_API_KEY;
    if (!key) {
        console.error('[Gemini] No API key found in environment variables (GEMINI_API_KEY, GOOGLE_GEMINI_API_KEY, GOOGLE_API_KEY)');
        throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY in the environment.');
    }
    const source = process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' :
        process.env.GOOGLE_GEMINI_API_KEY ? 'GOOGLE_GEMINI_API_KEY' :
            process.env.GOOGLE_API_KEY ? 'GOOGLE_API_KEY' : 'Unknown';
    console.log(`[Gemini] Using API key from: ${source} (Length: ${key.length})`);
    return key;
}
/**
 * Sleep utility for retry delays
 */
export async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = MAX_RETRIES, baseDelay = RETRY_DELAY_MS, onRetry) {
    let lastError;
    let retries = 0;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const result = await fn();
            return { result, retries };
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            retries = attempt + 1;
            if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt);
                console.warn(`Gemini request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`, lastError.message);
                onRetry?.(attempt + 1);
                await sleep(delay);
            }
        }
    }
    throw lastError || new Error('Retry failed with unknown error');
}
/**
 * Extract JSON object from Gemini text response
 * Handles both ```json blocks and raw JSON
 */
export function extractJsonObject(text) {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('A resposta do Gemini não contém um objeto JSON válido.');
    }
    const jsonText = jsonMatch[1] ?? jsonMatch[0];
    try {
        return JSON.parse(jsonText);
    }
    catch {
        throw new Error('Falha ao interpretar a resposta do Gemini: JSON inválido.');
    }
}
/**
 * Calculate hash for caching
 */
export function calculateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}
/**
 * Get cached result from MongoDB
 */
export async function getCachedResult(hash, collectionName) {
    if (!CACHE_ENABLED)
        return null;
    try {
        const db = await getDatabase();
        const collection = db.collection(collectionName);
        const cached = await collection.findOne({
            hash,
            expiresAt: { $gt: new Date() }
        });
        if (cached) {
            console.log(`[Gemini Cache] Hit for hash: ${hash.substring(0, 16)}...`);
            return cached.data;
        }
        return null;
    }
    catch (error) {
        console.warn('[Gemini Cache] Failed to read from cache:', error);
        return null;
    }
}
/**
 * Save result to MongoDB cache
 */
export async function saveCachedResult(hash, data, collectionName) {
    if (!CACHE_ENABLED)
        return;
    try {
        const db = await getDatabase();
        const collection = db.collection(collectionName);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
        await collection.updateOne({ hash }, {
            $set: {
                hash,
                data,
                createdAt: now,
                expiresAt
            }
        }, { upsert: true });
        console.log(`[Gemini Cache] Saved hash: ${hash.substring(0, 16)}... (expires: ${expiresAt.toISOString()})`);
    }
    catch (error) {
        console.warn('[Gemini Cache] Failed to save to cache:', error);
    }
}
/**
 * Validate parsed Gemini response with Zod schema
 * Returns structured error with phase for diagnostic purposes
 */
export function validateWithSchema(parsed, schema, phase = 'validation') {
    const result = schema.safeParse(parsed);
    if (result.success) {
        return { success: true, data: result.data };
    }
    const error = {
        phase,
        message: `Validação falhou: ${result.error.message}`,
        timestamp: new Date()
    };
    console.error(`[Gemini ${phase}] Schema validation failed:`, result.error.format());
    return { success: false, error };
}
/**
 * Create extraction error with phase context
 */
export function createExtractionError(phase, message, retryCount) {
    return {
        phase,
        message,
        retryCount,
        timestamp: new Date()
    };
}
/**
 * Record metric for extraction operation
 */
export async function recordExtractionMetric(params) {
    try {
        await recordMetric({
            operation: params.operation,
            status: params.status,
            durationMs: params.durationMs,
            tokensUsed: params.tokensUsed || 0,
            modelUsed: params.modelUsed || DEFAULT_MODEL,
            errorMessage: params.errorMessage,
            cacheHit: params.status === 'cache_hit',
            // Custom metadata for SEI operations
            ...(params.processoSEI ? { processoSEI: params.processoSEI } : {}),
            ...(params.phase ? { phase: params.phase } : {})
        });
    }
    catch (error) {
        console.warn('[Gemini Metrics] Failed to record metric:', error);
    }
}
/**
 * Semaphore for rate limiting Gemini API calls
 */
export class Semaphore {
    permits;
    queue = [];
    constructor(permits) {
        this.permits = permits;
    }
    async acquire() {
        if (this.permits > 0) {
            this.permits--;
            return;
        }
        return new Promise(resolve => {
            this.queue.push(resolve);
        });
    }
    release() {
        this.permits++;
        const next = this.queue.shift();
        if (next) {
            this.permits--;
            next();
        }
    }
}
