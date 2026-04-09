import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGrid, ListFilter, MapPinned, Plus, RadioTower, Search, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../contexts/AuthContext';
import { ApiRequestError, createWifiPoint, deleteWifiPoint, fetchWifiPoints, fetchWifiStats, updateWifiPoint } from '../../lib/api/wifi';
import { Projeto, getProjetoNome } from '../../types/projeto';
import { REGIOES_ADMINISTRATIVAS_DF, WIFI_POINT_STATUSES, WifiPoint, WifiPointInput, WifiStats, buildWifiStatsFromPoints, getWifiStatusLabel } from '../../types/wifi';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

import { WifiDashboard } from './WifiDashboard';
import { WifiMap } from './WifiMap';
import { WifiPointForm } from './WifiPointForm';
import { WifiTable } from './WifiTable';

interface WifiSocialProps {
  projetos: Projeto[];
}

type WifiView = 'mapa' | 'painel' | 'lista';

const EMPTY_STATS: WifiStats = {
  totalPontos: 0,
  online: 0,
  instavel: 0,
  offline: 0,
  implantacao: 0,
  precisaAcao: 0,
  manutencaoPendente: 0,
  incidentesAbertos: 0,
  pontosCriticos: 0,
  totalUsuarios: 0,
  velocidadeMedia: 0,
  regioesAtendidas: 0,
  distribStatus: [],
  pontosPorRegiao: [],
  regioesCriticas: [],
  filaAtencao: [],
  recentes: []
};

export function WifiSocial({ projetos }: WifiSocialProps) {
  const { token } = useAuth();
  const [view, setView] = useState<WifiView>('mapa');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [regionFilter, setRegionFilter] = useState('todas');
  const [points, setPoints] = useState<WifiPoint[]>([]);
  const [stats, setStats] = useState<WifiStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<WifiPoint | null>(null);
  const [initialPosition, setInitialPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [apiStatus, setApiStatus] = useState<'ready' | 'partial' | 'unavailable'>('ready');
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  const linkedProject = useMemo(
    () => projetos.find((projeto) => getProjetoNome(projeto).toLowerCase().includes('wifi')),
    [projetos]
  );

  const loadData = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    try {
      const nextPoints = await fetchWifiPoints(token, {
        search: search.trim() || undefined,
        status: statusFilter !== 'todos' ? statusFilter : undefined,
        regiaoAdministrativa: regionFilter !== 'todas' ? regionFilter : undefined
      });

      let nextStats: WifiStats;
      let nextApiStatus: 'ready' | 'partial' | 'unavailable' = 'ready';
      let nextApiMessage: string | null = null;

      try {
        nextStats = await fetchWifiStats(token);
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
          nextStats = buildWifiStatsFromPoints(nextPoints);
          nextApiStatus = 'partial';
          nextApiMessage = 'O backend publicado ainda não expõe /api/wifi/stats. As métricas exibidas abaixo foram derivadas no cliente a partir dos pontos carregados.';
        } else {
          throw error;
        }
      }

      setPoints(nextPoints);
      setStats(nextStats);
      setApiStatus(nextApiStatus);
      setApiMessage(nextApiMessage);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        setPoints([]);
        setStats(EMPTY_STATS);
        setApiStatus('unavailable');
        setApiMessage('O backend publicado ainda não tem o módulo Wi‑Fi Social habilitado. As rotas /api/wifi e/ou /api/wifi/stats responderam 404 neste ambiente.');
        return;
      }

      setApiStatus('ready');
      setApiMessage(null);
      toast.error('Erro ao carregar a operação do Wi‑Fi Social.');
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, regionFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = (position?: { latitude: number; longitude: number }) => {
    setEditingPoint(null);
    setInitialPosition(position ?? null);
    setModalOpen(true);
  };

  const handleSubmitPoint = async (payload: WifiPointInput) => {
    if (!token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    try {
      if (editingPoint) {
        await updateWifiPoint(token, editingPoint.id, payload);
        toast.success('Ponto atualizado.');
      } else {
        await createWifiPoint(token, payload);
        toast.success('Ponto cadastrado.');
      }

      setModalOpen(false);
      setEditingPoint(null);
      setInitialPosition(null);
      setApiStatus('ready');
      setApiMessage(null);
      await loadData();
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        setApiStatus('unavailable');
        setApiMessage('O ambiente atual não publicou as rotas de escrita do Wi‑Fi Social. Publique o backend mais recente para cadastrar ou editar pontos.');
        toast.error('A API publicada ainda não suporta cadastro de pontos Wi‑Fi.');
        return;
      }

      toast.error('Não foi possível salvar o ponto.');
    }
  };

  const handleDeletePoint = async (point: WifiPoint) => {
    if (!token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    if (!window.confirm(`Excluir o ponto "${point.nome}"?`)) {
      return;
    }

    try {
      await deleteWifiPoint(token, point.id);
      toast.success('Ponto removido.');
      setApiStatus('ready');
      setApiMessage(null);
      await loadData();
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        setApiStatus('unavailable');
        setApiMessage('O ambiente atual não publicou as rotas de escrita do Wi‑Fi Social. Publique o backend mais recente para excluir pontos.');
        toast.error('A API publicada ainda não suporta exclusão de pontos Wi‑Fi.');
        return;
      }

      toast.error('Não foi possível excluir o ponto.');
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Hero */}
      <div className="flex items-center justify-between gap-4 px-1 py-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">Wi‑Fi Social DF</p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight text-foreground">Operação territorial</h2>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="uppercase tracking-[0.14em] text-muted-foreground">Projeto</span>
            <span className="font-medium text-muted-foreground">{linkedProject ? getProjetoNome(linkedProject) : 'Wi‑Fi Social'}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="uppercase tracking-[0.14em] text-muted-foreground">Pontos</span>
            <span className="font-semibold text-foreground">{stats.totalPontos}</span>
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'mapa', label: 'Mapa', icon: MapPinned },
              { id: 'painel', label: 'Painel', icon: LayoutGrid },
              { id: 'lista', label: 'Lista', icon: ListFilter }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id as WifiView)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  view === tab.id
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            onClick={() => openCreateModal()}
            disabled={apiStatus === 'unavailable'}
            className="h-8 rounded-full bg-primary px-3 text-xs text-white hover:bg-primary/90 disabled:bg-slate-300"
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Novo ponto
          </Button>
        </div>

        <div className="grid gap-2 lg:grid-cols-[minmax(0,1.3fr)_200px_220px]">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por ponto, CEP, endereço, RA ou responsável..."
              className="h-9 rounded-full border-border bg-muted pl-10 text-sm text-foreground"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 rounded-full bg-muted text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {WIFI_POINT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>{getWifiStatusLabel(status)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="h-9 rounded-full bg-muted text-sm"><SelectValue placeholder="RA" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as RAs</SelectItem>
              {REGIOES_ADMINISTRATIVAS_DF.map((region) => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="font-medium text-muted-foreground">{points.length} ponto(s) filtrado(s)</span>
          <span className="flex items-center gap-1 text-destructive"><ShieldAlert className="h-3 w-3" />{stats.pontosCriticos} críticos</span>
          <span className="flex items-center gap-1 text-warning"><ShieldAlert className="h-3 w-3" />{stats.precisaAcao} exigem ação</span>
          <span className="flex items-center gap-1"><RadioTower className="h-3 w-3" />{stats.incidentesAbertos} incidentes</span>
          <span className="flex items-center gap-1 text-emerald-600"><RadioTower className="h-3 w-3" />{stats.regioesAtendidas} RAs cobertas</span>
        </div>
      </div>

      {apiMessage && (
        <div
          className={`rounded-[1.5rem] border px-5 py-4 text-sm ${
            apiStatus === 'unavailable'
              ? 'border-warning/40 bg-warning/10 text-warning'
              : 'border-sky-200 bg-sky-50 text-sky-900'
          }`}
        >
          {apiMessage}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center rounded-[1.45rem] border border-border/80 bg-card/85 px-8 py-10 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-sky-200 border-t-sky-700" />
            <div className="text-center">
              <p className="font-semibold text-foreground">Carregando operação Wi‑Fi</p>
              <p className="mt-1 text-sm text-muted-foreground">Buscando pontos, cobertura e métricas territoriais.</p>
            </div>
          </div>
        </div>
      ) : apiStatus === 'unavailable' ? (
        <div className="rounded-[1.45rem] border border-dashed border-warning/40 bg-white/85 px-8 py-14 text-center shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
          <p className="text-lg font-semibold text-foreground">Módulo Wi‑Fi Social indisponível neste ambiente</p>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            O frontend foi publicado antes do backend que expõe as rotas de Wi‑Fi Social. O restante do dashboard pode continuar operando, mas esta área depende da publicação das rotas
            {' '}
            <code>/api/wifi</code>
            {' '}
            e
            {' '}
            <code>/api/wifi/stats</code>.
          </p>
        </div>
      ) : (
        <>
          {view === 'mapa' && (
            <WifiMap
              points={points}
              onCreateAt={(latitude, longitude) => openCreateModal({ latitude, longitude })}
              onEditPoint={(point) => {
                setEditingPoint(point);
                setInitialPosition(null);
                setModalOpen(true);
              }}
            />
          )}

          {view === 'painel' && <WifiDashboard stats={stats} points={points} />}

          {view === 'lista' && (
            <WifiTable
              points={points}
              onEditPoint={(point) => {
                setEditingPoint(point);
                setInitialPosition(null);
                setModalOpen(true);
              }}
              onDeletePoint={handleDeletePoint}
            />
          )}
        </>
      )}

      {modalOpen && (
        <WifiPointForm
          point={editingPoint}
          initialPosition={initialPosition}
          defaultRegion={regionFilter !== 'todas' ? regionFilter : undefined}
          onClose={() => {
            setModalOpen(false);
            setEditingPoint(null);
            setInitialPosition(null);
          }}
          onSubmit={handleSubmitPoint}
        />
      )}
    </div>
  );
}
