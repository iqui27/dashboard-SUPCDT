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
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupedOSC {
  cnpj: string;
  nome: string;
  records: OSC[];
  projetos: string[];
}

export interface OSCUpsertResult {
  osc: OSC;
  action: 'inserted' | 'updated';
}
