import { getAuthToken } from './auth';

// Usa URL relativa para funcionar com o proxy do Vite, ou variável de ambiente
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const IMPORT_ENDPOINT = API_BASE_URL
  ? `${API_BASE_URL.replace(/\/$/, '')}/api/projects/import`
  : '/api/projects/import';

export type GeminiStatusProjeto = 'Assinado' | 'Em andamento' | 'Reprovada';
export type GeminiCategoria = 'Emenda' | 'INEX' | 'Convênio' | 'Outro';

export interface GeminiParlamentarInfo {
  nome: string;
  valor?: number;
}

export interface GeminiProjectSuggestion {
  projeto?: string;
  numeroTermoFomento?: string;
  processoSEI?: string;
  assinaturaPublicacao?: string;
  statusProjeto?: GeminiStatusProjeto | string;
  situacao?: string;
  etapaProjeto?: string;
  categoria?: GeminiCategoria | string;
  tipoInstrumento?: string;
  tipoSituacaoPagamento?: string;
  valorTotal?: number;
  parlamentar?: string;
  parlamentares?: GeminiParlamentarInfo[];
  emendasParlamentares?: GeminiParlamentarInfo[];
  osc?: string;
  presidenteOSC?: string;
  coordenadorProjeto?: string;
  regiaoAdministrativa?: string;
  regioesAdministrativas?: string[];
  responsavelParecer?: string;
  responsavelPlanilha?: string;
  statusPlanilha?: string;
  statusDocumentacao?: string;
  statusEscopoParecer?: string;
  tipoPublicoPrevisto?: string;
  contrapartidasComissao?: string;
  relatorioMonitoramentoAvaliacaoComissao?: string;
  notasObs?: string;
  vigenciaInicio?: string;
  vigenciaEvento?: string;
  vigenciaFinal?: string;
  statusDesde?: string;
  financeiroParcela1?: string | number;
  financeiroParcela2?: string | number;
  financeiroParcela3?: string | number;
  financeiroParcela4?: string | number;
  dataPrestacaoContasOSC?: string;
  prorrogacaoPrestacaoContasMais30?: string;
  diasParado?: number;
  diasLimite?: number;
  setor?: string;
  aditivosVigencia?: { dataInicio: string; dataFim: string; motivo: string }[];
  aditivosValor?: { valorAdicional: number; valorTotal: number; motivo: string }[];
  prazosRma?: string;
  prazosDespachoHomologacao?: string;
  prazosRelatorioExecucaoObjeto?: string;
  prazosParecerTecnicoRelatorio?: string;
  prazosDecisaoFinal?: string;
}

export interface ProjectImportResponse {
  suggestion: GeminiProjectSuggestion;
  usageMetadata?: Record<string, unknown>;
}

export interface ImportProgress {
  stage: 'uploading' | 'processing' | 'complete';
  uploadProgress?: number;
  message: string;
}

export async function importProjectFromPdf(
  file: File,
  onProgress?: (progress: ImportProgress) => void
): Promise<ProjectImportResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise<ProjectImportResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress({
          stage: 'uploading',
          uploadProgress: percentComplete,
          message: `Enviando PDF... ${Math.round(percentComplete)}%`
        });
      }
    });

    xhr.upload.addEventListener('loadend', () => {
      if (onProgress) {
        onProgress({
          stage: 'processing',
          uploadProgress: 100,
          message: 'Processando PDF com Gemini AI...'
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as ProjectImportResponse;
          if (onProgress) {
            onProgress({
              stage: 'complete',
              uploadProgress: 100,
              message: 'PDF processado com sucesso!'
            });
          }
          resolve(response);
        } catch (error) {
          reject(new Error('Falha ao interpretar resposta do servidor'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText) as { error?: string };
          reject(new Error(errorData.error ?? 'Falha ao processar PDF'));
        } catch {
          reject(new Error('Falha ao processar PDF'));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Erro de rede ao enviar PDF'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelado'));
    });

    xhr.open('POST', IMPORT_ENDPOINT);

    // Adicionar token de autenticação
    const token = getAuthToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(formData);
  });
}
