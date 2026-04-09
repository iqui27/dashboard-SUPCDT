import { useState } from 'react';
import { Check, ListChecks, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Etapa, Projeto } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { createEtapa, updateEtapa, deleteEtapa, toggleEntregavel, addEntregavel, deleteEntregavel } from '../../lib/api/etapas';
import { Button } from '../ui/button';

interface EtapasSectionProps {
  projeto: Projeto;
  onUpdate: () => void;
}

export function EtapasSection({ projeto, onUpdate }: EtapasSectionProps) {
  const { token } = useAuth();
  const [addingEtapa, setAddingEtapa] = useState(false);
  const [newEtapaNome, setNewEtapaNome] = useState('');
  const [newEtapaPercentual, setNewEtapaPercentual] = useState(0);
  const [editingPercentual, setEditingPercentual] = useState<string | null>(null);
  const [editPercentualValue, setEditPercentualValue] = useState(0);
  const [addingEntregavelForEtapa, setAddingEntregavelForEtapa] = useState<string | null>(null);
  const [newEntregavelNome, setNewEntregavelNome] = useState('');
  const [loading, setLoading] = useState(false);

  // Conditional visibility
  if (!projeto.modulosAtivos?.etapas) {
    return null;
  }

  const etapas = projeto.etapas ?? [];

  const handleCreateEtapa = async () => {
    if (!newEtapaNome.trim()) {
      toast.error('Informe o nome da etapa.');
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      await createEtapa(projeto.id, { nome: newEtapaNome, percentual: newEtapaPercentual }, token);
      setAddingEtapa(false);
      setNewEtapaNome('');
      setNewEtapaPercentual(0);
      onUpdate();
    } catch {
      toast.error('Erro ao criar etapa.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePercentual = async (etapa: Etapa) => {
    if (!token) return;

    setLoading(true);
    try {
      await updateEtapa(projeto.id, etapa.id, { percentual: editPercentualValue }, token);
      setEditingPercentual(null);
      onUpdate();
    } catch {
      toast.error('Erro ao atualizar percentual.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEtapa = async (etapaId: string) => {
    if (!token) return;

    setLoading(true);
    try {
      await deleteEtapa(projeto.id, etapaId, token);
      onUpdate();
    } catch {
      toast.error('Erro ao remover etapa.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEntregavel = async (etapa: Etapa, entregavelId: string, concluido: boolean) => {
    if (!token) return;

    try {
      await toggleEntregavel(projeto.id, etapa.id, entregavelId, !concluido, token);
      onUpdate();
    } catch {
      toast.error('Erro ao atualizar entregável.');
    }
  };

  const handleAddEntregavel = async (etapaId: string) => {
    if (!newEntregavelNome.trim()) {
      setAddingEntregavelForEtapa(null);
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      await addEntregavel(projeto.id, etapaId, newEntregavelNome, token);
      setAddingEntregavelForEtapa(null);
      setNewEntregavelNome('');
      onUpdate();
    } catch {
      toast.error('Erro ao adicionar entregável.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntregavel = async (etapaId: string, entregavelId: string) => {
    if (!token) return;

    try {
      await deleteEntregavel(projeto.id, etapaId, entregavelId, token);
      onUpdate();
    } catch {
      toast.error('Erro ao remover entregável.');
    }
  };

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-border/80 bg-card/80 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">Execução</p>
          <h3 className="mt-0.5 text-sm font-bold text-foreground">Etapas do projeto</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddingEtapa(true)}
          className="h-8 rounded-full border-border px-3 text-xs"
          disabled={loading}
        >
          <Plus className="mr-1.5 h-3 w-3" />
          Nova etapa
        </Button>
      </div>

      <div className="border-t border-border/70">
        {addingEtapa && (
          <div className="divide-y divide-border/70 border-b border-border/70 bg-muted/50 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nome da etapa</label>
                <input
                  type="text"
                  value={newEtapaNome}
                  onChange={(e) => setNewEtapaNome(e.target.value)}
                  placeholder="Ex: Planejamento, Execução, Encerramento..."
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>
              <div className="w-28 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Percentual</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newEtapaPercentual}
                  onChange={(e) => setNewEtapaPercentual(Number(e.target.value))}
                  className="h-9 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateEtapa}
                  className="h-9 rounded-full bg-primary px-4 text-xs text-white hover:bg-primary/90"
                  disabled={loading}
                >
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddingEtapa(false);
                    setNewEtapaNome('');
                    setNewEtapaPercentual(0);
                  }}
                  className="h-9 rounded-full px-3 text-xs text-muted-foreground"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {etapas.length === 0 && !addingEtapa ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            <ListChecks className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2">Nenhuma etapa cadastrada. Clique em "Nova etapa" para começar.</p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-border/70">
            {etapas.map((etapa) => (
              <li key={etapa.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-foreground">{etapa.nome}</h4>
                    <div className="mt-2 flex items-center gap-2">
                      {editingPercentual === etapa.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={editPercentualValue}
                            onChange={(e) => setEditPercentualValue(Number(e.target.value))}
                            className="h-7 w-16 rounded-lg border border-border px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdatePercentual(etapa);
                              if (e.key === 'Escape') setEditingPercentual(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdatePercentual(etapa)}
                            className="rounded-full p-1 text-primary hover:bg-primary/10"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPercentual(null)}
                            className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPercentual(etapa.id);
                            setEditPercentualValue(etapa.percentual);
                          }}
                          className="flex items-center gap-2 rounded-lg bg-muted px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-secondary"
                        >
                          {etapa.percentual}%
                        </button>
                      )}
                      <div className="h-1.5 flex-1 rounded-full bg-secondary">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, etapa.percentual))}%` }}
                        />
                      </div>
                    </div>

                    {/* Entregáveis */}
                    {etapa.entregaveis.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {etapa.entregaveis.map((ent) => (
                          <li key={ent.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleEntregavel(etapa, ent.id, ent.concluido)}
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                                ent.concluido
                                  ? 'border-emerald-500 bg-success text-white'
                                  : 'border-input bg-card hover:border-border'
                              }`}
                            >
                              {ent.concluido && <Check className="h-3 w-3" />}
                            </button>
                            <span className={`text-xs ${ent.concluido ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}>
                              {ent.nome}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteEntregavel(etapa.id, ent.id)}
                              className="rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-muted-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Adicionar entregável */}
                    {addingEntregavelForEtapa === etapa.id ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={newEntregavelNome}
                          onChange={(e) => setNewEntregavelNome(e.target.value)}
                          placeholder="Nome do entregável..."
                          className="h-7 flex-1 rounded-lg border border-border bg-card px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddEntregavel(etapa.id);
                            if (e.key === 'Escape') {
                              setAddingEntregavelForEtapa(null);
                              setNewEntregavelNome('');
                            }
                          }}
                          onBlur={() => {
                            if (!newEntregavelNome.trim()) {
                              setAddingEntregavelForEtapa(null);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddEntregavel(etapa.id)}
                          className="rounded-full p-1 text-primary hover:bg-primary/10"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingEntregavelForEtapa(etapa.id)}
                        className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-muted-foreground"
                      >
                        <Plus className="h-3 w-3" />
                        Adicionar entregável
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteEtapa(etapa.id)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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