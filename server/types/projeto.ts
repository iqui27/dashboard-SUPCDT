import { ObjectId } from 'mongodb';

export type StatusProjeto = string;
export type Categoria = string;

export interface DBMeta {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  ano?: number | null;
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

// ─── Módulo: Etapas ──────────────────────────────────────────────────────────

export interface DBEntregavel {
  id: string;
  nome: string;
  concluido: boolean;
}

export interface DBEtapa {
  id: string;
  nome: string;
  percentual: number; // 0-100
  entregaveis: DBEntregavel[];
}

// ─── Módulo: Orçamento ───────────────────────────────────────────────────────

export interface DBAditivoRubrica {
  id: string;
  descricao: string;
  valor: number;
  data?: Date | null;
}

export interface DBRubricaOrcamentaria {
  id: string;
  nome: string;
  previsto: number;
  executado: number;
  aditivos: DBAditivoRubrica[];
}

// ─── Módulo: Parceiros ───────────────────────────────────────────────────────

export type DBStatusParceiro = 'Ativo' | 'Apoiador' | 'Consultor' | 'Inativo';

export interface DBParceiro {
  id: string;
  nome: string;
  papel: string;
  status: DBStatusParceiro;
}

// ─── Módulo: Riscos ──────────────────────────────────────────────────────────

export type DBProbabilidadeRisco = 'Baixa' | 'Média' | 'Alta';
export type DBImpactoRisco = 'Baixo' | 'Médio' | 'Alto';
export type DBStatusRisco = 'Aberto' | 'Mitigado' | 'Encerrado';

export interface DBRisco {
  id: string;
  descricao: string;
  probabilidade: DBProbabilidadeRisco;
  impacto: DBImpactoRisco;
  mitigacao?: string | null;
  status: DBStatusRisco;
}

// ─── Módulo: Governança ──────────────────────────────────────────────────────

export interface DBDecisaoGovernanca {
  id: string;
  titulo: string;
  data: Date;
  descricao?: string | null;
  responsavel?: string | null;
}

// ─── Módulo: Indicadores de Pesquisa ────────────────────────────────────────

export interface DBSerieDados {
  label: string;
  valor: number;
}

export interface DBIndicadorPesquisa {
  id: string;
  nome: string;
  categoria: string;
  serie: DBSerieDados[];
}

// ─── Configuração de Módulos ─────────────────────────────────────────────────

export interface DBModulosAtivos {
  etapas?: boolean | undefined;
  orcamento?: boolean | undefined;
  parceiros?: boolean | undefined;
  riscos?: boolean | undefined;
  governanca?: boolean | undefined;
  indicadores?: boolean | undefined;
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

  // ─── Módulos de Monitoramento Avançado (opcionais — retrocompatível) ──────
  modulosAtivos?: DBModulosAtivos;
  etapas?: DBEtapa[];
  rubricas?: DBRubricaOrcamentaria[];
  parceirosModulo?: DBParceiro[];
  riscos?: DBRisco[];
  decisoes?: DBDecisaoGovernanca[];
  indicadores?: DBIndicadorPesquisa[];
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

  // ─── Módulos de Monitoramento Avançado (opcionais — retrocompatível) ──────
  modulosAtivos?: DBModulosAtivos;
  etapas?: DBEtapa[];
  rubricas?: DBRubricaOrcamentaria[];
  parceirosModulo?: DBParceiro[];
  riscos?: DBRisco[];
  decisoes?: DBDecisaoGovernanca[];
  indicadores?: DBIndicadorPesquisa[];
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

  modulosAtivos?: DBModulosAtivos;
  etapas?: DBEtapa[];
  rubricas?: DBRubricaOrcamentaria[];
  parceirosModulo?: DBParceiro[];
  riscos?: DBRisco[];
  decisoes?: DBDecisaoGovernanca[];
  indicadores?: DBIndicadorPesquisa[];
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
