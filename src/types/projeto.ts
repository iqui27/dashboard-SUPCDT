import type { StatusUpdate } from '../lib/statusUpdates';

export type StatusProjeto = 'Reprovada' | 'Em andamento' | 'Assinado' | 'Encerrado';
export type Categoria = 'Emenda' | 'INEX' | 'Convênio' | 'Outro' | 'Recurso Proprio';

export type StatusEmenda = 'Bloqueada' | 'Desbloqueada' | 'Anulada' | 'SERP' | 'SEEC';

export type TipoInstrumento = 'Termo de Colaboração' | 'Termo de Fomento';

export interface EmendaHistorico {
  id: string;
  data: Date;
  alteracao: string;
  usuario?: string;
}

export interface EmendaParlamentar {
  id: string;
  parlamentarId: string; // ObjectId como string - referência à collection parlamentares
  nome?: string; // Mantido para compatibilidade legada
  descentralizacao: boolean;
  numeroPortaria?: string;
  numeroOficio?: string;
  dataPublicacao?: Date;
  origem?: string;
  status: StatusEmenda;
  valor: number;
  historico: EmendaHistorico[];
}

// Parlamentar (collection separada)
export interface Parlamentar {
  _id?: string;
  nome: string;
  nomeNormalizado: string;
  createdAt: Date;
  updatedAt: Date;
}

// Projeto com dados populados (para frontend)
export interface ProjetoComParlamentares extends Omit<Projeto, 'emendasParlamentares'> {
  emendasParlamentares?: (EmendaParlamentar & {
    parlamentar: Parlamentar;
  })[];
}

export interface AditivoVigencia {
  id: string;
  dataInicio: Date;
  dataFim: Date;
  motivo: string;
  dataRegistro: Date;
}

export interface AditivoValor {
  id: string;
  valorAdicional: number;
  valorTotal: number;
  motivo: string;
  dataRegistro: Date;
}

export interface Prazos {
  rma: Date | null;
  despachoHomologacao: Date | null;
  relatorioExecucaoObjeto: Date | null;
  parecerTecnicoRelatorio: Date | null;
  decisaoFinal: Date | null;
  rmaCumprido?: boolean;
  despachoHomologacaoCumprido?: boolean;
  relatorioExecucaoObjetoCumprido?: boolean;
  parecerTecnicoRelatorioCumprido?: boolean;
  decisaoFinalCumprido?: boolean;
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

export interface Projeto {
  id: string;
  origin?: 'custom' | 'sheet';
  statusProjeto: StatusProjeto;
  assinaturaPublicacao: string;
  numeroTermoFomento: string;
  processoSEI: string;
  projeto: string;
  vigenciaInicio: Date | null;
  vigenciaEvento: Date | null;
  vigenciaFinal: Date | null;
  valorTotal: number;
  tipoSituacaoPagamento: string;
  parlamentar: string;
  emendasParlamentares: EmendaParlamentar[];
  etapaProjeto: string;
  osc: string;
  presidenteOSC: string;
  coordenadorProjeto: string;
  regiaoAdministrativa: string;
  regioesAdministrativas: string[];
  responsavelParecer?: string;
  responsavelPlanilha?: string;
  responsavelAlteracao?: string;
  statusPlanilha: string;
  statusDocumentacao: string;
  statusEscopoParecer: string;
  setor?: string;
  situacao: string;
  categoria: Categoria;
  tipoInstrumento?: TipoInstrumento;
  notasObs: string;
  tipoPublicoPrevisto: string;
  contrapartidasComissao: string;
  statusDesde: Date | null;
  financeiroParcela1: number | string;
  financeiroParcela2: number | string;
  financeiroParcela3: number | string;
  financeiroParcela4: number | string;
  relatorioMonitoramentoAvaliacaoComissao: string;
  dataPrestacaoContasOSC: Date | null;
  prorrogacaoPrestacaoContasMais30: Date | boolean | null;
  diasParado?: number;
  diasLimite?: number;
  aditivosVigencia: AditivoVigencia[];
  aditivosValor: AditivoValor[];
  prazos: Prazos;
  historicoMovimentacoes: MovimentacaoHistorico[];
  localStatusUpdate?: StatusUpdate;
  overrideNeedsSync?: boolean;
  overrideLastUpdatedAt?: Date | null;
  overrideLastSyncedAt?: Date | null;
  createdAt?: Date | string;
  createdBy?: string;

  // SUPCDT Novos Campos: Metas e Cronograma
  metas: Meta[];
  cronograma: {
    totalTrimestres: number; // Quantos trimestres tem o projeto
  };
}

export type Fomento = Projeto;

export interface ProjetoFilters {
  status: StatusProjeto[];
  assinaturaStatus: StatusProjeto[];
  parlamentar: string[];
  categoria: Categoria[];
  regiaoAdministrativa: string[];
  osc: string[];
  etapaProjeto: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  searchTerm: string;
}
export interface KPIData {
  totalProjetos: number;
  valorTotalAprovado: number;
  valorExecutado: number;
  statusDistribution: Record<StatusProjeto, number>;
  projetosAtencao: number;
  valorAssinados: number;
  valorNaoAssinados: number;
  localUpdates: number;
}

export interface Meta {
  id: string; // Internal ID for meta
  codigo: string; // "1", "1.1" etc
  descricao: string;
  unidade: string;
  totalPrevisto: number;
  previstoPorTrimestre: number[]; // e.g. [140, 140, 140, 140, 140]

  realizadoTotal: number; // Calculated on server or updated via lancamentos
  realizadoPorTrimestre: number[]; // Array matching length of trimestres
}

export interface Lancamento {
  id: string; // Mongo ID mapping
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