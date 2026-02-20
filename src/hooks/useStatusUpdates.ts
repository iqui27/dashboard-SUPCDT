import { useEffect, useMemo, useState } from 'react';
import { CreateStatusUpdateInput, StatusUpdate, createStatusUpdate, fetchStatusUpdates } from '../lib/statusUpdates';

interface UseStatusUpdatesParams {
  projectId?: string;
}

interface UseStatusUpdatesReturn {
  updates: StatusUpdate[];
  isLoading: boolean;
  error: string | null;
  createUpdate: (payload: CreateStatusUpdateInput) => Promise<StatusUpdate>;
  latestUpdate: StatusUpdate | null;
}

export function useStatusUpdates({ projectId }: UseStatusUpdatesParams = {}): UseStatusUpdatesReturn {
  const [updates, setUpdates] = useState<StatusUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUpdates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchStatusUpdates(projectId);
      setUpdates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar atualizações.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUpdates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const latestUpdate = useMemo(() => {
    if (updates.length === 0) return null;
    return updates[0];
  }, [updates]);

  const createUpdate = async (payload: CreateStatusUpdateInput) => {
    try {
      setError(null);
      const saved = await createStatusUpdate(payload);
      setUpdates(prev => [saved, ...prev]);
      setError(null);
      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar atualização.');
      throw err;
    }
  };

  return {
    updates,
    isLoading,
    error,
    latestUpdate,
    createUpdate
  };
}
