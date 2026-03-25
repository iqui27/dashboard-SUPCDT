import { Projeto, normalizeProjeto } from '../../types/projeto';
import { API_URL } from './base';

export async function updateModulosAtivos(
  projetoId: string,
  modulos: Record<string, boolean>,
  token: string
): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/modulos`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(modulos),
  });
  if (!response.ok) throw new Error('Falha ao atualizar módulos');
  return normalizeProjeto(await response.json());
}
