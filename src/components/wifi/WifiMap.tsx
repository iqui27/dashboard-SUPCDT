import 'leaflet/dist/leaflet.css';

import { Fragment, useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import {
  AlertTriangle,
  Gauge,
  LocateFixed,
  MapPin,
  PenSquare,
  RadioTower,
  Users,
  Wrench
} from 'lucide-react';

import {
  WifiPoint,
  WifiPointStatus,
  getWifiMaintenanceLabel,
  getWifiMaintenanceTone,
  getWifiPointPriorityLevel,
  getWifiPointPriorityTone,
  getWifiStatusColor,
  getWifiStatusLabel,
  getWifiStatusTone
} from '../../types/wifi';
import { Button } from '../ui/button';

interface WifiMapProps {
  points: WifiPoint[];
  onCreateAt: (latitude: number, longitude: number) => void;
  onEditPoint: (point: WifiPoint) => void;
}

function buildMarkerIcon(status: WifiPointStatus, active = false) {
  const color = getWifiStatusColor(status);
  const size = active ? 24 : 18;
  const halo = active ? 7 : 5;
  const iconAnchor = size / 2;

  return L.divIcon({
    className: 'wifi-point-marker',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${color};box-shadow:0 0 0 ${halo}px rgba(255,255,255,0.92),0 16px 34px -18px rgba(15,23,42,0.72);border:2px solid rgba(15,23,42,0.12);transform:${active ? 'scale(1.04)' : 'scale(1)'}"></div>`,
    iconSize: [size, size],
    iconAnchor: [iconAnchor, iconAnchor]
  });
}

function MapClickHandler({ onCreateAt }: Pick<WifiMapProps, 'onCreateAt'>) {
  useMapEvents({
    click(event) {
      onCreateAt(event.latlng.lat, event.latlng.lng);
    }
  });

  return null;
}

export function WifiMap({ points, onCreateAt, onEditPoint }: WifiMapProps) {
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const markerIcons = useMemo(() => ({
    online: buildMarkerIcon('online'),
    instavel: buildMarkerIcon('instavel'),
    offline: buildMarkerIcon('offline'),
    implantacao: buildMarkerIcon('implantacao')
  }), []);

  const activeMarkerIcons = useMemo(() => ({
    online: buildMarkerIcon('online', true),
    instavel: buildMarkerIcon('instavel', true),
    offline: buildMarkerIcon('offline', true),
    implantacao: buildMarkerIcon('implantacao', true)
  }), []);

  useEffect(() => {
    if (!points.length) {
      setSelectedPointId(null);
      return;
    }

    const selectedStillExists = selectedPointId && points.some((point) => point.id === selectedPointId);
    if (!selectedPointId || !selectedStillExists) {
      setSelectedPointId(points[0].id);
    }
  }, [points, selectedPointId]);

  const selectedPoint = useMemo(
    () => points.find((point) => point.id === selectedPointId) ?? null,
    [points, selectedPointId]
  );

  return (
    <div className="overflow-hidden rounded-[1.45rem] border border-white/80 bg-white/85 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Mapa do DF</h3>
          <p className="mt-1 text-[13px] text-slate-500">Clique no mapa para abrir o cadastro com a posição inicial preenchida. Clique em um ponto para abrir o painel operacional detalhado.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          <MapPin className="h-3.5 w-3.5" />
          Cobertura visual por raio
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative min-h-[420px] border-b border-slate-100 xl:min-h-[560px] xl:border-b-0 xl:border-r xl:border-slate-100">
          <div className="pointer-events-none absolute left-4 top-4 z-[90] max-w-[280px] rounded-[1.15rem] border border-white/80 bg-white/92 px-3.5 py-3 text-xs leading-5 text-slate-600 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur-sm">
            Toque ou clique para cadastrar um novo ponto. O detalhe operacional do ponto selecionado aparece ao lado, sem cortar a leitura dentro do mapa.
          </div>

          <MapContainer center={[-15.7942, -47.8822]} zoom={10.5} scrollWheelZoom className="h-[420px] w-full md:h-[500px] xl:h-[560px]">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <MapClickHandler onCreateAt={onCreateAt} />

            {points.map((point) => {
              const color = getWifiStatusColor(point.status);
              const prioridade = getWifiPointPriorityLevel(point);
              const isSelected = point.id === selectedPointId;

              return (
                <Fragment key={point.id}>
                  <Circle
                    center={[point.latitude, point.longitude]}
                    radius={point.coberturaRaioMetros}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: isSelected ? 0.16 : point.precisaAcao ? 0.12 : 0.08,
                      weight: isSelected ? 3 : prioridade === 'Crítica' ? 2.5 : 1.5
                    }}
                  />
                  <Marker
                    position={[point.latitude, point.longitude]}
                    icon={isSelected ? activeMarkerIcons[point.status] : markerIcons[point.status]}
                    eventHandlers={{
                      click: () => setSelectedPointId(point.id)
                    }}
                  />
                </Fragment>
              );
            })}
          </MapContainer>
        </div>

        <aside className="flex min-h-[320px] flex-col bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))]">
          {selectedPoint ? (
            <>
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700/75">Ponto selecionado</p>
                    <h4 className="mt-2 text-xl font-bold tracking-tight text-slate-950">{selectedPoint.nome}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{selectedPoint.endereco}</p>
                    {selectedPoint.cep && <p className="mt-1 text-xs font-medium text-slate-500">CEP {selectedPoint.cep}</p>}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWifiStatusTone(selectedPoint.status)}`}>
                    {getWifiStatusLabel(selectedPoint.status)}
                  </span>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWifiPointPriorityTone(getWifiPointPriorityLevel(selectedPoint))}`}>
                    Prioridade {getWifiPointPriorityLevel(selectedPoint)}
                  </span>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWifiMaintenanceTone(selectedPoint.statusManutencao)}`}>
                    {getWifiMaintenanceLabel(selectedPoint.statusManutencao)}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[1.2rem] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <LocateFixed className="h-3.5 w-3.5" />
                    Cobertura
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-950">{selectedPoint.coberturaRaioMetros} m</p>
                  <p className="text-[13px] text-slate-500">{selectedPoint.regiaoAdministrativa}</p>
                </div>

                <div className="rounded-[1.2rem] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <Users className="h-3.5 w-3.5" />
                    Usuários
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-950">{selectedPoint.usuariosConectados ?? 0}</p>
                  <p className="text-[13px] text-slate-500">conexões registradas</p>
                </div>

                <div className="rounded-[1.2rem] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <Gauge className="h-3.5 w-3.5" />
                    Velocidade
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-950">{selectedPoint.velocidadeMbps ?? 0} Mbps</p>
                  <p className="text-[13px] text-slate-500">média operacional</p>
                </div>

                <div className="rounded-[1.2rem] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <RadioTower className="h-3.5 w-3.5" />
                    Incidentes
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-950">{selectedPoint.incidentesAbertos}</p>
                  <p className="text-[13px] text-slate-500">ocorrência(s) aberta(s)</p>
                </div>
              </div>

              <div className="space-y-3 px-5 pb-5">
                <div className="rounded-[1.2rem] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Wrench className="h-4 w-4 text-sky-700" />
                    Operação e manutenção
                  </div>
                  <div className="mt-3 space-y-2 text-[13px] leading-5 text-slate-600">
                    <p><strong className="font-semibold text-slate-900">Responsável:</strong> {selectedPoint.responsavelOperacional || 'Não definido'}</p>
                    <p><strong className="font-semibold text-slate-900">Última manutenção:</strong> {selectedPoint.ultimaManutencao ? new Date(selectedPoint.ultimaManutencao).toLocaleDateString('pt-BR') : 'Sem manutenção registrada'}</p>
                    <p><strong className="font-semibold text-slate-900">Ação:</strong> {selectedPoint.precisaAcao ? 'Prioritária' : 'Rotina operacional'}</p>
                  </div>
                </div>

                {selectedPoint.precisaAcao && (
                  <div className="flex items-start gap-2 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    Este ponto está marcado para atuação prioritária da equipe de campo.
                  </div>
                )}

                {selectedPoint.observacoes && (
                  <div className="rounded-[1.2rem] border border-slate-200/80 bg-white px-4 py-3 text-sm leading-6 text-slate-600 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Observações</p>
                    <p className="mt-2">{selectedPoint.observacoes}</p>
                  </div>
                )}

                <Button
                  type="button"
                  className="h-11 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
                  onClick={() => onEditPoint(selectedPoint)}
                >
                  <PenSquare className="mr-2 h-4 w-4" />
                  Editar ponto
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
              <div className="rounded-full bg-slate-100 p-3 text-slate-500">
                <MapPin className="h-5 w-5" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-900">Selecione um ponto no mapa</p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                O detalhe operacional aparece aqui sem recortar conteúdo dentro do mapa.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
