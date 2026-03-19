import { useEffect, useState, type FormEvent } from 'react';
import { Save, Wifi, X } from 'lucide-react';
import { z } from 'zod';

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

  useEffect(() => {
    setForm(buildInitialState(point, initialPosition, defaultRegion));
    setErrors({});
  }, [point, initialPosition, defaultRegion]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = wifiPointSchema.safeParse({
      nome: form.nome,
      endereco: form.endereco,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_40px_120px_-60px_rgba(15,23,42,0.65)]">
        <div className="flex items-start justify-between border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.84))] px-6 py-5">
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
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5 text-slate-500" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="grid gap-5 md:grid-cols-2">
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
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={(e) => setForm((current) => ({ ...current, endereco: e.target.value }))} className="rounded-2xl" />
              {errors.endereco && <p className="text-xs text-rose-600">{errors.endereco}</p>}
            </div>

            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input type="number" step="0.000001" value={form.latitude} onChange={(e) => setForm((current) => ({ ...current, latitude: e.target.value }))} className="rounded-2xl" />
              {errors.latitude && <p className="text-xs text-rose-600">{errors.latitude}</p>}
            </div>

            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input type="number" step="0.000001" value={form.longitude} onChange={(e) => setForm((current) => ({ ...current, longitude: e.target.value }))} className="rounded-2xl" />
              {errors.longitude && <p className="text-xs text-rose-600">{errors.longitude}</p>}
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

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
              {saving ? 'Salvando...' : point ? 'Salvar alterações' : 'Cadastrar ponto'}
              <Save className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
