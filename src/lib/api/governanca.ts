import { Projeto, normalizeProjeto } from '../../types/projeto';
import { API_URL } from './base';

interface CreateDecisaoData {
  titulo: string;
  data: string;
  descricao?: string;
  responsavel?: string;
}

interface UpdateDecisaoData {
  titulo?: string;
  data?: string;
  descricao?: string;
  responsavel?: string;
}

/**
 * POST /api/projetos/:id/decisoes — Criar nova decisão de governança
 */
export async function createDecisao(
  projetoId: string,
  data: CreateDecisaoData,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/decisoes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Falha ao criar decisão');
  return normalizeProjeto(await response.json());
}

/**
 * PUT /api/projetos/:id/decisoes/:decisaoId — Atualizar decisão de governança
 */
export async function updateDecisao(
  projetoId: string,
  decisaoId: string,
  data: UpdateDecisaoData,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/decisoes/${decisaoId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Falha ao atualizar decisão');
  return normalizeProjeto(await response.json());
}

/**
 * DELETE /api/projetos/:id/decisoes/:decisaoId — Remover decisão de governança
 */
export async function deleteDecisao(
  projetoId: string,
  decisaoId: string,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/decisoes/${decisaoId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Falha ao remover decisão');
  return normalizeProjeto(await response.json());
}