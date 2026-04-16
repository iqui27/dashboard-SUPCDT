/**
 * Auto Populate Routes
 * Authenticated API for reviewing, approving, and rejecting SEI project suggestions
 *
 * Endpoints:
 * - GET /suggestions - List suggestions with filtering
 * - GET /suggestions/:id - Get specific suggestion
 * - POST /:id/approve - Approve a suggestion and create/update project
 * - POST /:id/reject - Reject a suggestion
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listSuggestions, getSuggestion, approveSuggestion, rejectSuggestion } from '../services/autoPopulate.js';
export const autoPopulateRouter = Router();
// All routes require authentication
autoPopulateRouter.use(requireAuth);
/**
 * GET /api/auto-populate/suggestions
 * List all suggestions with optional filtering
 *
 * Query params:
 * - status: Filter by status (pending, approved, rejected, failed)
 * - processoSEI: Filter by SEI process number
 * - limit: Max results (default 50, max 100)
 * - skip: Pagination offset
 * - sortBy: Sort field (createdAt, updatedAt)
 * - sortDirection: Sort order (asc, desc)
 */
autoPopulateRouter.get('/suggestions', async (req, res) => {
    try {
        // Extract and validate query parameters
        const status = req.query.status;
        const processoSEI = req.query.processoSEI;
        const limitParam = req.query.limit;
        const skipParam = req.query.skip;
        const sortBy = req.query.sortBy;
        const sortDirection = req.query.sortDirection;
        // Validate status if provided
        const validStatuses = ['pending', 'approved', 'rejected', 'failed'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Status inválido',
                validValues: validStatuses
            });
        }
        // Parse and validate pagination
        const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 100);
        const skip = Math.max(parseInt(skipParam || '0', 10) || 0, 0);
        // Validate sortBy
        const validSortFields = ['createdAt', 'updatedAt'];
        if (sortBy && !validSortFields.includes(sortBy)) {
            return res.status(400).json({
                error: 'Campo de ordenação inválido',
                validValues: validSortFields
            });
        }
        // Get suggestions
        const result = await listSuggestions({
            status,
            processoSEI,
            limit,
            skip,
            sortBy,
            sortDirection
        });
        res.json({
            suggestions: result.suggestions,
            total: result.total,
            pagination: {
                limit,
                skip,
                hasMore: skip + result.suggestions.length < result.total
            }
        });
    }
    catch (error) {
        console.error('[Auto Populate Routes] Error listing suggestions:', error);
        res.status(500).json({ error: 'Erro ao listar sugestões' });
    }
});
/**
 * GET /api/auto-populate/suggestions/:id
 * Get a specific suggestion by ID or processoSEI
 */
autoPopulateRouter.get('/suggestions/:id', async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id.trim().length === 0) {
            return res.status(400).json({ error: 'ID é obrigatório' });
        }
        const suggestion = await getSuggestion(id);
        if (!suggestion) {
            return res.status(404).json({
                error: 'Sugestão não encontrada',
                id
            });
        }
        res.json(suggestion);
    }
    catch (error) {
        console.error('[Auto Populate Routes] Error getting suggestion:', error);
        res.status(500).json({ error: 'Erro ao buscar sugestão' });
    }
});
/**
 * POST /api/auto-populate/:id/approve
 * Approve a suggestion and create/update the project
 *
 * Body (optional):
 * - approvedBy: User name (defaults to authenticated user)
 */
autoPopulateRouter.post('/:id/approve', async (req, res) => {
    const correlationId = crypto.randomUUID();
    try {
        const id = req.params.id;
        if (!id || id.trim().length === 0) {
            return res.status(400).json({
                error: 'ID é obrigatório',
                correlationId
            });
        }
        // Use authenticated user or provided name
        const approvedBy = req.body?.approvedBy || req.user?.username || 'Unknown';
        console.log(`[Auto Populate Routes] Approving suggestion ${id} (${correlationId})`);
        const result = await approveSuggestion(id, approvedBy);
        if (!result.success) {
            // Determine appropriate status code
            const statusCode = result.error?.includes('not found') ? 404 :
                result.error?.includes('cannot approve') ? 400 : 500;
            console.warn(`[Auto Populate Routes] Approval failed for ${id}: ${result.error}`);
            return res.status(statusCode).json({
                error: result.error,
                correlationId
            });
        }
        console.log(`[Auto Populate Routes] Suggestion ${id} approved, project ${result.projectId} (${correlationId})`);
        res.json({
            success: true,
            message: result.isNewProject
                ? 'Projeto criado com sucesso'
                : 'Projeto atualizado com sucesso',
            projectId: result.projectId,
            isNewProject: result.isNewProject,
            project: result.project,
            suggestion: result.suggestion,
            correlationId
        });
    }
    catch (error) {
        console.error(`[Auto Populate Routes] Error approving suggestion (${correlationId}):`, error);
        res.status(500).json({
            error: 'Erro ao aprovar sugestão',
            correlationId
        });
    }
});
/**
 * POST /api/auto-populate/:id/reject
 * Reject a suggestion
 *
 * Body:
 * - reason: Rejection reason (optional)
 * - rejectedBy: User name (defaults to authenticated user)
 */
autoPopulateRouter.post('/:id/reject', async (req, res) => {
    const correlationId = crypto.randomUUID();
    try {
        const id = req.params.id;
        if (!id || id.trim().length === 0) {
            return res.status(400).json({
                error: 'ID é obrigatório',
                correlationId
            });
        }
        // Use authenticated user or provided name
        const rejectedBy = req.body?.rejectedBy || req.user?.username || 'Unknown';
        const reason = req.body?.reason || '';
        console.log(`[Auto Populate Routes] Rejecting suggestion ${id} (${correlationId})`);
        const result = await rejectSuggestion(id, rejectedBy, reason);
        if (!result.success) {
            // Determine appropriate status code
            const statusCode = result.error?.includes('not found') ? 404 :
                result.error?.includes('cannot reject') ? 400 : 500;
            console.warn(`[Auto Populate Routes] Rejection failed for ${id}: ${result.error}`);
            return res.status(statusCode).json({
                error: result.error,
                correlationId
            });
        }
        console.log(`[Auto Populate Routes] Suggestion ${id} rejected (${correlationId})`);
        res.json({
            success: true,
            message: 'Sugestão rejeitada',
            suggestion: result.suggestion,
            correlationId
        });
    }
    catch (error) {
        console.error(`[Auto Populate Routes] Error rejecting suggestion (${correlationId}):`, error);
        res.status(500).json({
            error: 'Erro ao rejeitar sugestão',
            correlationId
        });
    }
});
import crypto from 'crypto';
/**
 * PATCH /api/auto-populate/suggestions/:id
 * Update suggestion fields before approving
 *
 * Body:
 * - suggestion: Partial suggestion object with fields to update
 */
autoPopulateRouter.patch('/suggestions/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const updates = req.body?.suggestion;
        if (!id || id.trim().length === 0) {
            return res.status(400).json({ error: 'ID é obrigatório' });
        }
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: 'Suggestion updates are required' });
        }
        // Import the service function
        const { updateSuggestionFields } = await import('../services/autoPopulate.js');
        const result = await updateSuggestionFields(id, updates);
        if (!result.success) {
            return res.status(404).json({ error: result.error || 'Suggestion not found' });
        }
        res.json(result.suggestion);
    }
    catch (error) {
        console.error('[Auto Populate Routes] Error updating suggestion:', error);
        res.status(500).json({ error: 'Erro ao atualizar sugestão' });
    }
});
