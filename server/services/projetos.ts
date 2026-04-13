import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/client.js';
import {
  DBProjeto,
  DBProjetoHistoricoAlteracao,
  DBProjetoHistoricoItem,
  DBProjetoMonitoramento,
  ProjetoApi,
  ProjetoHistoricoAcao,
  ProjetoInput
} from '../types/projeto.js';

const COLLECTION_NAME = 'projetos_supcdt';
const MAX_HISTORICO_ALTERACOES = 120;

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

type ProjetoAuditSnapshot = Record<string, string | null>;

const AUDIT_FIELD_DEFINITIONS = [
  { key: 'nome', label: 'Nome do projeto' },
  { key: 'nomeOSC', label: 'OSC' },
  { key: 'status', label: 'Status do projeto' },
  { key: 'responsavelSECTI', label: 'Responsável SECTI' },
  { key: 'numeroUnico', label: 'Número único' },
  { key: 'numeroTermo', label: 'Número do termo' },
  { key: 'processoSEI', label: 'Processo SEI' },
  { key: 'parceiro', label: 'Parceiro institucional' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'dataInicio', label: 'Data de início' },
  { key: 'dataFim', label: 'Data de fim' },
  { key: 'valorTotal', label: 'Valor total' },
  { key: 'raPerigao', label: 'Território declarado' },
  { key: 'descricao', label: 'Descrição operacional' },
  { key: 'objetivos', label: 'Objetivos' },
  { key: 'metas', label: 'Metas cadastradas' },
  { key: 'cronograma', label: 'Cronograma' },
  { key: 'statusOperacional', label: 'Status operacional' },
  { key: 'nivelRisco', label: 'Nível de risco' },
  { key: 'saudeEntrega', label: 'Saúde da entrega' },
  { key: 'precisaAcao', label: 'Ação prioritária' },
  { key: 'incidentesAbertos', label: 'Incidentes abertos' },
  { key: 'manutencaoStatus', label: 'Status de manutenção' },
  { key: 'responsavelOperacional', label: 'Responsável operacional' },
  { key: 'resumoExecutivo', label: 'Resumo executivo' },
  { key: 'bloqueios', label: 'Bloqueios' },
  { key: 'proximosPassos', label: 'Próximos passos' },
  { key: 'coberturaDetalhada', label: 'Cobertura detalhada' },
  { key: 'evidencias', label: 'Evidências' }
] as const;

export interface ProjetoHistoricoActorInput {
  userId?: string | null;
  username?: string | null;
  fullName?: string | null;
}

interface ProjetoHistoricoPayload {
  acao: ProjetoHistoricoAcao;
  resumo: string;
  alteracoes?: DBProjetoHistoricoAlteracao[];
  usuario?: ProjetoHistoricoActorInput;
  data?: Date;
}

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

function formatCurrencyValue(value?: number | null): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatAuditDate(value?: Date | null): string | null {
  if (!value || Number.isNaN(value.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('pt-BR').format(value);
}

function summarizeText(value?: string | null, maxLength = 140): string | null {
  const sanitized = sanitizeText(value)?.replace(/\s+/g, ' ');
  if (!sanitized) {
    return null;
  }

  return sanitized.length <= maxLength ? sanitized : `${sanitized.slice(0, maxLength - 1)}…`;
}

function summarizeList(values?: string[] | null, emptyLabel?: string): string | null {
  const sanitized = sanitizeTextList(values);
  if (!sanitized.length) {
    return emptyLabel ?? null;
  }

  if (sanitized.length <= 3) {
    return sanitized.join('; ');
  }

  return `${sanitized.slice(0, 3).join('; ')} (+${sanitized.length - 3})`;
}

function summarizeMetas(metas?: DBProjeto['metas']): string | null {
  if (!Array.isArray(metas) || !metas.length) {
    return 'Nenhuma meta';
  }

  const labels = metas
    .map((meta) => sanitizeText(meta.codigo) ?? summarizeText(meta.descricao, 48))
    .filter((value): value is string => Boolean(value));

  const preview = labels.slice(0, 3).join(', ');
  return `${metas.length} meta(s)${preview ? `: ${preview}` : ''}${labels.length > 3 ? ` (+${labels.length - 3})` : ''}`;
}

function summarizeEvidencias(evidencias?: DBProjetoMonitoramento['evidencias']): string | null {
  const normalized = normalizeEvidencias(evidencias);
  if (!normalized.length) {
    return 'Nenhuma evidência';
  }

  const preview = normalized
    .slice(0, 2)
    .map((item) => item.titulo)
    .join(', ');

  return `${normalized.length} evidência(s)${preview ? `: ${preview}` : ''}${normalized.length > 2 ? ` (+${normalized.length - 2})` : ''}`;
}

function resolveHistoricoUsuario(usuario?: ProjetoHistoricoActorInput) {
  return {
    userId: sanitizeText(usuario?.userId),
    username: sanitizeText(usuario?.username) ?? 'sistema',
    fullName: sanitizeText(usuario?.fullName)
  };
}

function buildProjetoAuditSnapshot(projeto: Partial<DBProjeto>): ProjetoAuditSnapshot {
  const monitoramento = projeto.monitoramento ?? {};

  return {
    nome: sanitizeText(projeto.nome) ?? null,
    nomeOSC: sanitizeText(projeto.nomeOSC) ?? null,
    status: sanitizeText(projeto.status) ?? null,
    responsavelSECTI: sanitizeText(projeto.responsavelSECTI) ?? null,
    numeroUnico: sanitizeText(projeto.numeroUnico) ?? null,
    numeroTermo: sanitizeText(projeto.numeroTermo) ?? null,
    processoSEI: sanitizeText(projeto.processoSEI) ?? null,
    parceiro: sanitizeText(projeto.parceiro) ?? null,
    categoria: sanitizeText(projeto.categoria) ?? null,
    dataInicio: formatAuditDate(projeto.dataInicio) ?? null,
    dataFim: formatAuditDate(projeto.dataFim) ?? null,
    valorTotal: formatCurrencyValue(projeto.valorTotal) ?? null,
    raPerigao: sanitizeText(projeto.raPerigao) ?? null,
    descricao: summarizeText(projeto.descricao) ?? null,
    objetivos: summarizeText(projeto.objetivos) ?? null,
    metas: summarizeMetas(projeto.metas) ?? null,
    cronograma:
      projeto.cronograma?.totalTrimestres && Number(projeto.cronograma.totalTrimestres) > 0
        ? `${Math.max(1, Number(projeto.cronograma.totalTrimestres))} trimestre(s)`
        : null,
    statusOperacional: sanitizeText(monitoramento.statusOperacional) ?? null,
    nivelRisco: sanitizeText(monitoramento.nivelRisco) ?? null,
    saudeEntrega: sanitizeText(monitoramento.saudeEntrega) ?? null,
    precisaAcao:
      typeof monitoramento.precisaAcao === 'boolean'
        ? (monitoramento.precisaAcao ? 'Sim' : 'Não')
        : null,
    incidentesAbertos:
      typeof monitoramento.incidentesAbertos === 'number'
        ? String(Number(monitoramento.incidentesAbertos) || 0)
        : null,
    manutencaoStatus: sanitizeText(monitoramento.manutencaoStatus) ?? null,
    responsavelOperacional: sanitizeText(monitoramento.responsavelOperacional) ?? null,
    resumoExecutivo: summarizeText(monitoramento.resumoExecutivo) ?? null,
    bloqueios: summarizeList(monitoramento.bloqueios, 'Nenhum bloqueio') ?? null,
    proximosPassos: summarizeList(monitoramento.proximosPassos, 'Nenhum próximo passo') ?? null,
    coberturaDetalhada: summarizeList(monitoramento.coberturaDetalhada, 'Cobertura não detalhada') ?? null,
    evidencias: summarizeEvidencias(monitoramento.evidencias) ?? null
  };
}

function buildProjetoHistoricoAlteracoes(
  anterior: Partial<DBProjeto>,
  atual: Partial<DBProjeto>
): DBProjetoHistoricoAlteracao[] {
  const snapshotAnterior = buildProjetoAuditSnapshot(anterior);
  const snapshotAtual = buildProjetoAuditSnapshot(atual);

  return AUDIT_FIELD_DEFINITIONS.flatMap(({ key, label }) => {
    const antes = snapshotAnterior[key];
    const depois = snapshotAtual[key];
    if (antes === depois) {
      return [];
    }

    return [{
      campo: label,
      antes: antes ?? null,
      depois: depois ?? null
    }];
  });
}

function buildProjetoHistoricoCriacao(projeto: Omit<DBProjeto, '_id'>): DBProjetoHistoricoAlteracao[] {
  const snapshot = buildProjetoAuditSnapshot(projeto);

  return AUDIT_FIELD_DEFINITIONS.flatMap(({ key, label }) => {
    const depois = snapshot[key];
    if (!depois) {
      return [];
    }

    return [{
      campo: label,
      depois
    }];
  });
}

function buildResumoAtualizacao(alteracoes: DBProjetoHistoricoAlteracao[]): string {
  if (alteracoes.length === 0) {
    return 'Atualizou dados do projeto.';
  }

  if (alteracoes.length === 1) {
    return `Atualizou ${alteracoes[0].campo.toLowerCase()}.`;
  }

  if (alteracoes.length <= 3) {
    return `Atualizou ${alteracoes.map((item) => item.campo.toLowerCase()).join(', ')}.`;
  }

  return `Atualizou ${alteracoes.length} campos do projeto.`;
}

function buildHistoricoItem(payload: ProjetoHistoricoPayload): DBProjetoHistoricoItem {
  return {
    id: new ObjectId().toString(),
    acao: payload.acao,
    data: payload.data ?? new Date(),
    resumo: sanitizeText(payload.resumo) ?? 'Atualização registrada no projeto.',
    usuario: resolveHistoricoUsuario(payload.usuario),
    alteracoes: Array.isArray(payload.alteracoes) ? payload.alteracoes : []
  };
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
    historicoAlteracoes: (projeto.historicoAlteracoes ?? []).map((item) => ({
      id: item.id,
      acao: item.acao,
      data: toIsoDate(item.data) ?? new Date().toISOString(),
      resumo: item.resumo,
      usuario: {
        userId: sanitizeText(item.usuario?.userId),
        username: sanitizeText(item.usuario?.username) ?? 'sistema',
        fullName: sanitizeText(item.usuario?.fullName)
      },
      alteracoes: Array.isArray(item.alteracoes)
        ? item.alteracoes.map((alteracao) => ({
            campo: alteracao.campo,
            antes: sanitizeText(alteracao.antes),
            depois: sanitizeText(alteracao.depois)
          }))
        : []
    })),
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

export async function createProjeto(
  projetoData: Omit<DBProjeto, '_id'>,
  usuario?: ProjetoHistoricoActorInput
): Promise<DBProjeto> {
  const db = await getDatabase('dashboard_supcdt');
  const collection = db.collection<DBProjeto>(COLLECTION_NAME);

  const novaEntrada: DBProjeto = {
    ...projetoData,
    historicoAlteracoes: [
      buildHistoricoItem({
        acao: 'criado',
        resumo: 'Projeto cadastrado na carteira monitorada.',
        alteracoes: buildProjetoHistoricoCriacao(projetoData),
        usuario
      })
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await collection.insertOne(novaEntrada);
  return { ...novaEntrada, _id: result.insertedId };
}

export async function getProjetos(): Promise<DBProjeto[]> {
  const db = await getDatabase('dashboard_supcdt');
  const collection = db.collection<DBProjeto>(COLLECTION_NAME);
  return collection.find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray();
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

export async function registrarProjetoHistorico(
  projetoId: string,
  payload: ProjetoHistoricoPayload
): Promise<void> {
  const db = await getDatabase('dashboard_supcdt');
  const collection = db.collection<DBProjeto>(COLLECTION_NAME);

  try {
    const projeto = await collection.findOne({ _id: new ObjectId(projetoId) });
    if (!projeto) {
      return;
    }

    const historicoAtualizado = [
      ...(projeto.historicoAlteracoes ?? []),
      buildHistoricoItem(payload)
    ].slice(-MAX_HISTORICO_ALTERACOES);

    await collection.updateOne(
      { _id: new ObjectId(projetoId) },
      { $set: { historicoAlteracoes: historicoAtualizado } }
    );
  } catch {
    // Mantemos o fluxo principal resiliente mesmo se a escrita do histórico falhar.
  }
}

export async function updateProjeto(
  id: string,
  updateData: Partial<DBProjeto>,
  usuario?: ProjetoHistoricoActorInput
): Promise<boolean> {
  const db = await getDatabase('dashboard_supcdt');
  const collection = db.collection<DBProjeto>(COLLECTION_NAME);

  try {
    const projetoAtual = await collection.findOne({ _id: new ObjectId(id) });
    if (!projetoAtual) {
      return false;
    }

    const { _id, createdAt, historicoAlteracoes, ...fieldsToUpdate } = updateData as DBProjeto;
    const proximoProjeto: DBProjeto = {
      ...projetoAtual,
      ...fieldsToUpdate,
      monitoramento: fieldsToUpdate.monitoramento ?? projetoAtual.monitoramento,
      metas: fieldsToUpdate.metas ?? projetoAtual.metas,
      cronograma: fieldsToUpdate.cronograma ?? projetoAtual.cronograma
    };
    const alteracoes = buildProjetoHistoricoAlteracoes(projetoAtual, proximoProjeto);
    const proximoHistorico = alteracoes.length
      ? [
          ...(projetoAtual.historicoAlteracoes ?? []),
          buildHistoricoItem({
            acao: 'atualizado',
            resumo: buildResumoAtualizacao(alteracoes),
            alteracoes,
            usuario
          })
        ].slice(-MAX_HISTORICO_ALTERACOES)
      : projetoAtual.historicoAlteracoes;
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...fieldsToUpdate,
          ...(alteracoes.length ? { historicoAlteracoes: proximoHistorico } : {}),
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
