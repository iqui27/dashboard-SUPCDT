import { Projeto, normalizeProjeto } from '../../types/projeto';
import { API_URL } from './base';

interface CreateRubricaData {
  nome: string;
  previsto?: number;
  executado?: number;
}

interface UpdateRubricaData {
  nome?: string;
  previsto?: number;
  executado?: number;
}

interface AddAditivoData {
  descricao: string;
  valor: number;
  data?: string;
}

/**
 * POST /api/projetos/:id/rubricas — Criar nova rubrica
 */
export async function createRubrica(
  projetoId: string,
  data: CreateRubricaData,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/rubricas`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Falha ao criar rubrica');
  return normalizeProjeto(await response.json());
}

/**
 * PUT /api/projetos/:id/rubricas/:rubricaId — Atualizar rubrica
 */
export async function updateRubrica(
  projetoId: string,
  rubricaId: string,
  data: UpdateRubricaData,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/rubricas/${rubricaId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Falha ao atualizar rubrica');
  return normalizeProjeto(await response.json());
}

/**
 * DELETE /api/projetos/:id/rubricas/:rubricaId — Remover rubrica
 */
export async function deleteRubrica(
  projetoId: string,
  rubricaId: string,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/rubricas/${rubricaId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Falha ao remover rubrica');
  return normalizeProjeto(await response.json());
}

/**
 * POST /api/projetos/:id/rubricas/:rubricaId/aditivos — Adicionar aditivo
 */
export async function addAditivo(
  projetoId: string,
  rubricaId: string,
  data: AddAditivoData,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/rubricas/${rubricaId}/aditivos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Falha ao adicionar aditivo');
  return normalizeProjeto(await response.json());
}