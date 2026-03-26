import { Printer, X } from 'lucide-react';

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

export function ProjetoPDFExport({ projeto, lancamentos, onClose }: ProjetoPDFExportProps) {
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print-specific CSS */}
      <style>{`
        @media print {
          body > *:not(.pdf-export-overlay) { display: none !important; }
          .pdf-export-overlay { position: static !important; background: white !important; }
          .pdf-no-print { display: none !important; }
          .pdf-export-content { padding: 0 !important; max-width: 100% !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>

      {/* Overlay */}
      <div className="pdf-export-overlay fixed inset-0 z-[200] overflow-y-auto bg-white">

        {/* Action bar — hidden on print */}
        <div className="pdf-no-print sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700/80">Exportar PDF</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">{nome}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-8 rounded-full border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50"
            >
              <X className="mr-1.5 h-3 w-3" />
              Fechar
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              className="h-8 rounded-full bg-slate-950 px-3 text-xs text-white hover:bg-slate-800"
            >
              <Printer className="mr-1.5 h-3 w-3" />
              Imprimir / Salvar PDF
            </Button>
          </div>
        </div>

        {/* Document content */}
        <div className="pdf-export-content mx-auto max-w-[210mm] px-8 py-8">

          {/* ── Header Institucional ── */}
          <div className="mb-8 border-b-2 border-slate-950 pb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-950">
              SECTI — Secretaria de Ciência, Tecnologia e Inovação
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Superintendência de Ciência, Desenvolvimento e Transferência de Tecnologia
            </p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-950 leading-tight">
                {nome}
              </h1>
              <p className="shrink-0 text-[10px] text-slate-400">
                Gerado em {dataGeracao}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-500">
              <span><span className="font-semibold text-slate-700">Status:</span> {status}</span>
              <span><span className="font-semibold text-slate-700">Categoria:</span> {projeto.categoria ?? 'Não informada'}</span>
              <span><span className="font-semibold text-slate-700">Período:</span> {dataInicio} – {dataFim}</span>
            </div>
          </div>

          {/* ── Seção 1: Dados do Projeto ── */}
          <section className="mb-7">
            <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">1. Dados do Projeto</p>
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
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Seção 2: Monitoramento ── */}
          <section className="mb-7 border-t border-slate-100 pt-5">
            <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">2. Monitoramento</p>

            {/* 4 indicadores */}
            <div className="mb-4 grid grid-cols-4 gap-3">
              {[
                { label: 'Status Operacional', value: statusOperacional },
                { label: 'Nível de Risco', value: nivelRisco },
                { label: 'Saúde da Entrega', value: saudeEntrega },
                { label: 'Progresso Físico', value: `${progresso.toFixed(0)}%` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded border border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                  <p className="mt-1 text-[13px] font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>

            {/* Metas summary */}
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Metas modeladas</p>
                <p className="mt-1 text-[13px] font-bold text-slate-900">{monitoramento.totalMetas}</p>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Total previsto</p>
                <p className="mt-1 text-[13px] font-bold text-slate-900">{monitoramento.totalPrevisto}</p>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Total realizado</p>
                <p className="mt-1 text-[13px] font-bold text-slate-900">{monitoramento.totalRealizado}</p>
              </div>
            </div>

            {operacional.resumoExecutivo && (
              <div className="mb-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Resumo executivo</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-700">{operacional.resumoExecutivo}</p>
              </div>
            )}

            {operacional.bloqueios.length > 0 && (
              <div className="mb-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Bloqueios</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {operacional.bloqueios.map((item) => (
                    <li key={item} className="text-[11px] text-slate-700">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {operacional.proximosPassos.length > 0 && (
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Próximos passos</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {operacional.proximosPassos.map((item) => (
                    <li key={item} className="text-[11px] text-slate-700">{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* ── Seção 3: Metas ── */}
          {projeto.metas.length > 0 && (
            <section className="mb-7 border-t border-slate-100 pt-5">
              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">3. Metas</p>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Código</th>
                    <th className="border border-slate-200 px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Descrição</th>
                    <th className="border border-slate-200 px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Unidade</th>
                    <th className="border border-slate-200 px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Previsto</th>
                    <th className="border border-slate-200 px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Realizado</th>
                    <th className="border border-slate-200 px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">%</th>
                  </tr>
                </thead>
                <tbody>
                  {projeto.metas.map((meta) => {
                    const percentual = meta.totalPrevisto > 0
                      ? ((meta.realizadoTotal / meta.totalPrevisto) * 100).toFixed(0)
                      : '—';
                    return (
                      <tr key={meta.id} className="even:bg-slate-50">
                        <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-900">{meta.codigo}</td>
                        <td className="border border-slate-200 px-3 py-2 text-slate-700">{meta.descricao}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center text-slate-600">{meta.unidade}</td>
                        <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{meta.totalPrevisto}</td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-900">{meta.realizadoTotal}</td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-bold text-slate-900">{percentual}%</td>
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
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {meta.codigo} — {meta.descricao} (trimestral)
                    </p>
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-100">
                          {Array.from({ length: projeto.cronograma.totalTrimestres }).map((_, idx) => (
                            <th key={idx} colSpan={2} className="border border-slate-200 px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              T{idx + 1}
                            </th>
                          ))}
                        </tr>
                        <tr>
                          {Array.from({ length: projeto.cronograma.totalTrimestres }).map((_, idx) => (
                            <>
                              <th key={`p-${idx}`} className="border border-slate-200 px-2 py-1 text-center text-[9px] text-slate-400">Prev.</th>
                              <th key={`r-${idx}`} className="border border-slate-200 px-2 py-1 text-center text-[9px] text-slate-400">Real.</th>
                            </>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {Array.from({ length: projeto.cronograma.totalTrimestres }).map((_, idx) => (
                            <>
                              <td key={`pv-${idx}`} className="border border-slate-200 px-2 py-1.5 text-center text-slate-700">{meta.previstoPorTrimestre[idx] ?? 0}</td>
                              <td key={`rv-${idx}`} className="border border-slate-200 px-2 py-1.5 text-center font-semibold text-slate-900">{meta.realizadoPorTrimestre[idx] ?? 0}</td>
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

          {/* ── Seção 4: Lançamentos recentes ── */}
          {ultimosLancamentos.length > 0 && (
            <section className="mb-7 border-t border-slate-100 pt-5">
              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">
                4. Lançamentos recentes (últimos {ultimosLancamentos.length})
              </p>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Data ativ.</th>
                    <th className="border border-slate-200 px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">T</th>
                    <th className="border border-slate-200 px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Descrição</th>
                    <th className="border border-slate-200 px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Local</th>
                    <th className="border border-slate-200 px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Valores</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosLancamentos.map((lanc) => (
                    <tr key={lanc.id} className="even:bg-slate-50">
                      <td className="border border-slate-200 px-3 py-2 text-slate-600">
                        {lanc.dataAtividade
                          ? new Date(lanc.dataAtividade + 'T00:00:00').toLocaleDateString('pt-BR')
                          : new Date(lanc.dataRegistro).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">T{lanc.trimestre}</td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-700">{lanc.descricaoAtividade}</td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-600">{lanc.localAtendido ?? '—'}</td>
                      <td className="border border-slate-200 px-3 py-2 text-slate-700">
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
          <div className="border-t border-slate-200 pt-4 text-center">
            <p className="text-[9px] text-slate-400">
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
