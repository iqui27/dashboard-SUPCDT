import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, MapPinned, Save, Search, Wifi, X } from 'lucide-react';
import { z } from 'zod';

import { formatCep, lookupCepAddress, normalizeCep, reverseLookupPointAddress } from '../../lib/wifiLocation';
import { ResponsavelOperacionalField } from '../ResponsavelOperacionalField';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import {
  REGIOES_ADMINISTRATIVAS_DF,
  WIFI_MAINTENANCE_STATUSES,
  WIFI_POINT_STATUSES,
  WifiMaintenanceStatus,
  WifiPoint,
  WifiPointInput,
  WifiPointStatus,
  getWifiMaintenanceLabel,
  getWifiStatusLabel
} from '../../types/wifi';
import { WifiPointLocationPicker } from './WifiPointLocationPicker';

interface WifiPointFormProps {
  point?: WifiPoint | null;
  initialPosition?: { latitude: number; longitude: number } | null;
  defaultRegion?: string;
  onClose: () => void;
  onSubmit: (payload: WifiPointInput) => Promise<void> | void;
}

const wifiPointSchema = z.object({
  nome: z.string().min(3, 'Informe um nome para o ponto'),
  endereco: z.string().min(5, 'Informe o endereço do ponto'),
  cep: z.string().nullable().optional().refine((value) => !value || normalizeCep(value).length === 8, 'CEP deve ter 8 dígitos'),
  regiaoAdministrativa: z.string().min(2, 'Selecione a região administrativa'),
  latitude: z.number().min(-16.2, 'Latitude fora do DF').max(-15.3, 'Latitude fora do DF'),
  longitude: z.number().min(-48.4, 'Longitude fora do DF').max(-47.3, 'Longitude fora do DF'),
  status: z.enum(WIFI_POINT_STATUSES),
  coberturaRaioMetros: z.number().min(50, 'Cobertura mínima de 50m').max(1500, 'Cobertura máxima de 1500m'),
  velocidadeMbps: z.number().nullable(),
  usuariosConectados: z.number().nullable(),
  precisaAcao: z.boolean(),
  statusManutencao: z.enum(WIFI_MAINTENANCE_STATUSES),
  incidentesAbertos: z.number().min(0, 'Incidentes não pode ser negativo'),
  responsavelOperacional: z.string().nullable(),
  ultimaManutencao: z.string().nullable(),
  observacoes: z.string().nullable()
});

function buildInitialState(point?: WifiPoint | null, initialPosition?: { latitude: number; longitude: number } | null, defaultRegion?: string) {
  return {
    nome: point?.nome ?? '',
    endereco: point?.endereco ?? '',
    cep: point?.cep ?? '',
    regiaoAdministrativa: point?.regiaoAdministrativa ?? defaultRegion ?? 'Plano Piloto',
    latitude: String(point?.latitude ?? initialPosition?.latitude ?? -15.7942),
    longitude: String(point?.longitude ?? initialPosition?.longitude ?? -47.8822),
    status: point?.status ?? ('implantacao' as WifiPointStatus),
    coberturaRaioMetros: String(point?.coberturaRaioMetros ?? 250),
    velocidadeMbps: point?.velocidadeMbps ? String(point.velocidadeMbps) : '',
    usuariosConectados: point?.usuariosConectados ? String(point.usuariosConectados) : '',
    precisaAcao: point?.precisaAcao ?? false,
    statusManutencao: point?.statusManutencao ?? ('pendente' as WifiMaintenanceStatus),
    incidentesAbertos: String(point?.incidentesAbertos ?? 0),
    responsavelOperacional: point?.responsavelOperacional ?? '',
    ultimaManutencao: point?.ultimaManutencao ? point.ultimaManutencao.slice(0, 10) : '',
    observacoes: point?.observacoes ?? ''
  };
}

export function WifiPointForm({ point, initialPosition, defaultRegion, onClose, onSubmit }: WifiPointFormProps) {
  const [form, setForm] = useState(() => buildInitialState(point, initialPosition, defaultRegion));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<string | null>(null);
  const [pointFeedback, setPointFeedback] = useState<string | null>(null);
  const [lookingUpPointAddress, setLookingUpPointAddress] = useState(false);
  const [manualCoordinates, setManualCoordinates] = useState(false);
  const initialLookupDoneRef = useRef(false);
  const reverseLookupRequestRef = useRef(0);

  useEffect(() => {
    setForm(buildInitialState(point, initialPosition, defaultRegion));
    setErrors({});
    setCepFeedback(null);
    setPointFeedback(null);
    setManualCoordinates(false);
    initialLookupDoneRef.current = false;
    reverseLookupRequestRef.current = 0;
  }, [point, initialPosition, defaultRegion]);

  useEffect(() => {
    const scrollY = window.scrollY;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyLeft = document.body.style.left;
    const originalBodyRight = document.body.style.right;
    const originalBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.left = originalBodyLeft;
      document.body.style.right = originalBodyRight;
      document.body.style.width = originalBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const applyReverseLookup = useCallback(async (latitude: number, longitude: number) => {
    const requestId = reverseLookupRequestRef.current + 1;
    reverseLookupRequestRef.current = requestId;
    setLookingUpPointAddress(true);
    setPointFeedback('Buscando endereço exato para o ponto selecionado...');

    try {
      const result = await reverseLookupPointAddress(latitude, longitude);
      if (reverseLookupRequestRef.current !== requestId) {
        return;
      }

      setForm((current) => ({
        ...current,
        endereco: result.endereco || current.endereco,
        cep: result.cep || current.cep,
        regiaoAdministrativa: result.regiaoAdministrativa ?? current.regiaoAdministrativa,
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6)
      }));
      setErrors((current) => {
        const next = { ...current };
        delete next.endereco;
        delete next.cep;
        delete next.regiaoAdministrativa;
        delete next.latitude;
        delete next.longitude;
        return next;
      });
      setPointFeedback(
        result.endereco
          ? 'Localização identificada. Endereço preenchido automaticamente a partir do ponto marcado no mapa.'
          : 'Ponto atualizado no mapa. Não foi possível obter um endereço completo para essa coordenada.'
      );
    } catch (error) {
      if (reverseLookupRequestRef.current !== requestId) {
        return;
      }

      setPointFeedback(
        error instanceof Error
          ? `${error.message} O ponto foi mantido no mapa e o endereço pode ser ajustado manualmente.`
          : 'O ponto foi marcado no mapa, mas o endereço não pôde ser identificado automaticamente.'
      );
    } finally {
      if (reverseLookupRequestRef.current === requestId) {
        setLookingUpPointAddress(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!initialPosition || point || initialLookupDoneRef.current) {
      return;
    }

    initialLookupDoneRef.current = true;
    void applyReverseLookup(initialPosition.latitude, initialPosition.longitude);
  }, [applyReverseLookup, initialPosition, point]);

  const handleCoordinateChange = (latitude: number, longitude: number) => {
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6)
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.latitude;
      delete next.longitude;
      return next;
    });
    void applyReverseLookup(latitude, longitude);
  };

  const handleCepLookup = async () => {
    if (normalizeCep(form.cep).length !== 8) {
      setErrors((current) => ({
        ...current,
        cep: 'Informe um CEP com 8 dígitos'
      }));
      return;
    }

    setLookingUpCep(true);
    setCepFeedback(null);
    setPointFeedback(null);
    try {
      const result = await lookupCepAddress(form.cep);
      setForm((current) => ({
        ...current,
        cep: result.cep,
        endereco: result.endereco || current.endereco,
        regiaoAdministrativa: result.regiaoAdministrativa ?? current.regiaoAdministrativa,
        latitude: result.latitude !== null ? result.latitude.toFixed(6) : current.latitude,
        longitude: result.longitude !== null ? result.longitude.toFixed(6) : current.longitude
      }));
      setErrors((current) => {
        const next = { ...current };
        delete next.cep;
        delete next.endereco;
        delete next.regiaoAdministrativa;
        delete next.latitude;
        delete next.longitude;
        return next;
      });
      setCepFeedback(
        result.regiaoAdministrativa
          ? `CEP localizado. Endereco preenchido e mapa aproximado em ${result.regiaoAdministrativa}. Ajuste o ponto exato no mapa abaixo.`
          : 'CEP localizado. Confira o endereco e marque o ponto exato no mapa abaixo.'
      );
    } catch (error) {
      setErrors((current) => ({
        ...current,
        cep: error instanceof Error ? error.message : 'Nao foi possivel consultar o CEP.'
      }));
    } finally {
      setLookingUpCep(false);
    }
  };

  const numericLatitude = Number(form.latitude) || -15.7942;
  const numericLongitude = Number(form.longitude) || -47.8822;
  const numericCoverageRadius = Number(form.coberturaRaioMetros) || 250;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = wifiPointSchema.safeParse({
      nome: form.nome,
      endereco: form.endereco,
      cep: form.cep.trim() ? formatCep(form.cep) : null,
      regiaoAdministrativa: form.regiaoAdministrativa,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      status: form.status,
      coberturaRaioMetros: Number(form.coberturaRaioMetros),
      velocidadeMbps: form.velocidadeMbps ? Number(form.velocidadeMbps) : null,
      usuariosConectados: form.usuariosConectados ? Number(form.usuariosConectados) : null,
      precisaAcao: form.precisaAcao,
      statusManutencao: form.statusManutencao,
      incidentesAbertos: Number(form.incidentesAbertos),
      responsavelOperacional: form.responsavelOperacional.trim() || null,
      ultimaManutencao: form.ultimaManutencao || null,
      observacoes: form.observacoes.trim() || null
    });

    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0] ?? 'form'), issue.message])
        )
      );
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[160] bg-slate-950/70 backdrop-blur-sm">
      <div className="absolute inset-0 overflow-hidden px-3 py-3 sm:px-6 sm:py-5">
        <div className="flex min-h-full items-center justify-center">
          <div
            className="relative flex min-h-0 max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_40px_120px_-60px_rgba(15,23,42,0.65)] sm:max-h-[calc(100dvh-2.5rem)]"
            role="dialog"
            aria-modal="true"
            aria-label={point ? 'Editar ponto Wi-Fi' : 'Novo ponto Wi-Fi'}
          >
        <div className="sticky top-0 z-10 flex shrink-0 items-start justify-between border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.84))] px-6 py-5 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-sky-700" />
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700/80">Wi‑Fi Social</p>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              {point ? 'Editar ponto' : 'Novo ponto de cobertura'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Cadastre a localização, status, raio de cobertura, manutenção e necessidade de ação do ponto.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5 text-slate-500" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-6 overscroll-contain">
          <div className="grid gap-4 md:grid-cols-2">
            {initialPosition && !point && (
              <div className="rounded-[1.5rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 md:col-span-2">
                O ponto inicial veio do mapa principal. Use o mapa abaixo para refinar a localizacao exata antes de salvar.
              </div>
            )}

            <div className="space-y-2">
              <Label>Nome do ponto</Label>
              <Input value={form.nome} onChange={(e) => setForm((current) => ({ ...current, nome: e.target.value }))} className="rounded-2xl" />
              {errors.nome && <p className="text-xs text-rose-600">{errors.nome}</p>}
            </div>

            <div className="space-y-2">
              <Label>Região administrativa</Label>
              <Select value={form.regiaoAdministrativa} onValueChange={(value) => setForm((current) => ({ ...current, regiaoAdministrativa: value }))}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REGIOES_ADMINISTRATIVAS_DF.map((regiao) => (
                    <SelectItem key={regiao} value={regiao}>{regiao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.regiaoAdministrativa && <p className="text-xs text-rose-600">{errors.regiaoAdministrativa}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>CEP</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={form.cep}
                    inputMode="numeric"
                    placeholder="00000-000"
                    onChange={(e) => {
                      setForm((current) => ({ ...current, cep: formatCep(e.target.value) }));
                      setCepFeedback(null);
                      setPointFeedback(null);
                    }}
                    className="rounded-2xl pl-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCepLookup}
                  disabled={lookingUpCep}
                  className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                  {lookingUpCep ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Preencher por CEP
                    </>
                  )}
                </Button>
              </div>
              {errors.cep && <p className="text-xs text-rose-600">{errors.cep}</p>}
              {cepFeedback && <p className="text-xs text-slate-500">{cepFeedback}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={(e) => setForm((current) => ({ ...current, endereco: e.target.value }))} className="rounded-2xl" />
              {errors.endereco && <p className="text-xs text-rose-600">{errors.endereco}</p>}
            </div>

            <div className="space-y-3 md:col-span-2">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPinned className="h-4 w-4 text-sky-700" />
                      <Label className="text-sm font-semibold text-slate-900">Localização exata</Label>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Você pode usar o CEP ou simplesmente marcar o ponto no mapa. Ao mover o marcador, o endereço e o CEP tentam ser preenchidos automaticamente.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setManualCoordinates((current) => !current)}
                    className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    {manualCoordinates ? 'Ocultar coordenadas' : 'Ajuste manual'}
                  </Button>
                </div>

                <div className="mt-4">
                  <WifiPointLocationPicker
                    latitude={numericLatitude}
                    longitude={numericLongitude}
                    coverageRadius={Math.min(1500, Math.max(50, numericCoverageRadius))}
                    onChange={handleCoordinateChange}
                  />
                </div>

                {(pointFeedback || lookingUpPointAddress) && (
                  <div className="mt-3 flex items-start gap-2 rounded-[1.15rem] border border-slate-200 bg-white px-3.5 py-3 text-xs leading-5 text-slate-600">
                    {lookingUpPointAddress ? <Loader2 className="mt-0.5 h-3.5 w-3.5 animate-spin text-sky-700" /> : <MapPinned className="mt-0.5 h-3.5 w-3.5 text-sky-700" />}
                    <span>{pointFeedback}</span>
                  </div>
                )}

                {manualCoordinates && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Latitude</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={form.latitude}
                        onChange={(e) => setForm((current) => ({ ...current, latitude: e.target.value }))}
                        className="rounded-2xl bg-white"
                      />
                      {errors.latitude && <p className="text-xs text-rose-600">{errors.latitude}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Longitude</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={form.longitude}
                        onChange={(e) => setForm((current) => ({ ...current, longitude: e.target.value }))}
                        className="rounded-2xl bg-white"
                      />
                      {errors.longitude && <p className="text-xs text-rose-600">{errors.longitude}</p>}
                    </div>
                  </div>
                )}

                {!manualCoordinates && (errors.latitude || errors.longitude) && (
                  <div className="mt-3 text-xs text-rose-600">
                    {errors.latitude || errors.longitude}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as WifiPointStatus }))}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WIFI_POINT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{getWifiStatusLabel(status)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cobertura estimada (m)</Label>
              <Input type="number" min={50} max={1500} step={10} value={form.coberturaRaioMetros} onChange={(e) => setForm((current) => ({ ...current, coberturaRaioMetros: e.target.value }))} className="rounded-2xl" />
              {errors.coberturaRaioMetros && <p className="text-xs text-rose-600">{errors.coberturaRaioMetros}</p>}
            </div>

            <div className="space-y-2">
              <Label>Velocidade média (Mbps)</Label>
              <Input type="number" min={0} step={1} value={form.velocidadeMbps} onChange={(e) => setForm((current) => ({ ...current, velocidadeMbps: e.target.value }))} className="rounded-2xl" />
            </div>

            <div className="space-y-2">
              <Label>Usuários conectados</Label>
              <Input type="number" min={0} step={1} value={form.usuariosConectados} onChange={(e) => setForm((current) => ({ ...current, usuariosConectados: e.target.value }))} className="rounded-2xl" />
            </div>

            <div className="space-y-2">
              <Label>Status de manutenção</Label>
              <Select value={form.statusManutencao} onValueChange={(value) => setForm((current) => ({ ...current, statusManutencao: value as WifiMaintenanceStatus }))}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WIFI_MAINTENANCE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{getWifiMaintenanceLabel(status)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Incidentes abertos</Label>
              <Input type="number" min={0} step={1} value={form.incidentesAbertos} onChange={(e) => setForm((current) => ({ ...current, incidentesAbertos: e.target.value }))} className="rounded-2xl" />
              {errors.incidentesAbertos && <p className="text-xs text-rose-600">{errors.incidentesAbertos}</p>}
            </div>

            <ResponsavelOperacionalField
              value={form.responsavelOperacional}
              onChange={(value) => setForm((current) => ({ ...current, responsavelOperacional: value }))}
            />

            <div className="space-y-2">
              <Label>Última manutenção</Label>
              <Input type="date" value={form.ultimaManutencao} onChange={(e) => setForm((current) => ({ ...current, ultimaManutencao: e.target.value }))} className="rounded-2xl" />
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.precisaAcao}
                  onChange={(e) => setForm((current) => ({ ...current, precisaAcao: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-700"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Ponto exige ação prioritária</p>
                  <p className="text-xs text-slate-500">Use quando houver problema operacional, manutenção pendente ou ação em campo.</p>
                </div>
              </label>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm((current) => ({ ...current, observacoes: e.target.value }))} className="min-h-[120px] rounded-[1.5rem]" />
            </div>
          </div>

          <div className="sticky bottom-0 z-10 -mx-6 mt-6 flex justify-end gap-3 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-sm">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
              {saving ? 'Salvando...' : point ? 'Salvar alterações' : 'Cadastrar ponto'}
              <Save className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
