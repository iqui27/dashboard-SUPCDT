import { Projeto, ProbabilidadeRisco, ImpactoRisco, StatusRisco, normalizeProjeto } from '../../types/projeto';
import { API_URL } from './base';

interface CreateRiscoData {
  descricao: string;
  probabilidade?: ProbabilidadeRisco;
  impacto?: ImpactoRisco;
  mitigacao?: string;
  status?: StatusRisco;
}

interface UpdateRiscoData {
  descricao?: string;
  probabilidade?: ProbabilidadeRisco;
  impacto?: ImpactoRisco;
  mitigacao?: string;
  status?: StatusRisco;
}

/**
 * POST /api/projetos/:id/riscos — Criar novo risco
 */
export async function createRisco(
  projetoId: string,
  data: CreateRiscoData,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/riscos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Falha ao criar risco');
  return normalizeProjeto(await response.json());
}

/**
 * PUT /api/projetos/:id/riscos/:riscoId — Atualizar risco
 */
export async function updateRisco(
  projetoId: string,
  riscoId: string,
  data: UpdateRiscoData,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/riscos/${riscoId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Falha ao atualizar risco');
  return normalizeProjeto(await response.json());
}

/**
 * DELETE /api/projetos/:id/riscos/:riscoId — Remover risco
 */
export async function deleteRisco(
  projetoId: string,
  riscoId: string,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/riscos/${riscoId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Falha ao remover risco');
  return normalizeProjeto(await response.json());
}