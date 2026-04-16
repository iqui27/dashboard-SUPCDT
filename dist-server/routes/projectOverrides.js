import { Router } from 'express';
import { getDatabase } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
const COLLECTION_NAME = 'project_overrides';
const DATE_FIELDS = [
    'vigenciaInicio',
    'vigenciaEvento',
    'vigenciaFinal',
    'statusDesde',
    'dataPrestacaoContasOSC'
];
function parseDateValue(value) {
    if (!value)
        return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
function normalizeHistoricoMovimentacoes(value) {
    if (!Array.isArray(value)) {
        return undefined;
    }
    return value.map(item => {
        const entry = typeof item === 'object' && item !== null ? { ...item } : {};
        if ('data' in entry) {
            entry.data = parseDateValue(entry.data);
        }
        return entry;
    });
}
function normalizeOverrides(payload) {
    const normalized = {};
    Object.entries(payload).forEach(([key, value]) => {
        if (DATE_FIELDS.includes(key)) {
            normalized[key] = parseDateValue(value);
            return;
        }
        if (key === 'historicoMovimentacoes') {
            const historico = normalizeHistoricoMovimentacoes(value);
            if (historico) {
                normalized[key] = historico;
            }
            return;
        }
        normalized[key] = value;
    });
    return normalized;
}
function serializeDate(value) {
    if (!value)
        return null;
    if (value instanceof Date) {
        return value.toISOString();
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function serializeOverrides(overrides) {
    const serialized = {};
    Object.entries(overrides).forEach(([key, value]) => {
        if (DATE_FIELDS.includes(key)) {
            serialized[key] = serializeDate(value);
            return;
        }
        if (key === 'historicoMovimentacoes' && Array.isArray(value)) {
            serialized[key] = value.map(item => {
                if (typeof item !== 'object' || item === null) {
                    return item;
                }
                const parsed = { ...item };
                if ('data' in parsed) {
                    parsed.data = serializeDate(parsed.data);
                }
                return parsed;
            });
            return;
        }
        serialized[key] = value;
    });
    return serialized;
}
function serializeOverrideDoc(doc) {
    const { _id, overrides, ...rest } = doc;
    return {
        id: _id?.toHexString(),
        overrides: serializeOverrides(overrides ?? {}),
        ...rest,
        lastOverrideAt: serializeDate(rest.lastOverrideAt),
        lastSheetSyncAt: rest.lastSheetSyncAt ? serializeDate(rest.lastSheetSyncAt) : null,
        createdAt: serializeDate(rest.createdAt),
        updatedAt: serializeDate(rest.updatedAt)
    };
}
export const projectOverridesRouter = Router();
projectOverridesRouter.get('/', async (req, res) => {
    try {
        const { projectId } = req.query;
        const db = await getDatabase();
        const collection = db.collection(COLLECTION_NAME);
        const filter = projectId ? { projectId } : {};
        const overrides = await collection.find(filter).toArray();
        res.json(overrides.map(serializeOverrideDoc));
    }
    catch (error) {
        console.error('Failed to list project overrides', error);
        res.status(500).json({ error: 'Failed to load project overrides' });
    }
});
projectOverridesRouter.put('/:projectId', requireAuth, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { overrides: overridesPayload } = req.body;
        if (!projectId?.trim()) {
            return res.status(400).json({ error: 'Project id is required' });
        }
        if (!overridesPayload || typeof overridesPayload !== 'object') {
            return res.status(400).json({ error: 'Overrides payload is required' });
        }
        // Preencher responsavelAlteracao com o usuário logado se não estiver presente
        const normalizedPayload = { ...overridesPayload };
        if (!normalizedPayload.responsavelAlteracao && req.user?.username) {
            normalizedPayload.responsavelAlteracao = req.user.username;
        }
        const overrides = normalizeOverrides(normalizedPayload);
        const db = await getDatabase();
        const collection = db.collection(COLLECTION_NAME);
        const existing = await collection.findOne({ projectId: projectId });
        const mergedOverrides = {
            ...(existing?.overrides ?? {}),
            ...overrides
        };
        const updateResult = await collection.findOneAndUpdate({ projectId }, {
            $set: {
                projectId,
                overrides: mergedOverrides,
                needsSheetSync: true,
                lastOverrideAt: new Date(),
                updatedAt: new Date()
            },
            $setOnInsert: {
                createdAt: new Date()
            }
        }, {
            upsert: true,
            returnDocument: 'after'
        });
        const updatedDoc = updateResult;
        if (!updatedDoc) {
            return res.status(500).json({ error: 'Failed to save project override' });
        }
        res.json(serializeOverrideDoc(updatedDoc));
    }
    catch (error) {
        console.error('Failed to save project override', error);
        res.status(500).json({ error: 'Failed to save project override' });
    }
});
projectOverridesRouter.post('/:projectId/sync', requireAuth, async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!projectId?.trim()) {
            return res.status(400).json({ error: 'Project id is required' });
        }
        const db = await getDatabase();
        const collection = db.collection(COLLECTION_NAME);
        const overrideDoc = await collection.findOne({ projectId: projectId });
        if (!overrideDoc) {
            return res.status(404).json({ error: 'Override not found for project' });
        }
        // Placeholder for future Google Sheets synchronization.
        console.warn('Sheet synchronization not configured. Override marked as pending.');
        await collection.updateOne({ projectId }, {
            $set: {
                needsSheetSync: true
            }
        });
        res.status(202).json({ message: 'Sheet synchronization not configured. Override marked as pending.' });
    }
    catch (error) {
        console.error('Failed to flag override for sheet sync', error);
        res.status(500).json({ error: 'Failed to process sheet synchronization' });
    }
});
