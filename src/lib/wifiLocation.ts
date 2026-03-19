import { REGIOES_ADMINISTRATIVAS_DF } from '../types/wifi';

const DEFAULT_DF_POSITION = {
  latitude: -15.7942,
  longitude: -47.8822
} as const;

const REGION_CENTERS: Partial<Record<(typeof REGIOES_ADMINISTRATIVAS_DF)[number], { latitude: number; longitude: number }>> = {
  'Plano Piloto': { latitude: -15.7906, longitude: -47.8897 },
  'Taguatinga': { latitude: -15.8367, longitude: -48.0467 },
  'Ceilândia': { latitude: -15.8216, longitude: -48.1042 },
  'Samambaia': { latitude: -15.8686, longitude: -48.0796 },
  'Águas Claras': { latitude: -15.8346, longitude: -48.0253 },
  'Guará': { latitude: -15.8233, longitude: -47.9798 },
  'Cruzeiro': { latitude: -15.7939, longitude: -47.944 },
  'Gama': { latitude: -16.0194, longitude: -48.0618 },
  'Planaltina': { latitude: -15.6178, longitude: -47.6486 },
  'Sobradinho': { latitude: -15.6467, longitude: -47.7825 },
  'Sobradinho II': { latitude: -15.6537, longitude: -47.8162 },
  'Santa Maria': { latitude: -16.0035, longitude: -47.9868 },
  'Recanto das Emas': { latitude: -15.9109, longitude: -48.0619 },
  'São Sebastião': { latitude: -15.9036, longitude: -47.7625 },
  'Lago Sul': { latitude: -15.8534, longitude: -47.8714 },
  'Lago Norte': { latitude: -15.7224, longitude: -47.8458 },
  'Núcleo Bandeirante': { latitude: -15.8714, longitude: -47.9695 },
  'Sudoeste/Octogonal': { latitude: -15.7983, longitude: -47.9345 },
  'SCIA/Estrutural': { latitude: -15.7839, longitude: -47.9881 },
  'SIA': { latitude: -15.8027, longitude: -48.0192 },
  'Vicente Pires': { latitude: -15.8081, longitude: -48.0281 },
  'Itapoã': { latitude: -15.7475, longitude: -47.7562 },
  'Jardim Botânico': { latitude: -15.8727, longitude: -47.8338 },
  'Arniqueira': { latitude: -15.8516, longitude: -48.0396 },
  'Brazlândia': { latitude: -15.6674, longitude: -48.2047 },
  'Riacho Fundo': { latitude: -15.8832, longitude: -48.0184 },
  'Riacho Fundo II': { latitude: -15.9326, longitude: -48.0343 },
  'Park Way': { latitude: -15.8924, longitude: -47.9517 },
  'Candangolândia': { latitude: -15.8521, longitude: -47.9507 },
  'Varjão': { latitude: -15.7104, longitude: -47.8722 },
  'Sol Nascente/Pôr do Sol': { latitude: -15.8072, longitude: -48.1162 },
  'Arapoanga': { latitude: -15.6656, longitude: -47.7023 },
  'Água Quente': { latitude: -15.9444, longitude: -48.0634 }
};

const REGION_ALIASES: Record<string, string> = {
  'asa norte': 'Plano Piloto',
  'asa sul': 'Plano Piloto',
  brasilia: 'Plano Piloto',
  esplanada: 'Plano Piloto',
  'setor bancario norte': 'Plano Piloto',
  'setor bancario sul': 'Plano Piloto',
  'setor comercial sul': 'Plano Piloto',
  'setor comercial norte': 'Plano Piloto',
  sudoeste: 'Sudoeste/Octogonal',
  octogonal: 'Sudoeste/Octogonal',
  estrutural: 'SCIA/Estrutural',
  scia: 'SCIA/Estrutural',
  'sol nascente': 'Sol Nascente/Pôr do Sol',
  'por do sol': 'Sol Nascente/Pôr do Sol',
  'aguas claras': 'Águas Claras',
  itapoa: 'Itapoã',
  'jardim botanico': 'Jardim Botânico',
  'nucleo bandeirante': 'Núcleo Bandeirante',
  'sao sebastiao': 'São Sebastião',
  'lago sul': 'Lago Sul',
  'lago norte': 'Lago Norte',
  'riacho fundo ii': 'Riacho Fundo II',
  'riacho fundo 2': 'Riacho Fundo II',
  'riacho fundo': 'Riacho Fundo',
  'vicente pires': 'Vicente Pires',
  'park way': 'Park Way',
  taguatinga: 'Taguatinga',
  ceilandia: 'Ceilândia',
  samambaia: 'Samambaia',
  planaltina: 'Planaltina',
  sobradinho: 'Sobradinho',
  gama: 'Gama',
  cruzeiro: 'Cruzeiro',
  brazlandia: 'Brazlândia',
  arapoanga: 'Arapoanga',
  arniqueira: 'Arniqueira',
  candangolandia: 'Candangolândia'
};

function normalizeText(value?: string | null): string {
  return value
    ?.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') ?? '';
}

function buildAddressLine(parts: Array<string | undefined | null>) {
  return parts
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(', ');
}

export interface WifiCepLookupResult {
  cep: string;
  endereco: string;
  regiaoAdministrativa: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ReverseLookupResponse {
  display_name?: string;
  address?: {
    postcode?: string;
    road?: string;
    pedestrian?: string;
    footway?: string;
    cycleway?: string;
    path?: string;
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    city_district?: string;
    town?: string;
    city?: string;
    municipality?: string;
    state?: string;
    state_district?: string;
    house_number?: string;
    amenity?: string;
    building?: string;
    attraction?: string;
  };
}

export function normalizeCep(value?: string | null) {
  return (value ?? '').replace(/\D/g, '').slice(0, 8);
}

export function formatCep(value?: string | null) {
  const digits = normalizeCep(value);
  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function inferRegiaoAdministrativa(value?: string | null) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return null;
  }

  for (const regiao of REGIOES_ADMINISTRATIVAS_DF) {
    if (normalizedValue.includes(normalizeText(regiao))) {
      return regiao;
    }
  }

  for (const [alias, regiao] of Object.entries(REGION_ALIASES)) {
    if (normalizedValue.includes(alias)) {
      return regiao;
    }
  }

  return null;
}

export function resolveRegiaoAdministrativaFromParts(...parts: Array<string | undefined | null>) {
  for (const part of parts) {
    const regiao = inferRegiaoAdministrativa(part);
    if (regiao) {
      return regiao;
    }
  }

  return null;
}

export function getRegiaoAdministrativaCenter(regiao?: string | null) {
  const resolved = regiao ? REGION_CENTERS[regiao as keyof typeof REGION_CENTERS] : null;
  return resolved ?? DEFAULT_DF_POSITION;
}

function buildReverseLookupAddress(payload: ReverseLookupResponse) {
  const address = payload.address;
  if (!address) {
    return payload.display_name ?? '';
  }

  const streetName =
    address.road ??
    address.pedestrian ??
    address.footway ??
    address.cycleway ??
    address.path ??
    address.amenity ??
    address.building ??
    address.attraction;

  const streetLine = buildAddressLine([
    streetName,
    address.house_number
  ]);

  const neighborhoodLine = buildAddressLine([
    address.neighbourhood,
    address.suburb,
    address.quarter,
    address.city_district
  ]);

  const localityLine = buildAddressLine([
    address.town,
    address.city,
    address.municipality,
    address.state
  ]);

  return buildAddressLine([streetLine, neighborhoodLine, localityLine]) || payload.display_name || '';
}

export async function lookupCepAddress(cepValue: string): Promise<WifiCepLookupResult> {
  const cep = normalizeCep(cepValue);

  if (cep.length !== 8) {
    throw new Error('Informe um CEP com 8 dígitos.');
  }

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error('Nao foi possivel consultar o CEP agora.');
  }

  const payload = await response.json() as {
    erro?: boolean;
    cep?: string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };

  if (payload.erro) {
    throw new Error('CEP nao encontrado.');
  }

  const regiaoAdministrativa = resolveRegiaoAdministrativaFromParts(
    payload.bairro,
    payload.localidade,
    payload.logradouro
  );
  const center = regiaoAdministrativa ? getRegiaoAdministrativaCenter(regiaoAdministrativa) : null;

  return {
    cep: formatCep(payload.cep ?? cep),
    endereco: buildAddressLine([
      payload.logradouro,
      payload.bairro,
      buildAddressLine([payload.localidade, payload.uf])
    ]),
    regiaoAdministrativa,
    latitude: center?.latitude ?? null,
    longitude: center?.longitude ?? null
  };
}

export async function reverseLookupPointAddress(latitude: number, longitude: number): Promise<WifiCepLookupResult> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude.toFixed(6)}&lon=${longitude.toFixed(6)}&zoom=18&addressdetails=1`,
    {
      method: 'GET',
      headers: {
        'Accept-Language': 'pt-BR'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Nao foi possivel localizar o endereco desse ponto agora.');
  }

  const payload = await response.json() as ReverseLookupResponse;
  const regiaoAdministrativa = resolveRegiaoAdministrativaFromParts(
    payload.address?.suburb,
    payload.address?.city_district,
    payload.address?.neighbourhood,
    payload.address?.state_district,
    payload.display_name
  );

  return {
    cep: formatCep(payload.address?.postcode ?? ''),
    endereco: buildReverseLookupAddress(payload),
    regiaoAdministrativa,
    latitude,
    longitude
  };
}
