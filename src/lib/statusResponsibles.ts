export interface StatusResponsible {
  id: string;
  name: string;
  department: string;
  username?: string;
}

// Usa URL relativa para funcionar com o proxy do Vite, ou variável de ambiente
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const RESPONSIBLES_ENDPOINT = API_BASE_URL
  ? `${API_BASE_URL.replace(/\/$/, '')}/api/status-responsibles`
  : '/api/status-responsibles';

export async function fetchStatusResponsibles(): Promise<StatusResponsible[]> {
  const response = await fetch(RESPONSIBLES_ENDPOINT);
  if (!response.ok) {
    throw new Error('Failed to load responsibles');
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(item => ({
    id: String(item.id ?? item.name),
    name: String(item.name ?? ''),
    department: String(item.department ?? ''),
    username: item.username
  }))
    .filter(item => Boolean(item.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
