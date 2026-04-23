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

// ---------------------------------------------------------------------------
// Wi-Fi Import from SEI
// ---------------------------------------------------------------------------

export interface WifiImportPoint {
  nome: string;
  endereco: string;
  cep?: string | null;
  regiaoAdministrativa: string;
  latitude: number;
  longitude: number;
  status: string;
  coberturaRaioMetros: number;
  velocidadeMbps?: number | null;
  usuariosConectados?: number | null;
  responsavelOperacional?: string | null;
  observacoes?: string | null;
  sourceExcerpt?: string;
}

export interface WifiImportResult {
  success: boolean;
  points: WifiImportPoint[];
  metadata: {
    processoSEI: string;
    documentsAnalyzed: number;
    extractionModel: string;
    durationMs: number;
    error?: string;
  };
  error?: string;
}

const IMPORT_TIMEOUT_MS = 120_000; // 2 minutes — scraper + Gemini AI can be slow

// ---------------------------------------------------------------------------
// Wi-Fi Import from SEI — Async polling pattern
// ---------------------------------------------------------------------------

const WIFI_IMPORT_POLL_INTERVAL_MS = 2000; // 2 seconds
const WIFI_IMPORT_MAX_POLL_MS = 180_000; // 3 minutes

interface WifiImportJobStart {
  jobId: string;
  status: 'pending' | 'processing';
  processoSEI: string;
}

interface WifiImportJobPoll {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: string;
  processoSEI: string;
  success?: boolean;
  points?: WifiImportPoint[];
  metadata?: WifiImportResult['metadata'];
  error?: string;
}

/**
 * Start an async WiFi import job and poll until completed or failed.
 *
 * The backend returns a jobId immediately (status 202) and processes
 * in the background. We poll every 2s until the job finishes or we
 * hit the 3-minute timeout.
 */
export async function importWifiPointsFromSei(
  token: string,
  processoSEI: string
): Promise<WifiImportResult> {
  // Step 1: Start the job
  const startResponse = await fetch(`${API_URL}/wifi/import-from-sei`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ processoSEI })
  });

  if (!startResponse.ok) {
    await parseApiError(startResponse, 'Falha ao iniciar importação do processo SEI');
  }

  const startData = (await startResponse.json()) as WifiImportJobStart;

  if (!startData.jobId) {
    throw new Error('Servidor não retornou jobId para a importação');
  }

  // Step 2: Poll for results
  const startTime = Date.now();

  while (Date.now() - startTime < WIFI_IMPORT_MAX_POLL_MS) {
    await new Promise((resolve) => setTimeout(resolve, WIFI_IMPORT_POLL_INTERVAL_MS));

    const pollResponse = await fetch(
      `${API_URL}/wifi/import-from-sei/${encodeURIComponent(startData.jobId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!pollResponse.ok) {
      if (pollResponse.status === 404) {
        throw new Error('Job de importação expirou. Tente novamente.');
      }
      await parseApiError(pollResponse, 'Falha ao consultar status da importação');
    }

    const pollData = (await pollResponse.json()) as WifiImportJobPoll;

    if (pollData.status === 'completed') {
      return {
        success: true,
        points: pollData.points || [],
        metadata: pollData.metadata || {
          processoSEI,
          documentsAnalyzed: 0,
          extractionModel: '',
          durationMs: Date.now() - startTime
        }
      };
    }

    if (pollData.status === 'failed') {
      return {
        success: false,
        points: [],
        metadata: {
          processoSEI,
          documentsAnalyzed: 0,
          extractionModel: '',
          durationMs: Date.now() - startTime,
          error: pollData.error
        },
        error: pollData.error || 'Falha na importação'
      };
    }

    // Still pending/processing — continue polling
  }

  // Timeout
  throw new Error('A importação demorou demais. Tente novamente.');
}

export interface WifiBulkCreateResult {
  success: boolean;
  created: WifiPoint[];
  total: number;
  createdCount: number;
  errors: Array<{ index: number; error: string }>;
}

export async function bulkCreateWifiPoints(
  token: string,
  points: WifiPointInput[]
): Promise<WifiBulkCreateResult> {
  const response = await fetch(`${API_URL}/wifi/bulk`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ points })
  });

  if (!response.ok) {
    await parseApiError(response, 'Falha ao criar pontos Wi-Fi em lote');
  }

  return response.json();
}
