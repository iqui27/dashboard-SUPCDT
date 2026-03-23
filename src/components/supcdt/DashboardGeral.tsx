import { useMemo, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Activity, AlertTriangle, Link2, Radar, TrendingUp, X } from 'lucide-react';
import CountUp from 'react-countup';

import { formatCurrency } from '../../lib/currencyUtils';
import {
  Projeto,
  getProjetoIncidentesAbertos,
  getProjetoLacunasMonitoramento,
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

function CategoryBarList({ data }: { data: { name: string; value: number; fill: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [count, setCount] = useState({ start: total, end: total });

  const handleClick = (name: string, value: number) => {
    setSelected(name);
    setCount(prev => ({ start: prev.end, end: value }));
  };

  const clearSelected = () => {
    setSelected(undefined);
    setCount(prev => ({ start: prev.end, end: total }));
  };

  const visible = selected ? data.filter(d => d.name === selected) : data;
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="rounded-[1.45rem] border border-white/80 bg-white/85 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Distribuição por categoria</h3>
          <p className="mt-1 text-[13px] text-slate-500">
            <CountUp start={count.start} end={count.end} duration={0.4} /> projeto(s)
            {selected ? ' na categoria selecionada' : ' no portfólio atual'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {selected && (
            <button
              onClick={clearSelected}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
            >
              {selected}
              <X className="h-3 w-3 text-slate-500" />
            </button>
          )}
        </div>
      </div>

      {data.length ? (
        <div className="mt-5 space-y-2.5">
          {visible.map((item) => (
            <div
              key={item.name}
              onClick={() => !selected && handleClick(item.name, item.value)}
              className={`group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 transition ${!selected ? 'hover:bg-slate-50' : ''}`}
            >
              <span className="w-32 shrink-0 truncate text-right text-[13px] text-slate-600">{item.name}</span>
              <div className="flex flex-1 items-center gap-2">
                <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                    style={{
                      width: `${(item.value / maxVal) * 100}%`,
                      backgroundColor: item.fill,
                    }}
                  />
                </div>
                <span className="w-6 text-right text-[13px] font-semibold text-slate-900">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
          Ainda não há volume suficiente para leitura por categoria.
        </div>
      )}
    </div>
  );
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
        className="flex items-center justify-between gap-6 px-1 py-1"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700/70">SUPCDT Monitoramento</p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">Painel Executivo</h2>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Portfólio</p>
            <p className="text-base font-bold text-slate-900">{projetos.length} projetos</p>
          </div>
          <div className="h-7 w-px bg-slate-200" />
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Integração</p>
            <p className="text-base font-bold text-slate-900">{portfolio.chavesIntegracao} chaves</p>
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
        <CategoryBarList data={portfolio.chartData} />

        <div className="space-y-5">
          <div className="rounded-[1.45rem] border border-white/80 bg-white/85 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Radar de atenção
              </h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                {portfolio.alertas.length} itens
              </span>
            </div>
            <div className="mt-3 divide-y divide-slate-100">
              {portfolio.alertas.length ? (
                portfolio.alertas.slice(0, 5).map((alerta) => (
                  <div key={alerta.projetoId} className="flex items-start gap-3 py-2.5">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      alerta.severidade === 'critico' ? 'bg-rose-500' : 'bg-amber-400'
                    }`} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-slate-900">{alerta.projetoNome}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{alerta.motivo}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 py-3 text-xs text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Nenhum alerta identificado
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.45rem] border border-white/80 bg-white/85 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Link2 className="h-4 w-4 text-slate-400" />
                Gaps de monitoramento
              </h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                {portfolio.lacunas.length} gaps
              </span>
            </div>
            {portfolio.lacunas.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {portfolio.lacunas.map((lacuna) => (
                  <span key={lacuna} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] text-slate-600">
                    {lacuna}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Cobertura mínima para monitoramento executivo atingida.
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-slate-950">Portfólio monitorado</h3>
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{projetos.length} projetos</span>
        </div>

        <div className="overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/80 shadow-sm">
          <ul role="list" className="divide-y divide-slate-100">
            {projetos.map((projeto) => {
              const status = getProjetoStatus(projeto);
              const nivelRisco = getProjetoNivelRisco(projeto);
              const saudeEntrega = getProjetoSaudeEntrega(projeto);
              const precisaAcao = getProjetoPrecisaAcao(projeto);
              const incidentesAbertos = getProjetoIncidentesAbertos(projeto);
              const tone = getStatusTone(status);
              const alerta = buildProjetoAlerta(projeto);
              const progresso = getProjetoPercentualExecucao(projeto);
              const territorio = getProjetoTerritorio(projeto) ?? '—';
              const responsavel = getProjetoResponsavel(projeto) ?? '—';

              return (
                <li key={projeto.id} className="px-4 py-3.5 hover:bg-slate-50/70 transition-colors">
                  {/* Top row: dot + name + status badges */}
                  <div className="flex items-center gap-2.5">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${tone.progress}`} />
                    <p className="text-sm font-semibold text-slate-900 truncate">{getProjetoNome(projeto)}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.badge}`}>{status}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getRiskTone(nivelRisco)}`}>Risco {nivelRisco}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getHealthTone(saudeEntrega)}`}>{saudeEntrega}</span>
                    {precisaAcao && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Prioritária</span>}
                  </div>

                  {/* Metadata lines */}
                  <div className="mt-2 ml-4 space-y-1.5 text-[11px]">
                    {/* OSC */}
                    <p className="text-slate-500">{getProjetoOsc(projeto) || '—'}</p>

                    {/* Territory + Responsible */}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      <span className="flex items-center gap-1">
                        <span className="uppercase tracking-[0.12em] text-slate-400">Território</span>
                        <span className="font-medium text-slate-700">{territorio}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="uppercase tracking-[0.12em] text-slate-400">Responsável</span>
                        <span className="font-medium text-slate-700">{responsavel}</span>
                      </span>
                    </div>

                    {/* Value + Incidents + Progress */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
                      <span className="flex items-center gap-1">
                        <span className="uppercase tracking-[0.12em] text-slate-400">Valor</span>
                        <span className="font-semibold text-slate-800">{formatCurrency(projeto.valorTotal)}</span>
                      </span>
                      {incidentesAbertos > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="uppercase tracking-[0.12em] text-slate-400">Incidentes</span>
                          <span className="font-semibold text-rose-700">{incidentesAbertos}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 ml-auto">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-1.5 rounded-full ${tone.progress}`} style={{ width: `${Math.min(100, Math.max(0, progresso))}%` }} />
                        </div>
                        <span className="font-medium text-slate-600">{progresso.toFixed(0)}%</span>
                      </span>
                    </div>

                    {/* Alert */}
                    {alerta && (
                      <span className={`flex items-center gap-1 ${alerta.severidade === 'critico' ? 'text-rose-600' : 'text-amber-600'}`}>
                        <AlertTriangle className="h-3 w-3 shrink-0" />{alerta.motivo}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {projetos.length === 0 && (
          <div className="rounded-[1.45rem] border border-dashed border-slate-200 bg-white/70 py-10 text-center text-sm text-slate-400">
            Nenhum projeto cadastrado no portfólio.
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
