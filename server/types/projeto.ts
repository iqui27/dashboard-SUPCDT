import { ObjectId } from 'mongodb';

export type StatusProjeto = 'Reprovada' | 'Em andamento' | 'Assinado' | 'Encerrado';
export type Categoria = 'Emenda' | 'INEX' | 'Convênio' | 'Outro' | 'Recurso Proprio';
export type StatusEmenda = 'Bloqueada' | 'Desbloqueada' | 'Anulada' | 'SERP' | 'SEEC';
export type TipoInstrumento = 'Termo de Colaboração' | 'Termo de Fomento';

export interface DBProjeto {
    _id?: ObjectId;
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
    emendasParlamentares: any[];
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
    aditivosVigencia: any[];
    aditivosValor: any[];
    prazos: any;
    historicoMovimentacoes: any[];
    localStatusUpdate?: any;
    overrideNeedsSync?: boolean;
    overrideLastUpdatedAt?: Date | null;
    overrideLastSyncedAt?: Date | null;
    createdAt?: Date | string;
    createdBy?: string;

    // SUPCDT
    metas: DBMeta[];
    cronograma: {
        totalTrimestres: number;
    };
    updatedAt?: Date;
}

export interface DBMeta {
    id: string; // custom generated string ID just to link in lancamentos easily
    codigo: string;
    descricao: string;
    unidade: string;
    totalPrevisto: number;
    previstoPorTrimestre: number[];
    realizadoTotal?: number;
    realizadoPorTrimestre?: number[];
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
