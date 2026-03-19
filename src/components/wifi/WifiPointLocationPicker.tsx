import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

interface WifiPointLocationPickerProps {
  latitude: number;
  longitude: number;
  coverageRadius: number;
  onChange: (latitude: number, longitude: number) => void;
}

const pickerIcon = L.divIcon({
  className: 'wifi-point-picker-marker',
  html: '<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:9999px;background:#0f172a;box-shadow:0 0 0 6px rgba(255,255,255,0.9),0 18px 35px -18px rgba(15,23,42,0.72);border:2px solid rgba(14,116,144,0.3)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

function MapViewportSync({ latitude, longitude }: Pick<WifiPointLocationPickerProps, 'latitude' | 'longitude'>) {
  const map = useMap();

  useEffect(() => {
    map.setView([latitude, longitude], Math.max(map.getZoom(), 14), {
      animate: true
    });
  }, [latitude, longitude, map]);

  return null;
}

function MapClickHandler({ onChange }: Pick<WifiPointLocationPickerProps, 'onChange'>) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng);
    }
  });

  return null;
}

export function WifiPointLocationPicker({
  latitude,
  longitude,
  coverageRadius,
  onChange
}: WifiPointLocationPickerProps) {
  const markerHandlers = useMemo(
    () => ({
      dragend(event: L.LeafletEvent) {
        const marker = event.target as L.Marker;
        const position = marker.getLatLng();
        onChange(position.lat, position.lng);
      }
    }),
    [onChange]
  );

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 text-xs text-slate-500">
        <span>Clique no mapa ou arraste o marcador para posicionar o ponto com precisão.</span>
        <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </span>
      </div>

      <div className="h-[280px] w-full">
        <MapContainer
          center={[latitude, longitude]}
          zoom={14}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <MapViewportSync latitude={latitude} longitude={longitude} />
          <MapClickHandler onChange={onChange} />
          <Circle
            center={[latitude, longitude]}
            radius={coverageRadius}
            pathOptions={{ color: '#0284c7', fillColor: '#0ea5e9', fillOpacity: 0.12, weight: 1.5 }}
          />
          <Marker
            position={[latitude, longitude]}
            draggable
            icon={pickerIcon}
            eventHandlers={markerHandlers}
          />
        </MapContainer>
      </div>
    </div>
  );
}
