import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/client.js';
import { DBProjeto, DBProjetoMonitoramento, ProjetoApi, ProjetoInput } from '../types/projeto.js';

const COLLECTION_NAME = 'projetos_supcdt';

type ResolvedMonitoramentoOperacional = {
  statusOperacional: string;
  nivelRisco: string;
  saudeEntrega: string;
  precisaAcao: boolean;
  incidentesAbertos: number;
  manutencaoStatus: string;
  resumoExecutivo: string | null;
  bloqueios: string[];
  proximosPassos: string[];
  evidencias: NonNullable<DBProjetoMonitoramento['evidencias']>;
  coberturaDetalhada: string[];
  responsavelOperacional: string | null;
  ultimaAtualizacao: Date | null;
};

function sanitizeText(value?: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}

function sanitizeTextList(values?: string[] | null): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => sanitizeText(value))
    .filter((value): value is string => Boolean(value));
}

function normalizeEvidencias(values?: DBProjetoMonitoramento['evidencias']): NonNullable<DBProjetoMonitoramento['evidencias']> {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((item) => ({
      titulo: sanitizeText(item?.titulo) ?? '',
      url: sanitizeText(item?.url) ?? ''
    }))
    .filter((item) => item.titulo && item.url);
}

function isGenericIntegrationValue(value: string | null): boolean {
  if (!value) {
    return true;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return ['em planejamento', 'a definir', 'tbd', 'nao informado', 'n/a'].includes(normalized);
}

function parseOptionalDate(value?: string | Date | null): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(value?: Date | null): string | null {
  if (!value) {
    return null;
  }

  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function normalizeMeta(meta: DBProjeto['metas'][number]) {
  return {
    id: meta.id,
    codigo: meta.codigo,
    descricao: meta.descricao,
    unidade: meta.unidade,
    totalPrevisto: Number(meta.totalPrevisto) || 0,
    previstoPorTrimestre: Array.isArray(meta.previstoPorTrimestre) ? meta.previstoPorTrimestre : [],
    realizadoTotal: Number(meta.realizadoTotal) || 0,
    realizadoPorTrimestre: Array.isArray(meta.realizadoPorTrimestre) ? meta.realizadoPorTrimestre : []
  };
}

function buildIntegrationKey(projeto: DBProjeto, id: string): string {
  const numeroUnico = sanitizeText(projeto.numeroUnico);
  if (numeroUnico) {
    return numeroUnico;
  }

  const numeroTermo = sanitizeText(projeto.numeroTermo);
  const processoSEI = sanitizeText(projeto.processoSEI);
  if (numeroTermo && processoSEI && !isGenericIntegrationValue(numeroTermo)) {
    return `${numeroTermo}::${processoSEI}`;
  }

  if (numeroTermo && !isGenericIntegrationValue(numeroTermo)) {
    return numeroTermo;
  }

  const nome = sanitizeText(projeto.nome)?.toLowerCase().replace(/\s+/g, '-');
  return nome ? `${nome}::${id}` : id;
}

function getDiasRestantes(dataFim?: Date | null): number | null {
  if (!dataFim || Number.isNaN(dataFim.getTime())) {
    return null;
  }

  const diffInMs = dataFim.getTime() - Date.now();
  return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
}

function deriveStatusOperacional(projeto: DBProjeto): string {
  const status = sanitizeText(projeto.status)?.toLowerCase() ?? '';
  if (status.includes('encerr')) return 'Encerrado';
  if (status.includes('critico') || status.includes('paralis') || status.includes('cancel')) return 'Crítico';
  if (status.includes('ativo') || status.includes('andamento') || status.includes('assinado')) return 'Operando';
  if (status.includes('implant')) return 'Em implantação';
  return 'Planejado';
}

function deriveNivelRisco(projeto: DBProjeto, diasRestantes: number | null): string {
  const status = sanitizeText(projeto.status)?.toLowerCase() ?? '';
  const semResponsavel = !sanitizeText(projeto.responsavelSECTI);
  const semTerritorio = !sanitizeText(projeto.raPerigao);
  if (status.includes('critico') || status.includes('paralis') || status.includes('cancel') || (diasRestantes !== null && diasRestantes < 0)) {
    return 'Crítico';
  }
  if (diasRestantes !== null && diasRestantes <= 30) {
    return 'Alto';
  }
  if (semResponsavel || semTerritorio || status.includes('planejamento')) {
    return 'Médio';
  }
  return 'Baixo';
}

function deriveSaudeEntrega(nivelRisco: string, statusOperacional: string): string {
  if (nivelRisco === 'Crítico' || statusOperacional === 'Crítico') return 'Risco';
  if (nivelRisco === 'Alto' || statusOperacional === 'Em implantação') return 'Observação';
  return 'Saudável';
}

function buildMonitoringGaps(monitoramento: DBProjetoMonitoramento): string[] {
  const lacunas: string[] = [];

  if (!sanitizeText(monitoramento.resumoExecutivo)) {
    lacunas.push('Resumo executivo do acompanhamento');
  }
  if (!sanitizeTextList(monitoramento.bloqueios).length) {
    lacunas.push('Risco e bloqueios operacionais');
  }
  if (!normalizeEvidencias(monitoramento.evidencias).length) {
    lacunas.push('Evidências e anexos de campo');
  }
  if (!sanitizeTextList(monitoramento.coberturaDetalhada).length) {
    lacunas.push('Cobertura geográfica detalhada');
  }
  if (!sanitizeText(monitoramento.manutencaoStatus) || monitoramento.manutencaoStatus === 'Sem rotina') {
    lacunas.push('Manutenção e chamados');
  }
  if (!sanitizeText(monitoramento.responsavelOperacional)) {
    lacunas.push('Responsável operacional dedicado');
  }
  if (!sanitizeTextList(monitoramento.proximosPassos).length) {
    lacunas.push('Próximos passos operacionais');
  }

  return lacunas;
}

function buildMonitoramentoOperacional(projeto: DBProjeto): ResolvedMonitoramentoOperacional {
  const diasRestantes = getDiasRestantes(projeto.dataFim);
  const atual = projeto.monitoramento ?? {};
  const statusOperacional = sanitizeText(atual.statusOperacional) ?? deriveStatusOperacional(projeto);
  const nivelRisco = sanitizeText(atual.nivelRisco) ?? deriveNivelRisco(projeto, diasRestantes);
  const saudeEntrega = sanitizeText(atual.saudeEntrega) ?? deriveSaudeEntrega(nivelRisco, statusOperacional);

  return {
    statusOperacional,
    nivelRisco,
    saudeEntrega,
    precisaAcao: atual.precisaAcao ?? (nivelRisco === 'Alto' || nivelRisco === 'Crítico'),
    incidentesAbertos: Number(atual.incidentesAbertos) || 0,
    manutencaoStatus: sanitizeText(atual.manutencaoStatus) ?? 'Sem rotina',
    resumoExecutivo: sanitizeText(atual.resumoExecutivo),
    bloqueios: sanitizeTextList(atual.bloqueios),
    proximosPassos: sanitizeTextList(atual.proximosPassos),
    evidencias: normalizeEvidencias(atual.evidencias),
    coberturaDetalhada: sanitizeTextList(atual.coberturaDetalhada),
    responsavelOperacional: sanitizeText(atual.responsavelOperacional ?? projeto.responsavelSECTI),
    ultimaAtualizacao: parseOptionalDate(atual.ultimaAtualizacao) ?? projeto.updatedAt ?? projeto.createdAt ?? null
  };
}

function normalizeMonitoramentoInput(
  input: ProjetoInput['monitoramento'],
  fallbackResponsavel?: string | null
): DBProjetoMonitoramento {
  const raw = (input && 'operacional' in input && input.operacional
    ? { ...input, ...input.operacional }
    : input) ?? {};

  return {
    statusOperacional: sanitizeText(raw.statusOperacional) ?? null,
    nivelRisco: sanitizeText(raw.nivelRisco) ?? null,
    saudeEntrega: sanitizeText(raw.saudeEntrega) ?? null,
    precisaAcao: Boolean(raw.precisaAcao),
    incidentesAbertos: Number(raw.incidentesAbertos) || 0,
    manutencaoStatus: sanitizeText(raw.manutencaoStatus) ?? 'Sem rotina',
    resumoExecutivo: sanitizeText(raw.resumoExecutivo),
    bloqueios: sanitizeTextList(raw.bloqueios),
    proximosPassos: sanitizeTextList(raw.proximosPassos),
    evidencias: normalizeEvidencias(raw.evidencias),
    coberturaDetalhada: sanitizeTextList(raw.coberturaDetalhada),
    responsavelOperacional: sanitizeText(raw.responsavelOperacional ?? fallbackResponsavel),
    ultimaAtualizacao: parseOptionalDate(raw.ultimaAtualizacao) ?? new Date()
  };
}

export function mapProjetoToApi(projeto: DBProjeto): ProjetoApi {
  const id = projeto._id?.toString() ?? '';
  const metas = (projeto.metas ?? []).map(normalizeMeta);
  const totalPrevisto = metas.reduce((acc, meta) => acc + meta.totalPrevisto, 0);
  const totalRealizado = metas.reduce((acc, meta) => acc + meta.realizadoTotal, 0);
  const percentualExecucao = totalPrevisto > 0 ? (totalRealizado / totalPrevisto) * 100 : 0;
  const operacional = buildMonitoramentoOperacional(projeto);

  return {
    id,
    chaveIntegracao: buildIntegrationKey(projeto, id),
    numeroUnico: sanitizeText(projeto.numeroUnico),
    nome: projeto.nome?.trim() || 'Projeto sem nome',
    nomeOSC: sanitizeText(projeto.nomeOSC),
    status: projeto.status?.trim() || 'Status não informado',
    responsavelSECTI: sanitizeText(projeto.responsavelSECTI),
    numeroTermo: sanitizeText(projeto.numeroTermo),
    processoSEI: sanitizeText(projeto.processoSEI),
    parceiro: sanitizeText(projeto.parceiro),
    categoria: sanitizeText(projeto.categoria),
    dataInicio: toIsoDate(projeto.dataInicio),
    dataFim: toIsoDate(projeto.dataFim),
    valorTotal: Number(projeto.valorTotal) || 0,
    raPerigao: sanitizeText(projeto.raPerigao),
    descricao: sanitizeText(projeto.descricao),
    objetivos: sanitizeText(projeto.objetivos),
    metas,
    cronograma: {
      totalTrimestres: Math.max(1, Number(projeto.cronograma?.totalTrimestres) || 1)
    },
    monitoramento: {
      totalMetas: metas.length,
      totalPrevisto,
      totalRealizado,
      percentualExecucao,
      diasRestantes: getDiasRestantes(projeto.dataFim),
      lacunas: buildMonitoringGaps(operacional),
      operacional: {
        ...operacional,
        ultimaAtualizacao: toIsoDate(operacional.ultimaAtualizacao)
      }
    },
    modulosAtivos: projeto.modulosAtivos ?? undefined,
    createdAt: toIsoDate(projeto.createdAt),
    updatedAt: toIsoDate(projeto.updatedAt)
  };
}

export function normalizeProjetoInput(input: ProjetoInput): Omit<DBProjeto, '_id'> {
  const metas = Array.isArray(input.metas)
    ? input.metas.map((meta) => ({
        id: meta.id,
        codigo: meta.codigo,
        descricao: meta.descricao,
        unidade: meta.unidade,
        totalPrevisto: Number(meta.totalPrevisto) || 0,
        previstoPorTrimestre: Array.isArray(meta.previstoPorTrimestre) ? meta.previstoPorTrimestre : [],
        realizadoTotal: Number(meta.realizadoTotal) || 0,
        realizadoPorTrimestre: Array.isArray(meta.realizadoPorTrimestre) ? meta.realizadoPorTrimestre : []
      }))
    : [];

  return {
    numeroUnico: sanitizeText(input.numeroUnico),
    nome: input.nome?.trim() || input.projeto?.trim() || 'Projeto sem nome',
    nomeOSC: sanitizeText(input.nomeOSC ?? input.osc),
    status: input.status?.trim() || input.statusProjeto?.trim() || 'Em Planejamento',
    responsavelSECTI: sanitizeText(input.responsavelSECTI ?? input.responsavelPlanilha),
    numeroTermo: sanitizeText(input.numeroTermo ?? input.numeroTermoFomento),
    processoSEI: sanitizeText(input.processoSEI),
    parceiro: sanitizeText(input.parceiro),
    categoria: sanitizeText(input.categoria),
    dataInicio: parseOptionalDate(input.dataInicio ?? input.vigenciaInicio) ?? null,
    dataFim: parseOptionalDate(input.dataFim ?? input.vigenciaFinal) ?? null,
    valorTotal: Number(input.valorTotal) || 0,
    raPerigao: sanitizeText(input.raPerigao ?? input.regiaoAdministrativa),
    descricao: sanitizeText(input.descricao),
    objetivos: sanitizeText(input.objetivos),
    metas,
    cronograma: {
      totalTrimestres: Math.max(1, Number(input.cronograma?.totalTrimestres) || 1)
    },
    monitoramento: normalizeMonitoramentoInput(input.monitoramento, input.responsavelSECTI ?? input.responsavelPlanilha)
  };
}

export async function createProjeto(projetoData: Omit<DBProjeto, '_id'>): Promise<DBProjeto> {
  const db = await getDatabase('dashboard_supcdt');
  const collection = db.collection<DBProjeto>(COLLECTION_NAME);

  const novaEntrada: DBProjeto = {
    ...projetoData,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await collection.insertOne(novaEntrada);
  return { ...novaEntrada, _id: result.insertedId };
}

export async function getProjetos(): Promise<DBProjeto[]> {
  const db = await getDatabase('dashboard_supcdt');
  const collection = db.collection<DBProjeto>(COLLECTION_NAME);
  return collection.find({}).sort({ createdAt: -1 }).toArray();
}

export async function getProjetoById(id: string): Promise<DBProjeto | null> {
  const db = await getDatabase('dashboard_supcdt');
  const collection = db.collection<DBProjeto>(COLLECTION_NAME);

  try {
    return await collection.findOne({ _id: new ObjectId(id) });
  } catch {
    return null;
  }
}

export async function updateProjeto(id: string, updateData: Partial<DBProjeto>): Promise<boolean> {
  const db = await getDatabase('dashboard_supcdt');
  const collection = db.collection<DBProjeto>(COLLECTION_NAME);

  try {
    const { _id, createdAt, ...fieldsToUpdate } = updateData as DBProjeto;
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...fieldsToUpdate,
          updatedAt: new Date()
        }
      }
    );

    return result.matchedCount > 0;
  } catch {
    return false;
  }
}

export async function deleteProjeto(id: string): Promise<boolean> {
  const db = await getDatabase('dashboard_supcdt');
  const collection = db.collection<DBProjeto>(COLLECTION_NAME);

  try {
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  } catch {
    return false;
  }
}

export async function updateProjetoMetas(id: string, metas: DBProjeto['metas']): Promise<boolean> {
  const db = await getDatabase('dashboard_supcdt');
  const collection = db.collection<DBProjeto>(COLLECTION_NAME);

  try {
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          metas,
          updatedAt: new Date()
        }
      }
    );
    return result.modifiedCount > 0;
  } catch {
    return false;
  }
}
