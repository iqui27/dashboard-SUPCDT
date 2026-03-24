import { useState } from 'react';
import { BarChart3, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Projeto, SerieDados } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { createIndicador, deleteIndicador } from '../../lib/api/indicadores';
import { Button } from '../ui/button';

interface IndicadoresSectionProps {
  projeto: Projeto;
  onUpdate: () => void;
}

export function IndicadoresSection({ projeto, onUpdate }: IndicadoresSectionProps) {
  const { token } = useAuth();
  const [addingIndicador, setAddingIndicador] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newCategoria, setNewCategoria] = useState('');
  const [newSeries, setNewSeries] = useState<SerieDados[]>([{ label: '', valor: 0 }]);
  const [loading, setLoading] = useState(false);

  // Conditional visibility
  if (!projeto.modulosAtivos?.indicadores) {
    return null;
  }

  const indicadores = projeto.indicadores ?? [];

  const handleAddSerie = () => {
    setNewSeries((prev) => [...prev, { label: '', valor: 0 }]);
  };

  const handleRemoveSerie = (index: number) => {
    setNewSeries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSerieChange = (index: number, field: 'label' | 'valor', value: string | number) => {
    setNewSeries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleCreateIndicador = async () => {
    if (!newNome.trim()) {
      toast.error('Informe o nome do indicador.');
      return;
    }
    if (!token) return;

    // Filter out empty series
    const validSeries = newSeries.filter((s) => s.label.trim());

    setLoading(true);
    try {
      await createIndicador(
        projeto.id,
        {
          nome: newNome.trim(),
          categoria: newCategoria.trim() || undefined,
          serie: validSeries,
        },
        token
      );
      setAddingIndicador(false);
      setNewNome('');
      setNewCategoria('');
      setNewSeries([{ label: '', valor: 0 }]);
      onUpdate();
    } catch {
      toast.error('Erro ao criar indicador.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIndicador = async (indicadorId: string) => {
    if (!token) return;

    setLoading(true);
    try {
      await deleteIndicador(projeto.id, indicadorId, token);
      onUpdate();
    } catch {
      toast.error('Erro ao remover indicador.');
    } finally {
      setLoading(false);
    }
  };

  const renderBarChart = (series: SerieDados[]) => {
    if (!series.length) return null;

    const maxValor = Math.max(...series.map((s) => s.valor), 1);

    return (
      <div className="mt-3 space-y-2">
        {series.map((s, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-28 truncate text-xs text-slate-600">{s.label}</span>
            <div className="h-2 flex-1 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-teal-500 transition-all"
                style={{ width: `${Math.min(100, (s.valor / maxValor) * 100)}%` }}
              />
            </div>
            <span className="w-12 text-right text-xs font-semibold text-slate-950">{s.valor}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/80 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700/70">Pesquisa</p>
          <h3 className="mt-0.5 text-sm font-bold text-slate-900">Indicadores de Pesquisa</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddingIndicador(true)}
          className="h-8 rounded-full border-slate-200 px-3 text-xs"
          disabled={loading}
        >
          <Plus className="mr-1.5 h-3 w-3" />
          Novo indicador
        </Button>
      </div>

      <div className="border-t border-slate-100">
        {addingIndicador && (
          <div className="divide-y divide-slate-100 border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-slate-600">Nome *</label>
                  <input
                    type="text"
                    value={newNome}
                    onChange={(e) => setNewNome(e.target.value)}
                    placeholder="Nome do indicador"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    autoFocus
                  />
                </div>
                <div className="w-40 space-y-1">
                  <label className="text-xs font-medium text-slate-600">Categoria</label>
                  <input
                    type="text"
                    value={newCategoria}
                    onChange={(e) => setNewCategoria(e.target.value)}
                    placeholder="Ex: Impacto"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Series inputs */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">Série de dados</label>
                {newSeries.map((serie, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={serie.label}
                      onChange={(e) => handleSerieChange(idx, 'label', e.target.value)}
                      placeholder="Label"
                      className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <input
                      type="number"
                      value={serie.valor || ''}
                      onChange={(e) => handleSerieChange(idx, 'valor', parseFloat(e.target.value) || 0)}
                      placeholder="Valor"
                      className="h-8 w-24 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    {newSeries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSerie(idx)}
                        className="rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddSerie}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar ponto de dados
                </button>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateIndicador}
                  className="h-9 rounded-full bg-slate-950 px-4 text-xs text-white hover:bg-slate-800"
                  disabled={loading}
                >
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddingIndicador(false);
                    setNewNome('');
                    setNewCategoria('');
                    setNewSeries([{ label: '', valor: 0 }]);
                  }}
                  className="h-9 rounded-full px-3 text-xs text-slate-500"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {indicadores.length === 0 && !addingIndicador ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2">Nenhum indicador cadastrado. Clique em "Novo indicador" para começar.</p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-slate-100">
            {indicadores.map((indicador) => (
              <li key={indicador.id} className="flex items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-950">{indicador.nome}</h4>
                    {indicador.categoria && (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-700">
                        {indicador.categoria}
                      </span>
                    )}
                  </div>
                  {indicador.serie.length > 0 && renderBarChart(indicador.serie)}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteIndicador(indicador.id)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}