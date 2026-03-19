import { Projeto, ProjetoInput } from '../../types/projeto';
import { API_URL } from './base';

export async function fetchProjetos(token: string): Promise<Projeto[]> {
    const response = await fetch(`${API_URL}/projetos`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Falha ao carregar projetos');
    return response.json();
}

export async function fetchProjetoById(id: string, token: string): Promise<Projeto> {
    const response = await fetch(`${API_URL}/projetos/${id}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Falha ao carregar projeto');
    return response.json();
}

export async function createProjeto(projetoData: ProjetoInput, token: string): Promise<Projeto> {
    const response = await fetch(`${API_URL}/projetos`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(projetoData)
    });
    if (!response.ok) throw new Error('Falha ao criar projeto');
    return response.json();
}

export async function updateProjeto(id: string, updateData: Partial<Projeto>, token: string): Promise<Projeto> {
    const response = await fetch(`${API_URL}/projetos/${id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
    });
    if (!response.ok) throw new Error('Falha ao atualizar projeto');
    return response.json();
}

export async function deleteProjeto(id: string, token: string): Promise<void> {
    const response = await fetch(`${API_URL}/projetos/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Falha ao deletar projeto');
}
