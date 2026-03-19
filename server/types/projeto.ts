import { ObjectId } from 'mongodb';

export type StatusProjeto = string;
export type Categoria = string;

export interface DBMeta {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  totalPrevisto: number;
  previstoPorTrimestre: number[];
  realizadoTotal?: number;
  realizadoPorTrimestre?: number[];
}

export interface DBProjetoEvidencia {
  titulo: string;
  url: string;
}

export interface DBProjetoMonitoramento {
  statusOperacional?: string | null;
  nivelRisco?: string | null;
  saudeEntrega?: string | null;
  precisaAcao?: boolean;
  incidentesAbertos?: number;
  manutencaoStatus?: string | null;
  resumoExecutivo?: string | null;
  bloqueios?: string[];
  proximosPassos?: string[];
  evidencias?: DBProjetoEvidencia[];
  coberturaDetalhada?: string[];
  responsavelOperacional?: string | null;
  ultimaAtualizacao?: Date | null;
}

export interface DBProjeto {
  _id?: ObjectId;
  numeroUnico?: string | null;
  nome: string;
  nomeOSC?: string | null;
  status: StatusProjeto;
  responsavelSECTI?: string | null;
  numeroTermo?: string | null;
  processoSEI?: string | null;
  parceiro?: string | null;
  categoria?: Categoria | null;
  dataInicio?: Date | null;
  dataFim?: Date | null;
  valorTotal: number;
  raPerigao?: string | null;
  descricao?: string | null;
  objetivos?: string | null;
  metas: DBMeta[];
  cronograma: {
    totalTrimestres: number;
  };
  monitoramento?: DBProjetoMonitoramento;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProjetoMonitoramento {
  totalMetas: number;
  totalPrevisto: number;
  totalRealizado: number;
  percentualExecucao: number;
  diasRestantes: number | null;
  lacunas: string[];
  operacional: {
    statusOperacional: string;
    nivelRisco: string;
    saudeEntrega: string;
    precisaAcao: boolean;
    incidentesAbertos: number;
    manutencaoStatus: string;
    resumoExecutivo?: string | null;
    bloqueios: string[];
    proximosPassos: string[];
    evidencias: DBProjetoEvidencia[];
    coberturaDetalhada: string[];
    responsavelOperacional?: string | null;
    ultimaAtualizacao?: string | null;
  };
}

export interface ProjetoApi {
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
  metas: Array<{
    id: string;
    codigo: string;
    descricao: string;
    unidade: string;
    totalPrevisto: number;
    previstoPorTrimestre: number[];
    realizadoTotal: number;
    realizadoPorTrimestre: number[];
  }>;
  cronograma: {
    totalTrimestres: number;
  };
  monitoramento: ProjetoMonitoramento;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ProjetoInput {
  numeroUnico?: string | null;
  nome?: string;
  nomeOSC?: string | null;
  status?: StatusProjeto;
  responsavelSECTI?: string | null;
  numeroTermo?: string | null;
  processoSEI?: string | null;
  parceiro?: string | null;
  categoria?: Categoria | null;
  dataInicio?: string | Date | null;
  dataFim?: string | Date | null;
  valorTotal?: number;
  raPerigao?: string | null;
  descricao?: string | null;
  objetivos?: string | null;
  metas?: DBMeta[];
  cronograma?: {
    totalTrimestres?: number;
  };
  monitoramento?: Partial<DBProjetoMonitoramento> & {
    operacional?: Partial<DBProjetoMonitoramento>;
    ultimaAtualizacao?: string | Date | null;
  };

  // Compatibilidade temporária com o modelo anterior.
  projeto?: string;
  osc?: string;
  statusProjeto?: string;
  numeroTermoFomento?: string;
  regiaoAdministrativa?: string;
  vigenciaInicio?: string | Date | null;
  vigenciaFinal?: string | Date | null;
  responsavelPlanilha?: string | null;
}

export interface DBLancamento {
  _id?: ObjectId;
  projetoId: ObjectId | string;
  trimestre: number;
  dataRegistro: Date;
  registradoPor: string;
  valores: {
    metaId: string;
    valorRealizado: number;
    observacao?: string;
  }[];
  localAtendido?: string;
  descricaoAtividade: string;
  fotoUrl?: string[];
  documentoUrl?: string[];
  createdAt?: Date;
}
