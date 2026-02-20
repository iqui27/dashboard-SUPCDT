import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import crypto from 'crypto';
import { z } from 'zod';
import { getDatabase } from '../db/client.js';
import { recordMetric } from './geminiMetrics.js';
const ParlamentarInfoSchema = z.object({
    nome: z.string(),
    valor: z.number().optional()
});
const GeminiProjectSchema = z.object({
    projeto: z.string().optional(),
    numeroTermoFomento: z.string().optional(),
    processoSEI: z.string().optional(),
    assinaturaPublicacao: z.string().optional(),
    statusProjeto: z.enum(['Assinado', 'Não assinado', 'Reprovado']).or(z.string()).optional(),
    situacao: z.string().optional(),
    etapaProjeto: z.string().optional(),
    categoria: z.enum(['Emenda', 'INEX', 'Convênio', 'Outro']).or(z.string()).optional(),
    tipoSituacaoPagamento: z.string().optional(),
    valorTotal: z.number().optional(),
    parlamentar: z.string().optional(),
    parlamentares: z.array(ParlamentarInfoSchema).optional(),
    osc: z.string().optional(),
    presidenteOSC: z.string().optional(),
    coordenadorProjeto: z.string().optional(),
    regiaoAdministrativa: z.string().optional(),
    regioesAdministrativas: z.array(z.string()).optional(),
    responsavelParecer: z.string().optional(),
    responsavelPlanilha: z.string().optional(),
    statusPlanilha: z.string().optional(),
    statusDocumentacao: z.string().optional(),
    statusEscopoParecer: z.string().optional(),
    tipoPublicoPrevisto: z.string().optional(),
    contrapartidasComissao: z.string().optional(),
    relatorioMonitoramentoAvaliacaoComissao: z.string().optional(),
    notasObs: z.string().optional(),
    vigenciaInicio: z.string().optional(),
    vigenciaEvento: z.string().optional(),
    vigenciaFinal: z.string().optional(),
    statusDesde: z.string().optional(),
    financeiroParcela1: z.union([z.string(), z.number()]).optional(),
    financeiroParcela2: z.union([z.string(), z.number()]).optional(),
    financeiroParcela3: z.union([z.string(), z.number()]).optional(),
    financeiroParcela4: z.union([z.string(), z.number()]).optional(),
    dataPrestacaoContasOSC: z.string().optional(),
    prorrogacaoPrestacaoContasMais30: z.string().optional(),
    diasParado: z.number().optional(),
    diasLimite: z.number().optional()
});
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    ?? process.env.GOOGLE_GEMINI_API_KEY
    ?? process.env.GOOGLE_API_KEY
    ?? '';
const RAW_MODEL = process.env.GEMINI_MODEL?.trim();
const MODEL_CANDIDATES = Array.from(new Set([
    RAW_MODEL,
    'gemini-2.5-flash',
    'models/gemini-2.5-flash',
    'gemini-2.5-pro',
    'models/gemini-2.5-pro',
    'gemini-1.5-flash',
    'models/gemini-1.5-flash',
    'gemini-1.5-pro',
    'models/gemini-1.5-pro'
].filter((value) => Boolean(value && value.length > 0))));
const DEFAULT_MODEL = MODEL_CANDIDATES[0] ?? 'gemini-2.5-flash';
const MAX_RETRIES = Number(process.env.GEMINI_MAX_RETRIES) || 3;
const RETRY_DELAY_MS = Number(process.env.GEMINI_RETRY_DELAY_MS) || 1000;
const CACHE_ENABLED = process.env.GEMINI_CACHE_ENABLED !== 'false';
const CACHE_TTL_DAYS = Number(process.env.GEMINI_CACHE_TTL_DAYS) || 7;
const CACHE_COLLECTION = 'gemini_pdf_cache';
function ensureApiKey() {
    const key = GEMINI_API_KEY;
    if (!key) {
        console.error('[Gemini Debug] No API key found in environment variables (GEMINI_API_KEY, GOOGLE_GEMINI_API_KEY, GOOGLE_API_KEY)');
        throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY in the environment.');
    }
    // Log which key variable is being used (without revealing the full key)
    const source = process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' :
        process.env.GOOGLE_GEMINI_API_KEY ? 'GOOGLE_GEMINI_API_KEY' :
            process.env.GOOGLE_API_KEY ? 'GOOGLE_API_KEY' : 'Unknown';
    console.log(`[Gemini Debug] Using API key from: ${source} (Length: ${key.length})`);
    return key;
}
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function retryWithBackoff(fn, maxRetries = MAX_RETRIES, baseDelay = RETRY_DELAY_MS, onRetry) {
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
function calculatePdfHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}
async function getCachedResult(hash) {
    if (!CACHE_ENABLED)
        return null;
    try {
        const db = await getDatabase();
        const collection = db.collection(CACHE_COLLECTION);
        const cached = await collection.findOne({
            hash,
            expiresAt: { $gt: new Date() }
        });
        if (cached) {
            console.log(`Cache hit for PDF hash: ${hash}`);
            return {
                suggestion: cached.suggestion,
                usageMetadata: cached.usageMetadata
            };
        }
        return null;
    }
    catch (error) {
        console.warn('Failed to read from cache:', error);
        return null;
    }
}
async function saveCachedResult(hash, fileName, result) {
    if (!CACHE_ENABLED)
        return;
    try {
        const db = await getDatabase();
        const collection = db.collection(CACHE_COLLECTION);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
        await collection.updateOne({ hash }, {
            $set: {
                hash,
                fileName,
                suggestion: result.suggestion,
                usageMetadata: result.usageMetadata,
                createdAt: now,
                expiresAt
            }
        }, { upsert: true });
        console.log(`Cached result for PDF hash: ${hash} (expires: ${expiresAt.toISOString()})`);
    }
    catch (error) {
        console.warn('Failed to save to cache:', error);
    }
}
function extractJsonObject(text) {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('A resposta do Gemini não contém um objeto JSON válido.');
    }
    const jsonText = jsonMatch[1] ?? jsonMatch[0];
    try {
        return JSON.parse(jsonText);
    }
    catch (error) {
        throw new Error('Falha ao interpretar a resposta do Gemini: JSON inválido.');
    }
}
function sanitizeSuggestion(raw) {
    const suggestion = {};
    const assignString = (key) => {
        const value = raw[key];
        if (typeof value === 'string') {
            suggestion[key] = value.trim();
        }
    };
    const assignNumber = (key) => {
        const value = raw[key];
        if (typeof value === 'number') {
            suggestion[key] = value;
        }
        else if (typeof value === 'string') {
            const numeric = Number(value.replace(/[^0-9,-]/g, '').replace(',', '.'));
            if (!Number.isNaN(numeric)) {
                suggestion[key] = numeric;
            }
        }
    };
    assignString('projeto');
    assignString('numeroTermoFomento');
    assignString('processoSEI');
    assignString('assinaturaPublicacao');
    assignString('statusProjeto');
    assignString('situacao');
    assignString('etapaProjeto');
    assignString('categoria');
    assignString('tipoSituacaoPagamento');
    assignString('parlamentar');
    assignString('osc');
    assignString('presidenteOSC');
    assignString('coordenadorProjeto');
    assignString('regiaoAdministrativa');
    assignString('responsavelParecer');
    assignString('responsavelPlanilha');
    assignString('statusPlanilha');
    assignString('statusDocumentacao');
    assignString('statusEscopoParecer');
    assignString('tipoPublicoPrevisto');
    assignString('contrapartidasComissao');
    assignString('relatorioMonitoramentoAvaliacaoComissao');
    assignString('notasObs');
    assignString('vigenciaInicio');
    assignString('vigenciaEvento');
    assignString('vigenciaFinal');
    assignString('statusDesde');
    assignString('dataPrestacaoContasOSC');
    assignString('prorrogacaoPrestacaoContasMais30');
    assignNumber('valorTotal');
    assignNumber('diasParado');
    assignNumber('diasLimite');
    assignNumber('financeiroParcela1');
    assignNumber('financeiroParcela2');
    assignNumber('financeiroParcela3');
    assignNumber('financeiroParcela4');
    const parlamentaresRaw = raw.parlamentares;
    if (Array.isArray(parlamentaresRaw)) {
        suggestion.parlamentares = parlamentaresRaw
            .map(item => {
            if (!item || typeof item !== 'object')
                return null;
            const nome = typeof item.nome === 'string'
                ? item.nome.trim()
                : undefined;
            const valorRaw = item.valor;
            if (!nome)
                return null;
            let valor;
            if (typeof valorRaw === 'number') {
                valor = valorRaw;
            }
            else if (typeof valorRaw === 'string') {
                const parsed = Number(valorRaw.replace(/[^0-9,-]/g, '').replace(',', '.'));
                if (!Number.isNaN(parsed)) {
                    valor = parsed;
                }
            }
            return { nome, ...(valor !== undefined ? { valor } : {}) };
        })
            .filter((item) => Boolean(item));
    }
    const regioesRaw = raw.regioesAdministrativas ?? raw.regioes ?? raw.localizacoes;
    if (Array.isArray(regioesRaw)) {
        suggestion.regioesAdministrativas = regioesRaw
            .map(value => typeof value === 'string' ? value.trim() : '')
            .filter(value => value.length > 0);
    }
    return suggestion;
}
export async function extractProjectFromPdf(buffer, fileName) {
    const startTime = Date.now();
    const pdfHash = calculatePdfHash(buffer);
    const fileSize = buffer.length;
    let retryCount = 0;
    let modelUsed = DEFAULT_MODEL;
    const cached = await getCachedResult(pdfHash);
    if (cached) {
        const durationMs = Date.now() - startTime;
        await recordMetric({
            operation: 'pdf_import',
            status: 'cache_hit',
            durationMs,
            fileSize,
            fileName,
            cacheHit: true,
            modelUsed: DEFAULT_MODEL
        });
        return cached;
    }
    const apiKey = ensureApiKey();
    const fileManager = new GoogleAIFileManager(apiKey);
    const generativeAI = new GoogleGenerativeAI(apiKey);
    const uploadResponse = await fileManager.uploadFile(buffer, {
        mimeType: 'application/pdf',
        displayName: fileName
    });
    try {
        const prompt = `Extraia dados do termo de fomento em JSON. Campos opcionais podem ser omitidos.

Schema:
{
  "projeto": "string",
  "numeroTermoFomento": "string",
  "processoSEI": "string",
  "assinaturaPublicacao": "string",
  "statusProjeto": "Assinado|Não assinado|Reprovado",
  "situacao": "string",
  "etapaProjeto": "string",
  "categoria": "Emenda|INEX|Convênio|Outro",
  "tipoInstrumento": "Termo de Fomento|Termo de Colaboração",
  "tipoSituacaoPagamento": "string",
  "valorTotal": number,
  "parlamentar": "string",
  "parlamentares": [{"nome": "string", "valor": number}],
  "osc": "string",
  "presidenteOSC": "string",
  "coordenadorProjeto": "string",
  "regiaoAdministrativa": "string",
  "regioesAdministrativas": ["string"],
  "responsavelParecer": "string",
  "responsavelPlanilha": "string",
  "statusPlanilha": "string",
  "statusDocumentacao": "string",
  "statusEscopoParecer": "string",
  "setor": "string",
  "tipoPublicoPrevisto": "string",
  "contrapartidasComissao": "string",
  "relatorioMonitoramentoAvaliacaoComissao": "string",
  "notasObs": "string",
  "vigenciaInicio": "AAAA-MM-DD",
  "vigenciaEvento": "AAAA-MM-DD",
  "vigenciaFinal": "AAAA-MM-DD",
  "statusDesde": "AAAA-MM-DD",
  "financeiroParcela1": "string|number",
  "financeiroParcela2": "string|number",
  "financeiroParcela3": "string|number",
  "financeiroParcela4": "string|number",
  "dataPrestacaoContasOSC": "AAAA-MM-DD",
  "prorrogacaoPrestacaoContasMais30": "Sim|Não|AAAA-MM-DD",
  "diasParado": number,
  "diasLimite": number,
  "aditivosVigencia": [{"dataInicio": "AAAA-MM-DD", "dataFim": "AAAA-MM-DD", "motivo": "string"}],
  "aditivosValor": [{"valorAdicional": number, "valorTotal": number, "motivo": "string"}],
  "prazosRma": "AAAA-MM-DD",
  "prazosDespachoHomologacao": "AAAA-MM-DD",
  "prazosRelatorioExecucaoObjeto": "AAAA-MM-DD",
  "prazosParecerTecnicoRelatorio": "AAAA-MM-DD",
  "prazosDecisaoFinal": "AAAA-MM-DD"
}

Retorne apenas JSON válido.`;
        const modelSequence = MODEL_CANDIDATES.length > 0 ? MODEL_CANDIDATES : [DEFAULT_MODEL];
        let generationResponse;
        let lastError;
        for (const candidate of modelSequence) {
            try {
                const model = generativeAI.getGenerativeModel({ model: candidate });
                const { result, retries: actualRetries } = await retryWithBackoff(async () => {
                    return await model.generateContent({
                        contents: [{
                                role: 'user',
                                parts: [
                                    { text: prompt },
                                    {
                                        fileData: {
                                            fileUri: uploadResponse.file.uri,
                                            mimeType: uploadResponse.file.mimeType ?? 'application/pdf'
                                        }
                                    }
                                ]
                            }]
                    });
                }, MAX_RETRIES, RETRY_DELAY_MS, (attempt) => {
                    retryCount = attempt;
                });
                generationResponse = result;
                retryCount = actualRetries;
                modelUsed = candidate;
                break;
            }
            catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                lastError = err;
                const status = err.status;
                if (status === 404 || /404/.test(err.message)) {
                    console.warn(`Gemini model "${candidate}" unavailable (404). Trying fallback...`);
                    continue;
                }
                throw err;
            }
        }
        if (!generationResponse) {
            throw lastError ?? new Error('Failed to generate content using available Gemini models.');
        }
        const textResponse = generationResponse.response?.text();
        if (!textResponse) {
            throw new Error('Resposta vazia do Gemini ao processar o PDF.');
        }
        const parsed = extractJsonObject(textResponse);
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('O Gemini não retornou um objeto JSON válido.');
        }
        const validationResult = GeminiProjectSchema.safeParse(parsed);
        if (!validationResult.success) {
            console.error('Gemini response validation failed:', validationResult.error.format());
            throw new Error(`Resposta do Gemini não está no formato esperado: ${validationResult.error.message}`);
        }
        const suggestion = sanitizeSuggestion(parsed);
        const usageMetadata = generationResponse.response?.usageMetadata
            ? { ...generationResponse.response.usageMetadata }
            : undefined;
        const importResult = {
            suggestion,
            usageMetadata
        };
        await saveCachedResult(pdfHash, fileName, importResult);
        const durationMs = Date.now() - startTime;
        const tokensUsed = usageMetadata?.totalTokenCount
            || usageMetadata?.promptTokenCount || 0;
        await recordMetric({
            operation: 'pdf_import',
            status: 'success',
            durationMs,
            fileSize,
            fileName,
            cacheHit: false,
            retries: retryCount,
            tokensUsed,
            modelUsed
        });
        return importResult;
    }
    catch (error) {
        const durationMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        await recordMetric({
            operation: 'pdf_import',
            status: 'error',
            durationMs,
            fileSize,
            fileName,
            cacheHit: false,
            retries: retryCount,
            errorMessage,
            modelUsed
        });
        throw error;
    }
    finally {
        try {
            await fileManager.deleteFile(uploadResponse.file.name);
        }
        catch (cleanupError) {
            console.warn('Falha ao remover arquivo temporário do Gemini:', cleanupError);
        }
    }
}
