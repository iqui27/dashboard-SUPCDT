import { ObjectId } from 'mongodb';

export const WIFI_POINT_STATUSES = ['online', 'instavel', 'offline', 'implantacao'] as const;
export type WifiPointStatus = (typeof WIFI_POINT_STATUSES)[number];
export const WIFI_MAINTENANCE_STATUSES = ['em_dia', 'preventiva', 'corretiva', 'pendente'] as const;
export type WifiMaintenanceStatus = (typeof WIFI_MAINTENANCE_STATUSES)[number];

export interface DBWifiEmpresa {
  _id?: ObjectId;
  nome: string;
  contatoNome?: string | null;
  telefone?: string | null;
  email?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WifiEmpresaApi {
  id: string;
  nome: string;
  contatoNome?: string | null;
  telefone?: string | null;
  email?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface WifiEmpresaInput {
  nome?: string;
  contatoNome?: string | null;
  telefone?: string | null;
  email?: string | null;
}

export interface DBWifiPoint {
  _id?: ObjectId;
  nome: string;
  endereco: string;
  cep?: string | null;
  regiaoAdministrativa: string;
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
  empresaId?: ObjectId | null;
  ultimaManutencao?: Date | null;
  observacoes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WifiPointApi {
  id: string;
  nome: string;
  endereco: string;
  cep?: string | null;
  regiaoAdministrativa: string;
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
  nome?: string;
  endereco?: string;
  cep?: string | null;
  regiaoAdministrativa?: string;
  latitude?: number;
  longitude?: number;
  status?: WifiPointStatus;
  coberturaRaioMetros?: number;
  velocidadeMbps?: number | null;
  usuariosConectados?: number | null;
  precisaAcao?: boolean;
  statusManutencao?: WifiMaintenanceStatus;
  incidentesAbertos?: number | null;
  responsavelOperacional?: string | null;
  empresaId?: string | null;
  ultimaManutencao?: string | Date | null;
  observacoes?: string | null;
}

export interface WifiStatsApi {
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
  distribStatus: Array<{ name: string; value: number }>;
  pontosPorRegiao: Array<{ regiaoAdministrativa: string; total: number }>;
  regioesCriticas: Array<{ regiaoAdministrativa: string; total: number }>;
  filaAtencao: WifiPointApi[];
  recentes: WifiPointApi[];
}
