import { useMemo, useState, type FormEvent } from 'react';
import { Activity, Save, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../contexts/AuthContext';
import { updateProjeto } from '../../lib/api/projetos';
import {
  Projeto,
  ProjetoEvidencia,
  getProjetoNome,
  getProjetoNivelRisco,
  getProjetoPrecisaAcao,
  getProjetoSaudeEntrega,
  getProjetoStatusOperacional
} from '../../types/projeto';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface ProjetoMonitoramentoModalProps {
  projeto: Projeto;
  onClose: () => void;
  onSuccess: () => void;
}

function listToText(values: string[]): string {
  return values.join('\n');
}

function textToList(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function evidenciasToText(values: ProjetoEvidencia[]): string {
  return values.map((item) => `${item.titulo} | ${item.url}`).join('\n');
}

function textToEvidencias(value: string): ProjetoEvidencia[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [titulo, ...rest] = line.split('|');
      return {
        titulo: titulo?.trim() ?? '',
        url: rest.join('|').trim()
      };
    })
    .filter((item) => item.titulo && item.url);
}

export function ProjetoMonitoramentoModal({ projeto, onClose, onSuccess }: ProjetoMonitoramentoModalProps) {
  const { token } = useAuth();
  const operacional = projeto.monitoramento.operacional;

  const [loading, setLoading] = useState(false);
  const [statusOperacional, setStatusOperacional] = useState(getProjetoStatusOperacional(projeto));
  const [nivelRisco, setNivelRisco] = useState(getProjetoNivelRisco(projeto));
  const [saudeEntrega, setSaudeEntrega] = useState(getProjetoSaudeEntrega(projeto));
  const [precisaAcao, setPrecisaAcao] = useState(getProjetoPrecisaAcao(projeto));
  const [incidentesAbertos, setIncidentesAbertos] = useState(String(operacional.incidentesAbertos ?? 0));
  const [manutencaoStatus, setManutencaoStatus] = useState(operacional.manutencaoStatus || 'Sem rotina');
  const [responsavelOperacional, setResponsavelOperacional] = useState(operacional.responsavelOperacional || projeto.responsavelSECTI || '');
  const [resumoExecutivo, setResumoExecutivo] = useState(operacional.resumoExecutivo || '');
  const [bloqueios, setBloqueios] = useState(listToText(operacional.bloqueios));
  const [proximosPassos, setProximosPassos] = useState(listToText(operacional.proximosPassos));
  const [coberturaDetalhada, setCoberturaDetalhada] = useState(listToText(operacional.coberturaDetalhada));
  const [evidencias, setEvidencias] = useState(evidenciasToText(operacional.evidencias));

  const resumoHelper = useMemo(() => {
    return precisaAcao
      ? 'Projeto marcado como exigindo ação prioritária.'
      : 'Projeto sem ação urgente sinalizada neste momento.';
  }, [precisaAcao]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    setLoading(true);
    try {
      await updateProjeto(
        projeto.id,
        {
          ...projeto,
          monitoramento: {
            ...projeto.monitoramento,
            operacional: {
              ...operacional,
              statusOperacional,
              nivelRisco,
              saudeEntrega,
              precisaAcao,
              incidentesAbertos: Number(incidentesAbertos) || 0,
              manutencaoStatus,
              responsavelOperacional,
              resumoExecutivo,
              bloqueios: textToList(bloqueios),
              proximosPassos: textToList(proximosPassos),
              coberturaDetalhada: textToList(coberturaDetalhada),
              evidencias: textToEvidencias(evidencias),
              ultimaAtualizacao: new Date().toISOString()
            }
          }
        },
        token
      );

      toast.success('Monitoramento atualizado.');
      onSuccess();
    } catch {
      toast.error('Erro ao salvar monitoramento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_40px_120px_-60px_rgba(15,23,42,0.65)]">
        <div className="flex items-start justify-between border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.84))] px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-sky-700" />
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700/80">Monitoramento operacional</p>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">{getProjetoNome(projeto)}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Atualize saúde, risco, incidentes, manutenção, evidências e próximos passos. Esta camada já prepara o modelo que será aprofundado no Wi-Fi Social.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5 text-slate-500" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status operacional</Label>
                  <Select value={statusOperacional} onValueChange={setStatusOperacional}>
                    <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Planejado">Planejado</SelectItem>
                      <SelectItem value="Em implantação">Em implantação</SelectItem>
                      <SelectItem value="Operando">Operando</SelectItem>
                      <SelectItem value="Atenção">Atenção</SelectItem>
                      <SelectItem value="Crítico">Crítico</SelectItem>
                      <SelectItem value="Encerrado">Encerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nível de risco</Label>
                  <Select value={nivelRisco} onValueChange={setNivelRisco}>
                    <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixo">Baixo</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                      <SelectItem value="Alto">Alto</SelectItem>
                      <SelectItem value="Crítico">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Saúde da entrega</Label>
                  <Select value={saudeEntrega} onValueChange={setSaudeEntrega}>
                    <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Saudável">Saudável</SelectItem>
                      <SelectItem value="Observação">Observação</SelectItem>
                      <SelectItem value="Risco">Risco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Manutenção</Label>
                  <Select value={manutencaoStatus} onValueChange={setManutencaoStatus}>
                    <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sem rotina">Sem rotina</SelectItem>
                      <SelectItem value="Em dia">Em dia</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Incidente">Incidente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Incidentes abertos</Label>
                  <Input
                    type="number"
                    min={0}
                    value={incidentesAbertos}
                    onChange={(e) => setIncidentesAbertos(e.target.value)}
                    className="rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Responsável operacional</Label>
                  <Input
                    value={responsavelOperacional}
                    onChange={(e) => setResponsavelOperacional(e.target.value)}
                    placeholder="Servidor(a) responsável pelo acompanhamento"
                    className="rounded-2xl"
                  />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={precisaAcao}
                    onChange={(e) => setPrecisaAcao(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-700"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Projeto exige ação prioritária</p>
                    <p className="text-xs text-slate-500">{resumoHelper}</p>
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <Label>Resumo executivo</Label>
                <Textarea
                  value={resumoExecutivo}
                  onChange={(e) => setResumoExecutivo(e.target.value)}
                  placeholder="Resumo curto do estado atual, decisões recentes e leitura executiva."
                  className="min-h-[120px] rounded-[1.5rem]"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label>Bloqueios e riscos</Label>
                  <Textarea
                    value={bloqueios}
                    onChange={(e) => setBloqueios(e.target.value)}
                    placeholder={"Um item por linha\nEx: Falta validar termo de referência"}
                    className="min-h-[160px] rounded-[1.5rem]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Próximos passos</Label>
                  <Textarea
                    value={proximosPassos}
                    onChange={(e) => setProximosPassos(e.target.value)}
                    placeholder={"Um item por linha\nEx: Consolidar plano de implantação por RA"}
                    className="min-h-[160px] rounded-[1.5rem]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 px-5 py-5 text-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.55)]">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-200/80">
                  <ShieldAlert className="h-4 w-4" />
                  Base para o Wi-Fi Social
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  Cobertura detalhada, manutenção e incidentes já entram aqui porque serão a espinha dorsal do módulo de pontos Wi‑Fi.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Cobertura detalhada</Label>
                <Textarea
                  value={coberturaDetalhada}
                  onChange={(e) => setCoberturaDetalhada(e.target.value)}
                  placeholder={"Um item por linha\nEx: Gama - Rodoviária\nEx: Samambaia Sul - praça central"}
                  className="min-h-[150px] rounded-[1.5rem]"
                />
              </div>

              <div className="space-y-2">
                <Label>Evidências e links</Label>
                <Textarea
                  value={evidencias}
                  onChange={(e) => setEvidencias(e.target.value)}
                  placeholder={"Uma evidência por linha no formato:\nNome do relatório | https://link-da-evidencia"}
                  className="min-h-[170px] rounded-[1.5rem]"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
              {loading ? 'Salvando...' : 'Salvar monitoramento'}
              <Save className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
