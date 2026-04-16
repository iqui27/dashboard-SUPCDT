import crypto from 'crypto';
import { Router } from 'express';
import { ZodError } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { SeiDocumentBatchSchema } from '../types/sei.js';
import { extractFromSeiDocuments } from '../services/seiExtractor.js';
import { getSeiProcess, processSeiExtraction, updateExtractedDocLinks } from '../services/seiPersistence.js';
import { extractSeiProjectSuggestion } from '../services/seiProjectExtractor.js';
import { persistSuggestion } from '../services/autoPopulate.js';
import { createUpdateProposal, confirmUpdateProposal, rejectUpdateProposal, listUpdateProposals, getUpdateProposal } from '../services/seiUpdateProposal.js';
export const seiRouter = Router();
// ---------------------------------------------------------------------------
// POST /api/sei/import
// ---------------------------------------------------------------------------
// Main ingestion endpoint called by the Chrome extension.
//
// Flow:
//   1. Validate payload (Zod)
//   2. Fetch existing process state to know which docs were already extracted
//   3. Extract per-document metadata via seiExtractor (Gemini)
//   4. Persist state + detect movements (seiPersistence)
//   5. Incremental project extraction:
//        - filter to only NEW docs (not in extractedDocLinks)
//        - call extractSeiProjectSuggestion with those docs
//        - if linkedProjectId → create update proposal (diff)
//        - else             → create new-project suggestion
//   6. Mark new doc links as extracted
// ---------------------------------------------------------------------------
seiRouter.post('/import', (req, res, next) => {
    if (process.env.NODE_ENV === 'production')
        return requireAuth(req, res, next);
    return next();
}, async (req, res) => {
    const correlationId = crypto.randomUUID();
    console.log(`[SEI Route] POST /api/sei/import (${correlationId})`);
    try {
        const validated = SeiDocumentBatchSchema.parse(req.body);
        const linkedProjectId = req.body.linkedProjectId || undefined;
        console.log(`[SEI Route] processoSEI=${validated.processoSEI} docs=${validated.documents.length} linkedProject=${linkedProjectId ?? 'none'}`);
        // ── Step 1: fetch existing state for incremental tracking ───────────────
        const existingProcess = await getSeiProcess(validated.processoSEI);
        const alreadyExtracted = new Set(existingProcess?.extractedDocLinks ?? []);
        const effectiveLinkedProjectId = linkedProjectId ?? existingProcess?.linkedProjectId;
        // ── Step 2: build full document list for metadata extraction ────────────
        const documentsWithProcesso = validated.documents.map(doc => ({
            tipo: doc.tipo,
            link: doc.link,
            nome: doc.nome,
            processoSEI: validated.processoSEI,
            dataInclusao: doc.dataInclusao,
            sequencial: doc.sequencial,
            content: doc.content,
            mimeType: doc.mimeType
        }));
        // ── Step 3: extract per-document metadata ───────────────────────────────
        const result = await extractFromSeiDocuments(validated.processoSEI, documentsWithProcesso);
        // ── Step 4: persist state + movement detection ──────────────────────────
        const persistenceResult = await processSeiExtraction(validated.processoSEI, result.documents, effectiveLinkedProjectId);
        if (!persistenceResult.persistenceSuccess) {
            console.warn(`[SEI Route] Persistence degraded for ${validated.processoSEI}: ${persistenceResult.persistenceError}`);
        }
        // ── Step 5: build response skeleton ─────────────────────────────────────
        const response = {
            ...result,
            movements: persistenceResult.movementResult.movements,
            movementDetection: {
                hasChanges: persistenceResult.movementResult.hasChanges,
                isFirstExtraction: persistenceResult.movementResult.isFirstExtraction,
                changesSummary: persistenceResult.movementResult.changesSummary
            },
            previousStateHash: persistenceResult.movementResult.previousStateHash
        };
        // ── Step 6: decide whether to run project extraction ────────────────────
        const hasRelevantMovements = persistenceResult.movementResult.isFirstExtraction ||
            persistenceResult.movementResult.movements.some(m => m.type === 'document_added' || m.type === 'document_modified');
        // Filter to documents not yet processed by project extractor
        const newDocsForExtraction = result.documents.filter(d => d.link && !alreadyExtracted.has(d.link));
        const shouldExtract = hasRelevantMovements && newDocsForExtraction.length > 0;
        if (shouldExtract) {
            console.log(`[SEI Route] Project extraction: ${newDocsForExtraction.length} new docs for ${validated.processoSEI}`);
            try {
                const extractionResult = await extractSeiProjectSuggestion(validated.processoSEI, newDocsForExtraction, { linkedProjectId: effectiveLinkedProjectId });
                if (extractionResult.success && extractionResult.suggestion) {
                    // Mark these doc links as extracted (incremental)
                    await updateExtractedDocLinks(validated.processoSEI, newDocsForExtraction.map(d => d.link).filter(Boolean));
                    if (effectiveLinkedProjectId) {
                        // ── Update flow: create a diff proposal ──────────────────────
                        const proposalResult = await createUpdateProposal(validated.processoSEI, effectiveLinkedProjectId, extractionResult.suggestion, newDocsForExtraction.map(d => d.link), {
                            rawResponse: extractionResult.rawResponse,
                            suggestionId: extractionResult.metadata.correlationId
                        });
                        response.updateProposal = proposalResult.hasChanges
                            ? {
                                status: proposalResult.success ? 'created' : 'failed',
                                proposalId: proposalResult.proposalId,
                                changedFields: Object.keys(proposalResult.proposal?.proposedChanges ?? {}),
                                error: proposalResult.error
                            }
                            : { status: 'no_changes' };
                    }
                    else {
                        // ── New project flow: persist suggestion for approval ─────────
                        const persistResult = await persistSuggestion(extractionResult, {
                            sourceStateHash: persistenceResult.movementResult.newStateHash
                        });
                        response.autoPopulate = {
                            status: persistResult.success ? 'triggered' : 'failed',
                            suggestionId: persistResult.suggestionId,
                            hasChanges: true,
                            error: persistResult.error
                        };
                    }
                }
                else {
                    // Extraction failed — persist as failed suggestion for retry visibility
                    const persistResult = await persistSuggestion(extractionResult, {
                        linkedProjectId: effectiveLinkedProjectId,
                        sourceStateHash: persistenceResult.movementResult.newStateHash
                    });
                    console.warn(`[SEI Route] Project extraction failed for ${validated.processoSEI}: ${extractionResult.error?.message}`);
                    response.autoPopulate = {
                        status: 'failed',
                        suggestionId: persistResult.suggestionId,
                        error: extractionResult.error?.message ?? 'Extração falhou'
                    };
                }
            }
            catch (autoPopulateError) {
                console.error(`[SEI Route] Auto-populate error for ${validated.processoSEI}:`, autoPopulateError);
                response.autoPopulate = {
                    status: 'failed',
                    error: autoPopulateError instanceof Error ? autoPopulateError.message : 'Erro interno'
                };
            }
        }
        else {
            const reason = !hasRelevantMovements ? 'sem movimentações relevantes' : 'nenhum doc novo';
            console.log(`[SEI Route] Skipping project extraction for ${validated.processoSEI}: ${reason}`);
            response.autoPopulate = { status: 'skipped', hasChanges: false };
        }
        res.json(response);
    }
    catch (error) {
        console.error(`[SEI Route] Error processing SEI import (${correlationId}):`, error);
        if (error instanceof ZodError) {
            const details = error.issues.map(e => ({ path: e.path.join('.'), message: e.message }));
            return res.status(400).json({ sucesso: false, error: 'Validação falhou', details, phase: 'validation', correlationId });
        }
        if (error instanceof Error) {
            const msg = error.message;
            if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) {
                return res.status(503).json({ sucesso: false, error: 'Limite de requisições excedido.', phase: 'gemini_api', correlationId });
            }
            if (msg.includes('API key') || msg.includes('unauthorized')) {
                return res.status(503).json({ sucesso: false, error: 'Serviço de IA temporariamente indisponível.', phase: 'gemini_api', correlationId });
            }
            return res.status(500).json({ sucesso: false, error: msg, phase: 'unknown', correlationId });
        }
        return res.status(500).json({ sucesso: false, error: 'Erro interno ao processar documentos SEI.', phase: 'unknown', correlationId });
    }
});
// ---------------------------------------------------------------------------
// GET /api/sei/processes/:numero
// ---------------------------------------------------------------------------
seiRouter.get('/processes/:numero', (req, res, next) => {
    if (process.env.NODE_ENV === 'production')
        return requireAuth(req, res, next);
    return next();
}, async (req, res) => {
    try {
        const numero = req.params.numero;
        if (!numero?.trim()) {
            return res.status(400).json({ error: 'Número do processo SEI é obrigatório' });
        }
        const process = await getSeiProcess(numero);
        if (!process) {
            return res.status(404).json({ error: 'Processo SEI não encontrado', processoSEI: numero });
        }
        res.json({
            processoSEI: process.processoSEI,
            documents: process.documents,
            stateHash: process.stateHash,
            linkedProjectId: process.linkedProjectId,
            extractedDocLinks: process.extractedDocLinks ?? [],
            firstExtractionAt: process.firstExtractionAt,
            lastExtractionAt: process.extractedAt,
            extractionCount: process.extractionCount,
            documentCount: process.documents.length
        });
    }
    catch (error) {
        console.error('[SEI Route] Error fetching SEI process:', error);
        res.status(500).json({ error: 'Erro ao buscar processo SEI' });
    }
});
// ---------------------------------------------------------------------------
// GET /api/sei/update-proposals
// ---------------------------------------------------------------------------
seiRouter.get('/update-proposals', (req, res, next) => {
    if (process.env.NODE_ENV === 'production')
        return requireAuth(req, res, next);
    return next();
}, async (req, res) => {
    try {
        const { status, processoSEI, linkedProjectId, limit, skip } = req.query;
        const result = await listUpdateProposals({
            status: status,
            processoSEI: processoSEI,
            linkedProjectId: linkedProjectId,
            limit: limit ? Number(limit) : undefined,
            skip: skip ? Number(skip) : undefined
        });
        res.json(result);
    }
    catch (error) {
        console.error('[SEI Route] Error listing update proposals:', error);
        res.status(500).json({ error: 'Erro ao listar propostas de atualização' });
    }
});
// ---------------------------------------------------------------------------
// GET /api/sei/update-proposals/:id
// ---------------------------------------------------------------------------
seiRouter.get('/update-proposals/:id', (req, res, next) => {
    if (process.env.NODE_ENV === 'production')
        return requireAuth(req, res, next);
    return next();
}, async (req, res) => {
    try {
        const proposal = await getUpdateProposal(req.params.id);
        if (!proposal) {
            return res.status(404).json({ error: 'Proposta não encontrada' });
        }
        res.json(proposal);
    }
    catch (error) {
        console.error('[SEI Route] Error fetching update proposal:', error);
        res.status(500).json({ error: 'Erro ao buscar proposta' });
    }
});
// ---------------------------------------------------------------------------
// POST /api/sei/update-proposals/:id/confirm
// Body (optional): { fieldsToConfirm: string[], confirmedBy: string }
// ---------------------------------------------------------------------------
seiRouter.post('/update-proposals/:id/confirm', (req, res, next) => {
    if (process.env.NODE_ENV === 'production')
        return requireAuth(req, res, next);
    return next();
}, async (req, res) => {
    try {
        const result = await confirmUpdateProposal(req.params.id, {
            fieldsToConfirm: req.body.fieldsToConfirm,
            confirmedBy: req.body.confirmedBy ?? req.user?.username
        });
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        res.json({
            success: true,
            projectId: result.projectId,
            appliedFields: result.appliedFields
        });
    }
    catch (error) {
        console.error('[SEI Route] Error confirming update proposal:', error);
        res.status(500).json({ error: 'Erro ao confirmar proposta' });
    }
});
// ---------------------------------------------------------------------------
// POST /api/sei/update-proposals/:id/reject
// Body (optional): { rejectedBy: string }
// ---------------------------------------------------------------------------
seiRouter.post('/update-proposals/:id/reject', (req, res, next) => {
    if (process.env.NODE_ENV === 'production')
        return requireAuth(req, res, next);
    return next();
}, async (req, res) => {
    try {
        const result = await rejectUpdateProposal(req.params.id, req.body.rejectedBy ?? req.user?.username);
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('[SEI Route] Error rejecting update proposal:', error);
        res.status(500).json({ error: 'Erro ao rejeitar proposta' });
    }
});
