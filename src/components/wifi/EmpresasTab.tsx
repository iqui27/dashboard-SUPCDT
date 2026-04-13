import { useEffect, useState } from 'react';
import { Building2, Edit2, Mail, Phone, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../contexts/AuthContext';
import { ApiRequestError, createWifiEmpresa, deleteWifiEmpresa, fetchWifiEmpresas, updateWifiEmpresa } from '../../lib/api/wifi';
import { WifiEmpresa, WifiEmpresaInput, WifiPoint, buildWifiStatsFromPoints } from '../../types/wifi';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface EmpresasTabProps {
  points: WifiPoint[];
}

export function EmpresasTab({ points }: EmpresasTabProps) {
  const { token, user } = useAuth();
  const [empresas, setEmpresas] = useState<WifiEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEmpresa, setEditingEmpresa] = useState<WifiEmpresa | null>(null);
  const [creatingEmpresa, setCreatingEmpresa] = useState(false);
  const [form, setForm] = useState<WifiEmpresaInput>({ nome: '', contatoNome: '', telefone: '', email: '' });
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const loadEmpresas = async () => {
      setLoading(true);
      try {
        const data = await fetchWifiEmpresas();
        setEmpresas(data);
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
          setEmpresas([]);
        } else {
          toast.error('Erro ao carregar empresas.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadEmpresas();
  }, []);

  // Compute per-company stats
  const empresasWithStats = empresas.map((empresa) => {
    const empresaPoints = points.filter((point) => point.empresaId === empresa.id);
    const stats = empresaPoints.length > 0 ? buildWifiStatsFromPoints(empresaPoints) : null;
    return { empresa, points: empresaPoints, stats };
  });

  // Points without empresa
  const pointsWithoutEmpresa = points.filter((point) => !point.empresaId);
  const orphanStats = pointsWithoutEmpresa.length > 0 ? buildWifiStatsFromPoints(pointsWithoutEmpresa) : null;

  const handleSubmit = async () => {
    if (!token || !form.nome.trim()) {
      toast.error('Nome da empresa é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      const payload: WifiEmpresaInput = {
        nome: form.nome.trim(),
        contatoNome: form.contatoNome?.trim() || null,
        telefone: form.telefone?.trim() || null,
        email: form.email?.trim() || null
      };

      if (editingEmpresa) {
        const updated = await updateWifiEmpresa(token, editingEmpresa.id, payload);
        setEmpresas((current) => current.map((e) => (e.id === updated.id ? updated : e)));
        toast.success('Empresa atualizada.');
      } else {
        const created = await createWifiEmpresa(token, payload);
        setEmpresas((current) => [...current, created]);
        toast.success('Empresa cadastrada.');
      }

      setCreatingEmpresa(false);
      setEditingEmpresa(null);
      setForm({ nome: '', contatoNome: '', telefone: '', email: '' });
    } catch (error) {
      toast.error('Não foi possível salvar a empresa.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (empresa: WifiEmpresa) => {
    if (!token) return;
    if (!window.confirm(`Excluir a empresa "${empresa.nome}"? Os pontos associados ficarão sem empresa.`)) return;

    try {
      await deleteWifiEmpresa(token, empresa.id);
      setEmpresas((current) => current.filter((e) => e.id !== empresa.id));
      toast.success('Empresa removida.');
    } catch (error) {
      toast.error('Não foi possível excluir a empresa.');
    }
  };

  const startEdit = (empresa: WifiEmpresa) => {
    setEditingEmpresa(empresa);
    setCreatingEmpresa(false);
    setForm({
      nome: empresa.nome,
      contatoNome: empresa.contatoNome ?? '',
      telefone: empresa.telefone ?? '',
      email: empresa.email ?? ''
    });
  };

  const startCreate = () => {
    setEditingEmpresa(null);
    setCreatingEmpresa(true);
    setForm({ nome: '', contatoNome: '', telefone: '', email: '' });
  };

  const cancelForm = () => {
    setEditingEmpresa(null);
    setCreatingEmpresa(false);
    setForm({ nome: '', contatoNome: '', telefone: '', email: '' });
  };

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center rounded-[1.45rem] border border-border/80 bg-card/85 px-8 py-10">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary/25 border-t-sky-700" />
          <p className="text-sm text-muted-foreground">Carregando empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-1 py-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">Gestão</p>
          <h3 className="mt-0.5 text-lg font-bold tracking-tight text-foreground">Empresas responsáveis</h3>
        </div>
        {isAdmin && (
          <Button
            onClick={startCreate}
            disabled={creatingEmpresa || editingEmpresa !== null}
            className="h-8 rounded-full bg-primary px-3 text-xs text-white hover:bg-primary/90 disabled:bg-muted"
          >
            <Building2 className="mr-1.5 h-3 w-3" />
            Nova empresa
          </Button>
        )}
      </div>

      {/* Form modal inline */}
      {(creatingEmpresa || editingEmpresa) && (
        <div className="rounded-[1.45rem] border border-border/80 bg-card p-5">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <h4 className="font-semibold text-foreground">
              {editingEmpresa ? `Editar ${editingEmpresa.nome}` : 'Nova empresa'}
            </h4>
            <Button variant="ghost" size="sm" onClick={cancelForm} className="h-8 rounded-full">
              Cancelar
            </Button>
          </div>
          <div className="grid gap-4 pt-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome da empresa</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((current) => ({ ...current, nome: e.target.value }))}
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Contato</Label>
              <Input
                value={form.contatoNome ?? ''}
                onChange={(e) => setForm((current) => ({ ...current, contatoNome: e.target.value }))}
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={form.telefone ?? ''}
                onChange={(e) => setForm((current) => ({ ...current, telefone: e.target.value }))}
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                className="rounded-2xl"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={cancelForm} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !form.nome.trim()} className="rounded-full bg-primary text-white">
              {saving ? 'Salvando...' : editingEmpresa ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </div>
      )}

      {/* Companies grid */}
      {empresasWithStats.length === 0 && !orphanStats && (
        <div className="rounded-[1.45rem] border border-dashed border-border/60 bg-card/85 px-8 py-12 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma empresa cadastrada. Adicione empresas para associar pontos.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {empresasWithStats.map(({ empresa, points: empresaPoints, stats }) => (
          <div
            key={empresa.id}
            className="rounded-[1.35rem] border border-border/70 bg-card divide-y divide-border/60"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{empresa.nome}</span>
              </div>
              {isAdmin && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(empresa)}
                    className="h-8 w-8 rounded-full"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(empresa)}
                    className="h-8 w-8 rounded-full hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              )}
            </div>

            {/* Contact info */}
            {(empresa.contatoNome || empresa.telefone || empresa.email) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-xs text-muted-foreground">
                {empresa.contatoNome && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {empresa.contatoNome}
                  </span>
                )}
                {empresa.telefone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {empresa.telefone}
                  </span>
                )}
                {empresa.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {empresa.email}
                  </span>
                )}
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="px-4 py-3">
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                  <span className="font-medium text-muted-foreground">
                    <span className="font-semibold text-foreground">{stats.totalPontos}</span> pontos
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    {stats.online} online
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    {stats.instavel} instável
                  </span>
                  <span className="flex items-center gap-1 text-rose-600">
                    {stats.offline} offline
                  </span>
                  {stats.velocidadeMedia > 0 && (
                    <span className="text-muted-foreground">
                      {stats.velocidadeMedia.toFixed(1)} Mbps média
                    </span>
                  )}
                  {stats.pontosCriticos > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      {stats.pontosCriticos} críticos
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Points list preview */}
            {empresaPoints.length > 0 && (
              <div className="px-4 py-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground/80">Pontos associados:</p>
                <ul className="mt-2 space-y-1">
                  {empresaPoints.slice(0, 5).map((point) => (
                    <li key={point.id} className="truncate">
                      {point.nome} — {point.regiaoAdministrativa}
                    </li>
                  ))}
                  {empresaPoints.length > 5 && (
                    <li className="text-muted-foreground">
                      +{empresaPoints.length - 5} outros
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Points without empresa */}
      {orphanStats && pointsWithoutEmpresa.length > 0 && (
        <div className="rounded-[1.35rem] border border-border/70 bg-card divide-y divide-border/60">
          <div className="flex items-center gap-2 px-4 py-3">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-muted-foreground">Pontos sem empresa</span>
            <span className="text-xs text-muted-foreground">
              ({pointsWithoutEmpresa.length})
            </span>
          </div>
          <div className="px-4 py-3">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{orphanStats.totalPontos}</span> pontos
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                {orphanStats.online} online
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                {orphanStats.instavel} instável
              </span>
              <span className="flex items-center gap-1 text-rose-600">
                {orphanStats.offline} offline
              </span>
              {orphanStats.pontosCriticos > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  {orphanStats.pontosCriticos} críticos
                </span>
              )}
            </div>
          </div>
          <div className="px-4 py-3 text-xs text-muted-foreground">
            <ul className="space-y-1">
              {pointsWithoutEmpresa.slice(0, 5).map((point) => (
                <li key={point.id} className="truncate">
                  {point.nome} — {point.regiaoAdministrativa}
                </li>
              ))}
              {pointsWithoutEmpresa.length > 5 && (
                <li className="text-muted-foreground">
                  +{pointsWithoutEmpresa.length - 5} outros
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}