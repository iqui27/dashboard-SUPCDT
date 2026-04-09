import { useState } from 'react';
import { Check, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Projeto, StatusParceiro } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { createParceiro, updateParceiro, deleteParceiro } from '../../lib/api/parceiros';
import { Button } from '../ui/button';

interface ParceirosSectionProps {
  projeto: Projeto;
  onUpdate: () => void;
}

const STATUS_OPTIONS: { value: StatusParceiro; label: string; color: string }[] = [
  { value: 'Ativo', label: 'Ativo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'Apoiador', label: 'Apoiador', color: 'bg-primary/20 text-primary border-sky-200' },
  { value: 'Consultor', label: 'Consultor', color: 'bg-amber-100 text-amber-700 border-warning/40' },
  { value: 'Inativo', label: 'Inativo', color: 'bg-secondary text-muted-foreground border-border' },
];

function getStatusColor(status: StatusParceiro): string {
  const option = STATUS_OPTIONS.find((opt) => opt.value === status);
  return option?.color ?? 'bg-secondary text-muted-foreground border-border';
}

export function ParceirosSection({ projeto, onUpdate }: ParceirosSectionProps) {
  const { token } = useAuth();
  const [addingParceiro, setAddingParceiro] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newPapel, setNewPapel] = useState('');
  const [newStatus, setNewStatus] = useState<StatusParceiro>('Ativo');
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Conditional visibility
  if (!projeto.modulosAtivos?.parceiros) {
    return null;
  }

  const parceiros = projeto.parceirosModulo ?? [];

  const handleCreateParceiro = async () => {
    if (!newNome.trim()) {
      toast.error('Informe o nome do parceiro.');
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      await createParceiro(projeto.id, { nome: newNome, papel: newPapel || undefined, status: newStatus }, token);
      setAddingParceiro(false);
      setNewNome('');
      setNewPapel('');
      setNewStatus('Ativo');
      onUpdate();
    } catch {
      toast.error('Erro ao criar parceiro.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (parceiroId: string, status: StatusParceiro) => {
    if (!token) return;

    setLoading(true);
    try {
      await updateParceiro(projeto.id, parceiroId, { status }, token);
      setEditingStatus(null);
      onUpdate();
    } catch {
      toast.error('Erro ao atualizar status.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteParceiro = async (parceiroId: string) => {
    if (!token) return;

    setLoading(true);
    try {
      await deleteParceiro(projeto.id, parceiroId, token);
      onUpdate();
    } catch {
      toast.error('Erro ao remover parceiro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-border/80 bg-card/80 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700/70">Rede</p>
          <h3 className="mt-0.5 text-sm font-bold text-foreground">Parceiros</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddingParceiro(true)}
          className="h-8 rounded-full border-border px-3 text-xs"
          disabled={loading}
        >
          <Plus className="mr-1.5 h-3 w-3" />
          Novo parceiro
        </Button>
      </div>

      <div className="border-t border-border/70">
        {addingParceiro && (
          <div className="divide-y divide-slate-100 border-b border-border/70 bg-muted/50 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nome *</label>
                <input
                  type="text"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  placeholder="Nome do parceiro"
                  className="h-9 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Papel</label>
                <input
                  type="text"
                  value={newPapel}
                  onChange={(e) => setNewPapel(e.target.value)}
                  placeholder="Ex: Executor, Financiador..."
                  className="h-9 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="w-32 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as StatusParceiro)}
                  className="h-9 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateParceiro}
                  className="h-9 rounded-full bg-primary px-4 text-xs text-white hover:bg-primary/90"
                  disabled={loading}
                >
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddingParceiro(false);
                    setNewNome('');
                    setNewPapel('');
                    setNewStatus('Ativo');
                  }}
                  className="h-9 rounded-full px-3 text-xs text-muted-foreground"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {parceiros.length === 0 && !addingParceiro ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2">Nenhum parceiro cadastrado. Clique em "Novo parceiro" para começar.</p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-slate-100">
            {parceiros.map((parceiro) => (
              <li key={parceiro.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-foreground">{parceiro.nome}</h4>
                  {parceiro.papel && (
                    <p className="text-xs text-muted-foreground">{parceiro.papel}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editingStatus === parceiro.id ? (
                    <div className="relative">
                      <select
                        value={parceiro.status}
                        onChange={(e) => handleUpdateStatus(parceiro.id, e.target.value as StatusParceiro)}
                        onBlur={() => setEditingStatus(null)}
                        className="h-7 appearance-none rounded-full border px-2.5 pr-6 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <Check className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingStatus(parceiro.id)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(parceiro.status)}`}
                    >
                      {parceiro.status}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteParceiro(parceiro.id)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}