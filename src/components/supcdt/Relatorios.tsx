import { useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

import { Projeto, getProjetoNome } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { downloadRelatorioSaiweb } from '../../lib/api/lancamentos';
import { Button } from '../ui/button';
import { ProjetoPDFExport } from './ProjetoPDFExport';

interface RelatoriosProps {
  projetos: Projeto[];
}

export function Relatorios({ projetos }: RelatoriosProps) {
  const { token } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedProjetoForPDF, setSelectedProjetoForPDF] = useState<Projeto | null>(null);
  const [pdfSelectIndex, setPdfSelectIndex] = useState<string>('0');

  const handleDownloadSaiweb = async () => {
    if (!token) return;
    setIsDownloading(true);
    try {
      await downloadRelatorioSaiweb(token);
      toast.success('Arquivo CSV gerado com sucesso.');
    } catch {
      toast.error('Erro ao gerar relatório Saiweb.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGerarPDF = () => {
    const idx = Number(pdfSelectIndex);
    const projeto = projetos[idx] ?? projetos[0];
    if (projeto) {
      setSelectedProjetoForPDF(projeto);
    }
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="flex items-center justify-between gap-4 px-1 py-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700/70">Relatórios e exportações</p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">Saída honesta do que já está pronto</h2>
        </div>
      </div>

      {/* Report cards */}
      <div className="overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/80 shadow-sm">
        <ul role="list" className="divide-y divide-slate-100">

          {/* Saiweb */}
          <li className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-sm font-semibold text-slate-900">Exportação operacional Saiweb</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Disponível</span>
                </div>
                <p className="mt-1 ml-6 text-[11px] text-slate-500">
                  Gera um CSV com os lançamentos trimestrais registrados na base atual.
                </p>
              </div>
              <Button onClick={handleDownloadSaiweb} disabled={isDownloading} className="h-8 shrink-0 rounded-full bg-slate-950 px-3 text-xs text-white hover:bg-slate-800">
                <Download className="mr-1.5 h-3 w-3" />
                {isDownloading ? 'Gerando...' : 'Baixar CSV'}
              </Button>
            </div>
          </li>

          {/* PDF institucional */}
          <li className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-sm font-semibold text-slate-900">Relatório institucional por projeto</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Disponível</span>
                </div>
                <p className="mt-1 ml-6 text-[11px] text-slate-500">
                  Selecione um projeto para gerar relatório institucional em PDF.
                </p>
                {projetos.length > 1 && (
                  <div className="mt-2 ml-6">
                    <select
                      value={pdfSelectIndex}
                      onChange={(e) => setPdfSelectIndex(e.target.value)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-600/30"
                    >
                      {projetos.map((p, idx) => (
                        <option key={p.id} value={String(idx)}>
                          {getProjetoNome(p)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <Button
                disabled={projetos.length === 0}
                onClick={handleGerarPDF}
                variant="outline"
                className="h-8 shrink-0 rounded-full border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50"
              >
                <FileSpreadsheet className="mr-1.5 h-3 w-3" />
                Gerar PDF
              </Button>
            </div>
          </li>

        </ul>
      </div>

      {selectedProjetoForPDF && (
        <ProjetoPDFExport
          projeto={selectedProjetoForPDF}
          lancamentos={[]}
          onClose={() => setSelectedProjetoForPDF(null)}
        />
      )}
    </div>
  );
}
