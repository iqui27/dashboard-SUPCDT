import crypto from 'crypto';
import { getDatabase } from '../db/client.js';
import { generateStateHash } from '../types/sei.js';
const COLLECTION_NAME = 'sei_processes';
// Connection timeout for reads (movement check)
const READ_TIMEOUT_MS = 3000;
// Connection timeout for writes
const WRITE_TIMEOUT_MS = 5000;
/**
 * Generate a unique document ID from a SEI document
 */
function getDocumentId(doc) {
    // Use link as primary ID, fallback to tipo+nome
    return doc.link || `${doc.tipo}-${doc.nome || 'unnamed'}-${doc.numeroDocumento || ''}`;
}
/**
 * Check if two documents are functionally equal (ignoring metadata timestamps)
 */
function areDocumentsEqual(doc1, doc2) {
    // Compare core fields that matter for change detection
    return (doc1.link === doc2.link &&
        doc1.tipo === doc2.tipo &&
        doc1.nome === doc2.nome &&
        doc1.numeroDocumento === doc2.numeroDocumento &&
        doc1.dataDocumento === doc2.dataDocumento &&
        doc1.descricao === doc2.descricao);
}
/**
 * Get existing SEI process state from MongoDB
 * Implements graceful degradation per failure modes spec
 */
export async function getSeiProcess(numero) {
    try {
        const db = await getDatabase();
        const collection = db.collection(COLLECTION_NAME);
        // Add timeout protection
        const process = await Promise.race([
            collection.findOne({ processoSEI: numero }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('MongoDB read timeout')), READ_TIMEOUT_MS))
        ]);
        if (!process) {
            return null;
        }
        console.log(`[SEI Persistence] Retrieved state for ${numero}, hash: ${process.stateHash}`);
        return process;
    }
    catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (err.message.includes('timeout')) {
            console.warn(`[SEI Persistence] Read timeout for ${numero}, skipping movement detection`);
        }
        else {
            console.error(`[SEI Persistence] Failed to get process ${numero}:`, err.message);
        }
        // Per failure modes: return null on error (skip movement detection)
        return null;
    }
}
/**
 * Save SEI process state to MongoDB with upsert
 * Implements retry-once and graceful degradation per failure modes spec
 */
export async function saveSeiProcess(state, metadata) {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 2;
    while (attempts < maxAttempts) {
        attempts++;
        try {
            const db = await getDatabase();
            const collection = db.collection(COLLECTION_NAME);
            const now = new Date();
            const extractionCount = (existingDoc) => (existingDoc?.extractionCount || 0) + 1;
            // Use timeout-protected write - split into two operations for reliability
            const existingDoc = await collection.findOne({ processoSEI: state.processoSEI });
            if (existingDoc) {
                // Update existing document (preserve extractedDocLinks — updated separately)
                const updatedDoc = {
                    processoSEI: state.processoSEI,
                    documents: state.documents,
                    extractedAt: state.extractedAt,
                    stateHash: state.stateHash,
                    linkedProjectId: state.linkedProjectId,
                    updatedAt: now,
                    extractionCount: extractionCount(existingDoc),
                    lastMetadata: metadata ? {
                        durationMs: 0,
                        documentsProcessed: metadata.length,
                        documentsSucceeded: metadata.filter(d => !d.erro).length,
                        documentsFailed: metadata.filter(d => d.erro).length,
                        retryCount: 0,
                        cacheHit: false,
                        correlationId: crypto.randomUUID()
                    } : undefined
                };
                await collection.updateOne({ processoSEI: state.processoSEI }, { $set: updatedDoc });
            }
            else {
                // Insert new document
                const newDoc = {
                    processoSEI: state.processoSEI,
                    documents: state.documents,
                    extractedAt: state.extractedAt,
                    stateHash: state.stateHash,
                    linkedProjectId: state.linkedProjectId,
                    extractedDocLinks: state.extractedDocLinks ?? [],
                    updatedAt: now,
                    extractionCount: 1,
                    createdAt: now,
                    firstExtractionAt: state.extractedAt,
                    lastMetadata: metadata ? {
                        durationMs: 0,
                        documentsProcessed: metadata.length,
                        documentsSucceeded: metadata.filter(d => !d.erro).length,
                        documentsFailed: metadata.filter(d => d.erro).length,
                        retryCount: 0,
                        cacheHit: false,
                        correlationId: crypto.randomUUID()
                    } : undefined
                };
                await collection.insertOne(newDoc);
            }
            const durationMs = Date.now() - startTime;
            console.log(`[SEI Persistence] Saved state for ${state.processoSEI}, hash: ${state.stateHash} (${durationMs}ms)`);
            return { success: true };
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.warn(`[SEI Persistence] Save attempt ${attempts}/${maxAttempts} failed for ${state.processoSEI}:`, err.message);
            if (attempts < maxAttempts && err.message.includes('timeout')) {
                // Brief delay before retry
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
            // Log final error but don't throw - graceful degradation
            console.error(`[SEI Persistence] Save failed for ${state.processoSEI} after ${attempts} attempts:`, err.message);
            return {
                success: false,
                error: err.message.includes('timeout')
                    ? 'Database timeout - extraction completed without persistence'
                    : err.message
            };
        }
    }
    return { success: false, error: 'Max retries exceeded' };
}
/**
 * Detect movements between two SEI process states
 */
export function detectMovements(oldState, newDocuments) {
    const newStateHash = generateStateHash(newDocuments);
    // No previous state = first extraction
    if (!oldState) {
        console.log(`[SEI Persistence] First extraction for ${newDocuments[0]?.processoSEI || 'unknown'}`);
        return {
            hasChanges: true,
            isFirstExtraction: true,
            movements: [],
            newStateHash,
            changesSummary: {
                added: newDocuments.length,
                removed: 0,
                modified: 0
            }
        };
    }
    // Quick hash comparison for no-change detection
    if (oldState.stateHash === newStateHash) {
        console.log(`[SEI Persistence] No changes detected for ${oldState.processoSEI} (hash match)`);
        return {
            hasChanges: false,
            isFirstExtraction: false,
            movements: [],
            previousStateHash: oldState.stateHash,
            newStateHash,
            changesSummary: {
                added: 0,
                removed: 0,
                modified: 0
            }
        };
    }
    // Build maps for efficient comparison
    const oldDocMap = new Map();
    for (const doc of oldState.documents) {
        oldDocMap.set(getDocumentId(doc), doc);
    }
    const newDocMap = new Map();
    for (const doc of newDocuments) {
        newDocMap.set(getDocumentId(doc), doc);
    }
    const movements = [];
    const detectedAt = new Date().toISOString();
    // Detect additions and modifications
    for (const [docId, newDoc] of newDocMap) {
        const oldDoc = oldDocMap.get(docId);
        if (!oldDoc) {
            // New document added
            movements.push({
                type: 'document_added',
                documentId: docId,
                document: newDoc,
                detectedAt
            });
        }
        else if (!areDocumentsEqual(oldDoc, newDoc)) {
            // Document modified (metadata changed)
            movements.push({
                type: 'document_modified',
                documentId: docId,
                document: newDoc,
                previousDocument: oldDoc,
                detectedAt
            });
        }
    }
    // Detect removals
    for (const [docId, oldDoc] of oldDocMap) {
        if (!newDocMap.has(docId)) {
            movements.push({
                type: 'document_removed',
                documentId: docId,
                document: oldDoc,
                detectedAt
            });
        }
    }
    const summary = {
        added: movements.filter(m => m.type === 'document_added').length,
        removed: movements.filter(m => m.type === 'document_removed').length,
        modified: movements.filter(m => m.type === 'document_modified').length
    };
    console.log(`[SEI Persistence] Movement detection for ${oldState.processoSEI}: +${summary.added} -${summary.removed} ~${summary.modified}`);
    return {
        hasChanges: movements.length > 0,
        isFirstExtraction: false,
        movements,
        previousStateHash: oldState.stateHash,
        newStateHash,
        changesSummary: summary
    };
}
/**
 * Process full extraction workflow: check state, extract, detect movements, persist
 */
export async function processSeiExtraction(processoSEI, documents, linkedProjectId) {
    // Step 1: Get existing state (if any)
    const existingState = await getSeiProcess(processoSEI);
    // Step 2: Detect movements between old and new state
    const movementResult = detectMovements(existingState, documents);
    // Step 3: Build new state — strip content field before persisting.
    // Document content (plain text or base64 PDF) can be many MB and must not
    // be stored in MongoDB (16 MB document limit). It is only needed transiently
    // during the Gemini extraction step.
    const documentsForStorage = documents.map(doc => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { content: _content, mimeType: _mimeType, ...rest } = doc;
        return rest;
    });
    const newState = {
        processoSEI,
        documents: documentsForStorage,
        extractedAt: new Date(),
        stateHash: movementResult.newStateHash,
        linkedProjectId
    };
    // Step 4: Persist new state
    const saveResult = await saveSeiProcess(newState, documentsForStorage);
    return {
        persistenceSuccess: saveResult.success,
        persistenceError: saveResult.error,
        movementResult
    };
}
/**
 * Link a SEI process to a Fomento project
 */
export async function linkToProject(processoSEI, projectId) {
    try {
        const db = await getDatabase();
        const collection = db.collection(COLLECTION_NAME);
        await Promise.race([
            collection.updateOne({ processoSEI }, { $set: { linkedProjectId: projectId, updatedAt: new Date() } }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('MongoDB write timeout')), WRITE_TIMEOUT_MS))
        ]);
        console.log(`[SEI Persistence] Linked ${processoSEI} to project ${projectId}`);
        return { success: true };
    }
    catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`[SEI Persistence] Failed to link ${processoSEI} to project ${projectId}:`, err.message);
        return { success: false, error: err.message };
    }
}
/**
 * Append document links to the extractedDocLinks set for a process.
 * Used after successful incremental project extraction to mark docs as processed.
 */
export async function updateExtractedDocLinks(processoSEI, newLinks) {
    if (newLinks.length === 0)
        return { success: true };
    try {
        const db = await getDatabase();
        const collection = db.collection(COLLECTION_NAME);
        await Promise.race([
            collection.updateOne({ processoSEI }, {
                $addToSet: { extractedDocLinks: { $each: newLinks } },
                $set: { updatedAt: new Date() }
            }, { upsert: false }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('MongoDB write timeout')), WRITE_TIMEOUT_MS))
        ]);
        console.log(`[SEI Persistence] Updated extractedDocLinks for ${processoSEI}: +${newLinks.length} links`);
        return { success: true };
    }
    catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`[SEI Persistence] Failed to update extractedDocLinks for ${processoSEI}:`, err.message);
        return { success: false, error: err.message };
    }
}
/**
 * Get movement history for a SEI process
 */
export async function getMovementHistory(processoSEI, _limit = 10) {
    // This would require a separate collection for movement history
    // For now, we can only return movements from the last comparison
    // A future enhancement would store movements in a dedicated collection
    const state = await getSeiProcess(processoSEI);
    if (!state) {
        return [];
    }
    // Return empty - movements are not persisted currently
    // Future: track movements in a sei_movements collection
    console.log(`[SEI Persistence] Movement history requested for ${processoSEI} (not yet implemented)`);
    return [];
}
