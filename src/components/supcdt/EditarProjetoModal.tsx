import { useState, useEffect, type FormEvent } from 'react';
import { FolderOpen, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Projeto, getProjetoNome } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { updateProjeto } from '../../lib/api/projetos';
import { API_BASE_URL } from '../../lib/api/base';
import { Button } from '../ui/button';

interface OscOption {
  _id?: string;
  osc: string;
}

interface UserOption {
  _id?: string;
  username: string;
  fullName?: string;
}

interface EditarProjetoModalProps {
  projeto: Projeto;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS = ['Em andamento', 'Assinado', 'Encerrado', 'Suspenso'];
const CATEGORIA_OPTIONS = ['Emenda', 'INEX', 'Convênio', 'Recurso Próprio', 'Outro'];

export function EditarProjetoModal({ projeto, onClose, onSuccess }: EditarProjetoModalProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingOscs, setLoadingOscs] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [oscs, setOscs] = useState<OscOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Carregar lista de OSCs
  useEffect(() => {
    async function fetchOscs() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/oscs`);
        if (res.ok) {
          const data = await res.json();
          setOscs(data || []);
        }
      } catch {
        console.error('Erro ao carregar OSCs');
      } finally {
        setLoadingOscs(false);
      }
    }
    fetchOscs();
  }, []);

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

  // Campos editáveis — inicializados com valores atuais do projeto
  const [nome, setNome] = useState(projeto.nome ?? '');
  const [nomeOSC, setNomeOSC] = useState(projeto.nomeOSC ?? '');
  const [status, setStatus] = useState(projeto.status ?? 'Em andamento');
  const [categoria, setCategoria] = useState(projeto.categoria ?? '');
  const [responsavelSECTI, setResponsavelSECTI] = useState(projeto.responsavelSECTI ?? '');
  const [parceiro, setParceiro] = useState(projeto.parceiro ?? '');
  const [numeroTermo, setNumeroTermo] = useState(projeto.numeroTermo ?? '');
  const [processoSEI, setProcessoSEI] = useState(projeto.processoSEI ?? '');
  const [valorTotal, setValorTotal] = useState(projeto.valorTotal?.toString() ?? '0');
  const [dataInicio, setDataInicio] = useState(projeto.dataInicio ? projeto.dataInicio.substring(0, 10) : '');
  const [dataFim, setDataFim] = useState(projeto.dataFim ? projeto.dataFim.substring(0, 10) : '');
  const [descricao, setDescricao] = useState(projeto.descricao ?? '');
  const [objetivos, setObjetivos] = useState(projeto.objetivos ?? '');
  const [raPerigao, setRaPerigao] = useState(projeto.raPerigao ?? '');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token || !projeto.id) return;

    if (!nome.trim()) {
      toast.error('O nome do projeto é obrigatório.');
      return;
    }

    setLoading(true);
    try {
      await updateProjeto(projeto.id, {
        nome: nome.trim(),
        nomeOSC: nomeOSC.trim() || null,
        status,
        categoria: categoria || null,
        responsavelSECTI: responsavelSECTI.trim() || null,
        parceiro: parceiro.trim() || null,
        numeroTermo: numeroTermo.trim() || null,
        processoSEI: processoSEI.trim() || null,
        valorTotal: parseFloat(valorTotal) || 0,
        dataInicio: dataInicio || null,
        dataFim: dataFim || null,
        descricao: descricao.trim() || null,
        objetivos: objetivos.trim() || null,
        raPerigao: raPerigao.trim() || null,
      }, token);

      toast.success('Projeto atualizado com sucesso.');
      onSuccess();
    } catch {
      toast.error('Erro ao atualizar o projeto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-[0_40px_100px_-30px_rgba(15,23,42,0.4)]">

        {/* Header */}
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-border/70 bg-card/95 px-6 py-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/70 leading-none">Projeto</p>
              <h2 className="text-sm font-bold text-foreground leading-tight">Editar dados básicos</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="max-w-[180px] truncate text-[11px] text-muted-foreground">{getProjetoNome(projeto)}</span>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto bg-white px-6 pt-5 pb-0 overscroll-contain" style={{ maxHeight: 'calc(90vh - 4rem)' }}>
          <div className="space-y-4">

            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Nome do projeto <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="Nome completo do projeto"
                className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            {/* Status + Categoria */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Status</label>
                <select
                  className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Categoria</label>
                <select
                  className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  <option value="">Selecionar categoria...</option>
                  {CATEGORIA_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* OSC + Responsável SECTI */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">OSC</label>
                {loadingOscs ? (
                  <div className="h-9 w-full rounded-full border border-border bg-muted px-3 flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
                  </div>
                ) : (
                  <select
                    className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    value={nomeOSC}
                    onChange={(e) => setNomeOSC(e.target.value)}
                  >
                    <option value="">Selecionar OSC...</option>
                    {oscs.map((osc) => (
                      <option key={osc._id || osc.osc} value={osc.osc}>{osc.osc}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Responsável SECTI</label>
                {loadingUsers ? (
                  <div className="h-9 w-full rounded-full border border-border bg-muted px-3 flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
                  </div>
                ) : (
                  <select
                    className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    value={responsavelSECTI}
                    onChange={(e) => setResponsavelSECTI(e.target.value)}
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

            {/* Parceiro + Território (raPerigao) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Parceiro</label>
                <input
                  type="text"
                  placeholder="Instituição parceira"
                  className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={parceiro}
                  onChange={(e) => setParceiro(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Território / RA Perigão</label>
                <input
                  type="text"
                  placeholder="Região Administrativa"
                  className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={raPerigao}
                  onChange={(e) => setRaPerigao(e.target.value)}
                />
              </div>
            </div>

            {/* Número do Termo + Processo SEI */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Número do Termo</label>
                <input
                  type="text"
                  placeholder="Ex: 001/2025"
                  className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={numeroTermo}
                  onChange={(e) => setNumeroTermo(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Processo SEI</label>
                <input
                  type="text"
                  placeholder="Ex: 00390-00012345/2025-00"
                  className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={processoSEI}
                  onChange={(e) => setProcessoSEI(e.target.value)}
                />
              </div>
            </div>

            {/* Valor Total */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Valor total (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
              />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Data de início</label>
                <input
                  type="date"
                  className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Data de fim</label>
                <input
                  type="date"
                  className="h-9 w-full rounded-full border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Descrição operacional</label>
              <textarea
                rows={3}
                placeholder="Descrição resumida do projeto..."
                className="w-full rounded-[0.9rem] border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            {/* Objetivos */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Objetivos</label>
              <textarea
                rows={3}
                placeholder="Objetivos do projeto..."
                className="w-full rounded-[0.9rem] border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none"
                value={objetivos}
                onChange={(e) => setObjetivos(e.target.value)}
              />
            </div>

          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border/70 bg-white py-4 mt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="h-8 rounded-full border-border px-4 text-xs text-muted-foreground">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="h-8 rounded-full bg-primary px-4 text-xs text-white hover:bg-primary/90">
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
