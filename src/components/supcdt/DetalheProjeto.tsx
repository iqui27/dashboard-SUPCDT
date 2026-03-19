import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Download, Link2, MapPin, PencilLine, Plus, Radar, ShieldAlert, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { Projeto, Lancamento, getProjetoIncidentesAbertos, getProjetoLacunasMonitoramento, getProjetoMonitoramento, getProjetoMonitoramentoOperacional, getProjetoNivelRisco, getProjetoNome, getProjetoNumeroTermo, getProjetoNumeroUnico, getProjetoOsc, getProjetoParceiro, getProjetoPercentualExecucao, getProjetoPrecisaAcao, getProjetoResponsavel, getProjetoSaudeEntrega, getProjetoStatus, getProjetoStatusOperacional, getProjetoTerritorio, parseProjetoDate } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { fetchLancamentosDeProjeto } from '../../lib/api/lancamentos';
import { formatCurrency } from '../../lib/currencyUtils';
import { formatBRDate } from '../../lib/utils';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

import { LancamentoModal } from './LancamentoModal';
import { MetaModal } from './MetaModal';
import { ProjetoMonitoramentoModal } from './ProjetoMonitoramentoModal';

interface DetalheProjetoProps {
  projeto: Projeto;
  onUpdate: () => void;
}

function getSummaryCardTone(label: string) {
  if (label === 'Status Atual') return 'bg-sky-50 border-sky-200';
  if (label === 'Progresso Físico') return 'bg-emerald-50 border-emerald-200';
  if (label === 'Metas Modeladas') return 'bg-amber-50 border-amber-200';
  return 'bg-white border-slate-200';
}

export function DetalheProjeto({ projeto, onUpdate }: DetalheProjetoProps) {
  const { token } = useAuth();
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
    const [isMonitoramentoModalOpen, setIsMonitoramentoModalOpen] = useState(false);

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
    <div className="space-y-6 pb-20">
      <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.10),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,255,255,0.76))] p-6 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-950 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                {status}
              </span>
              <span className="rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {projeto.categoria || 'Sem categoria'}
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950">{nome}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              {projeto.descricao || 'Este projeto já está cadastrado, mas ainda precisa de descrição operacional mais detalhada para ampliar a leitura executiva.'}
            </p>

            <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-2"><UserRound className="h-4 w-4" /> {osc}</span>
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {territorio}</span>
              <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {dataInicio} até {dataFim}</span>
              <span className="flex items-center gap-2"><Link2 className="h-4 w-4" /> {projeto.chaveIntegracao}</span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto">
            <Button onClick={() => setIsMonitoramentoModalOpen(true)} variant="outline" className="h-11 rounded-full border-slate-200 bg-white/80 text-slate-700 hover:bg-white">
              <PencilLine className="mr-2 h-4 w-4" />
              Atualizar monitoramento
            </Button>
            <Button disabled variant="outline" className="h-11 rounded-full border-slate-200 bg-white/80 text-slate-500">
              <Download className="mr-2 h-4 w-4" />
              PDF institucional indisponível
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="h-11 rounded-full bg-slate-950 text-white hover:bg-slate-800">
              <Plus className="mr-2 h-4 w-4" />
              Novo lançamento
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          A exportação PDF só será habilitada quando o template institucional, as evidências e as regras de homologação estiverem modelados na base.
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { label: 'Status Atual', value: status, helper: 'Situação executiva da iniciativa' },
          { label: 'Status Operacional', value: statusOperacional, helper: 'Leitura operacional mais recente' },
          { label: 'Nível de Risco', value: nivelRisco, helper: precisaAcao ? 'Exige ação prioritária' : 'Sem urgência sinalizada' },
          { label: 'Saúde da Entrega', value: saudeEntrega, helper: `${incidentesAbertos} incidente(s) abertos` },
          { label: 'Progresso Físico', value: `${progresso.toFixed(0)}%`, helper: `${monitoramento.totalRealizado} de ${monitoramento.totalPrevisto}` },
          { label: 'Metas Modeladas', value: `${monitoramento.totalMetas}`, helper: 'Linhas de acompanhamento disponíveis' },
          { label: 'Investimento Total', value: formatCurrency(projeto.valorTotal), helper: 'Valor cadastrado na base atual' }
        ].map((item) => (
          <Card key={item.label} className={`rounded-[1.75rem] border shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)] ${getSummaryCardTone(item.label)}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-950">{item.value}</div>
              <p className="mt-2 text-xs text-slate-500">{item.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          <Card className="rounded-[1.75rem] border-white/80 bg-white/85 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">Objetivo e escopo atual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Objetivos</p>
                <p className="mt-2">{projeto.objetivos || 'Objetivos ainda não detalhados no cadastro atual.'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Descrição operacional</p>
                <p className="mt-2">{projeto.descricao || 'Descrição operacional ainda não consolidada.'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-white/80 bg-white/85 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl text-slate-950">Acompanhamento das metas</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setIsMetaModalOpen(true)} className="rounded-full">
                <Plus className="mr-2 h-4 w-4" />
                Nova meta
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {projeto.metas.length ? (
                projeto.metas.map((meta) => {
                  const percentual = meta.totalPrevisto > 0 ? (meta.realizadoTotal / meta.totalPrevisto) * 100 : 0;

                  return (
                    <div key={meta.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{meta.codigo}</span>
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{meta.unidade}</p>
                          </div>
                          <h3 className="mt-3 text-lg font-semibold text-slate-950">{meta.descricao}</h3>
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Execução</p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">
                            {meta.realizadoTotal} / {meta.totalPrevisto}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>Progresso da meta</span>
                          <span className="font-semibold text-slate-950">{percentual.toFixed(0)}%</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-200">
                          <div className="h-2 rounded-full bg-sky-600" style={{ width: `${Math.min(100, Math.max(0, percentual))}%` }} />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: projeto.cronograma.totalTrimestres || 1 }).map((_, idx) => {
                          const previsto = meta.previstoPorTrimestre[idx] || 0;
                          const realizado = meta.realizadoPorTrimestre[idx] || 0;
                          return (
                            <div key={`${meta.id}-${idx}`} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Trimestre {idx + 1}</p>
                              <div className="mt-2 flex items-end justify-between gap-4">
                                <div>
                                  <p className="text-[11px] text-slate-400">Previsto</p>
                                  <p className="text-sm font-semibold text-slate-900">{previsto}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[11px] text-slate-400">Realizado</p>
                                  <p className="text-sm font-semibold text-slate-900">{realizado}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                  Nenhuma meta cadastrada. Cadastre a primeira meta para iniciar o acompanhamento físico.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-white/80 bg-white/85 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">Histórico de lançamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                  Carregando histórico...
                </div>
              ) : lancamentos.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                  Nenhum lançamento registrado até o momento.
                </div>
              ) : (
                <div className="space-y-4">
                  {lancamentos.map((lanc) => (
                    <div key={lanc.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">T{lanc.trimestre}</span>
                            <span className="text-sm text-slate-500">
                              {new Date(lanc.dataRegistro).toLocaleDateString('pt-BR')} por {lanc.registradoPor}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-medium text-slate-900">{lanc.descricaoAtividade}</p>
                          {lanc.localAtendido && (
                            <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                              <MapPin className="h-3.5 w-3.5" />
                              {lanc.localAtendido}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          {lanc.valores.map((valor) => {
                            const meta = projeto.metas.find((item) => item.id === valor.metaId);
                            return (
                              <div key={valor.metaId} className="rounded-2xl bg-white px-4 py-2 text-sm shadow-sm">
                                <span className="text-slate-500">{meta?.codigo || 'Meta'}:</span>{' '}
                                <span className="font-semibold text-slate-950">+{valor.valorRealizado}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[1.75rem] border-white/80 bg-white/85 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">Governança do projeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'OSC', value: osc },
                { label: 'Responsável SECTI', value: responsavel },
                { label: 'Parceiro', value: parceiro },
                { label: 'Território declarado', value: territorio },
                { label: 'Número do termo', value: numeroTermo },
                { label: 'Número único', value: numeroUnico || 'Ainda não definido' }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{item.value}</p>
                </div>
              ))}

              <div className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Chave de integração entre dashboards</p>
                <p className="mt-1 break-all font-mono text-sm">{projeto.chaveIntegracao}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-slate-200 bg-slate-950 text-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.55)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-white">
                <ShieldAlert className="h-5 w-5 text-amber-300" />
                Lacunas remanescentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lacunas.map((lacuna) => (
                <div key={lacuna} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  {lacuna}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-white/80 bg-white/85 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
                <Radar className="h-5 w-5 text-sky-700" />
                Painel operacional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Resumo executivo</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {operacional.resumoExecutivo || 'Resumo executivo ainda não registrado.'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Responsável operacional</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {operacional.responsavelOperacional || 'Não informado'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Metas com execução</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {projeto.metas.filter((meta) => meta.realizadoTotal > 0).length} de {projeto.metas.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Cronograma cadastrado</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{projeto.cronograma.totalTrimestres} trimestres</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Execução consolidada</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {monitoramento.totalRealizado} de {monitoramento.totalPrevisto}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Bloqueios</p>
                <div className="mt-1 space-y-1">
                  {operacional.bloqueios.length ? (
                    operacional.bloqueios.map((item) => (
                      <p key={item} className="text-sm font-medium text-slate-900">{item}</p>
                    ))
                  ) : (
                    <p className="text-sm font-medium text-slate-900">Nenhum bloqueio registrado.</p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Próximos passos</p>
                <div className="mt-1 space-y-1">
                  {operacional.proximosPassos.length ? (
                    operacional.proximosPassos.map((item) => (
                      <p key={item} className="text-sm font-medium text-slate-900">{item}</p>
                    ))
                  ) : (
                    <p className="text-sm font-medium text-slate-900">Nenhum próximo passo registrado.</p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Cobertura detalhada</p>
                <div className="mt-1 space-y-1">
                  {operacional.coberturaDetalhada.length ? (
                    operacional.coberturaDetalhada.map((item) => (
                      <p key={item} className="text-sm font-medium text-slate-900">{item}</p>
                    ))
                  ) : (
                    <p className="text-sm font-medium text-slate-900">Cobertura detalhada ainda não registrada.</p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Evidências</p>
                <div className="mt-1 space-y-2">
                  {operacional.evidencias.length ? (
                    operacional.evidencias.map((item) => (
                      <a key={`${item.titulo}-${item.url}`} href={item.url} target="_blank" rel="noreferrer" className="block text-sm font-medium text-sky-700 hover:text-sky-800">
                        {item.titulo}
                      </a>
                    ))
                  ) : (
                    <p className="text-sm font-medium text-slate-900">Nenhuma evidência vinculada.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
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

      {isMetaModalOpen && (
        <MetaModal
          projeto={projeto}
          onClose={() => setIsMetaModalOpen(false)}
          onSuccess={() => {
            setIsMetaModalOpen(false);
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
    </div>
  );
}
