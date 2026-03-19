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
  return Number.isFinite(projeto.monitoramento?.percentualExecucao)
    ? projeto.monitoramento.percentualExecucao
    : 0;
}

export function getProjetoLacunasMonitoramento(projeto: Projeto): string[] {
  return projeto.monitoramento?.lacunas ?? [];
}

export function getProjetoStatusOperacional(projeto: Projeto): string {
  return sanitizeDisplayValue(projeto.monitoramento?.operacional?.statusOperacional) ?? 'Planejado';
}

export function getProjetoNivelRisco(projeto: Projeto): string {
  return sanitizeDisplayValue(projeto.monitoramento?.operacional?.nivelRisco) ?? 'Médio';
}

export function getProjetoSaudeEntrega(projeto: Projeto): string {
  return sanitizeDisplayValue(projeto.monitoramento?.operacional?.saudeEntrega) ?? 'Observação';
}

export function getProjetoPrecisaAcao(projeto: Projeto): boolean {
  return Boolean(projeto.monitoramento?.operacional?.precisaAcao);
}

export function getProjetoIncidentesAbertos(projeto: Projeto): number {
  return Number(projeto.monitoramento?.operacional?.incidentesAbertos) || 0;
}
