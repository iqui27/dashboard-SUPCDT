import { useEffect, useState, useCallback } from 'react';
import { fetchOscs } from '../lib/oscs';

interface UseOscsReturn {
  oscs: string[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useOscs(): UseOscsReturn {
  const [oscs, setOscs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchOscs();
      // Extrair nomes únicos da propriedade 'osc' e ordenar alfabeticamente
      const uniqueOscs = Array.from(new Set(data.map(osc => osc.osc).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
      setOscs(uniqueOscs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar OSCs.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    oscs,
    isLoading,
    error,
    reload: load
  };
}

