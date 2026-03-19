import type { StatusUpdate } from '../lib/statusUpdates';

export type StatusProjeto = string;
export type Categoria = string;
export type TipoInstrumento = string;

export interface EmendaHistorico {
  id: string;
  data: Date;
  alteracao: string;
  usuario?: string;
}

export interface Parlamentar {
  _id?: string;
  nome: string;
  nomeNormalizado: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmendaParlamentar {
  id: string;
  parlamentarId?: string;
  nome?: string;
  descentralizacao?: boolean;
  numeroPortaria?: string;
  numeroOficio?: string;
  dataPublicacao?: Date;
  origem?: string;
  status?: string;
  valor?: number;
  historico?: EmendaHistorico[];
  parlamentar?: Parlamentar;
}

export interface MovimentacaoHistorico {
  id: string;
  data: Date;
  statusProjeto: StatusProjeto;
  situacao?: string;
  etapaProjeto?: string;
  setor?: string;
  notas?: string;
}

export interface ProjetoCronograma {
  totalTrimestres: number;
}

export interface ProjetoEvidencia {
  titulo: string;
  url: string;
}

export interface MonitoramentoOperacional {
  statusOperacional: string;
  nivelRisco: string;
  saudeEntrega: string;
  precisaAcao: boolean;
  incidentesAbertos: number;
  manutencaoStatus: string;
  resumoExecutivo?: string | null;
  bloqueios: string[];
  proximosPassos: string[];
  evidencias: ProjetoEvidencia[];
  coberturaDetalhada: string[];
  responsavelOperacional?: string | null;
  ultimaAtualizacao?: string | null;
}

export interface Meta {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  totalPrevisto: number;
  previstoPorTrimestre: number[];
  realizadoTotal: number;
  realizadoPorTrimestre: number[];
}

export interface ProjetoMonitoramento {
  totalMetas: number;
  totalPrevisto: number;
  totalRealizado: number;
  percentualExecucao: number;
  diasRestantes: number | null;
  lacunas: string[];
  operacional: MonitoramentoOperacional;
}

export interface Projeto {
  id: string;
  chaveIntegracao: string;
  numeroUnico?: string | null;
  nome: string;
  nomeOSC?: string | null;
  status: StatusProjeto;
  responsavelSECTI?: string | null;
  numeroTermo?: string | null;
  processoSEI?: string | null;
  parceiro?: string | null;
  categoria?: Categoria | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  valorTotal: number;
  raPerigao?: string | null;
  descricao?: string | null;
  objetivos?: string | null;
  metas: Meta[];
  cronograma: ProjetoCronograma;
  monitoramento: ProjetoMonitoramento;
  createdAt?: string | null;
  updatedAt?: string | null;

  // Metadados legados/integradores preservados enquanto módulos antigos são migrados.
  parlamentar?: string | null;
  emendasParlamentares?: EmendaParlamentar[];
  localStatusUpdate?: StatusUpdate;
  overrideNeedsSync?: boolean;
  overrideLastUpdatedAt?: Date | null;
  overrideLastSyncedAt?: Date | null;
}

export interface ProjetoInput {
  numeroUnico?: string | null;
  nome: string;
  nomeOSC?: string | null;
  status: StatusProjeto;
  responsavelSECTI?: string | null;
  numeroTermo?: string | null;
  processoSEI?: string | null;
  parceiro?: string | null;
  categoria?: Categoria | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  valorTotal: number;
  raPerigao?: string | null;
  descricao?: string | null;
  objetivos?: string | null;
  metas: Meta[];
  cronograma: ProjetoCronograma;
  monitoramento?: Partial<MonitoramentoOperacional>;
}

export type Fomento = Projeto;

export interface ProjetoFilters {
  status: string[];
  categoria: string[];
  regiaoAdministrativa: string[];
  osc: string[];
  searchTerm: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface KPIData {
  totalProjetos: number;
  valorTotalAprovado: number;
  valorExecutado: number;
  statusDistribution: Record<string, number>;
  projetosAtencao: number;
  valorAssinados: number;
  valorNaoAssinados: number;
  localUpdates: number;
}

export interface Lancamento {
  id: string;
  projetoId: string;
  trimestre: number;
  dataRegistro: Date;
  registradoPor: string;
  valores: LancamentoValor[];
  localAtendido?: string;
  descricaoAtividade: string;
  fotoUrl?: string[];
  documentoUrl?: string[];
  createdAt?: Date;
}

export interface LancamentoValor {
  metaId: string;
  valorRealizado: number;
  observacao?: string;
}

const DEFAULT_MONITORAMENTO_OPERACIONAL: MonitoramentoOperacional = {
  statusOperacional: 'Planejado',
  nivelRisco: 'Médio',
  saudeEntrega: 'Observação',
  precisaAcao: false,
  incidentesAbertos: 0,
  manutencaoStatus: 'Sem rotina',
  resumoExecutivo: null,
  bloqueios: [],
  proximosPassos: [],
  evidencias: [],
  coberturaDetalhada: [],
  responsavelOperacional: null,
  ultimaAtualizacao: null
};

function normalizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);
}

function normalizeEvidencias(values: unknown): ProjetoEvidencia[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((item) => {
      const evidencia = item as ProjetoEvidencia | undefined;
      return {
        titulo: typeof evidencia?.titulo === 'string' ? evidencia.titulo.trim() : '',
        url: typeof evidencia?.url === 'string' ? evidencia.url.trim() : ''
      };
    })
    .filter((item) => item.titulo && item.url);
}

const PLACEHOLDER_VALUES = new Set([
  '',
  'a definir',
  'aguardando definicao',
  'nao informado',
  'não informado',
  'nao especificado',
  'não especificado',
  'n/a',
  'sem informacao',
  'sem informação',
  'tbd'
]);

function normalizeValue(value?: string | null): string {
  return (value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function isPlaceholderValue(value?: string | null): boolean {
  return PLACEHOLDER_VALUES.has(normalizeValue(value));
}

export function sanitizeDisplayValue(value?: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || isPlaceholderValue(trimmed)) {
    return null;
  }
  return trimmed;
}

export function getProjetoNome(projeto: Projeto): string {
  return sanitizeDisplayValue(projeto.nome) ?? 'Projeto sem nome';
}

export function getProjetoOsc(projeto: Projeto): string | null {
  return sanitizeDisplayValue(projeto.nomeOSC);
}

export function getProjetoStatus(projeto: Projeto): string {
  return sanitizeDisplayValue(projeto.status) ?? 'Status não informado';
}

export function getProjetoResponsavel(projeto: Projeto): string | null {
  return sanitizeDisplayValue(projeto.responsavelSECTI);
}

export function getProjetoTerritorio(projeto: Projeto): string | null {
  return sanitizeDisplayValue(projeto.raPerigao);
}

export function getProjetoNumeroTermo(projeto: Projeto): string | null {
  return sanitizeDisplayValue(projeto.numeroTermo);
}

export function getProjetoParceiro(projeto: Projeto): string | null {
  return sanitizeDisplayValue(projeto.parceiro);
}

export function getProjetoNumeroUnico(projeto: Projeto): string | null {
  return sanitizeDisplayValue(projeto.numeroUnico);
}

export function parseProjetoDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getProjetoPercentualExecucao(projeto: Projeto): number {
  const percentualExecucao = Number(getProjetoMonitoramento(projeto).percentualExecucao);
  return Number.isFinite(percentualExecucao)
    ? percentualExecucao
    : 0;
}

export function getProjetoLacunasMonitoramento(projeto: Projeto): string[] {
  return getProjetoMonitoramento(projeto).lacunas;
}

export function getProjetoMonitoramentoOperacional(projeto?: Partial<Projeto> | null): MonitoramentoOperacional {
  const operacional = projeto?.monitoramento?.operacional;

  return {
    ...DEFAULT_MONITORAMENTO_OPERACIONAL,
    statusOperacional: sanitizeDisplayValue(operacional?.statusOperacional) ?? DEFAULT_MONITORAMENTO_OPERACIONAL.statusOperacional,
    nivelRisco: sanitizeDisplayValue(operacional?.nivelRisco) ?? DEFAULT_MONITORAMENTO_OPERACIONAL.nivelRisco,
    saudeEntrega: sanitizeDisplayValue(operacional?.saudeEntrega) ?? DEFAULT_MONITORAMENTO_OPERACIONAL.saudeEntrega,
    precisaAcao: Boolean(operacional?.precisaAcao),
    incidentesAbertos: Number(operacional?.incidentesAbertos) || 0,
    manutencaoStatus: sanitizeDisplayValue(operacional?.manutencaoStatus) ?? DEFAULT_MONITORAMENTO_OPERACIONAL.manutencaoStatus,
    resumoExecutivo: sanitizeDisplayValue(operacional?.resumoExecutivo) ?? null,
    bloqueios: normalizeStringList(operacional?.bloqueios),
    proximosPassos: normalizeStringList(operacional?.proximosPassos),
    evidencias: normalizeEvidencias(operacional?.evidencias),
    coberturaDetalhada: normalizeStringList(operacional?.coberturaDetalhada),
    responsavelOperacional:
      sanitizeDisplayValue(operacional?.responsavelOperacional) ?? sanitizeDisplayValue(projeto?.responsavelSECTI) ?? null,
    ultimaAtualizacao: typeof operacional?.ultimaAtualizacao === 'string' ? operacional.ultimaAtualizacao : null
  };
}

export function getProjetoMonitoramento(projeto?: Partial<Projeto> | null): ProjetoMonitoramento {
  const monitoramento = projeto?.monitoramento;

  return {
    totalMetas: Number(monitoramento?.totalMetas) || (Array.isArray(projeto?.metas) ? projeto.metas.length : 0),
    totalPrevisto: Number(monitoramento?.totalPrevisto) || 0,
    totalRealizado: Number(monitoramento?.totalRealizado) || 0,
    percentualExecucao: Number(monitoramento?.percentualExecucao) || 0,
    diasRestantes: typeof monitoramento?.diasRestantes === 'number' ? monitoramento.diasRestantes : null,
    lacunas: normalizeStringList(monitoramento?.lacunas),
    operacional: getProjetoMonitoramentoOperacional(projeto)
  };
}

export function normalizeProjeto(projeto: Projeto): Projeto {
  return {
    ...projeto,
    metas: Array.isArray(projeto.metas) ? projeto.metas : [],
    cronograma: {
      totalTrimestres: Math.max(1, Number(projeto.cronograma?.totalTrimestres) || 1)
    },
    monitoramento: getProjetoMonitoramento(projeto)
  };
}

export function normalizeProjetos(projetos: Projeto[]): Projeto[] {
  return Array.isArray(projetos) ? projetos.map(normalizeProjeto) : [];
}

export function getProjetoStatusOperacional(projeto: Projeto): string {
  return sanitizeDisplayValue(getProjetoMonitoramentoOperacional(projeto).statusOperacional) ?? 'Planejado';
}

export function getProjetoNivelRisco(projeto: Projeto): string {
  return sanitizeDisplayValue(getProjetoMonitoramentoOperacional(projeto).nivelRisco) ?? 'Médio';
}

export function getProjetoSaudeEntrega(projeto: Projeto): string {
  return sanitizeDisplayValue(getProjetoMonitoramentoOperacional(projeto).saudeEntrega) ?? 'Observação';
}

export function getProjetoPrecisaAcao(projeto: Projeto): boolean {
  return getProjetoMonitoramentoOperacional(projeto).precisaAcao;
}

export function getProjetoIncidentesAbertos(projeto: Projeto): number {
  return getProjetoMonitoramentoOperacional(projeto).incidentesAbertos;
}
