import 'leaflet/dist/leaflet.css';

import { useMemo } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { AlertTriangle, MapPin, PenSquare, Wrench } from 'lucide-react';

import { WifiPoint, WifiPointStatus, getWifiMaintenanceLabel, getWifiPointPriorityLevel, getWifiPointPriorityTone, getWifiStatusColor, getWifiStatusLabel } from '../../types/wifi';
import { Button } from '../ui/button';

interface WifiMapProps {
  points: WifiPoint[];
  onCreateAt: (latitude: number, longitude: number) => void;
  onEditPoint: (point: WifiPoint) => void;
}

function buildMarkerIcon(status: WifiPointStatus) {
  const color = getWifiStatusColor(status);
  return L.divIcon({
    className: 'wifi-point-marker',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:9999px;background:${color};box-shadow:0 0 0 5px rgba(255,255,255,0.88),0 12px 28px -12px rgba(15,23,42,0.65);border:2px solid rgba(15,23,42,0.12)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
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
  const markerIcons = useMemo(() => ({
    online: buildMarkerIcon('online'),
    instavel: buildMarkerIcon('instavel'),
    offline: buildMarkerIcon('offline'),
    implantacao: buildMarkerIcon('implantacao')
  }), []);

  return (
    <div className="overflow-hidden rounded-[1.45rem] border border-white/80 bg-white/85 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Mapa do DF</h3>
          <p className="mt-1 text-[13px] text-slate-500">Clique no mapa para abrir o cadastro com a posição inicial já preenchida.</p>
        </div>
        <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 md:flex">
          <MapPin className="h-3.5 w-3.5" />
          Cobertura visual por raio
        </div>
      </div>

      <div className="h-[500px] w-full xl:h-[520px]">
        <MapContainer center={[-15.7942, -47.8822]} zoom={10.5} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <MapClickHandler onCreateAt={onCreateAt} />

          {points.map((point) => {
            const color = getWifiStatusColor(point.status);
            const prioridade = getWifiPointPriorityLevel(point);
            return (
              <div key={point.id}>
                <Circle
                  center={[point.latitude, point.longitude]}
                  radius={point.coberturaRaioMetros}
                  pathOptions={{ color, fillColor: color, fillOpacity: point.precisaAcao ? 0.12 : 0.08, weight: prioridade === 'Crítica' ? 2.5 : 1.5 }}
                />
                <Marker position={[point.latitude, point.longitude]} icon={markerIcons[point.status]}>
                  <Popup>
                    <div className="min-w-[220px] space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{point.nome}</p>
                        <p className="text-xs text-slate-500">{point.endereco}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getWifiPointPriorityTone(prioridade)}`}>
                          Prioridade {prioridade}
                        </span>
                      </div>
                      <div className="grid gap-2 text-xs text-slate-600">
                        <p><strong>RA:</strong> {point.regiaoAdministrativa}</p>
                        <p><strong>Status:</strong> {getWifiStatusLabel(point.status)}</p>
                        <p><strong>Cobertura:</strong> {point.coberturaRaioMetros} m</p>
                        <p><strong>Ação:</strong> {point.precisaAcao ? 'Prioritária' : 'Rotina'}</p>
                        <p><strong>Usuários:</strong> {point.usuariosConectados ?? 0}</p>
                        <p><strong>Manutenção:</strong> {getWifiMaintenanceLabel(point.statusManutencao)}</p>
                        <p><strong>Incidentes:</strong> {point.incidentesAbertos}</p>
                      </div>
                      <div className="grid gap-2">
                        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
                          <Wrench className="h-3.5 w-3.5" />
                          {point.ultimaManutencao ? `Última manutenção em ${new Date(point.ultimaManutencao).toLocaleDateString('pt-BR')}` : 'Sem manutenção registrada'}
                        </div>
                        {point.precisaAcao && (
                          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Este ponto exige atuação prioritária da equipe.
                          </div>
                        )}
                      </div>
                      <Button type="button" size="sm" className="w-full rounded-full bg-slate-950 text-white hover:bg-slate-800" onClick={() => onEditPoint(point)}>
                        <PenSquare className="mr-2 h-4 w-4" />
                        Editar ponto
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              </div>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
