import 'leaflet/dist/leaflet.css';

import { Fragment, useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import {
  AlertTriangle,
  Gauge,
  LocateFixed,
  MapPin,
  PenSquare,
  RadioTower,
  Users,
  Wrench,
  X
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

interface WifiPointDetailCardProps {
  point: WifiPoint;
  onEditPoint: (point: WifiPoint) => void;
  onClose?: () => void;
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

function MapViewportSync({ selectedPoint }: { selectedPoint: WifiPoint | null }) {
  const map = useMap();

  useEffect(() => {
    const invalidate = () => map.invalidateSize({ animate: false });

    const rafId = window.requestAnimationFrame(invalidate);
    const timeoutId = window.setTimeout(invalidate, 180);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [map]);

  useEffect(() => {
    if (!selectedPoint) {
      return;
    }

    map.flyTo([selectedPoint.latitude, selectedPoint.longitude], Math.max(map.getZoom(), 13), {
      animate: true,
      duration: 0.6
    });
  }, [map, selectedPoint]);

  return null;
}

function WifiPointDetailCard({ point, onEditPoint, onClose }: WifiPointDetailCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-white/85 bg-white/96 p-4 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.42)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/75">Ponto selecionado</p>
          <h4 className="mt-2 text-xl font-bold tracking-tight text-foreground">{point.nome}</h4>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{point.endereco}</p>
          {point.cep && <p className="mt-1 text-xs font-medium text-muted-foreground">CEP {point.cep}</p>}
        </div>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-muted-foreground hover:bg-secondary"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWifiStatusTone(point.status)}`}>
          {getWifiStatusLabel(point.status)}
        </span>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWifiPointPriorityTone(getWifiPointPriorityLevel(point))}`}>
          Prioridade {getWifiPointPriorityLevel(point)}
        </span>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWifiMaintenanceTone(point.statusManutencao)}`}>
          {getWifiMaintenanceLabel(point.statusManutencao)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.2rem] border border-border/80 bg-muted px-4 py-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <LocateFixed className="h-3.5 w-3.5" />
            Cobertura
          </div>
          <p className="mt-2 text-lg font-bold text-foreground">{point.coberturaRaioMetros} m</p>
          <p className="text-[13px] text-muted-foreground">{point.regiaoAdministrativa}</p>
        </div>

        <div className="rounded-[1.2rem] border border-border/80 bg-muted px-4 py-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Usuários
          </div>
          <p className="mt-2 text-lg font-bold text-foreground">{point.usuariosConectados ?? 0}</p>
          <p className="text-[13px] text-muted-foreground">conexões registradas</p>
        </div>

        <div className="rounded-[1.2rem] border border-border/80 bg-muted px-4 py-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            Velocidade
          </div>
          <p className="mt-2 text-lg font-bold text-foreground">{point.velocidadeMbps ?? 0} Mbps</p>
          <p className="text-[13px] text-muted-foreground">média operacional</p>
        </div>

        <div className="rounded-[1.2rem] border border-border/80 bg-muted px-4 py-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <RadioTower className="h-3.5 w-3.5" />
            Incidentes
          </div>
          <p className="mt-2 text-lg font-bold text-foreground">{point.incidentesAbertos}</p>
          <p className="text-[13px] text-muted-foreground">ocorrência(s) aberta(s)</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-[1.2rem] border border-border/80 bg-muted px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Wrench className="h-4 w-4 text-primary" />
            Operação e manutenção
          </div>
          <div className="mt-3 space-y-2 text-[13px] leading-5 text-muted-foreground">
            <p><strong className="font-semibold text-foreground">Responsável:</strong> {point.responsavelOperacional || 'Não definido'}</p>
            <p><strong className="font-semibold text-foreground">Última manutenção:</strong> {point.ultimaManutencao ? new Date(point.ultimaManutencao).toLocaleDateString('pt-BR') : 'Sem manutenção registrada'}</p>
            <p><strong className="font-semibold text-foreground">Ação:</strong> {point.precisaAcao ? 'Prioritária' : 'Rotina operacional'}</p>
          </div>
        </div>

        {point.precisaAcao && (
          <div className="flex items-start gap-2 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Este ponto está marcado para atuação prioritária da equipe de campo.
          </div>
        )}

        {point.observacoes && (
          <div className="rounded-[1.2rem] border border-border/80 bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Observações</p>
            <p className="mt-2">{point.observacoes}</p>
          </div>
        )}
      </div>

      <Button
        type="button"
        className="mt-4 h-11 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
        onClick={() => onEditPoint(point)}
      >
        <PenSquare className="mr-2 h-4 w-4" />
        Editar ponto
      </Button>
    </div>
  );
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
    if (selectedPointId && !selectedStillExists) {
      setSelectedPointId(null);
    }
  }, [points, selectedPointId]);

  const selectedPoint = useMemo(
    () => points.find((point) => point.id === selectedPointId) ?? null,
    [points, selectedPointId]
  );

  return (
    <div className="overflow-hidden rounded-[1.45rem] border border-border/80 bg-card/85 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Mapa do DF</h3>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Clique no mapa para abrir o cadastro com a posição inicial preenchida. Clique em um ponto para abrir o painel operacional detalhado.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          Cobertura visual por raio
        </div>
      </div>

      <div className="relative">
        <div className="relative h-[420px] w-full md:h-[520px] xl:h-[620px]">
          <div className="pointer-events-none absolute left-4 top-4 z-[90] hidden max-w-[240px] rounded-[1.15rem] border border-white/80 bg-white/92 px-3.5 py-3 text-xs leading-5 text-muted-foreground shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur-sm md:block">
            Clique no mapa para cadastrar um novo ponto. Clique em um marcador para abrir o painel operacional.
          </div>

          {selectedPoint ? (
            <div className="pointer-events-none absolute bottom-4 right-4 z-[90] hidden w-[380px] max-w-[calc(100%-2rem)] lg:block">
              <div className="pointer-events-auto">
                <WifiPointDetailCard
                  point={selectedPoint}
                  onEditPoint={onEditPoint}
                  onClose={() => setSelectedPointId(null)}
                />
              </div>
            </div>
          ) : null}

          <MapContainer center={[-15.7942, -47.8822]} zoom={10.5} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <MapClickHandler onCreateAt={onCreateAt} />
            <MapViewportSync selectedPoint={selectedPoint} />

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

        {selectedPoint ? (
          <div className="border-t border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] p-4 lg:hidden">
            <WifiPointDetailCard
              point={selectedPoint}
              onEditPoint={onEditPoint}
              onClose={() => setSelectedPointId(null)}
            />
          </div>
        ) : (
          <div className="border-t border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] px-4 py-5">
            <div className="rounded-[1.2rem] border border-dashed border-border bg-white/70 px-4 py-4 text-sm leading-6 text-muted-foreground">
              Clique em um marcador para abrir o painel operacional do ponto sem comprimir o mapa.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
