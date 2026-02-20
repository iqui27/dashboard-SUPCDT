// removed missing import

export type StatusProjeto = 'Assinado' | 'Não assinado' | 'Reprovado';
export type Categoria = 'Emenda' | 'INEX' | 'Convênio' | 'Outro';

export interface ParlamentarInfo {
  nome: string;
  valor?: number;
}

export interface MovimentacaoHistorico {
  id: string;
  data: Date;
  statusProjeto: StatusProjeto;
  situacao?: string;
  etapaProjeto?: string;
  notas?: string;
}

export interface Fomento {
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
  parlamentares: ParlamentarInfo[];
  etapaProjeto: string;
  osc: string;
  presidenteOSC: string;
  coordenadorProjeto: string;
  regiaoAdministrativa: string;
  regioesAdministrativas: string[];
  responsavelParecer: string;
  responsavelPlanilha: string;
  setor?: string;
  statusPlanilha: string;
  statusDocumentacao: string;
  statusEscopoParecer: string;
  situacao: string;
  categoria: Categoria;
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
  historicoMovimentacoes: MovimentacaoHistorico[];
  localStatusUpdate?: any;
  overrideNeedsSync?: boolean;
  overrideLastUpdatedAt?: Date | null;
  overrideLastSyncedAt?: Date | null;
  overrideFields?: string[];
}

export interface SheetFomento extends Fomento {
  sheetRowNumber: number;
}

export interface SerializedFomento extends Omit<Fomento, 'vigenciaInicio' | 'vigenciaEvento' | 'vigenciaFinal' | 'statusDesde' | 'dataPrestacaoContasOSC' | 'historicoMovimentacoes' | 'overrideLastUpdatedAt' | 'overrideLastSyncedAt'> {
  vigenciaInicio: string | null;
  vigenciaEvento: string | null;
  vigenciaFinal: string | null;
  statusDesde: string | null;
  dataPrestacaoContasOSC: string | null;
  historicoMovimentacoes: Array<Omit<MovimentacaoHistorico, 'data'> & { data: string }>;
  overrideLastUpdatedAt?: string | null;
  overrideLastSyncedAt?: string | null;
}
