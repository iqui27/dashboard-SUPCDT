import { API_URL } from './base';
import { WifiEmpresa, WifiEmpresaInput, WifiPoint, WifiPointInput, WifiStats } from '../../types/wifi';

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

async function parseApiError(response: Response, fallbackMessage: string): Promise<never> {
  let message = fallbackMessage;

  try {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const payload = await response.json();
      if (typeof payload?.error === 'string' && payload.error.trim()) {
        message = payload.error.trim();
      }
    }
  } catch {
    // Mantém a mensagem padrão quando o corpo não for parseável.
  }

  throw new ApiRequestError(message, response.status);
}

function withQuery(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function fetchWifiPoints(
  token: string,
  filters?: { search?: string; status?: string; regiaoAdministrativa?: string }
): Promise<WifiPoint[]> {
  const response = await fetch(
    `${API_URL}/wifi${withQuery({
      search: filters?.search,
      status: filters?.status,
      regiaoAdministrativa: filters?.regiaoAdministrativa
    })}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    await parseApiError(response, 'Falha ao carregar pontos Wi-Fi');
  }

  return response.json();
}

export async function fetchWifiStats(token: string): Promise<WifiStats> {
  const response = await fetch(`${API_URL}/wifi/stats`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    await parseApiError(response, 'Falha ao carregar métricas Wi-Fi');
  }

  return response.json();
}

export async function createWifiPoint(token: string, payload: WifiPointInput): Promise<WifiPoint> {
  const response = await fetch(`${API_URL}/wifi`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    await parseApiError(response, 'Falha ao criar ponto Wi-Fi');
  }

  return response.json();
}

export async function updateWifiPoint(token: string, id: string, payload: WifiPointInput): Promise<WifiPoint> {
  const response = await fetch(`${API_URL}/wifi/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    await parseApiError(response, 'Falha ao atualizar ponto Wi-Fi');
  }

  return response.json();
}

export async function deleteWifiPoint(token: string, id: string): Promise<void> {
  const response = await fetch(`${API_URL}/wifi/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    await parseApiError(response, 'Falha ao excluir ponto Wi-Fi');
  }
}

export async function fetchWifiEmpresas(): Promise<WifiEmpresa[]> {
  const response = await fetch(`${API_URL}/wifi-empresas`);

  if (!response.ok) {
    await parseApiError(response, 'Falha ao carregar empresas Wi-Fi');
  }

  return response.json();
}

export async function createWifiEmpresa(token: string, payload: WifiEmpresaInput): Promise<WifiEmpresa> {
  const response = await fetch(`${API_URL}/wifi-empresas`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    await parseApiError(response, 'Falha ao criar empresa Wi-Fi');
  }

  return response.json();
}

export async function updateWifiEmpresa(token: string, id: string, payload: WifiEmpresaInput): Promise<WifiEmpresa> {
  const response = await fetch(`${API_URL}/wifi-empresas/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    await parseApiError(response, 'Falha ao atualizar empresa Wi-Fi');
  }

  return response.json();
}

export async function deleteWifiEmpresa(token: string, id: string): Promise<void> {
  const response = await fetch(`${API_URL}/wifi-empresas/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    await parseApiError(response, 'Falha ao excluir empresa Wi-Fi');
  }
}
