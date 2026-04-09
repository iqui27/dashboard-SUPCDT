import { useState } from 'react';
import { Check, Printer, X } from 'lucide-react';

import {
  Lancamento,
  Projeto,
  getProjetoMonitoramento,
  getProjetoMonitoramentoOperacional,
  getProjetoNivelRisco,
  getProjetoNome,
  getProjetoNumeroTermo,
  getProjetoNumeroUnico,
  getProjetoOsc,
  getProjetoParceiro,
  getProjetoPercentualExecucao,
  getProjetoResponsavel,
  getProjetoSaudeEntrega,
  getProjetoStatus,
  getProjetoStatusOperacional,
  getProjetoTerritorio,
  parseProjetoDate,
} from '../../types/projeto';
import { formatCurrency } from '../../lib/currencyUtils';
import { formatBRDate } from '../../lib/utils';
import { Button } from '../ui/button';

interface ProjetoPDFExportProps {
  projeto: Projeto;
  lancamentos: Lancamento[];
  onClose: () => void;
}

interface ExportOptions {
  dadosBasicos: boolean;
  monitoramento: boolean;
  metas: boolean;
  lancamentos: boolean;
  etapas: boolean;
  orcamento: boolean;
  parceiros: boolean;
  riscos: boolean;
  governanca: boolean;
  indicadores: boolean;
}

const DEFAULT_OPTIONS: ExportOptions = {
  dadosBasicos: true,
  monitoramento: true,
  metas: true,
  lancamentos: true,
  etapas: true,
  orcamento: true,
  parceiros: true,
  riscos: true,
  governanca: true,
  indicadores: true,
};

const MODULE_LABELS: Record<keyof ExportOptions, { label: string; icon: string }> = {
  dadosBasicos: { label: 'Dados Básicos', icon: '📋' },
  monitoramento: { label: 'Monitoramento', icon: '📊' },
  metas: { label: 'Metas', icon: '🎯' },
  lancamentos: { label: 'Lançamentos', icon: '📝' },
  etapas: { label: 'Etapas', icon: '🪜' },
  orcamento: { label: 'Orçamento', icon: '💰' },
  parceiros: { label: 'Parceiros', icon: '🤝' },
  riscos: { label: 'Riscos', icon: '⚠️' },
  governanca: { label: 'Governança', icon: '🏛️' },
  indicadores: { label: 'Indicadores', icon: '📈' },
};

// Helper to check if module has data
function hasModuleData(projeto: Projeto, key: keyof ExportOptions): boolean {
  switch (key) {
    case 'etapas':
      return (projeto.etapas?.length ?? 0) > 0;
    case 'orcamento':
      return (projeto.rubricas?.length ?? 0) > 0;
    case 'parceiros':
      return (projeto.parceirosModulo?.length ?? 0) > 0;
    case 'riscos':
      return (projeto.riscos?.length ?? 0) > 0;
    case 'governanca':
      return (projeto.decisoes?.length ?? 0) > 0;
    case 'indicadores':
      return (projeto.indicadores?.length ?? 0) > 0;
    case 'metas':
      return (projeto.metas?.length ?? 0) > 0;
    default:
      return true;
  }
}

export function ProjetoPDFExport({ projeto, lancamentos, onClose }: ProjetoPDFExportProps) {
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_OPTIONS);

  const nome = getProjetoNome(projeto);
  const osc = getProjetoOsc(projeto) ?? 'Não informada';
  const status = getProjetoStatus(projeto);
  const responsavel = getProjetoResponsavel(projeto) ?? 'Não informado';
  const territorio = getProjetoTerritorio(projeto) ?? 'Não informado';
  const parceiro = getProjetoParceiro(projeto) ?? 'Não informado';
  const numeroTermo = getProjetoNumeroTermo(projeto) ?? 'Não informado';
  const numeroUnico = getProjetoNumeroUnico(projeto) ?? 'Não informado';
  const statusOperacional = getProjetoStatusOperacional(projeto);
  const nivelRisco = getProjetoNivelRisco(projeto);
  const saudeEntrega = getProjetoSaudeEntrega(projeto);
  const progresso = getProjetoPercentualExecucao(projeto);
  const monitoramento = getProjetoMonitoramento(projeto);
  const operacional = getProjetoMonitoramentoOperacional(projeto);
  const dataInicio = formatBRDate(parseProjetoDate(projeto.dataInicio));
  const dataFim = formatBRDate(parseProjetoDate(projeto.dataFim));
  const dataGeracao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const ultimosLancamentos = lancamentos.slice(-10).reverse();

  const toggleOption = (key: keyof ExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrint = () => {
    window.print();
  };

  // Count active sections
  const activeSections = Object.entries(options)
    .filter(([key, active]) => active && hasModuleData(projeto, key as keyof ExportOptions))
    .length;

  return (
    <>
      {/* Print-specific CSS */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Esconde tudo */
          body * {
            visibility: hidden !important;
          }
          
          /* Mostra apenas o overlay e seus filhos */
          .pdf-export-overlay,
          .pdf-export-overlay * {
            visibility: visible !important;
          }
          
          .pdf-export-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
            bottom: auto !important;
            width: 100% !important;
            background: white !important;
            overflow: visible !important;
            display: block !important;
          }
          
          .pdf-no-print {
            display: none !important;
          }
          
          .pdf-export-content {
            padding: 0 !important;
            max-width: 100% !important;
            overflow: visible !important;
          }
          
          section {
            page-break-inside: avoid;
          }
          
          @page {
            margin: 15mm;
            size: A4;
          }
        }
      `}</style>

      {/* Overlay */}
      <div className="pdf-export-overlay fixed inset-0 z-[200] overflow-y-auto bg-white">

        {/* Action bar — hidden on print */}
        <div className="pdf-no-print sticky top-0 z-10 border-b border-border bg-white px-6 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Exportar PDF</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{nome}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-8 rounded-full border-border px-3 text-xs text-muted-foreground hover:bg-muted"
              >
                <X className="mr-1.5 h-3 w-3" />
                Fechar
              </Button>
              <Button
                type="button"
                onClick={handlePrint}
                className="h-8 rounded-full bg-primary px-3 text-xs text-white hover:bg-primary/90"
              >
                <Printer className="mr-1.5 h-3 w-3" />
                Imprimir / Salvar PDF
              </Button>
            </div>
          </div>

          {/* Options selector */}
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(DEFAULT_OPTIONS) as (keyof ExportOptions)[]).map((key) => {
              const hasData = hasModuleData(projeto, key);
              const isActive = options[key];
              const { label, icon } = MODULE_LABELS[key];

              return (
                <button
                  key={key}
                  onClick={() => toggleOption(key)}
                  disabled={!hasData}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive && hasData
                      ? 'bg-primary/20 text-primary/90 ring-1 ring-sky-300'
                      : hasData
                        ? 'bg-secondary text-muted-foreground hover:bg-slate-200'
                        : 'cursor-not-allowed bg-muted text-slate-300'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                  {isActive && hasData && <Check className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {activeSections} seç{activeSections === 1 ? 'ão' : 'ões'} selecionadas
          </p>
        </div>

        {/* Document content */}
        <div className="pdf-export-content mx-auto max-w-[210mm] px-8 py-8">

          {/* ── Header Institucional ── */}
          <div className="mb-8 border-b-2 border-slate-950 pb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-foreground">
              SECTI — Secretaria de Ciência, Tecnologia e Inovação
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Superintendência de Ciência, Desenvolvimento e Transferência de Tecnologia
            </p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <h1 className="text-xl font-extrabold tracking-tight text-foreground leading-tight">
                {nome}
              </h1>
              <p className="shrink-0 text-[10px] text-muted-foreground">
                Gerado em {dataGeracao}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
              <span><span className="font-semibold text-muted-foreground">Status:</span> {status}</span>
              <span><span className="font-semibold text-muted-foreground">Categoria:</span> {projeto.categoria ?? 'Não informada'}</span>
              <span><span className="font-semibold text-muted-foreground">Período:</span> {dataInicio} – {dataFim}</span>
            </div>
          </div>

          {/* ── Seção 1: Dados do Projeto ── */}
          {options.dadosBasicos && (
            <section className="mb-7">
              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">1. Dados do Projeto</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { label: 'OSC / Executora', value: osc },
                  { label: 'Responsável SECTI', value: responsavel },
                  { label: 'Parceiro institucional', value: parceiro },
                  { label: 'Território / RA', value: territorio },
                  { label: 'Número do Termo', value: numeroTermo },
                  { label: 'Número único', value: numeroUnico },
                  { label: 'Processo SEI', value: projeto.processoSEI ?? 'Não informado' },
                  { label: 'Valor total', value: formatCurrency(projeto.valorTotal) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Seção 2: Monitoramento ── */}
          {options.monitoramento && (
            <section className="mb-7 border-t border-border/70 pt-5">
              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">2. Monitoramento</p>

              {/* 4 indicadores */}
              <div className="mb-4 grid grid-cols-4 gap-3">
                {[
                  { label: 'Status Operacional', value: statusOperacional },
                  { label: 'Nível de Risco', value: nivelRisco },
                  { label: 'Saúde da Entrega', value: saudeEntrega },
                  { label: 'Progresso Físico', value: `${progresso.toFixed(0)}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded border border-border bg-muted px-3 py-2.5 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                    <p className="mt-1 text-[13px] font-bold text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              {/* Metas summary */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded border border-border bg-muted px-3 py-2.5 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Metas modeladas</p>
                  <p className="mt-1 text-[13px] font-bold text-foreground">{monitoramento.totalMetas}</p>
                </div>
                <div className="rounded border border-border bg-muted px-3 py-2.5 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Total previsto</p>
                  <p className="mt-1 text-[13px] font-bold text-foreground">{monitoramento.totalPrevisto}</p>
                </div>
                <div className="rounded border border-border bg-muted px-3 py-2.5 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Total realizado</p>
                  <p className="mt-1 text-[13px] font-bold text-foreground">{monitoramento.totalRealizado}</p>
                </div>
              </div>

              {operacional.resumoExecutivo && (
                <div className="mb-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resumo executivo</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{operacional.resumoExecutivo}</p>
                </div>
              )}

              {operacional.bloqueios.length > 0 && (
                <div className="mb-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Bloqueios</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {operacional.bloqueios.map((item) => (
                      <li key={item} className="text-[11px] text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {operacional.proximosPassos.length > 0 && (
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Próximos passos</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {operacional.proximosPassos.map((item) => (
                      <li key={item} className="text-[11px] text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* ── Seção 3: Metas ── */}
          {options.metas && projeto.metas.length > 0 && (
            <section className="mb-7 border-t border-border/70 pt-5">
              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">3. Metas</p>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-secondary">
                    <th className="border border-border px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Código</th>
                    <th className="border border-border px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Descrição</th>
                    <th className="border border-border px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Unidade</th>
                    <th className="border border-border px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Previsto</th>
                    <th className="border border-border px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Realizado</th>
                    <th className="border border-border px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {projeto.metas.map((meta) => {
                    const percentual = meta.totalPrevisto > 0
                      ? ((meta.realizadoTotal / meta.totalPrevisto) * 100).toFixed(0)
                      : '—';
                    return (
                      <tr key={meta.id} className="even:bg-muted">
                        <td className="border border-border px-3 py-2 font-semibold text-foreground">{meta.codigo}</td>
                        <td className="border border-border px-3 py-2 text-muted-foreground">{meta.descricao}</td>
                        <td className="border border-border px-3 py-2 text-center text-muted-foreground">{meta.unidade}</td>
                        <td className="border border-border px-3 py-2 text-right text-muted-foreground">{meta.totalPrevisto}</td>
                        <td className="border border-border px-3 py-2 text-right font-semibold text-foreground">{meta.realizadoTotal}</td>
                        <td className="border border-border px-3 py-2 text-right font-bold text-foreground">{percentual}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Trimestres por meta */}
              {projeto.cronograma.totalTrimestres > 0 && projeto.metas.map((meta) => {
                const hasTrimData = Array.from({ length: projeto.cronograma.totalTrimestres }).some(
                  (_, idx) => (meta.previstoPorTrimestre[idx] ?? 0) > 0 || (meta.realizadoPorTrimestre[idx] ?? 0) > 0
                );
                if (!hasTrimData) return null;
                return (
                  <div key={`trim-${meta.id}`} className="mt-4">
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {meta.codigo} — {meta.descricao} (trimestral)
                    </p>
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-secondary">
                          {Array.from({ length: projeto.cronograma.totalTrimestres }).map((_, idx) => (
                            <th key={idx} colSpan={2} className="border border-border px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              T{idx + 1}
                            </th>
                          ))}
                        </tr>
                        <tr>
                          {Array.from({ length: projeto.cronograma.totalTrimestres }).map((_, idx) => (
                            <>
                              <th key={`p-${idx}`} className="border border-border px-2 py-1 text-center text-[9px] text-muted-foreground">Prev.</th>
                              <th key={`r-${idx}`} className="border border-border px-2 py-1 text-center text-[9px] text-muted-foreground">Real.</th>
                            </>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {Array.from({ length: projeto.cronograma.totalTrimestres }).map((_, idx) => (
                            <>
                              <td key={`pv-${idx}`} className="border border-border px-2 py-1.5 text-center text-muted-foreground">{meta.previstoPorTrimestre[idx] ?? 0}</td>
                              <td key={`rv-${idx}`} className="border border-border px-2 py-1.5 text-center font-semibold text-foreground">{meta.realizadoPorTrimestre[idx] ?? 0}</td>
                            </>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </section>
          )}

          {/* ── Seção: Etapas ── */}
          {options.etapas && (projeto.etapas?.length ?? 0) > 0 && (
            <section className="mb-7 border-t border-border/70 pt-5">
              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">4. Etapas e Entregáveis</p>
              <div className="space-y-3">
                {projeto.etapas!.map((etapa) => (
                  <div key={etapa.id} className="rounded-lg border border-border bg-muted p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-foreground">{etapa.nome}</p>
                      <p className="text-[11px] font-bold text-primary">{etapa.percentual.toFixed(0)}%</p>
                    </div>
                    {/* Progress bar */}
                    <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-sky-600 transition-all"
                        style={{ width: `${Math.min(100, etapa.percentual)}%` }}
                      />
                    </div>
                    {/* Entregáveis */}
                    {etapa.entregaveis.length > 0 && (
                      <div className="space-y-1">
                        {etapa.entregaveis.map((entregavel) => (
                          <div key={entregavel.id} className="flex items-center gap-2">
                            <span className={`h-3.5 w-3.5 rounded-full border-2 ${entregavel.concluido ? 'border-emerald-500 bg-emerald-500' : 'border-input bg-white'}`}>
                              {entregavel.concluido && (
                                <svg className="h-full w-full text-white" viewBox="0 0 12 12" fill="none">
                                  <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </span>
                            <span className={`text-[10px] ${entregavel.concluido ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}>
                              {entregavel.nome}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Seção: Orçamento ── */}
          {options.orcamento && (projeto.rubricas?.length ?? 0) > 0 && (
            <section className="mb-7 border-t border-border/70 pt-5">
              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">5. Orçamento</p>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-secondary">
                    <th className="border border-border px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Rubrica</th>
                    <th className="border border-border px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Previsto</th>
                    <th className="border border-border px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Executado</th>
                    <th className="border border-border px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">%</th>
                    <th className="border border-border px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Aditivos</th>
                  </tr>
                </thead>
                <tbody>
                  {projeto.rubricas!.map((rubrica) => {
                    const percentual = rubrica.previsto > 0
                      ? ((rubrica.executado / rubrica.previsto) * 100).toFixed(0)
                      : '—';
                    const totalAditivos = rubrica.aditivos.reduce((sum, a) => sum + a.valor, 0);
                    return (
                      <tr key={rubrica.id} className="even:bg-muted">
                        <td className="border border-border px-3 py-2 font-medium text-foreground">{rubrica.nome}</td>
                        <td className="border border-border px-3 py-2 text-right text-muted-foreground">{formatCurrency(rubrica.previsto)}</td>
                        <td className="border border-border px-3 py-2 text-right font-semibold text-foreground">{formatCurrency(rubrica.executado)}</td>
                        <td className="border border-border px-3 py-2 text-right font-bold text-foreground">{percentual}%</td>
                        <td className="border border-border px-3 py-2 text-right text-muted-foreground">
                          {totalAditivos > 0 ? formatCurrency(totalAditivos) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary font-semibold">
                    <td className="border border-border px-3 py-2 text-foreground">Total</td>
                    <td className="border border-border px-3 py-2 text-right text-foreground">
                      {formatCurrency(projeto.rubricas!.reduce((s, r) => s + r.previsto, 0))}
                    </td>
                    <td className="border border-border px-3 py-2 text-right text-foreground">
                      {formatCurrency(projeto.rubricas!.reduce((s, r) => s + r.executado, 0))}
                    </td>
                    <td className="border border-border px-3 py-2 text-right text-foreground">—</td>
                    <td className="border border-border px-3 py-2 text-right text-foreground">
                      {formatCurrency(projeto.rubricas!.reduce((s, r) => s + r.aditivos.reduce((ss, a) => ss + a.valor, 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </section>
          )}

          {/* ── Seção: Parceiros ── */}
          {options.parceiros && (projeto.parceirosModulo?.length ?? 0) > 0 && (
            <section className="mb-7 border-t border-border/70 pt-5">
              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">6. Parceiros</p>
              <div className="grid grid-cols-2 gap-3">
                {projeto.parceirosModulo!.map((parceiro) => (
                  <div key={parceiro.id} className="rounded-lg border border-border bg-muted p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-foreground">{parceiro.nome}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{parceiro.papel}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${
                        parceiro.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' :
                        parceiro.status === 'Apoiador' ? 'bg-primary/20 text-primary' :
                        parceiro.status === 'Consultor' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-200 text-muted-foreground'
                      }`}>
                        {parceiro.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Seção: Riscos ── */}
          {options.riscos && (projeto.riscos?.length ?? 0) > 0 && (
            <section className="mb-7 border-t border-border/70 pt-5">
              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">7. Riscos</p>
              <div className="space-y-2">
                {projeto.riscos!.map((risco) => (
                  <div key={risco.id} className="rounded-lg border border-border bg-muted p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-[11px] font-medium text-foreground">{risco.descricao}</p>
                        {risco.mitigacao && (
                          <p className="mt-1 text-[10px] text-muted-foreground"><span className="font-medium">Mitigação:</span> {risco.mitigacao}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${
                          risco.probabilidade === 'Alta' ? 'bg-rose-100 text-rose-700' :
                          risco.probabilidade === 'Média' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-200 text-muted-foreground'
                        }`}>
                          {risco.probabilidade}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${
                          risco.impacto === 'Alto' ? 'bg-rose-100 text-rose-700' :
                          risco.impacto === 'Médio' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-200 text-muted-foreground'
                        }`}>
                          {risco.impacto}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${
                          risco.status === 'Aberto' ? 'bg-rose-100 text-rose-700' :
                          risco.status === 'Mitigado' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-200 text-muted-foreground'
                        }`}>
                          {risco.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Seção: Governança ── */}
          {options.governanca && (projeto.decisoes?.length ?? 0) > 0 && (
            <section className="mb-7 border-t border-border/70 pt-5">
              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">8. Governança</p>
              <div className="space-y-2">
                {projeto.decisoes!.map((decisao) => (
                  <div key={decisao.id} className="rounded-lg border border-border bg-muted p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold text-foreground">{decisao.titulo}</p>
                        {decisao.descricao && (
                          <p className="mt-1 text-[10px] text-muted-foreground">{decisao.descricao}</p>
                        )}
                        {decisao.responsavel && (
                          <p className="mt-1 text-[10px] text-muted-foreground">Responsável: {decisao.responsavel}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                        {formatBRDate(parseProjetoDate(decisao.data))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Seção: Indicadores ── */}
          {options.indicadores && (projeto.indicadores?.length ?? 0) > 0 && (
            <section className="mb-7 border-t border-border/70 pt-5">
              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">9. Indicadores de Pesquisa</p>
              <div className="space-y-3">
                {projeto.indicadores!.map((indicador) => (
                  <div key={indicador.id} className="rounded-lg border border-border bg-muted p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-foreground">{indicador.nome}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{indicador.categoria}</p>
                      </div>
                    </div>
                    {/* Bar chart for series */}
                    <div className="mt-2 flex items-end gap-1">
                      {indicador.serie.map((item, idx) => (
                        <div key={idx} className="flex-1">
                          <div
                            className="w-full rounded-t bg-sky-600"
                            style={{ height: `${Math.max(8, (item.valor / Math.max(...indicador.serie.map(s => s.valor))) * 40)}px` }}
                          />
                          <p className="mt-1 text-center text-[8px] text-muted-foreground truncate">{item.label}</p>
                          <p className="text-center text-[9px] font-semibold text-muted-foreground">{item.valor}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Seção: Lançamentos recentes ── */}
          {options.lancamentos && ultimosLancamentos.length > 0 && (
            <section className="mb-7 border-t border-border/70 pt-5">
              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                10. Lançamentos recentes (últimos {ultimosLancamentos.length})
              </p>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-secondary">
                    <th className="border border-border px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Data ativ.</th>
                    <th className="border border-border px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">T</th>
                    <th className="border border-border px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Descrição</th>
                    <th className="border border-border px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Local</th>
                    <th className="border border-border px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Valores</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosLancamentos.map((lanc) => (
                    <tr key={lanc.id} className="even:bg-muted">
                      <td className="border border-border px-3 py-2 text-muted-foreground">
                        {lanc.dataAtividade
                          ? new Date(lanc.dataAtividade + 'T00:00:00').toLocaleDateString('pt-BR')
                          : new Date(lanc.dataRegistro).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="border border-border px-3 py-2 text-center font-semibold text-foreground">T{lanc.trimestre}</td>
                      <td className="border border-border px-3 py-2 text-muted-foreground">{lanc.descricaoAtividade}</td>
                      <td className="border border-border px-3 py-2 text-muted-foreground">{lanc.localAtendido ?? '—'}</td>
                      <td className="border border-border px-3 py-2 text-muted-foreground">
                        {lanc.valores.map((v) => {
                          const meta = projeto.metas.find((m) => m.id === v.metaId);
                          return `${meta?.codigo ?? 'Meta'}: +${v.valorRealizado}`;
                        }).join(', ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* ── Footer ── */}
          <div className="border-t border-border pt-4 text-center">
            <p className="text-[9px] text-muted-foreground">
              Gerado automaticamente pelo Dashboard SUPCDT em {dataGeracao}
            </p>
            <p className="mt-0.5 text-[9px] text-slate-300">
              SECTI — Secretaria de Ciência, Tecnologia e Inovação do Distrito Federal
            </p>
          </div>

        </div>
      </div>
    </>
  );
}