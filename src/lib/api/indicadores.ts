import { Projeto, SerieDados, normalizeProjeto } from '../../types/projeto';
import { API_URL } from './base';

interface CreateIndicadorData {
  nome: string;
  categoria?: string;
  serie?: SerieDados[];
}

interface UpdateIndicadorData {
  nome?: string;
  categoria?: string;
  serie?: SerieDados[];
}

/**
 * POST /api/projetos/:id/indicadores — Criar novo indicador
 */
export async function createIndicador(
  projetoId: string,
  data: CreateIndicadorData,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/indicadores`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Falha ao criar indicador');
  return normalizeProjeto(await response.json());
}

/**
 * PUT /api/projetos/:id/indicadores/:indicadorId — Atualizar indicador
 */
export async function updateIndicador(
  projetoId: string,
  indicadorId: string,
  data: UpdateIndicadorData,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/indicadores/${indicadorId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Falha ao atualizar indicador');
  return normalizeProjeto(await response.json());
}

/**
 * DELETE /api/projetos/:id/indicadores/:indicadorId — Remover indicador
 */
export async function deleteIndicador(
  projetoId: string,
  indicadorId: string,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/indicadores/${indicadorId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Falha ao remover indicador');
  return normalizeProjeto(await response.json());
}