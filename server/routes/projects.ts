import { Router, Request, Response } from 'express';
import multer from 'multer';
import { ObjectId, type Filter } from 'mongodb';
import type { Document } from 'mongodb';
import { getDatabase } from '../db/client.js';
import { extractProjectFromPdf } from '../services/geminiImport.js';
import { requireAuth } from '../middleware/auth.js';

const COLLECTION_NAME = 'custom_projects';

interface CustomProjectDoc {
  _id?: ObjectId | string;
  [key: string]: unknown;
}

type ProjectDocument = CustomProjectDoc & { _id?: ObjectId | string };

const dateFields = [
  'vigenciaInicio',
  'vigenciaEvento',
  'vigenciaFinal',
  'statusDesde',
  'dataPrestacaoContasOSC',
  'createdAt'
];

function parseDateValue(value: unknown) {
  if (!value) return null;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isMongoObjectId(value: unknown): value is ObjectId {
  return value instanceof ObjectId;
}

function normalizeProjectPayload(payload: Record<string, unknown>): CustomProjectDoc {
  const doc: CustomProjectDoc = {
    ...payload,
    origin: 'custom'
  };

  dateFields.forEach(field => {
    if (field in doc) {
      doc[field] = parseDateValue(doc[field]);
    }
  });

  // Parse valorTotal from string to number
  if ('valorTotal' in doc && typeof doc.valorTotal === 'string') {
    const valorTotalStr = doc.valorTotal;
    // Handle Brazilian format: 1.234,56 -> 1234.56
    let cleaned = valorTotalStr.replace(/R\$/g, '').trim();

    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Format like 1.234,56 - remove thousand separators (dots)
      cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    } else if (cleaned.includes(',')) {
      // Format like 1234,56 - just replace comma with dot
      cleaned = cleaned.replace(/,/g, '.');
    } else {
      // Format like 1234.56 or 1234 - already in decimal format
      // Remove dots only if there are multiple (thousand separators)
      const dotCount = (cleaned.match(/\./g) || []).length;
      if (dotCount > 1) {
        cleaned = cleaned.replace(/\./g, '');
      }
    }

    const parsed = parseFloat(cleaned);
    doc.valorTotal = isNaN(parsed) ? 0 : parsed;
  } else if (!doc.valorTotal && 'valorTotalRaw' in doc && typeof doc.valorTotalRaw === 'string') {
    // Parse valorTotalRaw if valorTotal is not provided or is null/undefined
    const valorTotalStr = doc.valorTotalRaw;
    // Handle Brazilian format: 1.234,56 -> 1234.56
    let cleaned = valorTotalStr.replace(/R\$/g, '').trim();

    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Format like 1.234,56 - remove thousand separators (dots)
      cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    } else if (cleaned.includes(',')) {
      // Format like 1234,56 - just replace comma with dot
      cleaned = cleaned.replace(/,/g, '.');
    } else {
      // Format like 1234.56 or 1234 - already in decimal format
      // Remove dots only if there are multiple (thousand separators)
      const dotCount = (cleaned.match(/\./g) || []).length;
      if (dotCount > 1) {
        cleaned = cleaned.replace(/\./g, '');
      }
    }

    const parsed = parseFloat(cleaned);
    doc.valorTotal = isNaN(parsed) ? 0 : parsed;
  }

  if (Array.isArray(doc.historicoMovimentacoes)) {
    doc.historicoMovimentacoes = (doc.historicoMovimentacoes as Record<string, unknown>[]).map(item => ({
      ...item,
      data: parseDateValue(item.data)
    }));
  }

  return doc;
}

function serializeProject(doc: ProjectDocument) {
  const { _id, id: legacyId, ...rest } = doc as ProjectDocument & { id?: string };
  const serializedId = isMongoObjectId(_id)
    ? _id.toHexString()
    : typeof _id === 'string'
      ? _id
      : legacyId ?? '';

  // Ensure createdBy is present, falling back to responsavelAlteracao if missing
  const responsavelAlteracao = rest.responsavelAlteracao as string | undefined;
  const createdBy = rest.createdBy as string | undefined;

  return {
    id: serializedId,
    ...rest,
    createdBy: createdBy || responsavelAlteracao
  };
}

export const projectsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (Number(process.env.GEMINI_MAX_FILE_SIZE_MB) || 16) * 1024 * 1024
  }
});

projectsRouter.post('/import', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const uploaded = req.file;
    if (!uploaded) {
      return res.status(400).json({ error: 'Arquivo PDF não encontrado no upload.' });
    }

    if (uploaded.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Envie um arquivo no formato PDF.' });
    }

    // Debug: Check if API key is visible to the route handler
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    console.log(`[Import Debug] Request received. API Key present: ${!!apiKey}, Key length: ${apiKey?.length || 0}`);

    const result = await extractProjectFromPdf(uploaded.buffer, uploaded.originalname ?? 'projeto.pdf');
    res.json(result);
  } catch (error) {
    console.error('Failed to import project from PDF via Gemini', error);

    // Enhanced error logging
    if (error instanceof Error) {
      console.error('[Import Debug] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }

    const message = error instanceof Error ? error.message : 'Falha ao processar PDF.';
    res.status(500).json({ error: message, details: 'Check server logs for more info' });
  }
});

projectsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const collection = db.collection<CustomProjectDoc>(COLLECTION_NAME);
    const projects = await collection.find({}).toArray();

    // Process each project to ensure valorTotal is properly parsed
    const processedProjects = projects.map(project => {
      const processed = normalizeProjectPayload(project as Record<string, unknown>);
      return serializeProject(processed as ProjectDocument);
    });

    res.json(processedProjects);
  } catch (error) {
    console.error('Failed to list custom projects', error);
    res.status(500).json({ error: 'Failed to load custom projects' });
  }
});

projectsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }

    const db = await getDatabase();
    const collection = db.collection<CustomProjectDoc>(COLLECTION_NAME);
    const project = await collection.findOne({ _id: new ObjectId(id) });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Process the project to ensure valorTotal is properly parsed
    const processed = normalizeProjectPayload(project as Record<string, unknown>);
    res.json(serializeProject(processed as ProjectDocument));
  } catch (error) {
    console.error('Failed to get project', error);
    res.status(500).json({ error: 'Failed to load project' });
  }
});

projectsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const payload = req.body as Record<string, unknown>;
    const projeto = (payload.projeto as string | undefined)?.trim();

    if (!projeto) {
      return res.status(400).json({ error: 'Project name (projeto) is required' });
    }

    // Preencher responsavelAlteracao com o usuário logado
    const currentUser = req.user?.username || 'Sistema';
    const responsavelAlteracao = currentUser;
    const createdBy = currentUser;

    const doc = normalizeProjectPayload({
      ...payload,
      projeto,
      responsavelAlteracao,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const db = await getDatabase();
    const collection = db.collection<CustomProjectDoc>(COLLECTION_NAME);
    const result = await collection.insertOne(doc);

    const insertedId = result.insertedId;
    const idValue = isMongoObjectId(insertedId)
      ? insertedId.toHexString()
      : String(insertedId);

    const saved = await collection.findOneAndUpdate(
      isMongoObjectId(insertedId)
        ? { _id: insertedId }
        : { _id: insertedId as string },
      { $set: { id: idValue } },
      { returnDocument: 'after' }
    );

    if (!saved) {
      return res.status(500).json({ error: 'Failed to save project' });
    }

    res.status(201).json(serializeProject(saved as ProjectDocument));
  } catch (error) {
    console.error('Failed to save custom project', error);
    res.status(500).json({ error: 'Failed to save project' });
  }
});

projectsRouter.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    console.log('PUT request received for project id:', id);

    const payload = req.body as Record<string, unknown>;
    const projeto = (payload.projeto as string | undefined)?.trim();
    if (!projeto) {
      return res.status(400).json({ error: 'Project name (projeto) is required' });
    }

    // Preencher responsavelAlteracao com o usuário logado
    const responsavelAlteracao = req.user?.username || 'Sistema';

    const doc = normalizeProjectPayload({
      ...payload,
      projeto,
      responsavelAlteracao,
      updatedAt: new Date()
    });

    doc.id = id;

    const db = await getDatabase();
    const collection = db.collection<CustomProjectDoc>(COLLECTION_NAME);

    const filters: Filter<CustomProjectDoc>[] = [];
    if (ObjectId.isValid(id)) {
      filters.push({ _id: new ObjectId(id) });
    }
    filters.push({ id });
    filters.push({ _id: id });

    const orFilters = filters.map(filter => ({ ...filter }));
    console.log('Searching for project with filter list:', JSON.stringify(orFilters));

    const existingDoc = await collection.findOne({ $or: orFilters });

    if (!existingDoc) {
      console.warn('Failed to locate project for update:', id);
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!doc.id && typeof existingDoc.id === 'string') {
      doc.id = existingDoc.id;
    }

    const existingHistory = Array.isArray(existingDoc.historicoMovimentacoes)
      ? existingDoc.historicoMovimentacoes as Document[]
      : [];
    const incomingHistory = Array.isArray(doc.historicoMovimentacoes)
      ? doc.historicoMovimentacoes as Document[]
      : undefined;

    if (!incomingHistory || incomingHistory.length === 0) {
      const preservedHistory = existingHistory.map(entry => ({
        ...entry,
        data: parseDateValue(entry.data) ?? null
      }));
      if (preservedHistory.length > 0) {
        (doc as Document).historicoMovimentacoes = preservedHistory;
      } else {
        delete (doc as Document).historicoMovimentacoes;
      }
    } else {
      const historyMap = new Map<string, Document>();

      existingHistory.forEach((entry, index) => {
        const entryId = typeof entry.id === 'string' && entry.id ? entry.id : `existing-${index}`;
        historyMap.set(entryId, {
          ...entry,
          data: parseDateValue(entry.data) ?? null
        });
      });

      incomingHistory.forEach((entry, index) => {
        const entryId = typeof entry.id === 'string' && entry.id ? entry.id : `incoming-${index}`;
        historyMap.set(entryId, {
          ...entry,
          data: parseDateValue(entry.data) ?? null
        });
      });

      const mergedHistory = Array.from(historyMap.values()).sort((a, b) => {
        const dateA = a.data instanceof Date ? a.data.getTime() : 0;
        const dateB = b.data instanceof Date ? b.data.getTime() : 0;
        return dateB - dateA;
      });

      (doc as Document).historicoMovimentacoes = mergedHistory;
    }

    const combinedFilter: Filter<CustomProjectDoc> = { $or: orFilters };

    console.log('Updating project using combined filter:', JSON.stringify(combinedFilter));
    const updateResult = await collection.updateOne(combinedFilter, { $set: doc });

    if (updateResult.matchedCount === 0) {
      console.warn('Project update matched no documents for id:', id);
      return res.status(404).json({ error: 'Project not found during update' });
    }

    const updatedDoc = await collection.findOne(combinedFilter);
    if (!updatedDoc) {
      console.warn('Project not found after successful update:', id);
      return res.status(404).json({ error: 'Project not found after update' });
    }

    console.log('Project updated successfully:', updatedDoc.projeto);
    res.json(serializeProject(updatedDoc as ProjectDocument));
  } catch (error) {
    console.error('Failed to update custom project', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

projectsRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }

    const db = await getDatabase();
    const collection = db.collection<CustomProjectDoc>(COLLECTION_NAME);
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete custom project', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});
