export interface OSC {
  id: string;
  processo: string;
  osc: string;
  projeto: string;
  parlamentar?: string;
  valor: number;
  valorRaw?: string;
  cnpj?: string;
  status?: string;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export interface OSCInput {
  processo: string;
  osc: string;
  projeto: string;
  parlamentar?: string;
  valor?: number | string | null;
  valorRaw?: string | null;
  cnpj?: string;
  status?: string;
}
