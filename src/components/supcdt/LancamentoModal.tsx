import { useState, type FormEvent } from 'react';
import { ClipboardList, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Projeto, Lancamento, getProjetoNome, parseProjetoDate } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { criarLancamento, updateLancamento, deleteLancamento } from '../../lib/api/lancamentos';
import { Button } from '../ui/button';

interface LancamentoModalProps {
  projeto: Projeto;
  lancamento?: Lancamento; // se presente = modo edição
  onClose: () => void;
  onSuccess: () => void;
}

function getTrimesterLabel(index: number, projeto: Projeto): string {
  const base = parseProjetoDate(projeto.dataInicio);
  if (!base) return `Trimestre ${index + 1}`;

  const start = new Date(base);
  start.setMonth(start.getMonth() + index * 3);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 3);
  end.setDate(end.getDate() - 1);

  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');

  return `T${index + 1} · ${fmt(start)} – ${fmt(end)}`;
}

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function LancamentoModal({ projeto, lancamento, onClose, onSuccess }: LancamentoModalProps) {
  const { token } = useAuth();
  const isEditing = !!lancamento;
  const [loading, setLoading] = useState(false);
  const [trimestre, setTrimestre] = useState(lancamento?.trimestre ?? 1);
  const [descricaoAtividade, setDescricaoAtividade] = useState(lancamento?.descricaoAtividade ?? '');
  const [localAtendido, setLocalAtendido] = useState(lancamento?.localAtendido ?? '');
  const [dataAtividade, setDataAtividade] = useState<string>(
    lancamento?.dataAtividade ?? getTodayISO()
  );

  // Inicializar valores a partir do lançamento existente (modo edição)
  const initialValores: Record<string, number> = {};
  if (lancamento) {
    for (const v of lancamento.valores) {
      initialValores[v.metaId] = v.valorRealizado;
    }
  }
  const [valores, setValores] = useState<Record<string, number>>(initialValores);

  const handleMudarValor = (metaId: string, valStr: string) => {
    const v = parseInt(valStr, 10);
    setValores((prev) => ({ ...prev, [metaId]: isNaN(v) ? 0 : v }));
  };

  const handleDelete = async () => {
    if (!token || !lancamento) return;
    const confirmed = window.confirm('Tem certeza que deseja excluir este lançamento?');
    if (!confirmed) return;

    setLoading(true);
    try {
      await deleteLancamento(lancamento.id, token);
      toast.success('Lançamento excluído com sucesso!');
      onSuccess();
    } catch {
      toast.error('Erro ao excluir lançamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    const valuesArray = Object.keys(valores)
      .map((metaId) => ({ metaId, valorRealizado: valores[metaId] }))
      .filter((v) => v.valorRealizado > 0);

    if (valuesArray.length === 0) {
      toast.error('Informe pelo menos um valor maior que zero em alguma meta.');
      return;
    }

    if (!descricaoAtividade) {
      toast.error('Descrição da atividade é obrigatória.');
      return;
    }

    setLoading(true);
    try {
      const payload: Partial<Lancamento> = {
        trimestre,
        descricaoAtividade,
        localAtendido,
        valores: valuesArray,
        ...(dataAtividade ? { dataAtividade } : {}),
      };

      if (isEditing) {
        await updateLancamento(lancamento.id, payload, token);
        toast.success('Lançamento atualizado com sucesso!');
      } else {
        await criarLancamento({ ...payload, projetoId: projeto.id, dataRegistro: new Date() }, token);
        toast.success('Lançamento registrado com sucesso!');
      }
      onSuccess();
    } catch {
      toast.error(isEditing ? 'Erro ao atualizar lançamento.' : 'Erro ao registrar lançamento.');
    } finally {
      setLoading(false);
    }
  };

  const totalTrimestres = projeto.cronograma.totalTrimestres || 1;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[1.5rem] border border-white/80 bg-white shadow-[0_40px_100px_-30px_rgba(15,23,42,0.4)]">

        {/* Header */}
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="h-4 w-4 text-sky-600" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700/70 leading-none">Monitoramento</p>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {isEditing ? 'Editar lançamento' : 'Novo lançamento'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">{getProjetoNome(projeto)}</span>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
              <X className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto bg-white px-6 pt-5 pb-0 overscroll-contain">
          <div className="space-y-4">

            {/* Trimestre + Local */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Trimestre de referência
                </label>
                <select
                  title="Trimestre"
                  className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={trimestre}
                  onChange={(e) => setTrimestre(Number(e.target.value))}
                >
                  {Array.from({ length: totalTrimestres }).map((_, idx) => (
                    <option key={idx} value={idx + 1}>
                      {getTrimesterLabel(idx, projeto)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Local da atividade
                </label>
                <input
                  type="text"
                  placeholder="Ex: CEF 01 do Recanto das Emas"
                  className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={localAtendido}
                  onChange={(e) => setLocalAtendido(e.target.value)}
                />
              </div>
            </div>

            {/* Data da atividade */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Data da atividade
              </label>
              <input
                type="date"
                className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                value={dataAtividade}
                onChange={(e) => setDataAtividade(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Descrição da atividade
              </label>
              <textarea
                required
                rows={3}
                placeholder="Descreva o que foi feito de forma resumida, mas clara..."
                className="w-full rounded-[0.9rem] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none"
                value={descricaoAtividade}
                onChange={(e) => setDescricaoAtividade(e.target.value)}
              />
            </div>

            {/* Meta values */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Valores realizados
              </p>
              <div className="overflow-hidden rounded-[1.1rem] border border-slate-100">
                <ul role="list" className="divide-y divide-slate-100">
                  {projeto.metas.map((meta) => (
                    <li key={meta.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{meta.codigo} — {meta.descricao}</p>
                        <p className="text-[11px] text-slate-400">{meta.unidade}</p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        className="h-8 w-24 shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 text-sm text-right text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                        value={valores[meta.id] || ''}
                        onChange={(e) => handleMudarValor(meta.id, e.target.value)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-slate-100 bg-white py-4 mt-5">
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={loading}
                  className="h-8 rounded-full px-4 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 className="mr-1.5 h-3 w-3" />
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="h-8 rounded-full border-slate-200 px-4 text-xs text-slate-600">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="h-8 rounded-full bg-slate-950 px-4 text-xs text-white hover:bg-slate-800">
                {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Registrar lançamento'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
