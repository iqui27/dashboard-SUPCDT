import { Projeto, normalizeProjeto } from '../../types/projeto';
import { API_URL } from './base';

interface CreateEtapaData {
  nome: string;
  percentual?: number;
  entregaveis?: { nome: string }[];
}

interface UpdateEtapaData {
  nome?: string;
  percentual?: number;
}

/**
 * POST /api/projetos/:id/etapas — Criar nova etapa
 */
export async function createEtapa(
  projetoId: string,
  data: CreateEtapaData,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/etapas`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Falha ao criar etapa');
  return normalizeProjeto(await response.json());
}

/**
 * PUT /api/projetos/:id/etapas/:etapaId — Atualizar etapa
 */
export async function updateEtapa(
  projetoId: string,
  etapaId: string,
  data: UpdateEtapaData,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/etapas/${etapaId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Falha ao atualizar etapa');
  return normalizeProjeto(await response.json());
}

/**
 * DELETE /api/projetos/:id/etapas/:etapaId — Remover etapa
 */
export async function deleteEtapa(
  projetoId: string,
  etapaId: string,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/etapas/${etapaId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Falha ao remover etapa');
  return normalizeProjeto(await response.json());
}

/**
 * PATCH /api/projetos/:id/etapas/:etapaId/entregaveis/:entId — Marcar entregável como concluído
 */
export async function toggleEntregavel(
  projetoId: string,
  etapaId: string,
  entregavelId: string,
  concluido: boolean,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/etapas/${etapaId}/entregaveis/${entregavelId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ concluido })
  });
  if (!response.ok) throw new Error('Falha ao atualizar entregável');
  return normalizeProjeto(await response.json());
}

/**
 * POST /api/projetos/:id/etapas/:etapaId/entregaveis — Adicionar entregável
 */
export async function addEntregavel(
  projetoId: string,
  etapaId: string,
  nome: string,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/etapas/${etapaId}/entregaveis`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nome })
  });
  if (!response.ok) throw new Error('Falha ao adicionar entregável');
  return normalizeProjeto(await response.json());
}

/**
 * DELETE /api/projetos/:id/etapas/:etapaId/entregaveis/:entId — Remover entregável
 */
export async function deleteEntregavel(
  projetoId: string,
  etapaId: string,
  entregavelId: string,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/etapas/${etapaId}/entregaveis/${entregavelId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Falha ao remover entregável');
  return normalizeProjeto(await response.json());
}