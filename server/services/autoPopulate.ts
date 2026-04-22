/**
 * Auto Populate Service
 * Persists AI-extracted suggestions and maps approval to Fomento projects
 * 
 * Implements:
 * - Idempotent suggestion persistence by processoSEI
 * - Approval/rejection workflow
 * - Deduplication logic (no duplicate projects for same SEI process)
 * - Reuse of normalization utilities from projectNormalization.ts
 */

import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/client.js';
import {
  normalizeProjectPayload,
  serializeProjectDoc,
  parseDateValue,
  parseMonetaryValue,
  normalizeStatusProjeto,
  normalizeCategoria,
  parseStringArray
} from './projectNormalization.js';
import {
  SeiProjectSuggestion,
  SeiProjectExtractionResult
} from './seiProjectExtractor.js';

// Collection names
const SUGGESTIONS_COLLECTION = 'sei_project_suggestions';
const PROJECTS_COLLECTION = 'custom_projects';
const OSCS_COLLECTION = 'oscs';

/**
 * Text fields that should be stored in UPPERCASE
 * Only short fields like names, titles, and dropdowns
 * Long text fields (notasObs, situacao, tipoPublicoPrevisto) stay normal
 */
const TEXT_FIELDS_TO_UPPERCASE = [
  'projeto',
  'osc',
  'parlamentar',
  'presidenteOSC',
  'coordenadorProjeto',
  'regiaoAdministrativa',
  'setor',
  'responsavelParecer',
  'responsavelAlteracao',
  'responsavelPlanilha',
  'numeroTermoFomento',
  'cnpjOSC'
];

/**
 * Normalize text fields to UPPERCASE for consistency
 */
function normalizeTextFieldsToUpper(suggestion: SeiProjectSuggestion): SeiProjectSuggestion {
  const normalized: SeiProjectSuggestion = { ...suggestion };
  const normalizedAsRecord: Record<string, unknown> = normalized;
  
  for (const field of TEXT_FIELDS_TO_UPPERCASE) {
    if (normalizedAsRecord[field] && typeof normalizedAsRecord[field] === 'string') {
      normalizedAsRecord[field] = (normalizedAsRecord[field] as string).toUpperCase();
    }
  }
  
  // Also uppercase regioesAdministrativas array
  if (normalized.regioesAdministrativas && Array.isArray(normalized.regioesAdministrativas)) {
    normalized.regioesAdministrativas = normalized.regioesAdministrativas.map(r => 
      typeof r === 'string' ? r.toUpperCase() : r
    );
  }
  
  // Also uppercase emendasParlamentares[].nome
  if (normalized.emendasParlamentares && Array.isArray(normalized.emendasParlamentares)) {
    normalized.emendasParlamentares = normalized.emendasParlamentares.map(emenda => ({
      ...emenda,
      nome: emenda.nome?.toUpperCase() || emenda.nome
    }));
  }
  
  return normalized;
}

/**
 * Suggestion status lifecycle
 */
export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'failed';

/**
 * Persisted suggestion record in MongoDB
 */
export interface SeiProjectSuggestionRecord {
  _id?: ObjectId | string;
  id?: string;
  processoSEI: string;
  suggestionId: string; // Correlation ID from extraction
  correlationId?: string; // Gemini correlation ID
  sourceDocuments?: string[]; // Links to source documents
  suggestion: SeiProjectSuggestion;
  rawResponse?: string; // Raw Gemini response for quality audit
  status: SuggestionStatus;
  sourceStateHash?: string; // Hash of SEI process state at extraction time
  linkedProjectId?: string; // ID of existing project (for updates)
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  lastError?: string;
  lastAttemptAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    durationMs?: number;
    cacheHit?: boolean;
    retries?: number;
    documentsConsidered?: number;
    documentsUsed?: number;
    modelUsed?: string;
    tokensUsed?: number;
  };
}

/**
 * Result of persisting a suggestion
 */
export interface PersistSuggestionResult {
  success: boolean;
  suggestionId?: string;
  suggestion?: SeiProjectSuggestionRecord;
  error?: string;
  isDuplicate?: boolean; // True if suggestion already exists for this process
}

/**
 * Result of approving a suggestion
 */
export interface ApproveSuggestionResult {
  success: boolean;
  projectId?: string;
  isNewProject?: boolean;
  project?: Record<string, unknown>;
  suggestion?: SeiProjectSuggestionRecord;
  error?: string;
}

/**
 * Result of rejecting a suggestion
 */
export interface RejectSuggestionResult {
  success: boolean;
  suggestion?: SeiProjectSuggestionRecord;
  error?: string;
}

/**
 * Generate a unique suggestion ID
 */
function generateSuggestionId(): string {
  return `sug-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Persist an AI-extracted suggestion
 * Idempotent by processoSEI - returns existing suggestion if already stored
 */
export async function persistSuggestion(
  extractionResult: SeiProjectExtractionResult,
  options?: {
    linkedProjectId?: string;
    sourceStateHash?: string;
    forceUpdate?: boolean; // Override existing suggestion even if status is not pending
  }
): Promise<PersistSuggestionResult> {
  const startTime = Date.now();
  const suggestionId = generateSuggestionId();

  try {
    const db = await getDatabase();
    const collection = db.collection<SeiProjectSuggestionRecord>(SUGGESTIONS_COLLECTION);
    const now = new Date();

    // Check for existing suggestion for this process
    const existing = await collection.findOne({ 
      processoSEI: extractionResult.processoSEI 
    });

    if (existing && !options?.forceUpdate) {
      // Idempotent behavior depends on status:
      // - approved/rejected: return duplicate (can't update without force)
      // - pending: return duplicate (already pending approval)
      // - failed: update with new successful extraction (allows retry)
      if (existing.status === 'approved' || existing.status === 'rejected') {
        console.log(`[Auto Populate] Suggestion already exists for ${extractionResult.processoSEI} with status ${existing.status}`);
        return {
          success: true,
          suggestionId: existing.suggestionId,
          suggestion: existing,
          isDuplicate: true
        };
      }
      
      if (existing.status === 'pending') {
        // Already pending - return duplicate
        console.log(`[Auto Populate] Suggestion already pending for ${extractionResult.processoSEI}`);
        return {
          success: true,
          suggestionId: existing.suggestionId,
          suggestion: existing,
          isDuplicate: true
        };
      }
      
      // existing.status === 'failed' -> continue to update with new data
    }

    // Build suggestion record
    const normalizedSuggestion = normalizeTextFieldsToUpper(extractionResult.suggestion || {});
    
    const record: SeiProjectSuggestionRecord = {
      id: suggestionId,
      suggestionId,
      processoSEI: extractionResult.processoSEI,
      correlationId: extractionResult.metadata.correlationId,
      sourceDocuments: extractionResult.sourceDocuments,
      suggestion: normalizedSuggestion,
      rawResponse: extractionResult.rawResponse,
      status: extractionResult.success ? 'pending' : 'failed',
      sourceStateHash: options?.sourceStateHash,
      linkedProjectId: options?.linkedProjectId,
      lastError: extractionResult.error?.message,
      lastAttemptAt: now,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      metadata: {
        durationMs: extractionResult.metadata.durationMs,
        cacheHit: extractionResult.metadata.cacheHit,
        retries: extractionResult.metadata.retries,
        documentsConsidered: extractionResult.metadata.documentsConsidered,
        documentsUsed: extractionResult.metadata.documentsUsed,
        modelUsed: extractionResult.metadata.modelUsed,
        tokensUsed: extractionResult.metadata.tokensUsed
      }
    };

    // Upsert suggestion
    if (existing) {
      await collection.updateOne(
        { processoSEI: extractionResult.processoSEI },
        { $set: record }
      );
      console.log(`[Auto Populate] Updated suggestion for ${extractionResult.processoSEI}`);
    } else {
      await collection.insertOne(record);
      console.log(`[Auto Populate] Created new suggestion for ${extractionResult.processoSEI}`);
    }

    const durationMs = Date.now() - startTime;
    console.log(`[Auto Populate] Suggestion persisted in ${durationMs}ms for ${extractionResult.processoSEI}`);

    return {
      success: true,
      suggestionId,
      suggestion: record
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Auto Populate] Failed to persist suggestion for ${extractionResult.processoSEI}:`, errorMessage);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Approve a suggestion and create/update project
 * Implements deduplication: no duplicate project for same processoSEI
 */
export async function approveSuggestion(
  suggestionIdOrProcessoSEI: string,
  approvedBy?: string
): Promise<ApproveSuggestionResult> {
  const startTime = Date.now();

  try {
    const db = await getDatabase();
    const suggestionsCollection = db.collection<SeiProjectSuggestionRecord>(SUGGESTIONS_COLLECTION);
    const projectsCollection = db.collection<Record<string, unknown>>(PROJECTS_COLLECTION);
    const oscsCollection = db.collection<Record<string, unknown>>(OSCS_COLLECTION);

    // Find suggestion by ID or processoSEI
    const suggestion = await suggestionsCollection.findOne({
      $or: [
        { suggestionId: suggestionIdOrProcessoSEI },
        { processoSEI: suggestionIdOrProcessoSEI }
      ]
    });

    if (!suggestion) {
      return {
        success: false,
        error: `Suggestion not found: ${suggestionIdOrProcessoSEI}`
      };
    }

    // Check if suggestion is in valid state for approval
    if (suggestion.status !== 'pending') {
      return {
        success: false,
        error: `Suggestion status is ${suggestion.status}, cannot approve`
      };
    }

    const now = new Date();

    // Check for existing project with same processoSEI (deduplication)
    let existingProject = null;
    
    if (suggestion.linkedProjectId) {
      // Check by linkedProjectId first
      if (ObjectId.isValid(suggestion.linkedProjectId)) {
        existingProject = await projectsCollection.findOne({
          _id: new ObjectId(suggestion.linkedProjectId)
        });
      }
      if (!existingProject) {
        existingProject = await projectsCollection.findOne({
          id: suggestion.linkedProjectId
        });
      }
    }
    
    if (!existingProject) {
      // Check by processoSEI
      existingProject = await projectsCollection.findOne({
        processoSEI: suggestion.processoSEI
      });
    }

    // Build project payload from suggestion
    const suggestionData = suggestion.suggestion;
    
    // Check/create OSC if needed
    if (suggestionData.osc) {
      const existingOsc = await oscsCollection.findOne({ nome: suggestionData.osc });
      if (!existingOsc) {
        // Create new OSC
        await oscsCollection.insertOne({
          nome: suggestionData.osc,
          presidente: suggestionData.presidenteOSC || '',
          createdAt: now,
          updatedAt: now,
          origin: 'auto-populate'
        });
        console.log(`[Auto Populate] Created new OSC: ${suggestionData.osc}`);
      }
    }

    // Map suggestion to project fields
    const projectPayload: Record<string, unknown> = {
      projeto: suggestionData.projeto || suggestion.processoSEI,
      numeroTermoFomento: suggestionData.numeroTermoFomento || '',
      processoSEI: suggestion.processoSEI,
      assinaturaPublicacao: suggestionData.assinaturaPublicacao || '',
      statusProjeto: normalizeStatusProjeto(suggestionData.statusProjeto),
      situacao: suggestionData.situacao || '',
      etapaProjeto: suggestionData.etapaProjeto || '',
      categoria: normalizeCategoria(suggestionData.categoria),
      tipoInstrumento: suggestionData.tipoInstrumento || '',
      tipoSituacaoPagamento: suggestionData.tipoSituacaoPagamento || '',
      valorTotal: parseMonetaryValue(suggestionData.valorTotal),
      parlamentar: suggestionData.parlamentar || '',
      emendasParlamentares: Array.isArray(suggestionData.emendasParlamentares)
        ? suggestionData.emendasParlamentares
        : [],
      osc: suggestionData.osc || '',
      cnpjOSC: suggestionData.cnpjOSC || '',
      presidenteOSC: suggestionData.presidenteOSC || '',
      coordenadorProjeto: suggestionData.coordenadorProjeto || '',
      regiaoAdministrativa: suggestionData.regiaoAdministrativa || '',
      regioesAdministrativas: parseStringArray(suggestionData.regioesAdministrativas),
      tipoPublicoPrevisto: suggestionData.tipoPublicoPrevisto || '',
      responsavelParecer: suggestionData.responsavelParecer || '',
      statusPlanilha: suggestionData.statusPlanilha || '',
      statusDocumentacao: suggestionData.statusDocumentacao || '',
      statusEscopoParecer: suggestionData.statusEscopoParecer || '',
      setor: suggestionData.setor || '',
      notasObs: suggestionData.notasObs || '',
      vigenciaInicio: parseDateValue(suggestionData.vigenciaInicio),
      vigenciaEvento: parseDateValue(suggestionData.vigenciaEvento),
      vigenciaFinal: parseDateValue(suggestionData.vigenciaFinal),
      statusDesde: parseDateValue(suggestionData.statusDesde),
      dataPrestacaoContasOSC: parseDateValue(suggestionData.dataPrestacaoContasOSC),
      financeiroParcela1: suggestionData.financeiroParcela1 || '',
      financeiroParcela2: suggestionData.financeiroParcela2 || '',
      financeiroParcela3: suggestionData.financeiroParcela3 || '',
      financeiroParcela4: suggestionData.financeiroParcela4 || '',
      origin: 'custom',
      sourceSuggestionId: suggestion.suggestionId,
      updatedAt: now
    };

    // Normalize the payload
    const normalizedPayload = normalizeProjectPayload(projectPayload, {
      origin: 'custom',
      createdBy: approvedBy || 'Auto Populate',
      responsavelAlteracao: approvedBy || 'Auto Populate'
    });

    let projectId: string;
    let isNewProject: boolean;

    if (existingProject) {
      // Update existing project
      projectId = existingProject._id instanceof ObjectId
        ? existingProject._id.toHexString()
        : (existingProject.id as string) || String(existingProject._id);
      
      // Preserve existing data that's not in suggestion
      const mergedPayload = {
        ...existingProject,
        ...normalizedPayload,
        // Preserve critical existing fields
        _id: existingProject._id,
        id: projectId,
        createdAt: existingProject.createdAt || normalizedPayload.createdAt,
        createdBy: existingProject.createdBy || normalizedPayload.createdBy,
        origin: existingProject.origin || 'custom'
      };

      await projectsCollection.updateOne(
        { _id: existingProject._id },
        { $set: mergedPayload }
      );

      console.log(`[Auto Populate] Updated existing project ${projectId} for process ${suggestion.processoSEI}`);
      isNewProject = false;

    } else {
      // Create new project
      normalizedPayload.createdAt = now;
      
      const insertResult = await projectsCollection.insertOne(normalizedPayload);
      projectId = insertResult.insertedId.toHexString();
      
      // Update the document with id field
      await projectsCollection.updateOne(
        { _id: insertResult.insertedId },
        { $set: { id: projectId } }
      );

      console.log(`[Auto Populate] Created new project ${projectId} for process ${suggestion.processoSEI}`);
      isNewProject = true;
    }

    // Update suggestion status to approved
    await suggestionsCollection.updateOne(
      { _id: suggestion._id },
      {
        $set: {
          status: 'approved',
          approvedAt: now,
          approvedBy: approvedBy || 'Auto Populate',
          linkedProjectId: projectId,
          updatedAt: now,
          lastError: undefined
        }
      }
    );

    const durationMs = Date.now() - startTime;
    console.log(`[Auto Populate] Suggestion approved in ${durationMs}ms, project ${projectId}`);

    // Fetch the final project state
    let finalProject = null;
    if (ObjectId.isValid(projectId)) {
      finalProject = await projectsCollection.findOne({ _id: new ObjectId(projectId) });
    }
    if (!finalProject) {
      finalProject = await projectsCollection.findOne({ id: projectId });
    }

    return {
      success: true,
      projectId,
      isNewProject,
      project: finalProject ? serializeProjectDoc(finalProject as Record<string, unknown> & { _id?: ObjectId | string }) : undefined,
      suggestion: {
        ...suggestion,
        status: 'approved',
        approvedAt: now,
        approvedBy: approvedBy || 'Auto Populate',
        linkedProjectId: projectId
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Auto Populate] Failed to approve suggestion ${suggestionIdOrProcessoSEI}:`, errorMessage);
    
    // Update suggestion with error
    try {
      const db = await getDatabase();
      const collection = db.collection<SeiProjectSuggestionRecord>(SUGGESTIONS_COLLECTION);
      await collection.updateOne(
        {
          $or: [
            { suggestionId: suggestionIdOrProcessoSEI },
            { processoSEI: suggestionIdOrProcessoSEI }
          ]
        },
        {
          $set: {
            status: 'failed',
            lastError: errorMessage,
            lastAttemptAt: new Date(),
            updatedAt: new Date()
          }
        }
      );
    } catch (updateError) {
      console.error('[Auto Populate] Failed to update suggestion error state:', updateError);
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Reject a suggestion
 */
export async function rejectSuggestion(
  suggestionIdOrProcessoSEI: string,
  rejectedBy?: string,
  reason?: string
): Promise<RejectSuggestionResult> {
  try {
    const db = await getDatabase();
    const collection = db.collection<SeiProjectSuggestionRecord>(SUGGESTIONS_COLLECTION);
    const now = new Date();

    const suggestion = await collection.findOne({
      $or: [
        { suggestionId: suggestionIdOrProcessoSEI },
        { processoSEI: suggestionIdOrProcessoSEI }
      ]
    });

    if (!suggestion) {
      return {
        success: false,
        error: `Suggestion not found: ${suggestionIdOrProcessoSEI}`
      };
    }

    // Check if suggestion is in valid state for rejection
    if (suggestion.status !== 'pending') {
      return {
        success: false,
        error: `Suggestion status is ${suggestion.status}, cannot reject`
      };
    }

    await collection.updateOne(
      { _id: suggestion._id },
      {
        $set: {
          status: 'rejected',
          rejectedAt: now,
          rejectedBy: rejectedBy || 'Unknown',
          rejectionReason: reason || '',
          updatedAt: now
        }
      }
    );

    console.log(`[Auto Populate] Rejected suggestion for ${suggestion.processoSEI}`);

    return {
      success: true,
      suggestion: {
        ...suggestion,
        status: 'rejected',
        rejectedAt: now,
        rejectedBy: rejectedBy || 'Unknown',
        rejectionReason: reason || ''
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Auto Populate] Failed to reject suggestion ${suggestionIdOrProcessoSEI}:`, errorMessage);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * List suggestions with optional filtering
 */
export async function listSuggestions(options?: {
  status?: SuggestionStatus;
  processoSEI?: string;
  limit?: number;
  skip?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
}): Promise<{
  suggestions: SeiProjectSuggestionRecord[];
  total: number;
}> {
  try {
    const db = await getDatabase();
    const collection = db.collection<SeiProjectSuggestionRecord>(SUGGESTIONS_COLLECTION);

    // Build filter
    const filter: Record<string, unknown> = {};
    if (options?.status) {
      filter.status = options.status;
    }
    if (options?.processoSEI) {
      filter.processoSEI = options.processoSEI;
    }

    // Build sort
    const sortField = options?.sortBy || 'createdAt';
    const sortDirection = options?.sortDirection === 'asc' ? 1 : -1;

    // limit: 0 → return empty (MongoDB .limit(0) means no limit)
    if (options?.limit === 0) {
      return { suggestions: [], total: await collection.countDocuments(filter) };
    }

    // Execute query
    const suggestions = await collection
      .find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(options?.skip || 0)
      .limit(options?.limit ?? 50)
      .toArray();

    const total = await collection.countDocuments(filter);

    return { suggestions, total };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Auto Populate] Failed to list suggestions:', errorMessage);
    return { suggestions: [], total: 0 };
  }
}

/**
 * Get a single suggestion by ID or processoSEI
 */
export async function getSuggestion(
  suggestionIdOrProcessoSEI: string
): Promise<SeiProjectSuggestionRecord | null> {
  try {
    const db = await getDatabase();
    const collection = db.collection<SeiProjectSuggestionRecord>(SUGGESTIONS_COLLECTION);

    return await collection.findOne({
      $or: [
        { suggestionId: suggestionIdOrProcessoSEI },
        { processoSEI: suggestionIdOrProcessoSEI },
        { id: suggestionIdOrProcessoSEI }
      ]
    });

  } catch (error) {
    console.error(`[Auto Populate] Failed to get suggestion ${suggestionIdOrProcessoSEI}:`, error);
    return null;
  }
}

/**
 * Delete a suggestion (for cleanup or forced retry)
 * Only allows deletion of pending or failed suggestions
 */
export async function deleteSuggestion(
  suggestionIdOrProcessoSEI: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    const collection = db.collection<SeiProjectSuggestionRecord>(SUGGESTIONS_COLLECTION);

    const suggestion = await collection.findOne({
      $or: [
        { suggestionId: suggestionIdOrProcessoSEI },
        { processoSEI: suggestionIdOrProcessoSEI }
      ]
    });

    if (!suggestion) {
      return { success: false, error: 'Suggestion not found' };
    }

    // Only delete pending or failed suggestions
    if (suggestion.status === 'approved' || suggestion.status === 'rejected') {
      return {
        success: false,
        error: `Cannot delete suggestion with status ${suggestion.status}`
      };
    }

    await collection.deleteOne({ _id: suggestion._id });
    console.log(`[Auto Populate] Deleted suggestion for ${suggestion.processoSEI}`);

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Auto Populate] Failed to delete suggestion ${suggestionIdOrProcessoSEI}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Check if a project exists for a given processoSEI
 */
export async function projectExistsForProcess(processoSEI: string): Promise<{
  exists: boolean;
  projectId?: string;
}> {
  try {
    const db = await getDatabase();
    const collection = db.collection<Record<string, unknown>>(PROJECTS_COLLECTION);

    const project = await collection.findOne({ processoSEI });

    if (!project) {
      return { exists: false };
    }

    const projectId = project._id instanceof ObjectId
      ? project._id.toHexString()
      : (project.id as string) || String(project._id);

    return { exists: true, projectId };

  } catch (error) {
    console.error(`[Auto Populate] Failed to check project existence for ${processoSEI}:`, error);
    return { exists: false };
  }
}

/**
 * Update suggestion fields before approval
 * Only allows updates for pending suggestions
 */
export async function updateSuggestionFields(
  id: string,
  updates: Partial<SeiProjectSuggestion>
): Promise<{ success: boolean; suggestion?: SeiProjectSuggestionRecord; error?: string }> {
  try {
    const db = await getDatabase();
    const collection = db.collection<SeiProjectSuggestionRecord>(SUGGESTIONS_COLLECTION);

    // Find the suggestion
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      // Try by processoSEI if not valid ObjectId
      const byProcesso = await collection.findOne({ processoSEI: id, status: 'pending' });
      if (!byProcesso) {
        return { success: false, error: 'Sugestão não encontrada ou não pendente' };
      }
      objectId = byProcesso._id instanceof ObjectId ? byProcesso._id : new ObjectId(byProcesso._id);
    }

    const suggestion = await collection.findOne({ _id: objectId });

    if (!suggestion) {
      return { success: false, error: 'Sugestão não encontrada' };
    }

    if (suggestion.status !== 'pending') {
      return { success: false, error: 'Sugestão não pode ser editada (status não é pendente)' };
    }

    // Merge updates with existing suggestion
    const updatedSuggestion = {
      ...suggestion.suggestion,
      ...updates
    };

    // Update the record
    await collection.updateOne(
      { _id: objectId },
      {
        $set: {
          suggestion: updatedSuggestion,
          updatedAt: new Date()
        }
      }
    );

    // Fetch updated record
    const updated = await collection.findOne({ _id: objectId });

    console.log(`[Auto Populate] Updated suggestion ${id}`);

    return { success: true, suggestion: updated ?? undefined };

  } catch (error) {
    console.error(`[Auto Populate] Failed to update suggestion ${id}:`, error);
    return { success: false, error: 'Erro ao atualizar sugestão' };
  }
}