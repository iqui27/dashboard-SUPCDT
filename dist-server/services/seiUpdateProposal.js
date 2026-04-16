/**
 * SEI Update Proposal Service
 *
 * When new documents arrive for a SEI process that is already linked to a
 * custom_project, we do NOT silently overwrite the project. Instead we:
 *   1. Compute a diff between the Gemini suggestion and the current project
 *   2. Save a SeiUpdateProposal (status: 'pending') in MongoDB
 *   3. Present the diff to the user in the Dashboard for field-by-field confirmation
 *   4. Apply only the confirmed fields to the project
 */
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/client.js';
import { parseDateValue, parseMonetaryValue } from './projectNormalization.js';
const PROPOSALS_COLLECTION = 'sei_update_proposals';
const PROJECTS_COLLECTION = 'custom_projects';
// Fields that Gemini can extract and that are safe to compare/update
const DIFFABLE_FIELDS = [
    'projeto',
    'numeroTermoFomento',
    'assinaturaPublicacao',
    'statusProjeto',
    'situacao',
    'etapaProjeto',
    'categoria',
    'tipoInstrumento',
    'tipoSituacaoPagamento',
    'valorTotal',
    'parlamentar',
    'emendasParlamentares',
    'osc',
    'cnpjOSC',
    'presidenteOSC',
    'coordenadorProjeto',
    'regiaoAdministrativa',
    'regioesAdministrativas',
    'tipoPublicoPrevisto',
    'responsavelParecer',
    'statusPlanilha',
    'statusDocumentacao',
    'statusEscopoParecer',
    'setor',
    'notasObs',
    'vigenciaInicio',
    'vigenciaEvento',
    'vigenciaFinal',
    'statusDesde',
    'dataPrestacaoContasOSC',
    'financeiroParcela1',
    'financeiroParcela2',
    'financeiroParcela3',
    'financeiroParcela4',
];
// Date fields (stored as Date in MongoDB, compared as ISO string from suggestion)
const DATE_FIELDS = new Set([
    'vigenciaInicio', 'vigenciaEvento', 'vigenciaFinal',
    'statusDesde', 'dataPrestacaoContasOSC',
]);
// Monetary fields
const MONETARY_FIELDS = new Set([
    'valorTotal', 'financeiroParcela1', 'financeiroParcela2',
    'financeiroParcela3', 'financeiroParcela4',
]);
function normalizeForComparison(field, value) {
    if (value === null || value === undefined || value === '')
        return null;
    if (DATE_FIELDS.has(field)) {
        const parsed = parseDateValue(value);
        return parsed instanceof Date ? parsed.toISOString().substring(0, 10) : null;
    }
    if (MONETARY_FIELDS.has(field)) {
        const num = parseMonetaryValue(value);
        return num === 0 ? null : num;
    }
    if (Array.isArray(value)) {
        return value.length === 0 ? null : JSON.stringify(value);
    }
    return typeof value === 'string' ? value.trim() || null : value;
}
/**
 * Compute diff between a Gemini suggestion and the current project.
 * Returns only fields where the suggestion differs from the current value
 * and the suggestion has an actual value (non-empty).
 */
export function computeDiff(currentProject, suggestion) {
    const diff = {};
    for (const field of DIFFABLE_FIELDS) {
        const suggested = suggestion[field];
        if (suggested === undefined || suggested === null || suggested === '')
            continue;
        if (Array.isArray(suggested) && suggested.length === 0)
            continue;
        const current = currentProject[field];
        const normalizedCurrent = normalizeForComparison(field, current);
        const normalizedSuggested = normalizeForComparison(field, suggested);
        if (normalizedSuggested === null)
            continue;
        if (normalizedCurrent === normalizedSuggested)
            continue;
        diff[field] = { from: current ?? null, to: suggested };
    }
    return diff;
}
/**
 * Create an update proposal for an existing linked project.
 * If there are no changes, returns success but with empty proposedChanges.
 */
export async function createUpdateProposal(processoSEI, linkedProjectId, suggestion, newDocLinks, options) {
    try {
        const db = await getDatabase();
        const proposalsCollection = db.collection(PROPOSALS_COLLECTION);
        const projectsCollection = db.collection(PROJECTS_COLLECTION);
        // Fetch current project
        let currentProject = null;
        if (ObjectId.isValid(linkedProjectId)) {
            currentProject = await projectsCollection.findOne({ _id: new ObjectId(linkedProjectId) });
        }
        if (!currentProject) {
            currentProject = await projectsCollection.findOne({
                $or: [{ id: linkedProjectId }, { processoSEI }]
            });
        }
        if (!currentProject) {
            return {
                success: false,
                hasChanges: false,
                error: `Projeto não encontrado: ${linkedProjectId}`
            };
        }
        const proposedChanges = computeDiff(currentProject, suggestion);
        const hasChanges = Object.keys(proposedChanges).length > 0;
        if (!hasChanges) {
            console.log(`[SEI Update Proposal] No changes detected for ${processoSEI}`);
            return { success: true, hasChanges: false };
        }
        const now = new Date();
        // Check for existing pending proposal for this process
        const existing = await proposalsCollection.findOne({
            processoSEI,
            linkedProjectId,
            status: 'pending'
        });
        if (existing) {
            // Merge new changes into existing pending proposal
            const mergedChanges = { ...existing.proposedChanges, ...proposedChanges };
            const mergedLinks = Array.from(new Set([...(existing.newDocLinks ?? []), ...newDocLinks]));
            await proposalsCollection.updateOne({ _id: existing._id }, {
                $set: {
                    proposedChanges: mergedChanges,
                    newDocLinks: mergedLinks,
                    updatedAt: now,
                    ...(options?.rawResponse ? { rawResponse: options.rawResponse } : {}),
                }
            });
            const updated = { ...existing, proposedChanges: mergedChanges, newDocLinks: mergedLinks, updatedAt: now };
            console.log(`[SEI Update Proposal] Merged into existing proposal for ${processoSEI} (${Object.keys(mergedChanges).length} changes)`);
            return {
                success: true,
                hasChanges: true,
                proposalId: existing._id?.toString(),
                proposal: updated
            };
        }
        // Create new proposal
        const proposal = {
            processoSEI,
            linkedProjectId,
            status: 'pending',
            proposedChanges,
            newDocLinks,
            rawResponse: options?.rawResponse,
            suggestionId: options?.suggestionId,
            createdAt: now,
            updatedAt: now,
        };
        const result = await proposalsCollection.insertOne(proposal);
        const proposalId = result.insertedId.toString();
        console.log(`[SEI Update Proposal] Created proposal ${proposalId} for ${processoSEI} (${Object.keys(proposedChanges).length} changes)`);
        return {
            success: true,
            hasChanges: true,
            proposalId,
            proposal: { ...proposal, _id: proposalId }
        };
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[SEI Update Proposal] Failed to create proposal for ${processoSEI}:`, msg);
        return { success: false, hasChanges: false, error: msg };
    }
}
/**
 * Confirm an update proposal — apply confirmed fields to the project.
 * If fieldsToConfirm is omitted, all proposed changes are applied.
 */
export async function confirmUpdateProposal(proposalId, options) {
    try {
        const db = await getDatabase();
        const proposalsCollection = db.collection(PROPOSALS_COLLECTION);
        const projectsCollection = db.collection(PROJECTS_COLLECTION);
        // Find proposal
        const proposal = await proposalsCollection.findOne(ObjectId.isValid(proposalId)
            ? { _id: new ObjectId(proposalId) }
            : { _id: proposalId });
        if (!proposal) {
            return { success: false, error: `Proposta não encontrada: ${proposalId}` };
        }
        if (proposal.status !== 'pending') {
            return { success: false, error: `Proposta já está com status "${proposal.status}"` };
        }
        // Determine which fields to apply
        const allFields = Object.keys(proposal.proposedChanges);
        const fieldsToApply = options?.fieldsToConfirm
            ? options.fieldsToConfirm.filter(f => allFields.includes(f))
            : allFields;
        if (fieldsToApply.length === 0) {
            return { success: false, error: 'Nenhum campo válido para aplicar' };
        }
        // Build update payload from confirmed fields
        const updatePayload = { updatedAt: new Date() };
        for (const field of fieldsToApply) {
            const change = proposal.proposedChanges[field];
            if (!change)
                continue;
            let value = change.to;
            // Re-parse dates and monetary values for proper MongoDB storage
            if (DATE_FIELDS.has(field) && typeof value === 'string') {
                value = parseDateValue(value) ?? value;
            }
            if (MONETARY_FIELDS.has(field)) {
                value = parseMonetaryValue(value);
            }
            updatePayload[field] = value;
        }
        // Apply to project
        const projectId = proposal.linkedProjectId;
        const filter = ObjectId.isValid(projectId)
            ? { _id: new ObjectId(projectId) }
            : { id: projectId };
        const updateResult = await projectsCollection.updateOne(filter, { $set: updatePayload });
        if (updateResult.matchedCount === 0) {
            return { success: false, error: `Projeto não encontrado: ${projectId}` };
        }
        // Mark proposal confirmed (or partially confirmed)
        const isPartial = fieldsToApply.length < allFields.length;
        const now = new Date();
        await proposalsCollection.updateOne({ _id: proposal._id }, {
            $set: {
                status: isPartial ? 'pending' : 'confirmed',
                confirmedAt: now,
                confirmedBy: options?.confirmedBy ?? 'system',
                confirmedFields: fieldsToApply,
                updatedAt: now,
                // Remove applied changes from proposedChanges when partial
                ...(isPartial ? {
                    proposedChanges: Object.fromEntries(Object.entries(proposal.proposedChanges).filter(([k]) => !fieldsToApply.includes(k)))
                } : {})
            }
        });
        console.log(`[SEI Update Proposal] Confirmed ${fieldsToApply.length}/${allFields.length} fields for project ${projectId}`);
        return {
            success: true,
            projectId,
            appliedFields: fieldsToApply
        };
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[SEI Update Proposal] Failed to confirm proposal ${proposalId}:`, msg);
        return { success: false, error: msg };
    }
}
/**
 * Reject an update proposal — no changes applied to the project.
 */
export async function rejectUpdateProposal(proposalId, rejectedBy) {
    try {
        const db = await getDatabase();
        const proposalsCollection = db.collection(PROPOSALS_COLLECTION);
        const proposal = await proposalsCollection.findOne(ObjectId.isValid(proposalId)
            ? { _id: new ObjectId(proposalId) }
            : { _id: proposalId });
        if (!proposal) {
            return { success: false, error: `Proposta não encontrada: ${proposalId}` };
        }
        if (proposal.status !== 'pending') {
            return { success: false, error: `Proposta já está com status "${proposal.status}"` };
        }
        const now = new Date();
        await proposalsCollection.updateOne({ _id: proposal._id }, { $set: { status: 'rejected', rejectedAt: now, rejectedBy: rejectedBy ?? 'system', updatedAt: now } });
        console.log(`[SEI Update Proposal] Rejected proposal ${proposalId} for ${proposal.processoSEI}`);
        return { success: true };
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { success: false, error: msg };
    }
}
/**
 * List update proposals with optional filtering.
 */
export async function listUpdateProposals(options) {
    try {
        const db = await getDatabase();
        const collection = db.collection(PROPOSALS_COLLECTION);
        const filter = {};
        if (options?.status)
            filter.status = options.status;
        if (options?.processoSEI)
            filter.processoSEI = options.processoSEI;
        if (options?.linkedProjectId)
            filter.linkedProjectId = options.linkedProjectId;
        const proposals = await collection
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(options?.skip ?? 0)
            .limit(options?.limit ?? 50)
            .toArray();
        const total = await collection.countDocuments(filter);
        return { proposals, total };
    }
    catch (error) {
        console.error('[SEI Update Proposal] Failed to list proposals:', error);
        return { proposals: [], total: 0 };
    }
}
/**
 * Get a single proposal by ID.
 */
export async function getUpdateProposal(proposalId) {
    try {
        const db = await getDatabase();
        const collection = db.collection(PROPOSALS_COLLECTION);
        return await collection.findOne(ObjectId.isValid(proposalId)
            ? { _id: new ObjectId(proposalId) }
            : { _id: proposalId });
    }
    catch {
        return null;
    }
}
