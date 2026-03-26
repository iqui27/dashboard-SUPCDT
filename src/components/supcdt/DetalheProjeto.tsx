import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Download, Link2, MapPin, Pencil, PencilLine, Plus, Radar, Settings, ShieldAlert, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { Projeto, Lancamento, Meta, getProjetoIncidentesAbertos, getProjetoLacunasMonitoramento, getProjetoMonitoramento, getProjetoMonitoramentoOperacional, getProjetoNivelRisco, getProjetoNome, getProjetoNumeroTermo, getProjetoNumeroUnico, getProjetoOsc, getProjetoParceiro, getProjetoPercentualExecucao, getProjetoPrecisaAcao, getProjetoResponsavel, getProjetoSaudeEntrega, getProjetoStatus, getProjetoStatusOperacional, getProjetoTerritorio, parseProjetoDate } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { fetchLancamentosDeProjeto } from '../../lib/api/lancamentos';
import { formatCurrency } from '../../lib/currencyUtils';
import { formatBRDate } from '../../lib/utils';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

import { EtapasSection } from './EtapasSection';
import { OrcamentoSection } from './OrcamentoSection';
import { ParceirosSection } from './ParceirosSection';
import { RiscosSection } from './RiscosSection';
import { GovernancaSection } from './GovernancaSection';
import { IndicadoresSection } from './IndicadoresSection';
import { EditarProjetoModal } from './EditarProjetoModal';
import { LancamentoModal } from './LancamentoModal';
import { MetaModal } from './MetaModal';
import { ModulosConfigPanel } from './ModulosConfigPanel';
import { ProjetoMonitoramentoModal } from './ProjetoMonitoramentoModal';

interface DetalheProjetoProps {
  projeto: Projeto;
  onUpdate: () => void;
}

export function DetalheProjeto({ projeto, onUpdate }: DetalheProjetoProps) {
  const { token } = useAuth();
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [isMonitoramentoModalOpen, setIsMonitoramentoModalOpen] = useState(false);
  const [isEditarProjetoOpen, setIsEditarProjetoOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null);

  const carregarLancamentos = useCallback(async () => {
    if (!token || !projeto.id) return;
    setLoading(true);
    try {
      const data = await fetchLancamentosDeProjeto(projeto.id, token);
      setLancamentos(data);
    } catch {
      toast.error('Erro ao carregar histórico de lançamentos.');
    } finally {
      setLoading(false);
    }
  }, [token, projeto.id]);

  useEffect(() => {
    carregarLancamentos();
  }, [carregarLancamentos]);

  const nome = getProjetoNome(projeto);
  const osc = getProjetoOsc(projeto) ?? 'OSC ainda não informada';
  const status = getProjetoStatus(projeto);
  const responsavel = getProjetoResponsavel(projeto) ?? 'Responsável ainda não informado';
  const territorio = getProjetoTerritorio(projeto) ?? 'Cobertura ainda não detalhada';
  const parceiro = getProjetoParceiro(projeto) ?? 'Parceiro institucional ainda não informado';
  const numeroTermo = getProjetoNumeroTermo(projeto) ?? 'Termo ainda não informado';
  const numeroUnico = getProjetoNumeroUnico(projeto);
  const progresso = getProjetoPercentualExecucao(projeto);
  const statusOperacional = getProjetoStatusOperacional(projeto);
  const nivelRisco = getProjetoNivelRisco(projeto);
  const saudeEntrega = getProjetoSaudeEntrega(projeto);
  const precisaAcao = getProjetoPrecisaAcao(projeto);
  const incidentesAbertos = getProjetoIncidentesAbertos(projeto);
  const monitoramento = getProjetoMonitoramento(projeto);
  const operacional = getProjetoMonitoramentoOperacional(projeto);
  const dataInicio = formatBRDate(parseProjetoDate(projeto.dataInicio));
  const dataFim = formatBRDate(parseProjetoDate(projeto.dataFim));
  const lacunas = getProjetoLacunasMonitoramento(projeto);

  return (
    <div className="space-y-5 pb-20">

      {/* Hero */}
      <div className="space-y-3 px-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">{status}</span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700/70">{projeto.categoria || 'Sem categoria'}</p>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{nome}</h1>
            {projeto.descricao && (
              <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">{projeto.descricao}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-slate-500">
              <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 shrink-0" />{osc}</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{territorio}</span>
              <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 shrink-0" />{dataInicio} até {dataFim}</span>
              <span className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5 shrink-0" />{projeto.chaveIntegracao}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 w-8 rounded-full border-slate-200 p-0 text-slate-500 hover:bg-slate-50 hover:text-slate-700">
                  <Settings className="h-3.5 w-3.5" />
                  <span className="sr-only">Configurar módulos</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <ModulosConfigPanel projeto={projeto} onUpdate={onUpdate} />
              </PopoverContent>
            </Popover>
            <Button onClick={() => setIsMonitoramentoModalOpen(true)} variant="outline" className="h-8 rounded-full border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50">
              <PencilLine className="mr-1.5 h-3 w-3" />
              Monitoramento
            </Button>
            <Button onClick={() => setIsEditarProjetoOpen(true)} variant="outline" className="h-8 rounded-full border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50">
              <Pencil className="mr-1.5 h-3 w-3" />
              Editar projeto
            </Button>
            <Button disabled variant="outline" className="h-8 rounded-full border-slate-200 px-3 text-xs text-slate-400">
              <Download className="mr-1.5 h-3 w-3" />
              PDF indisponível
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="h-8 rounded-full bg-slate-950 px-3 text-xs text-white hover:bg-slate-800">
              <Plus className="mr-1.5 h-3 w-3" />
              Novo lançamento
            </Button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/80 shadow-sm">
        <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {[
            { label: 'Status atual', value: status },
            { label: 'Status operacional', value: statusOperacional },
            { label: 'Nível de risco', value: nivelRisco, flag: precisaAcao },
            { label: 'Saúde da entrega', value: saudeEntrega },
          ].map((item) => (
            <div key={item.label} className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
              <p className={`mt-0.5 text-sm font-bold ${item.flag ? 'text-rose-700' : 'text-slate-900'}`}>{item.value}</p>
            </div>
          ))}
        </div>
        <div className="grid divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Progresso físico</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{progresso.toFixed(0)}%</p>
            <div className="mt-1.5 h-1 rounded-full bg-slate-100">
              <div className="h-1 rounded-full bg-sky-600 transition-all" style={{ width: `${Math.min(100, Math.max(0, progresso))}%` }} />
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Metas modeladas</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{monitoramento.totalMetas}</p>
            <p className="text-[10px] text-slate-400">{monitoramento.totalRealizado} de {monitoramento.totalPrevisto} realizados</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Investimento total</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{formatCurrency(projeto.valorTotal)}</p>
            <p className="text-[10px] text-slate-400">{incidentesAbertos} incidente(s) aberto(s)</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">

        {/* Left column */}
        <div className="space-y-5">

          {/* Objective */}
          <div className="overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/80 shadow-sm">
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700/70">Escopo</p>
              <h3 className="mt-0.5 text-sm font-bold text-slate-900">Objetivo e escopo atual</h3>
            </div>
            <div className="divide-y divide-slate-100 border-t border-slate-100 text-sm leading-6 text-slate-600">
              <div className="px-5 py-4">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Objetivos</p>
                <p>{projeto.objetivos || 'Objetivos ainda não detalhados no cadastro atual.'}</p>
              </div>
              <div className="px-5 py-4">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Descrição operacional</p>
                <p>{projeto.descricao || 'Descrição operacional ainda não consolidada.'}</p>
              </div>
            </div>
          </div>

          {/* Metas */}
          <div className="overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/80 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700/70">Execução</p>
                <h3 className="mt-0.5 text-sm font-bold text-slate-900">Acompanhamento das metas</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsMetaModalOpen(true)} className="h-8 rounded-full border-slate-200 px-3 text-xs">
                <Plus className="mr-1.5 h-3 w-3" />
                Nova meta
              </Button>
            </div>

            <div className="border-t border-slate-100">
              {projeto.metas.length ? (
                <ul role="list" className="divide-y divide-slate-100">
                  {projeto.metas.map((meta) => {
                    const percentual = meta.totalPrevisto > 0 ? (meta.realizadoTotal / meta.totalPrevisto) * 100 : 0;
                    return (
                      <li key={meta.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">{meta.codigo}</span>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{meta.unidade}</p>
                            </div>
                            <h4 className="mt-2 text-sm font-semibold text-slate-950">{meta.descricao}</h4>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingMeta(meta)}
                              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                              title="Editar meta"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <div className="rounded-[1rem] bg-slate-50 px-4 py-2.5 text-right">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Execução</p>
                              <p className="mt-0.5 text-base font-semibold text-slate-950">{meta.realizadoTotal} / {meta.totalPrevisto}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Progresso</span>
                            <span className="font-semibold text-slate-900">{percentual.toFixed(0)}%</span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                            <div className="h-1.5 rounded-full bg-sky-600" style={{ width: `${Math.min(100, Math.max(0, percentual))}%` }} />
                          </div>
                        </div>

                        {projeto.cronograma.totalTrimestres > 0 && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            {Array.from({ length: projeto.cronograma.totalTrimestres }).map((_, idx) => {
                              const previsto = meta.previstoPorTrimestre[idx] || 0;
                              const realizado = meta.realizadoPorTrimestre[idx] || 0;
                              return (
                                <div key={`${meta.id}-${idx}`} className="rounded-[1rem] bg-slate-50 px-3.5 py-2.5">
                                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">T{idx + 1}</p>
                                  <div className="mt-1.5 flex items-end justify-between gap-2">
                                    <div>
                                      <p className="text-[10px] text-slate-400">Prev.</p>
                                      <p className="text-xs font-semibold text-slate-900">{previsto}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] text-slate-400">Real.</p>
                                      <p className="text-xs font-semibold text-slate-900">{realizado}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  Nenhuma meta cadastrada. Cadastre a primeira meta para iniciar o acompanhamento físico.
                </div>
              )}
            </div>
          </div>

          {/* Etapas */}
          <EtapasSection projeto={projeto} onUpdate={onUpdate} />

          {/* Orçamento */}
          <OrcamentoSection projeto={projeto} onUpdate={onUpdate} />

          {/* Parceiros */}
          <ParceirosSection projeto={projeto} onUpdate={onUpdate} />

          {/* Riscos */}
          <RiscosSection projeto={projeto} onUpdate={onUpdate} />

          {/* Governança */}
          <GovernancaSection projeto={projeto} onUpdate={onUpdate} />

          {/* Indicadores */}
          <IndicadoresSection projeto={projeto} onUpdate={onUpdate} />

          {/* Lançamentos */}
          <div className="overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/80 shadow-sm">
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700/70">Histórico</p>
              <h3 className="mt-0.5 text-sm font-bold text-slate-900">Histórico de lançamentos</h3>
            </div>

            <div className="border-t border-slate-100">
              {loading ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">Carregando histórico...</div>
              ) : lancamentos.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">Nenhum lançamento registrado até o momento.</div>
              ) : (
                <ul role="list" className="divide-y divide-slate-100">
                  {lancamentos.map((lanc) => (
                    <li key={lanc.id} className="px-5 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">T{lanc.trimestre}</span>
                            <span className="text-xs text-slate-400">
                              Reg. {new Date(lanc.dataRegistro).toLocaleDateString('pt-BR')} · {lanc.registradoPor}
                            </span>
                            {lanc.dataAtividade && (
                              <span className="text-xs text-sky-600 font-medium">
                                Ativ. {new Date(lanc.dataAtividade + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-medium text-slate-900">{lanc.descricaoAtividade}</p>
                          {lanc.localAtendido && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {lanc.localAtendido}
                            </p>
                          )}
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="flex flex-wrap gap-2">
                            {lanc.valores.map((valor) => {
                              const meta = projeto.metas.find((item) => item.id === valor.metaId);
                              return (
                                <div key={valor.metaId} className="rounded-[1rem] bg-slate-50 px-3 py-1.5 text-xs">
                                  <span className="text-slate-400">{meta?.codigo || 'Meta'}:</span>{' '}
                                  <span className="font-semibold text-slate-900">+{valor.valorRealizado}</span>
                                </div>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingLancamento(lanc)}
                            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
                            title="Editar lançamento"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Governance */}
          <div className="overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/80 shadow-sm">
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700/70">Estrutura</p>
              <h3 className="mt-0.5 text-sm font-bold text-slate-900">Governança do projeto</h3>
            </div>
            <ul role="list" className="divide-y divide-slate-100 border-t border-slate-100">
              {[
                { label: 'OSC', value: osc },
                { label: 'Responsável SECTI', value: responsavel },
                { label: 'Parceiro', value: parceiro },
                { label: 'Território declarado', value: territorio },
                { label: 'Número do termo', value: numeroTermo },
                { label: 'Número único', value: numeroUnico || 'Ainda não definido' },
              ].map((item) => (
                <li key={item.label} className="px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-900">{item.value}</p>
                </li>
              ))}
              <li className="bg-slate-950 px-5 py-3 text-white">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-300">Chave de integração</p>
                <p className="mt-0.5 break-all font-mono text-xs text-slate-200">{projeto.chaveIntegracao}</p>
              </li>
            </ul>
          </div>

          {/* Gaps */}
          {lacunas.length > 0 && (
            <div className="overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/80 shadow-sm">
              <div className="flex items-center gap-2 px-5 py-4">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-600/80">Atenção</p>
                  <h3 className="mt-0.5 text-sm font-bold text-slate-900">Lacunas remanescentes</h3>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-5 py-4">
                {lacunas.map((lacuna) => (
                  <span key={lacuna} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] text-amber-700">
                    {lacuna}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Operational panel */}
          <div className="overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/80 shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4">
              <Radar className="h-4 w-4 shrink-0 text-sky-600" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700/70">Operação</p>
                <h3 className="mt-0.5 text-sm font-bold text-slate-900">Painel operacional</h3>
              </div>
            </div>
            <ul role="list" className="divide-y divide-slate-100 border-t border-slate-100 text-sm">
              {[
                { label: 'Resumo executivo', value: operacional.resumoExecutivo || 'Não registrado.' },
                { label: 'Responsável operacional', value: operacional.responsavelOperacional || 'Não informado' },
                { label: 'Metas com execução', value: `${projeto.metas.filter((m) => m.realizadoTotal > 0).length} de ${projeto.metas.length}` },
                { label: 'Cronograma', value: `${projeto.cronograma.totalTrimestres} trimestre(s)` },
                { label: 'Execução consolidada', value: `${monitoramento.totalRealizado} de ${monitoramento.totalPrevisto}` },
              ].map((item) => (
                <li key={item.label} className="px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                  <p className="mt-0.5 font-medium text-slate-900">{item.value}</p>
                </li>
              ))}

              {operacional.bloqueios.length > 0 && (
                <li className="px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Bloqueios</p>
                  <div className="mt-1 space-y-0.5">
                    {operacional.bloqueios.map((item) => (
                      <p key={item} className="font-medium text-slate-900">{item}</p>
                    ))}
                  </div>
                </li>
              )}

              {operacional.proximosPassos.length > 0 && (
                <li className="px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Próximos passos</p>
                  <div className="mt-1 space-y-0.5">
                    {operacional.proximosPassos.map((item) => (
                      <p key={item} className="font-medium text-slate-900">{item}</p>
                    ))}
                  </div>
                </li>
              )}

              {operacional.coberturaDetalhada.length > 0 && (
                <li className="px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Cobertura detalhada</p>
                  <div className="mt-1 space-y-0.5">
                    {operacional.coberturaDetalhada.map((item) => (
                      <p key={item} className="font-medium text-slate-900">{item}</p>
                    ))}
                  </div>
                </li>
              )}

              {operacional.evidencias.length > 0 && (
                <li className="px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Evidências</p>
                  <div className="mt-1 space-y-1">
                    {operacional.evidencias.map((item) => (
                      <a key={`${item.titulo}-${item.url}`} href={item.url} target="_blank" rel="noreferrer" className="block text-sm font-medium text-sky-700 hover:text-sky-800">
                        {item.titulo}
                      </a>
                    ))}
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <LancamentoModal
          projeto={projeto}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            carregarLancamentos();
            onUpdate();
          }}
        />
      )}

      {editingLancamento && (
        <LancamentoModal
          projeto={projeto}
          lancamento={editingLancamento}
          onClose={() => setEditingLancamento(null)}
          onSuccess={() => {
            setEditingLancamento(null);
            carregarLancamentos();
            onUpdate();
          }}
        />
      )}

      {(isMetaModalOpen || editingMeta) && (
        <MetaModal
          projeto={projeto}
          meta={editingMeta ?? undefined}
          onClose={() => {
            setIsMetaModalOpen(false);
            setEditingMeta(null);
          }}
          onSuccess={() => {
            setIsMetaModalOpen(false);
            setEditingMeta(null);
            onUpdate();
          }}
        />
      )}

      {isMonitoramentoModalOpen && (
        <ProjetoMonitoramentoModal
          projeto={projeto}
          onClose={() => setIsMonitoramentoModalOpen(false)}
          onSuccess={() => {
            setIsMonitoramentoModalOpen(false);
            onUpdate();
          }}
        />
      )}

      {isEditarProjetoOpen && (
        <EditarProjetoModal
          projeto={projeto}
          onClose={() => setIsEditarProjetoOpen(false)}
          onSuccess={() => {
            setIsEditarProjetoOpen(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
