import { Router, Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { getDatabase } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserById } from '../services/users.js';

export interface StatusUpdate {
  projectId: string;
  status: string;
  notes: string;
  updatedAt: Date;
  user?: string;
  sector?: string;
}

const COLLECTION_NAME = 'status_updates';

export const statusUpdatesRouter = Router();

statusUpdatesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query as { projectId?: string };
    const db = await getDatabase();
    const collection = db.collection<StatusUpdate>(COLLECTION_NAME);

    const filter = projectId ? { projectId } : {};
    const updates = await collection
      .find(filter)
      .sort({ updatedAt: -1 })
      .toArray();

    res.json(updates.map(serializeUpdate));
  } catch (error) {
    console.error('Failed to list status updates', error);
    res.status(500).json({ error: 'Failed to load status updates' });
  }
});

statusUpdatesRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const { projectId, status, notes, sector } = req.body as Partial<StatusUpdate>;

  if (!projectId || !status || !notes) {
    return res.status(400).json({ error: 'projectId, status and notes are required' });
  }

  // Buscar o usuário completo para obter o fullName
  const user = await getUserById(req.user!.userId);
  console.log('User from DB:', user);
  
  // Usar o nome completo se disponível, senão o username
  const userDisplayName = user?.fullName || req.user?.username || 'Sistema';
  console.log('User display name being saved:', userDisplayName);

  const update: StatusUpdate = {
    projectId,
    status,
    notes,
    user: userDisplayName,
    sector,
    updatedAt: new Date()
  };

  try {
    const db = await getDatabase();
    const collection = db.collection<StatusUpdate>(COLLECTION_NAME);
    const insertResult = await collection.insertOne(update);

    const saved: WithId<StatusUpdate> = {
      _id: insertResult.insertedId,
      ...update
    };

    res.status(201).json(serializeUpdate(saved));
  } catch (error) {
    console.error('Failed to save status update', error);
    res.status(500).json({ error: 'Failed to save status update' });
  }
});

function serializeUpdate(update: WithId<StatusUpdate>) {
  return {
    id: update._id instanceof ObjectId ? update._id.toHexString() : String(update._id),
    projectId: update.projectId,
    status: update.status,
    notes: update.notes,
    user: update.user,
    sector: update.sector,
    updatedAt: update.updatedAt
  };
}
