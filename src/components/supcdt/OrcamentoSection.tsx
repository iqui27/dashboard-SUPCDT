import { useState } from 'react';
import { ChevronDown, ChevronRight, DollarSign, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { AditivoRubrica, Projeto, RubricaOrcamentaria } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { createRubrica, deleteRubrica, addAditivo } from '../../lib/api/orcamento';
import { formatCurrency } from '../../lib/currencyUtils';
import { Button } from '../ui/button';
import { formatBRDate } from '../../lib/utils';
import { parseProjetoDate } from '../../types/projeto';

interface OrcamentoSectionProps {
  projeto: Projeto;
  onUpdate: () => void;
}

export function OrcamentoSection({ projeto, onUpdate }: OrcamentoSectionProps) {
  const { token } = useAuth();
  const [addingRubrica, setAddingRubrica] = useState(false);
  const [newRubricaNome, setNewRubricaNome] = useState('');
  const [newRubricaPrevisto, setNewRubricaPrevisto] = useState(0);
  const [newRubricaExecutado, setNewRubricaExecutado] = useState(0);
  const [expandedRubricas, setExpandedRubricas] = useState<Set<string>>(new Set());
  const [addingAditivoForRubrica, setAddingAditivoForRubrica] = useState<string | null>(null);
  const [newAditivoDescricao, setNewAditivoDescricao] = useState('');
  const [newAditivoValor, setNewAditivoValor] = useState(0);
  const [newAditivoData, setNewAditivoData] = useState('');
  const [loading, setLoading] = useState(false);

  // Conditional visibility
  if (!projeto.modulosAtivos?.orcamento) {
    return null;
  }

  const rubricas = projeto.rubricas ?? [];

  // Compute totals
  const totalPrevisto = rubricas.reduce((sum, r) => sum + (r.previsto ?? 0), 0);
  const totalExecutado = rubricas.reduce((sum, r) => sum + (r.executado ?? 0), 0);
  const saldo = totalPrevisto - totalExecutado;

  const toggleExpand = (rubricaId: string) => {
    setExpandedRubricas((prev) => {
      const next = new Set(prev);
      if (next.has(rubricaId)) {
        next.delete(rubricaId);
      } else {
        next.add(rubricaId);
      }
      return next;
    });
  };

  const handleCreateRubrica = async () => {
    if (!newRubricaNome.trim()) {
      toast.error('Informe o nome da rubrica.');
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      await createRubrica(projeto.id, { nome: newRubricaNome, previsto: newRubricaPrevisto, executado: newRubricaExecutado }, token);
      setAddingRubrica(false);
      setNewRubricaNome('');
      setNewRubricaPrevisto(0);
      setNewRubricaExecutado(0);
      onUpdate();
    } catch {
      toast.error('Erro ao criar rubrica.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRubrica = async (rubricaId: string) => {
    if (!token) return;

    setLoading(true);
    try {
      await deleteRubrica(projeto.id, rubricaId, token);
      onUpdate();
    } catch {
      toast.error('Erro ao remover rubrica.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAditivo = async (rubricaId: string) => {
    if (!newAditivoDescricao.trim()) {
      toast.error('Informe a descrição do aditivo.');
      return;
    }
    if (newAditivoValor <= 0) {
      toast.error('Informe um valor maior que zero.');
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      await addAditivo(projeto.id, rubricaId, { descricao: newAditivoDescricao, valor: newAditivoValor, data: newAditivoData || undefined }, token);
      setAddingAditivoForRubrica(null);
      setNewAditivoDescricao('');
      setNewAditivoValor(0);
      setNewAditivoData('');
      onUpdate();
    } catch {
      toast.error('Erro ao adicionar aditivo.');
    } finally {
      setLoading(false);
    }
  };

  const getVariationPercent = (rubrica: RubricaOrcamentaria): number | null => {
    if (!rubrica.previsto || rubrica.previsto === 0) return null;
    return (rubrica.executado / rubrica.previsto) * 100;
  };

  const rubricaSaldo = (rubrica: RubricaOrcamentaria): number => {
    return (rubrica.previsto ?? 0) - (rubrica.executado ?? 0);
  };

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/80 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700/70">Financeiro</p>
          <h3 className="mt-0.5 text-sm font-bold text-slate-900">Orçamento do projeto</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddingRubrica(true)}
          className="h-8 rounded-full border-slate-200 px-3 text-xs"
          disabled={loading}
        >
          <Plus className="mr-1.5 h-3 w-3" />
          Nova rubrica
        </Button>
      </div>

      {/* Summary header */}
      <div className="grid divide-y divide-slate-100 border-t border-slate-100 text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Previsto</p>
          <p className="mt-0.5 text-sm font-bold text-slate-900">{formatCurrency(totalPrevisto)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Executado</p>
          <p className="mt-0.5 text-sm font-bold text-slate-900">{formatCurrency(totalExecutado)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Saldo</p>
          <p className={`mt-0.5 text-sm font-bold ${saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(saldo)}
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100">
        {addingRubrica && (
          <div className="divide-y divide-slate-100 border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-slate-600">Nome da rubrica</label>
                <input
                  type="text"
                  value={newRubricaNome}
                  onChange={(e) => setNewRubricaNome(e.target.value)}
                  placeholder="Ex: Material, Serviços, Equipamentos..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  autoFocus
                />
              </div>
              <div className="w-32 space-y-1">
                <label className="text-xs font-medium text-slate-600">Previsto (R$)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newRubricaPrevisto}
                  onChange={(e) => setNewRubricaPrevisto(Number(e.target.value))}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="w-32 space-y-1">
                <label className="text-xs font-medium text-slate-600">Executado (R$)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newRubricaExecutado}
                  onChange={(e) => setNewRubricaExecutado(Number(e.target.value))}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateRubrica}
                  className="h-9 rounded-full bg-slate-950 px-4 text-xs text-white hover:bg-slate-800"
                  disabled={loading}
                >
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddingRubrica(false);
                    setNewRubricaNome('');
                    setNewRubricaPrevisto(0);
                    setNewRubricaExecutado(0);
                  }}
                  className="h-9 rounded-full px-3 text-xs text-slate-500"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {rubricas.length === 0 && !addingRubrica ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            <DollarSign className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2">Nenhuma rubrica cadastrada. Clique em "Nova rubrica" para começar.</p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-slate-100">
            {rubricas.map((rubrica) => {
              const variation = getVariationPercent(rubrica);
              const isOverBudget = variation !== null && variation > 100;
              const barWidth = variation !== null ? Math.min(100, variation) : 0;
              const isExpanded = expandedRubricas.has(rubrica.id);
              const rubricaSaldoValue = rubricaSaldo(rubrica);

              return (
                <li key={rubrica.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-950">{rubrica.nome}</h4>
                        {variation !== null && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isOverBudget ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {variation.toFixed(0)}%
                          </span>
                        )}
                        {variation === null && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                            N/A
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                          <div
                            className={`h-1.5 rounded-full transition-all ${isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                        <span>Prev: {formatCurrency(rubrica.previsto)}</span>
                        <span>Exec: {formatCurrency(rubrica.executado)}</span>
                        <span className={rubricaSaldoValue >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          Saldo: {formatCurrency(rubricaSaldoValue)}
                        </span>
                      </div>

                      {/* Aditivos */}
                      {rubrica.aditivos.length > 0 && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => toggleExpand(rubrica.id)}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                          >
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            {rubrica.aditivos.length} aditivo(s)
                          </button>

                          {isExpanded && (
                            <ul className="mt-2 space-y-1.5 pl-4">
                              {rubrica.aditivos.map((aditivo: AditivoRubrica) => (
                                <li key={aditivo.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                                  <span className="flex-1 text-slate-700">{aditivo.descricao}</span>
                                  <span className="font-semibold text-slate-900">{formatCurrency(aditivo.valor)}</span>
                                  {aditivo.data && (
                                    <span className="text-slate-400">{formatBRDate(parseProjetoDate(aditivo.data as unknown as string))}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* Adicionar aditivo */}
                      {addingAditivoForRubrica === rubrica.id ? (
                        <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
                          <div className="grid gap-2 sm:grid-cols-3">
                            <input
                              type="text"
                              value={newAditivoDescricao}
                              onChange={(e) => setNewAditivoDescricao(e.target.value)}
                              placeholder="Descrição"
                              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-sky-500"
                              autoFocus
                            />
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={newAditivoValor}
                              onChange={(e) => setNewAditivoValor(Number(e.target.value))}
                              placeholder="Valor (R$)"
                              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-sky-500"
                            />
                            <input
                              type="date"
                              value={newAditivoData}
                              onChange={(e) => setNewAditivoData(e.target.value)}
                              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-sky-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAddAditivo(rubrica.id)}
                              className="h-7 rounded-full bg-slate-950 px-3 text-[10px] text-white hover:bg-slate-800"
                              disabled={loading}
                            >
                              Adicionar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setAddingAditivoForRubrica(null);
                                setNewAditivoDescricao('');
                                setNewAditivoValor(0);
                                setNewAditivoData('');
                              }}
                              className="h-7 rounded-full px-2 text-[10px] text-slate-500"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAddingAditivoForRubrica(rubrica.id)}
                          className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                        >
                          <Plus className="h-3 w-3" />
                          Adicionar aditivo
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteRubrica(rubrica.id)}
                      className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}