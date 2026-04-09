import { useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Projeto, ProbabilidadeRisco, ImpactoRisco, StatusRisco, Risco } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { createRisco, updateRisco, deleteRisco } from '../../lib/api/riscos';
import { Button } from '../ui/button';

interface RiscosSectionProps {
  projeto: Projeto;
  onUpdate: () => void;
}

const PROBABILIDADE_OPTIONS: ProbabilidadeRisco[] = ['Baixa', 'Média', 'Alta'];
const IMPACTO_OPTIONS: ImpactoRisco[] = ['Baixo', 'Médio', 'Alto'];

const STATUS_OPTIONS: { value: StatusRisco; label: string; color: string }[] = [
  { value: 'Aberto', label: 'Aberto', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { value: 'Mitigado', label: 'Mitigado', color: 'bg-amber-100 text-amber-700 border-warning/40' },
  { value: 'Encerrado', label: 'Encerrado', color: 'bg-secondary text-muted-foreground border-border' },
];

function getStatusColor(status: StatusRisco): string {
  const option = STATUS_OPTIONS.find((opt) => opt.value === status);
  return option?.color ?? 'bg-secondary text-muted-foreground border-border';
}

/**
 * Calculate severity color based on probabilidade × impacto matrix
 * Critical: Alta × Alto, Alta × Médio
 * High: Média × Alto, Alta × Baixo
 * Moderate: Média × Médio, Baixa × Alto
 * Low: Baixa × Médio, Baixa × Baixo, Média × Baixo
 */
function getSeverityColor(probabilidade: ProbabilidadeRisco, impacto: ImpactoRisco): string {
  if (probabilidade === 'Alta') {
    if (impacto === 'Alto' || impacto === 'Médio') return 'bg-red-500';
    return 'bg-warning/100'; // Alta × Baixo
  }
  if (probabilidade === 'Média') {
    if (impacto === 'Alto') return 'bg-warning/100';
    if (impacto === 'Médio') return 'bg-yellow-500';
    return 'bg-green-500'; // Média × Baixo
  }
  // Baixa
  if (impacto === 'Alto') return 'bg-yellow-500';
  return 'bg-green-500'; // Baixa × Médio, Baixa × Baixo
}

export function RiscosSection({ projeto, onUpdate }: RiscosSectionProps) {
  const { token } = useAuth();
  const [addingRisco, setAddingRisco] = useState(false);
  const [newDescricao, setNewDescricao] = useState('');
  const [newProbabilidade, setNewProbabilidade] = useState<ProbabilidadeRisco>('Média');
  const [newImpacto, setNewImpacto] = useState<ImpactoRisco>('Médio');
  const [newMitigacao, setNewMitigacao] = useState('');
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Conditional visibility
  if (!projeto.modulosAtivos?.riscos) {
    return null;
  }

  const riscos = projeto.riscos ?? [];

  // Separate open and closed risks
  const openRiscos = riscos.filter((r) => r.status !== 'Encerrado');
  const closedRiscos = riscos.filter((r) => r.status === 'Encerrado');

  const handleCreateRisco = async () => {
    if (!newDescricao.trim()) {
      toast.error('Informe a descrição do risco.');
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      await createRisco(
        projeto.id,
        {
          descricao: newDescricao,
          probabilidade: newProbabilidade,
          impacto: newImpacto,
          mitigacao: newMitigacao || undefined,
        },
        token
      );
      setAddingRisco(false);
      setNewDescricao('');
      setNewProbabilidade('Média');
      setNewImpacto('Médio');
      setNewMitigacao('');
      onUpdate();
    } catch {
      toast.error('Erro ao criar risco.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (riscoId: string, status: StatusRisco) => {
    if (!token) return;

    setLoading(true);
    try {
      await updateRisco(projeto.id, riscoId, { status }, token);
      setEditingStatus(null);
      onUpdate();
    } catch {
      toast.error('Erro ao atualizar status.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRisco = async (riscoId: string) => {
    if (!token) return;

    setLoading(true);
    try {
      await deleteRisco(projeto.id, riscoId, token);
      onUpdate();
    } catch {
      toast.error('Erro ao remover risco.');
    } finally {
      setLoading(false);
    }
  };

  const renderRisco = (risco: Risco, isClosed: boolean = false) => (
    <li key={risco.id} className={`flex items-start justify-between gap-3 px-5 py-4 ${isClosed ? 'opacity-50' : ''}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${getSeverityColor(risco.probabilidade, risco.impacto)}`} />
          <h4 className="text-sm font-semibold text-foreground">{risco.descricao}</h4>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            P: {risco.probabilidade}
          </span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            I: {risco.impacto}
          </span>
        </div>
        {risco.mitigacao && (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium">Mitigação:</span> {risco.mitigacao}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {editingStatus === risco.id ? (
          <select
            value={risco.status}
            onChange={(e) => handleUpdateStatus(risco.id, e.target.value as StatusRisco)}
            onBlur={() => setEditingStatus(null)}
            className="h-7 rounded-full border px-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500"
            autoFocus
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <button
            type="button"
            onClick={() => setEditingStatus(risco.id)}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(risco.status)}`}
          >
            {risco.status}
          </button>
        )}
        <button
          type="button"
          onClick={() => handleDeleteRisco(risco.id)}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-border/80 bg-card/80 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-700/70">Gestão</p>
          <h3 className="mt-0.5 text-sm font-bold text-foreground">Riscos</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddingRisco(true)}
          className="h-8 rounded-full border-border px-3 text-xs"
          disabled={loading}
        >
          <Plus className="mr-1.5 h-3 w-3" />
          Novo risco
        </Button>
      </div>

      <div className="border-t border-border/70">
        {addingRisco && (
          <div className="divide-y divide-slate-100 border-b border-border/70 bg-muted/50 px-5 py-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Descrição *</label>
                <input
                  type="text"
                  value={newDescricao}
                  onChange={(e) => setNewDescricao(e.target.value)}
                  placeholder="Descreva o risco..."
                  className="h-9 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="w-32 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Probabilidade</label>
                  <select
                    value={newProbabilidade}
                    onChange={(e) => setNewProbabilidade(e.target.value as ProbabilidadeRisco)}
                    className="h-9 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {PROBABILIDADE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="w-32 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Impacto</label>
                  <select
                    value={newImpacto}
                    onChange={(e) => setNewImpacto(e.target.value as ImpactoRisco)}
                    className="h-9 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {IMPACTO_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Mitigação (opcional)</label>
                <textarea
                  value={newMitigacao}
                  onChange={(e) => setNewMitigacao(e.target.value)}
                  placeholder="Como este risco está sendo mitigado..."
                  rows={2}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateRisco}
                  className="h-9 rounded-full bg-primary px-4 text-xs text-white hover:bg-primary/90"
                  disabled={loading}
                >
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddingRisco(false);
                    setNewDescricao('');
                    setNewProbabilidade('Média');
                    setNewImpacto('Médio');
                    setNewMitigacao('');
                  }}
                  className="h-9 rounded-full px-3 text-xs text-muted-foreground"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {riscos.length === 0 && !addingRisco ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            <AlertTriangle className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2">Nenhum risco cadastrado. Clique em "Novo risco" para começar.</p>
          </div>
        ) : (
          <>
            {/* Open risks */}
            {openRiscos.length > 0 && (
              <ul role="list" className="divide-y divide-slate-100">
                {openRiscos.map((risco) => renderRisco(risco))}
              </ul>
            )}

            {/* Closed risks separator */}
            {closedRiscos.length > 0 && (
              <>
                <div className="border-t border-border bg-muted px-5 py-2">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Encerrados</p>
                </div>
                <ul role="list" className="divide-y divide-slate-100">
                  {closedRiscos.map((risco) => renderRisco(risco, true))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}