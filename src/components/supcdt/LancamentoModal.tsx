import { useState, type FormEvent } from 'react';
import { ClipboardList, X } from 'lucide-react';
import { toast } from 'sonner';

import { Projeto, Lancamento, getProjetoNome, parseProjetoDate } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { criarLancamento } from '../../lib/api/lancamentos';
import { Button } from '../ui/button';

interface LancamentoModalProps {
  projeto: Projeto;
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

export function LancamentoModal({ projeto, onClose, onSuccess }: LancamentoModalProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [trimestre, setTrimestre] = useState(1);
  const [descricaoAtividade, setDescricaoAtividade] = useState('');
  const [localAtendido, setLocalAtendido] = useState('');
  const [valores, setValores] = useState<Record<string, number>>({});

  const handleMudarValor = (metaId: string, valStr: string) => {
    const v = parseInt(valStr, 10);
    setValores((prev) => ({ ...prev, [metaId]: isNaN(v) ? 0 : v }));
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
        projetoId: projeto.id,
        trimestre,
        descricaoAtividade,
        localAtendido,
        dataRegistro: new Date(),
        valores: valuesArray,
      };
      await criarLancamento(payload, token);
      toast.success('Lançamento registrado com sucesso!');
      onSuccess();
    } catch {
      toast.error('Erro ao registrar lançamento.');
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
              <h2 className="text-sm font-bold text-slate-900 leading-tight">Novo lançamento</h2>
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
          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white py-4 mt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="h-8 rounded-full border-slate-200 px-4 text-xs text-slate-600">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="h-8 rounded-full bg-slate-950 px-4 text-xs text-white hover:bg-slate-800">
              {loading ? 'Salvando...' : 'Registrar lançamento'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
