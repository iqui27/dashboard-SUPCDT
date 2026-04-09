import { useState, type FormEvent } from 'react';
import { Gavel, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Projeto } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { createDecisao, deleteDecisao } from '../../lib/api/governanca';
import { Button } from '../ui/button';

interface GovernancaSectionProps {
  projeto: Projeto;
  onUpdate: () => void;
}

export function GovernancaSection({ projeto, onUpdate }: GovernancaSectionProps) {
  const { token } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [descricao, setDescricao] = useState('');
  const [responsavel, setResponsavel] = useState('');

  // Conditional visibility
  if (!projeto.modulosAtivos?.governanca) {
    return null;
  }

  const decisoes = projeto.decisoes ?? [];

  // Sort by data descending (most recent first)
  const sortedDecisoes = [...decisoes].sort((a, b) => {
    const dateA = new Date(a.data).getTime();
    const dateB = new Date(b.data).getTime();
    return dateB - dateA;
  });

  const formatDate = (isoDate: string) => {
    const d = new Date(isoDate);
    return d.toLocaleDateString('pt-BR');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error('Informe o título da decisão.');
      return;
    }
    if (!data) {
      toast.error('Informe a data da decisão.');
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      await createDecisao(
        projeto.id,
        {
          titulo: titulo.trim(),
          data,
          descricao: descricao.trim() || undefined,
          responsavel: responsavel.trim() || undefined,
        },
        token
      );
      toast.success('Decisão registrada.');
      setIsModalOpen(false);
      setTitulo('');
      setData(new Date().toISOString().split('T')[0]);
      setDescricao('');
      setResponsavel('');
      onUpdate();
    } catch {
      toast.error('Erro ao registrar decisão.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (decisaoId: string) => {
    if (!token) return;

    setLoading(true);
    try {
      await deleteDecisao(projeto.id, decisaoId, token);
      onUpdate();
    } catch {
      toast.error('Erro ao remover decisão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-[1.35rem] border border-border/80 bg-card/80 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700/70">Estratégia</p>
            <h3 className="mt-0.5 text-sm font-bold text-foreground">Decisões de Governança</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="h-8 rounded-full border-border px-3 text-xs"
            disabled={loading}
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Nova decisão
          </Button>
        </div>

        <div className="border-t border-border/70">
          {decisoes.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              <Gavel className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2">Nenhuma decisão registrada. Clique em "Nova decisão" para começar.</p>
            </div>
          ) : (
            <ul role="list" className="divide-y divide-slate-100">
              {sortedDecisoes.map((decisao) => (
                <li key={decisao.id} className="flex items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatDate(decisao.data)}</span>
                      {decisao.responsavel && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                          {decisao.responsavel}
                        </span>
                      )}
                    </div>
                    <h4 className="mt-1 text-sm font-semibold text-foreground">{decisao.titulo}</h4>
                    {decisao.descricao && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{decisao.descricao}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(decisao.id)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-[0_40px_100px_-30px_rgba(15,23,42,0.4)]">
            {/* Header */}
            <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-border/70 bg-card/95 px-6 py-3.5 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <Gavel className="h-4 w-4 text-violet-600" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-700/70 leading-none">Governança</p>
                  <h2 className="text-sm font-bold text-foreground leading-tight">Nova decisão</h2>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 bg-white px-6 pt-5 pb-0">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Título <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Aprovação de novo cronograma"
                  className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Data <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do responsável"
                    className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhes da decisão..."
                  className="w-full rounded-[0.9rem] border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-border/70 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
                  className="h-8 rounded-full border-border px-4 text-xs text-muted-foreground"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-8 rounded-full bg-primary px-4 text-xs text-white hover:bg-primary/90"
                >
                  {loading ? 'Salvando...' : 'Registrar decisão'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}