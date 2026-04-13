export const REGIOES_ADMINISTRATIVAS_DF = [
  'Plano Piloto',
  'Gama',
  'Taguatinga',
  'Brazlândia',
  'Sobradinho',
  'Planaltina',
  'Núcleo Bandeirante',
  'Ceilândia',
  'Cruzeiro',
  'Guará',
  'Lago Sul',
  'Lago Norte',
  'Candangolândia',
  'Águas Claras',
  'Samambaia',
  'Santa Maria',
  'Recanto das Emas',
  'São Sebastião',
  'Riacho Fundo',
  'Riacho Fundo II',
  'Park Way',
  'Sudoeste/Octogonal',
  'Varjão',
  'SCIA/Estrutural',
  'SIA',
  'Sobradinho II',
  'Jardim Botânico',
  'Itapoã',
  'Arniqueira',
  'Vicente Pires',
  'Fercal',
  'Sol Nascente/Pôr do Sol',
  'Arapoanga',
  'Água Quente'
] as const;

export type RegiaoAdministrativaDf = (typeof REGIOES_ADMINISTRATIVAS_DF)[number];
export const WIFI_POINT_STATUSES = ['online', 'instavel', 'offline', 'implantacao'] as const;
export type WifiPointStatus = (typeof WIFI_POINT_STATUSES)[number];
export const WIFI_MAINTENANCE_STATUSES = ['em_dia', 'preventiva', 'corretiva', 'pendente'] as const;
export type WifiMaintenanceStatus = (typeof WIFI_MAINTENANCE_STATUSES)[number];

export interface WifiEmpresa {
  id: string;
  nome: string;
  contatoNome?: string | null;
  telefone?: string | null;
  email?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface WifiEmpresaInput {
  nome: string;
  contatoNome?: string | null;
  telefone?: string | null;
  email?: string | null;
}

export interface WifiPoint {
  id: string;
  nome: string;
  endereco: string;
  cep?: string | null;
  regiaoAdministrativa: RegiaoAdministrativaDf | string;
  latitude: number;
  longitude: number;
  status: WifiPointStatus;
  coberturaRaioMetros: number;
  velocidadeMbps?: number | null;
  usuariosConectados?: number | null;
  precisaAcao: boolean;
  statusManutencao: WifiMaintenanceStatus;
  incidentesAbertos: number;
  responsavelOperacional?: string | null;
  empresaId?: string | null;
  ultimaManutencao?: string | null;
  observacoes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface WifiPointInput {
  nome: string;
  endereco: string;
  cep?: string | null;
  regiaoAdministrativa: RegiaoAdministrativaDf | string;
  latitude: number;
  longitude: number;
  status: WifiPointStatus;
  coberturaRaioMetros: number;
  velocidadeMbps?: number | null;
  usuariosConectados?: number | null;
  precisaAcao: boolean;
  statusManutencao: WifiMaintenanceStatus;
  incidentesAbertos: number;
  responsavelOperacional?: string | null;
  empresaId?: string | null;
  ultimaManutencao?: string | null;
  observacoes?: string | null;
}

export interface WifiStatusDistribution {
  name: string;
  value: number;
}

export interface WifiPointsByRegion {
  regiaoAdministrativa: string;
  total: number;
}

export interface WifiStats {
  totalPontos: number;
  online: number;
  instavel: number;
  offline: number;
  implantacao: number;
  precisaAcao: number;
  manutencaoPendente: number;
  incidentesAbertos: number;
  pontosCriticos: number;
  totalUsuarios: number;
  velocidadeMedia: number;
  regioesAtendidas: number;
  distribStatus: WifiStatusDistribution[];
  pontosPorRegiao: WifiPointsByRegion[];
  regioesCriticas: WifiPointsByRegion[];
  filaAtencao: WifiPoint[];
  recentes: WifiPoint[];
}

export function getWifiStatusLabel(status: WifiPointStatus): string {
  if (status === 'online') return 'Online';
  if (status === 'instavel') return 'Instável';
  if (status === 'offline') return 'Offline';
  return 'Implantação';
}

export function getWifiStatusTone(status: WifiPointStatus): string {
  if (status === 'online') return 'bg-emerald-600 text-white';
  if (status === 'instavel') return 'bg-amber-500 text-white';
  if (status === 'offline') return 'bg-rose-600 text-white';
  return 'bg-sky-600 text-white';
}

export function getWifiStatusColor(status: WifiPointStatus): string {
  if (status === 'online') return '#059669';
  if (status === 'instavel') return '#d97706';
  if (status === 'offline') return '#dc2626';
  return '#0284c7';
}

export function getWifiMaintenanceLabel(status: WifiMaintenanceStatus): string {
  if (status === 'em_dia') return 'Em dia';
  if (status === 'preventiva') return 'Preventiva';
  if (status === 'corretiva') return 'Corretiva';
  return 'Pendente';
}

export function getWifiMaintenanceTone(status: WifiMaintenanceStatus): string {
  if (status === 'em_dia') return 'bg-emerald-100 text-emerald-800';
  if (status === 'preventiva') return 'bg-sky-100 text-sky-800';
  if (status === 'corretiva') return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-800';
}

export function getWifiDaysSinceMaintenance(point: WifiPoint): number | null {
  if (!point.ultimaManutencao) {
    return null;
  }

  const parsed = new Date(point.ultimaManutencao);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
}

export function getWifiPointPriorityScore(point: WifiPoint): number {
  let score = 0;

  if (point.status === 'offline') score += 5;
  if (point.status === 'instavel') score += 3;
  if (point.status === 'implantacao') score += 1;
  if (point.precisaAcao) score += 4;
  if (point.statusManutencao === 'pendente') score += 3;
  if (point.statusManutencao === 'corretiva') score += 4;
  if (point.statusManutencao === 'preventiva') score += 1;
  score += Math.min(4, point.incidentesAbertos || 0);

  const diasSemManutencao = getWifiDaysSinceMaintenance(point);
  if (diasSemManutencao !== null && diasSemManutencao > 180) score += 3;
  if (diasSemManutencao !== null && diasSemManutencao > 120 && diasSemManutencao <= 180) score += 2;

  return score;
}

export function getWifiPointPriorityLevel(point: WifiPoint): 'Crítica' | 'Alta' | 'Monitorar' | 'Rotina' {
  const score = getWifiPointPriorityScore(point);
  if (score >= 9) return 'Crítica';
  if (score >= 6) return 'Alta';
  if (score >= 3) return 'Monitorar';
  return 'Rotina';
}

export function getWifiPointPriorityTone(level: 'Crítica' | 'Alta' | 'Monitorar' | 'Rotina'): string {
  if (level === 'Crítica') return 'bg-rose-100 text-rose-800 ring-1 ring-rose-200';
  if (level === 'Alta') return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
  if (level === 'Monitorar') return 'bg-sky-100 text-sky-800 ring-1 ring-sky-200';
  return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200';
}

export function sortWifiPointsByPriority(points: WifiPoint[]): WifiPoint[] {
  return [...points].sort((a, b) => {
    const scoreDiff = getWifiPointPriorityScore(b) - getWifiPointPriorityScore(a);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
  });
}

export function buildWifiStatsFromPoints(points: WifiPoint[]): WifiStats {
  const sortedPoints = sortWifiPointsByPriority(points);
  const criticalPoints = sortedPoints.filter((point) => getWifiPointPriorityScore(point) >= 9);
  const regionTotals = points.reduce((acc, point) => {
    acc.set(point.regiaoAdministrativa, (acc.get(point.regiaoAdministrativa) || 0) + 1);
    return acc;
  }, new Map<string, number>());
  const criticalRegions = points.reduce((acc, point) => {
    if (getWifiPointPriorityScore(point) >= 6) {
      acc.set(point.regiaoAdministrativa, (acc.get(point.regiaoAdministrativa) || 0) + 1);
    }
    return acc;
  }, new Map<string, number>());
  const speedValues = points
    .map((point) => point.velocidadeMbps)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  return {
    totalPontos: points.length,
    online: points.filter((point) => point.status === 'online').length,
    instavel: points.filter((point) => point.status === 'instavel').length,
    offline: points.filter((point) => point.status === 'offline').length,
    implantacao: points.filter((point) => point.status === 'implantacao').length,
    precisaAcao: points.filter((point) => point.precisaAcao).length,
    manutencaoPendente: points.filter((point) => point.statusManutencao === 'pendente' || point.statusManutencao === 'corretiva').length,
    incidentesAbertos: points.reduce((sum, point) => sum + (point.incidentesAbertos || 0), 0),
    pontosCriticos: criticalPoints.length,
    totalUsuarios: points.reduce((sum, point) => sum + (point.usuariosConectados || 0), 0),
    velocidadeMedia: speedValues.length
      ? Number((speedValues.reduce((sum, value) => sum + value, 0) / speedValues.length).toFixed(1))
      : 0,
    regioesAtendidas: regionTotals.size,
    distribStatus: [
      { name: 'Online', value: points.filter((point) => point.status === 'online').length },
      { name: 'Instável', value: points.filter((point) => point.status === 'instavel').length },
      { name: 'Offline', value: points.filter((point) => point.status === 'offline').length },
      { name: 'Implantação', value: points.filter((point) => point.status === 'implantacao').length }
    ],
    pontosPorRegiao: Array.from(regionTotals.entries())
      .map(([regiaoAdministrativa, total]) => ({ regiaoAdministrativa, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    regioesCriticas: Array.from(criticalRegions.entries())
      .map(([regiaoAdministrativa, total]) => ({ regiaoAdministrativa, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    filaAtencao: sortedPoints.slice(0, 5),
    recentes: [...points]
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
      .slice(0, 5)
  };
}
