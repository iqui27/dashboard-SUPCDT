import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGrid, ListFilter, MapPinned, Plus, RadioTower, Search, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../contexts/AuthContext';
import { ApiRequestError, createWifiPoint, deleteWifiPoint, fetchWifiPoints, fetchWifiStats, updateWifiPoint } from '../../lib/api/wifi';
import { Projeto, getProjetoNome, getProjetoStatus } from '../../types/projeto';
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
      <div className="rounded-[1.65rem] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.16),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,255,255,0.74))] p-5 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/80">Wi‑Fi Social DF</p>
            <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-slate-950 lg:text-[2.15rem]">
              Operação territorial da rede com mapa, cobertura e status por ponto.
            </h2>
            <p className="mt-2.5 text-sm leading-6 text-slate-600">
              Esta vertical já nasce integrada ao dashboard principal e transforma o projeto Wi‑Fi Social em uma operação cartográfica real, com cadastro por ponto, leitura de cobertura e pendências operacionais.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Projeto vinculado</p>
              <p className="mt-1 text-base font-semibold text-slate-950">{linkedProject ? getProjetoNome(linkedProject) : 'Wi‑Fi Social'}</p>
              <p className="text-[13px] text-slate-500">{linkedProject ? getProjetoStatus(linkedProject) : 'Sem vínculo explícito no cadastro'}</p>
            </div>
            <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pontos carregados</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{stats.totalPontos}</p>
              <p className="text-[13px] text-slate-500">pontos na coleção operacional</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-[1.45rem] border border-white/80 bg-white/85 p-4 shadow-[0_20px_70px_-42px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'mapa', label: 'Mapa', icon: MapPinned },
              { id: 'painel', label: 'Painel', icon: LayoutGrid },
              { id: 'lista', label: 'Lista', icon: ListFilter }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id as WifiView)}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
                  view === tab.id
                    ? 'bg-slate-950 text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.8)]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            onClick={() => openCreateModal()}
            disabled={apiStatus === 'unavailable'}
            className="h-10 rounded-full bg-slate-950 px-4 text-white hover:bg-slate-800 disabled:bg-slate-300"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo ponto
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_220px_240px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por ponto, CEP, endereço, RA ou responsável..."
              className="h-11 rounded-full border-slate-200 bg-slate-50 pl-11 text-slate-900"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 rounded-full bg-slate-50"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {WIFI_POINT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>{getWifiStatusLabel(status)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="h-11 rounded-full bg-slate-50"><SelectValue placeholder="RA" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as RAs</SelectItem>
              {REGIOES_ADMINISTRATIVAS_DF.map((region) => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-sm text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            {points.length} ponto(s) filtrado(s)
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-700">
            <ShieldAlert className="h-4 w-4" />
            {stats.pontosCriticos} ponto(s) críticos
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
            <ShieldAlert className="h-4 w-4" />
            {stats.precisaAcao} ponto(s) exigem ação prioritária
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            <RadioTower className="h-4 w-4" />
            {stats.incidentesAbertos} incidente(s) abertos
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
            <RadioTower className="h-4 w-4" />
            {stats.regioesAtendidas} RA(s) com cobertura cadastrada
          </span>
        </div>
      </div>

      {apiMessage && (
        <div
          className={`rounded-[1.5rem] border px-5 py-4 text-sm ${
            apiStatus === 'unavailable'
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-sky-200 bg-sky-50 text-sky-900'
          }`}
        >
          {apiMessage}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center rounded-[1.45rem] border border-white/80 bg-white/85 px-8 py-10 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-sky-200 border-t-sky-700" />
            <div className="text-center">
              <p className="font-semibold text-slate-900">Carregando operação Wi‑Fi</p>
              <p className="mt-1 text-sm text-slate-500">Buscando pontos, cobertura e métricas territoriais.</p>
            </div>
          </div>
        </div>
      ) : apiStatus === 'unavailable' ? (
        <div className="rounded-[1.45rem] border border-dashed border-amber-200 bg-white/85 px-8 py-14 text-center shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
          <p className="text-lg font-semibold text-slate-950">Módulo Wi‑Fi Social indisponível neste ambiente</p>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
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
