import { Projeto, StatusParceiro, normalizeProjeto } from '../../types/projeto';
import { API_URL } from './base';

interface CreateParceiroData {
  nome: string;
  papel?: string;
  status?: StatusParceiro;
}

interface UpdateParceiroData {
  nome?: string;
  papel?: string;
  status?: StatusParceiro;
}

/**
 * POST /api/projetos/:id/parceiros — Criar novo parceiro
 */
export async function createParceiro(
  projetoId: string,
  data: CreateParceiroData,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/parceiros`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Falha ao criar parceiro');
  return normalizeProjeto(await response.json());
}

/**
 * PUT /api/projetos/:id/parceiros/:parceiroId — Atualizar parceiro
 */
export async function updateParceiro(
  projetoId: string,
  parceiroId: string,
  data: UpdateParceiroData,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/parceiros/${parceiroId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Falha ao atualizar parceiro');
  return normalizeProjeto(await response.json());
}

/**
 * DELETE /api/projetos/:id/parceiros/:parceiroId — Remover parceiro
 */
export async function deleteParceiro(
  projetoId: string,
  parceiroId: string,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/parceiros/${parceiroId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Falha ao remover parceiro');
  return normalizeProjeto(await response.json());
}