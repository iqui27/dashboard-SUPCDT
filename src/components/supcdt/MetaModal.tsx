import { useState, useEffect, type FormEvent } from 'react';
import { Target, X } from 'lucide-react';
import { toast } from 'sonner';
import { ObjectId } from 'bson';

import { Projeto, Meta, getProjetoNome, getTrimestreLabel } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { updateProjeto } from '../../lib/api/projetos';
import { Button } from '../ui/button';

interface MetaModalProps {
  projeto: Projeto;
  meta?: Meta; // se fornecido, modo de edição
  onClose: () => void;
  onSuccess: () => void;
}

export function MetaModal({ projeto, meta, onClose, onSuccess }: MetaModalProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const totalTrimesters = projeto.cronograma?.totalTrimestres || 4;
  const isEditing = !!meta;

  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [unidade, setUnidade] = useState('');
  const [previsto, setPrevisto] = useState<number[]>([]);

  // Atualizar estado quando meta mudar (importante para edição!)
  useEffect(() => {
    setCodigo(meta?.codigo ?? '');
    setDescricao(meta?.descricao ?? '');
    setUnidade(meta?.unidade ?? '');

    // Garantir que o array de previsto tem o tamanho correto
    const initialPrevisto = [...(meta?.previstoPorTrimestre ?? [])];
    while (initialPrevisto.length < totalTrimesters) initialPrevisto.push(0);
    setPrevisto(initialPrevisto.slice(0, totalTrimesters));
  }, [meta, totalTrimesters]);

  const handlePrevistoChange = (index: number, valStr: string) => {
    const value = parseFloat(valStr);
    setPrevisto((prev) => {
      const next = [...prev];
      next[index] = isNaN(value) ? 0 : value;
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token || !projeto.id) return;

    if (!codigo || !descricao || !unidade) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    const totalPrevisto = previsto.reduce((acc, curr) => acc + curr, 0);

    if (totalPrevisto <= 0) {
      toast.error('O total previsto deve ser maior que zero.');
      return;
    }

    setLoading(true);
    try {
      let novasMetas: Meta[];

      if (isEditing) {
        novasMetas = projeto.metas.map((m) =>
          m.id === meta.id
            ? { ...m, codigo, descricao, unidade, totalPrevisto, previstoPorTrimestre: previsto }
            : m
        );
      } else {
        const novaMeta: Meta = {
          id: new ObjectId().toString(),
          codigo,
          descricao,
          unidade,
          totalPrevisto,
          previstoPorTrimestre: previsto,
          realizadoTotal: 0,
          realizadoPorTrimestre: Array(totalTrimesters).fill(0),
        };
        novasMetas = [...projeto.metas, novaMeta];
      }

      // Enviar apenas metas para não sobrescrever outros campos do projeto (módulos, etc.)
      await updateProjeto(projeto.id, { metas: novasMetas }, token);
      toast.success(isEditing ? 'Meta atualizada.' : 'Meta adicionada.');
      onSuccess();
    } catch {
      toast.error(isEditing ? 'Erro ao atualizar meta.' : 'Erro ao adicionar meta.');
    } finally {
      setLoading(false);
    }
  };

  const totalPrevisto = previsto.reduce((acc, curr) => acc + curr, 0);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[1.5rem] border border-white/80 bg-white shadow-[0_40px_100px_-30px_rgba(15,23,42,0.4)]">

        {/* Header */}
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <Target className="h-4 w-4 text-sky-600" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/70 leading-none">Metas</p>
              <h2 className="text-sm font-bold text-foreground leading-tight">
                {isEditing ? 'Editar meta' : 'Nova meta'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground">{getProjetoNome(projeto)}</span>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto bg-white px-6 pt-5 pb-0 overscroll-contain">
          <div className="space-y-4">

            {/* Código + Unidade */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Código <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="1.1"
                  className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Unidade de medida <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Pessoas, Relatórios, Unidades..."
                  className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Descrição da meta <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="Ex: Realizar formações presenciais com jovens das escolas."
                className="w-full rounded-[0.9rem] border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            {/* Valores previstos */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Previsto por trimestre
              </p>
              <div className="overflow-hidden rounded-[1.1rem] border border-slate-100">
                <ul role="list" className="divide-y divide-slate-100">
                  {Array.from({ length: totalTrimesters }).map((_, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-4 px-4 py-3">
                      <p className="text-sm text-muted-foreground">{getTrimestreLabel(idx, projeto.dataInicio)}</p>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        className="h-8 w-24 shrink-0 rounded-full border border-border bg-muted px-3 text-sm text-right text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                        value={previsto[idx] || ''}
                        onChange={(e) => handlePrevistoChange(idx, e.target.value)}
                      />
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t border-slate-100 bg-muted px-4 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total previsto</p>
                  <p className="text-sm font-bold text-foreground">{totalPrevisto} {unidade || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white py-4 mt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="h-8 rounded-full border-border px-4 text-xs text-muted-foreground">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="h-8 rounded-full bg-slate-950 px-4 text-xs text-white hover:bg-slate-800">
              {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Adicionar meta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
