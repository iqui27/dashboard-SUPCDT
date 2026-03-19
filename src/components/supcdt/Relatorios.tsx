import { useMemo, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Projeto, getProjetoLacunasMonitoramento } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { downloadRelatorioSaiweb } from '../../lib/api/lancamentos';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface RelatoriosProps {
  projetos: Projeto[];
}

export function Relatorios({ projetos }: RelatoriosProps) {
  const { token } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);

  const lacunas = useMemo(() => (projetos[0] ? getProjetoLacunasMonitoramento(projetos[0]) : []), [projetos]);

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

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.08),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,255,255,0.74))] p-6 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700/80">Relatórios e exportações</p>
        <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">Saída honesta do que já está pronto</h2>
        <p className="mt-3 max-w-3xl text-base text-slate-600">
          Nesta fase, apenas as exportações lastreadas pela base real permanecem disponíveis. O que ainda depende de template, evidências ou novas entidades aparece como indisponível, não como promessa vaga.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[1.75rem] border-white/80 bg-white/85 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-slate-950">Exportação operacional Saiweb</CardTitle>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Gera um CSV com os lançamentos trimestrais registrados na base atual. É a exportação que já possui backend funcional e corresponde ao estado real do produto.
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Disponível agora para exportação a partir dos lançamentos existentes.
            </div>
            <Button onClick={handleDownloadSaiweb} disabled={isDownloading} className="h-11 rounded-full bg-slate-950 text-white hover:bg-slate-800">
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? 'Gerando CSV...' : 'Baixar CSV do Saiweb'}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-white/80 bg-white/85 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-slate-950">Relatório institucional por projeto</CardTitle>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  O resumo executivo em PDF foi removido do fluxo ativo até que o modelo suporte anexos, evidências, regras de homologação e saída institucional padronizada.
                </p>
              </div>
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">O que falta para liberar</p>
              <div className="mt-3 grid gap-2">
                {lacunas.map((lacuna) => (
                  <div key={lacuna} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                    {lacuna}
                  </div>
                ))}
              </div>
            </div>
            <Button disabled variant="outline" className="h-11 rounded-full border-slate-200 bg-white text-slate-500">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              PDF institucional indisponível nesta fase
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
