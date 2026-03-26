import { useState, useEffect, type FormEvent } from 'react';
import { Activity, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../contexts/AuthContext';
import { updateProjeto } from '../../lib/api/projetos';
import { API_BASE_URL } from '../../lib/api/base';
import {
  Projeto,
  ProjetoEvidencia,
  getProjetoMonitoramento,
  getProjetoMonitoramentoOperacional,
  getProjetoNome,
  getProjetoNivelRisco,
  getProjetoPrecisaAcao,
  getProjetoSaudeEntrega,
  getProjetoStatusOperacional
} from '../../types/projeto';
import { Button } from '../ui/button';

interface UserOption {
  _id?: string;
  username: string;
  fullName?: string;
}

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

const STATUS_OPERACIONAL_OPTIONS = [
  { value: 'Planejado', label: 'Planejado' },
  { value: 'Em implantação', label: 'Em implantação' },
  { value: 'Operando', label: 'Operando' },
  { value: 'Atenção', label: 'Atenção' },
  { value: 'Crítico', label: 'Crítico' },
  { value: 'Encerrado', label: 'Encerrado' },
];

const NIVEL_RISCO_OPTIONS = [
  { value: 'Baixo', label: 'Baixo' },
  { value: 'Médio', label: 'Médio' },
  { value: 'Alto', label: 'Alto' },
  { value: 'Crítico', label: 'Crítico' },
];

const SAUDE_ENTREGA_OPTIONS = [
  { value: 'Saudável', label: 'Saudável' },
  { value: 'Observação', label: 'Observação' },
  { value: 'Risco', label: 'Risco' },
];

const MANUTENCAO_OPTIONS = [
  { value: 'Sem rotina', label: 'Sem rotina' },
  { value: 'Em dia', label: 'Em dia' },
  { value: 'Pendente', label: 'Pendente' },
  { value: 'Incidente', label: 'Incidente' },
];

export function ProjetoMonitoramentoModal({ projeto, onClose, onSuccess }: ProjetoMonitoramentoModalProps) {
  const { token } = useAuth();
  const monitoramento = getProjetoMonitoramento(projeto);
  const operacional = getProjetoMonitoramentoOperacional(projeto);

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
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

  // Carregar lista de usuários
  useEffect(() => {
    async function fetchUsers() {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || data || []);
        }
      } catch {
        console.error('Erro ao carregar usuários');
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchUsers();
  }, [token]);

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
            ...monitoramento,
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
    <div className="fixed inset-0 z-[160] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[1.5rem] border border-white/80 bg-white shadow-[0_40px_100px_-30px_rgba(15,23,42,0.4)]">

        {/* Header */}
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-sky-600" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700/70 leading-none">Monitoramento</p>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">Painel operacional</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="max-w-[180px] truncate text-[11px] text-slate-400">{getProjetoNome(projeto)}</span>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
              <X className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto bg-white px-6 pt-5 pb-0 overscroll-contain" style={{ maxHeight: 'calc(90vh - 4rem)' }}>
          <div className="space-y-4">

            {/* Status operacional + Nível de risco */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Status operacional</label>
                <select
                  className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={statusOperacional}
                  onChange={(e) => setStatusOperacional(e.target.value)}
                >
                  {STATUS_OPERACIONAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Nível de risco</label>
                <select
                  className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={nivelRisco}
                  onChange={(e) => setNivelRisco(e.target.value)}
                >
                  {NIVEL_RISCO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Saúde da entrega + Manutenção */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Saúde da entrega</label>
                <select
                  className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={saudeEntrega}
                  onChange={(e) => setSaudeEntrega(e.target.value)}
                >
                  {SAUDE_ENTREGA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Manutenção</label>
                <select
                  className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={manutencaoStatus}
                  onChange={(e) => setManutencaoStatus(e.target.value)}
                >
                  {MANUTENCAO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Checkbox ação prioritária */}
            <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={precisaAcao}
                  onChange={(e) => setPrecisaAcao(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-700"
                />
                <p className="text-sm font-medium text-slate-900">Projeto exige ação prioritária</p>
              </label>
            </div>

            {/* Incidentes + Responsável */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Incidentes abertos</label>
                <input
                  type="number"
                  min={0}
                  className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={incidentesAbertos}
                  onChange={(e) => setIncidentesAbertos(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Responsável operacional</label>
                {loadingUsers ? (
                  <div className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 px-3 flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    <span className="ml-2 text-sm text-slate-400">Carregando...</span>
                  </div>
                ) : (
                  <select
                    className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    value={responsavelOperacional}
                    onChange={(e) => setResponsavelOperacional(e.target.value)}
                  >
                    <option value="">Selecionar responsável...</option>
                    {users.map((user) => (
                      <option key={user._id || user.username} value={user.fullName || user.username}>
                        {user.fullName || user.username}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Resumo executivo */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Resumo executivo</label>
              <textarea
                rows={3}
                placeholder="Resumo curto do estado atual..."
                className="w-full rounded-[0.9rem] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none"
                value={resumoExecutivo}
                onChange={(e) => setResumoExecutivo(e.target.value)}
              />
            </div>

            {/* Bloqueios + Próximos passos */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Bloqueios e riscos</label>
                <textarea
                  rows={3}
                  placeholder="Um item por linha..."
                  className="w-full rounded-[0.9rem] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none"
                  value={bloqueios}
                  onChange={(e) => setBloqueios(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Próximos passos</label>
                <textarea
                  rows={3}
                  placeholder="Um item por linha..."
                  className="w-full rounded-[0.9rem] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none"
                  value={proximosPassos}
                  onChange={(e) => setProximosPassos(e.target.value)}
                />
              </div>
            </div>

            {/* Cobertura + Evidências */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Cobertura detalhada</label>
                <textarea
                  rows={3}
                  placeholder="Um item por linha..."
                  className="w-full rounded-[0.9rem] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none"
                  value={coberturaDetalhada}
                  onChange={(e) => setCoberturaDetalhada(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Evidências e links</label>
                <textarea
                  rows={3}
                  placeholder="Nome | URL"
                  className="w-full rounded-[0.9rem] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none"
                  value={evidencias}
                  onChange={(e) => setEvidencias(e.target.value)}
                />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white py-4 mt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="h-8 rounded-full border-slate-200 px-4 text-xs text-slate-600">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="h-8 rounded-full bg-slate-950 px-4 text-xs text-white hover:bg-slate-800">
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}