import { useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Activity, AlertTriangle, Link2, Radar, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { formatCurrency } from '../../lib/currencyUtils';
import {
  Projeto,
  getProjetoIncidentesAbertos,
  getProjetoLacunasMonitoramento,
  getProjetoMonitoramento,
  getProjetoMonitoramentoOperacional,
  getProjetoNivelRisco,
  getProjetoNome,
  getProjetoOsc,
  getProjetoPercentualExecucao,
  getProjetoPrecisaAcao,
  getProjetoResponsavel,
  getProjetoSaudeEntrega,
  getProjetoStatus,
  getProjetoStatusOperacional,
  getProjetoTerritorio,
  parseProjetoDate
} from '../../types/projeto';

interface DashboardGeralProps {
  projetos: Projeto[];
}

interface ProjetoAlerta {
  projetoId: string;
  projetoNome: string;
  motivo: string;
  severidade: 'critico' | 'atencao';
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 26
    }
  }
};

function normalizeText(value?: string | null): string {
  return value
    ?.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') ?? '';
}

function getDiasRestantes(projeto: Projeto): number | null {
  const dataFim = parseProjetoDate(projeto.dataFim);
  if (!dataFim) {
    return null;
  }

  return Math.ceil((dataFim.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function buildProjetoAlerta(projeto: Projeto): ProjetoAlerta | null {
  const status = normalizeText(getProjetoStatus(projeto));
  const statusOperacional = normalizeText(getProjetoStatusOperacional(projeto));
  const nivelRisco = normalizeText(getProjetoNivelRisco(projeto));
  const precisaAcao = getProjetoPrecisaAcao(projeto);
  const incidentesAbertos = getProjetoIncidentesAbertos(projeto);
  const lacunas = getProjetoLacunasMonitoramento(projeto);
  const diasRestantes = getDiasRestantes(projeto);
  const responsavel = getProjetoResponsavel(projeto);
  const territorio = getProjetoTerritorio(projeto);

  if (statusOperacional.includes('critico') || nivelRisco.includes('critico') || incidentesAbertos >= 3) {
    return {
      projetoId: projeto.id,
      projetoNome: getProjetoNome(projeto),
      motivo:
        incidentesAbertos >= 3
          ? `${incidentesAbertos} incidentes operacionais abertos`
          : `Leitura operacional crítica: ${getProjetoStatusOperacional(projeto)}`,
      severidade: 'critico'
    };
  }

  if (status.includes('paralis') || status.includes('cancel') || status.includes('critico')) {
    return {
      projetoId: projeto.id,
      projetoNome: getProjetoNome(projeto),
      motivo: `Status requer atuação imediata: ${getProjetoStatus(projeto)}`,
      severidade: 'critico'
    };
  }

  if (diasRestantes !== null && diasRestantes < 0) {
    return {
      projetoId: projeto.id,
      projetoNome: getProjetoNome(projeto),
      motivo: `Vigência encerrada há ${Math.abs(diasRestantes)} dias`,
      severidade: 'critico'
    };
  }

  if (diasRestantes !== null && diasRestantes <= 45) {
    return {
      projetoId: projeto.id,
      projetoNome: getProjetoNome(projeto),
      motivo: `Vigência termina em ${diasRestantes} dias`,
      severidade: 'atencao'
    };
  }

  if (!responsavel) {
    return {
      projetoId: projeto.id,
      projetoNome: getProjetoNome(projeto),
      motivo: 'Responsável SECTI ainda não informado',
      severidade: 'atencao'
    };
  }

  if (!territorio) {
    return {
      projetoId: projeto.id,
      projetoNome: getProjetoNome(projeto),
      motivo: 'Território/cobertura ainda não informado',
      severidade: 'atencao'
    };
  }

  if (status.includes('planejamento')) {
    return {
      projetoId: projeto.id,
      projetoNome: getProjetoNome(projeto),
      motivo: 'Projeto ainda em preparação operacional',
      severidade: 'atencao'
    };
  }

  if (precisaAcao) {
    return {
      projetoId: projeto.id,
      projetoNome: getProjetoNome(projeto),
      motivo: 'Projeto marcado como exigindo ação prioritária',
      severidade: 'atencao'
    };
  }

  if (lacunas.length >= 4) {
    return {
      projetoId: projeto.id,
      projetoNome: getProjetoNome(projeto),
      motivo: `${lacunas.length} lacunas operacionais ainda não preenchidas`,
      severidade: 'atencao'
    };
  }

  return null;
}

function getStatusTone(status: string) {
  const normalized = normalizeText(status);
  if (normalized.includes('ativo') || normalized.includes('andamento') || normalized.includes('assinado')) {
    return {
      surface: 'border-emerald-200 bg-emerald-50/70',
      badge: 'bg-emerald-600 text-white',
      progress: 'bg-emerald-500'
    };
  }
  if (normalized.includes('planejamento') || normalized.includes('analise')) {
    return {
      surface: 'border-sky-200 bg-sky-50/70',
      badge: 'bg-sky-600 text-white',
      progress: 'bg-sky-500'
    };
  }
  if (normalized.includes('atras') || normalized.includes('paralis') || normalized.includes('cancel')) {
    return {
      surface: 'border-rose-200 bg-rose-50/70',
      badge: 'bg-rose-600 text-white',
      progress: 'bg-rose-500'
    };
  }
  return {
    surface: 'border-zinc-200 bg-zinc-50/80',
    badge: 'bg-zinc-800 text-white',
    progress: 'bg-zinc-500'
  };
}

function getRiskTone(nivelRisco: string) {
  const normalized = normalizeText(nivelRisco);
  if (normalized.includes('critico')) {
    return 'bg-rose-100 text-rose-800 ring-1 ring-rose-200';
  }
  if (normalized.includes('alto')) {
    return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
  }
  if (normalized.includes('medio')) {
    return 'bg-sky-100 text-sky-800 ring-1 ring-sky-200';
  }
  return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200';
}

function getHealthTone(saudeEntrega: string) {
  const normalized = normalizeText(saudeEntrega);
  if (normalized.includes('risco')) {
    return 'bg-rose-100 text-rose-800 ring-1 ring-rose-200';
  }
  if (normalized.includes('observ')) {
    return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
  }
  return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200';
}

export function DashboardGeral({ projetos }: DashboardGeralProps) {
  const portfolio = useMemo(() => {
    const projetosAtivos = projetos.filter((projeto) => {
      const status = normalizeText(getProjetoStatus(projeto));
      return status.includes('ativo') || status.includes('andamento') || status.includes('assinado');
    }).length;

    const investimentoTotal = projetos.reduce((total, projeto) => total + (Number(projeto.valorTotal) || 0), 0);
    const chavesIntegracao = projetos.filter((projeto) => Boolean(projeto.chaveIntegracao)).length;
    const projetosPrecisaAcao = projetos.filter((projeto) => getProjetoPrecisaAcao(projeto)).length;
    const incidentesAbertos = projetos.reduce((total, projeto) => total + getProjetoIncidentesAbertos(projeto), 0);
    const alertas = projetos
      .map(buildProjetoAlerta)
      .filter((alerta): alerta is ProjetoAlerta => alerta !== null);

    const categoriaMap = projetos.reduce((acc, projeto) => {
      const key = projeto.categoria || 'Não informado';
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map<string, number>());

    const chartData = Array.from(categoriaMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], index) => ({
        name,
        value,
        fill: CHART_COLORS[index % CHART_COLORS.length]
      }));

    const lacunas = Array.from(new Set(projetos.flatMap((projeto) => getProjetoLacunasMonitoramento(projeto)))).slice(0, 8);

    return {
      projetosAtivos,
      investimentoTotal,
      chavesIntegracao,
      projetosPrecisaAcao,
      incidentesAbertos,
      alertas,
      chartData,
      lacunas
    };
  }, [projetos]);

  return (
    <motion.div
      className="space-y-6 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div
        variants={itemVariants}
        className="overflow-hidden rounded-[1.65rem] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.18),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,255,255,0.7))] p-5 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/80">SUPCDT Monitoramento</p>
            <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-slate-950 lg:text-[2.15rem]">
              Leitura executiva do portfólio com base nos dados reais disponíveis.
            </h2>
            <p className="mt-2.5 max-w-2xl text-sm leading-6 text-slate-600">
              O painel agora consolida investimento, risco, saúde da entrega, incidentes e necessidade de ação. A leitura ficou mais próxima da operação real e já prepara a governança do módulo Wi-Fi Social.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Base carregada</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{projetos.length}</p>
              <p className="text-[13px] text-slate-500">projetos no portfólio atual</p>
            </div>
            <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Integração</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{portfolio.chavesIntegracao}</p>
              <p className="text-[13px] text-slate-500">chaves prontas para cruzar com outro dashboard</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.45rem] border border-white/80 bg-white/85 p-5 shadow-[0_20px_70px_-42px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Investimento Total</span>
            <div className="rounded-lg bg-sky-100 p-2 text-sky-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <h3 className="mt-3 text-[1.9rem] font-bold text-slate-950">{formatCurrency(portfolio.investimentoTotal)}</h3>
          <p className="mt-2 text-[13px] text-slate-500">Soma dos projetos atualmente cadastrados</p>
        </div>

        <div className="rounded-[1.45rem] border border-white/80 bg-white/85 p-5 shadow-[0_20px_70px_-42px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Projetos Ativos</span>
            <div className="rounded-lg bg-teal-100 p-2 text-teal-700">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <h3 className="mt-3 text-[1.9rem] font-bold text-slate-950">
            {portfolio.projetosAtivos}
            <span className="ml-2 text-lg font-medium text-slate-400">/ {projetos.length}</span>
          </h3>
          <p className="mt-2 text-[13px] text-slate-500">Status operacionais em andamento, ativo ou assinado</p>
        </div>

        <div className="rounded-[1.45rem] border border-white/80 bg-white/85 p-5 shadow-[0_20px_70px_-42px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Exigem Ação</span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Radar className="h-4 w-4" />
            </div>
          </div>
          <h3 className="mt-3 text-[1.9rem] font-bold text-slate-950">{portfolio.projetosPrecisaAcao}</h3>
          <p className="mt-2 text-[13px] text-slate-500">Projetos com acionamento operacional prioritário</p>
        </div>

        <div className="rounded-[1.45rem] border border-white/80 bg-white/85 p-5 shadow-[0_20px_70px_-42px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Incidentes Abertos</span>
            <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <h3 className="mt-3 text-[1.9rem] font-bold text-slate-950">{portfolio.incidentesAbertos}</h3>
          <p className="mt-2 text-[13px] text-slate-500">Soma dos incidentes operacionais em acompanhamento</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.9fr)]">
        <div className="rounded-[1.45rem] border border-white/80 bg-white/85 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Distribuição por categoria</h3>
              <p className="mt-1 text-[13px] text-slate-500">Leitura rápida do tipo de iniciativa já registrada</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              dados reais
            </span>
          </div>

          <div className="mt-5 h-[240px] w-full">
            {portfolio.chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={portfolio.chartData} layout="vertical" margin={{ top: 0, right: 24, left: 12, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgb(71 85 105)', fontSize: 12 }}
                    width={132}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(15,23,42,0.04)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.96)',
                      border: '1px solid rgba(148,163,184,0.2)',
                      borderRadius: '16px',
                      boxShadow: '0 20px 50px -30px rgba(15,23,42,0.45)'
                    }}
                    formatter={(value: number) => [`${value} projeto(s)`, 'Quantidade']}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={26}>
                    {portfolio.chartData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                Ainda não há volume suficiente para leitura por categoria.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[1.45rem] border border-white/80 bg-white/85 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Radar de atenção
            </h3>
            <div className="mt-4 space-y-3">
              {portfolio.alertas.length ? (
                portfolio.alertas.slice(0, 5).map((alerta) => (
                  <div
                    key={alerta.projetoId}
                    className={`rounded-2xl border px-4 py-3 ${
                      alerta.severidade === 'critico'
                        ? 'border-rose-200 bg-rose-50 text-rose-900'
                        : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                  >
                    <p className="font-semibold">{alerta.projetoNome}</p>
                    <p className="mt-1 text-sm opacity-80">{alerta.motivo}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Nenhum alerta prioritário foi identificado com os critérios atuais.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.45rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.55)]">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-sky-200/80">
              <Link2 className="h-4 w-4" />
              Próxima camada
            </div>
            <h3 className="mt-3 text-lg font-semibold">Gaps já mapeados para monitoramento profissional</h3>
            <div className="mt-4 grid gap-2">
              {portfolio.lacunas.length ? (
                portfolio.lacunas.map((lacuna) => (
                  <div key={lacuna} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                    {lacuna}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-emerald-200/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  O conjunto atual já cobre a camada mínima para monitoramento executivo.
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-950">Portfólio monitorado</h3>
            <p className="mt-1 text-[13px] text-slate-500">Cada card mostra risco, saúde, incidentes, progresso físico e a chave de integração disponível.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {projetos.map((projeto) => {
            const status = getProjetoStatus(projeto);
            const statusOperacional = getProjetoStatusOperacional(projeto);
            const nivelRisco = getProjetoNivelRisco(projeto);
            const saudeEntrega = getProjetoSaudeEntrega(projeto);
            const precisaAcao = getProjetoPrecisaAcao(projeto);
            const incidentesAbertos = getProjetoIncidentesAbertos(projeto);
            const tone = getStatusTone(status);
            const alerta = buildProjetoAlerta(projeto);
            const progresso = getProjetoPercentualExecucao(projeto);
            const monitoramento = getProjetoMonitoramento(projeto);
            const operacional = getProjetoMonitoramentoOperacional(projeto);
            const territorio = getProjetoTerritorio(projeto) ?? 'Cobertura ainda não detalhada';
            const responsavel = getProjetoResponsavel(projeto) ?? 'Responsável ainda não informado';
            const manutencaoStatus = operacional.manutencaoStatus || 'Sem rotina';

            return (
              <div
                key={projeto.id}
                className={`rounded-[1.45rem] border p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 ${tone.surface}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}>
                      {status}
                    </span>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full bg-slate-950/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 ring-1 ring-slate-200">
                        {statusOperacional}
                      </span>
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getRiskTone(nivelRisco)}`}>
                        Risco {nivelRisco}
                      </span>
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getHealthTone(saudeEntrega)}`}>
                        {saudeEntrega}
                      </span>
                    </div>
                    <h4 className="mt-4 text-xl font-bold text-slate-950">{getProjetoNome(projeto)}</h4>
                    <p className="mt-1 text-sm text-slate-600">{getProjetoOsc(projeto) || 'OSC ainda não informada'}</p>
                  </div>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {projeto.categoria || 'Sem categoria'}
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                      <span>Progresso físico</span>
                      <span className="font-semibold text-slate-900">{progresso.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/70">
                      <div
                        className={`h-2 rounded-full ${tone.progress}`}
                        style={{ width: `${Math.min(100, Math.max(0, progresso))}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/70 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Território</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{territorio}</p>
                    </div>
                    <div className="rounded-2xl bg-white/70 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Responsável</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{responsavel}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/70 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Incidentes</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{incidentesAbertos}</p>
                    </div>
                    <div className="rounded-2xl bg-white/70 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Manutenção</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">{manutencaoStatus}</p>
                    </div>
                    <div className="rounded-2xl bg-white/70 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Ação</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">{precisaAcao ? 'Prioritária' : 'Rotina'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Valor total</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(projeto.valorTotal)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Metas</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{monitoramento.totalMetas}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Chave de integração</p>
                    <p className="mt-1 truncate font-mono text-sm text-slate-900">{projeto.chaveIntegracao}</p>
                  </div>

                  {alerta ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {alerta.motivo}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Sem pendência prioritária com os dados atuais.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {projetos.length === 0 && (
          <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white/70 py-12 text-center text-slate-500">
            Nenhum projeto cadastrado no portfólio.
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
