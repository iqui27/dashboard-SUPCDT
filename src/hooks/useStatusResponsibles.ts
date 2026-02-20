import { useEffect, useState, useCallback } from 'react';
import { fetchStatusResponsibles, StatusResponsible } from '../lib/statusResponsibles';

interface UseStatusResponsiblesReturn {
  responsibles: StatusResponsible[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useStatusResponsibles(): UseStatusResponsiblesReturn {
  const [responsibles, setResponsibles] = useState<StatusResponsible[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchStatusResponsibles();
      setResponsibles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar responsáveis.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    responsibles,
    isLoading,
    error,
    reload: load
  };
}
