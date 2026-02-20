import { getAuthHeaders } from './auth';

export interface StatusUpdate {
  id: string;
  projectId: string;
  status: string;
  notes: string;
  user?: string;
  sector?: string;
  termoFomento?: string;
  updatedAt: string;
}

export interface CreateStatusUpdateInput {
  projectId: string;
  status: string;
  notes: string;
  sector?: string;
  termoFomento?: string;
}

// Usa URL relativa para funcionar com o proxy do Vite, ou variável de ambiente
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const STATUS_UPDATES_ENDPOINT = API_BASE_URL 
  ? `${API_BASE_URL.replace(/\/$/, '')}/api/status-updates`
  : '/api/status-updates';

export async function fetchStatusUpdates(projectId?: string): Promise<StatusUpdate[]> {
  const url = projectId ? `${STATUS_UPDATES_ENDPOINT}?projectId=${encodeURIComponent(projectId)}` : STATUS_UPDATES_ENDPOINT;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to load status updates');
  }

  const data = await response.json() as StatusUpdate[];
  return data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function createStatusUpdate(payload: CreateStatusUpdateInput): Promise<StatusUpdate> {
  const response = await fetch(STATUS_UPDATES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error ?? 'Failed to save status update');
  }

  const data = await response.json() as StatusUpdate;
  return data;
}
