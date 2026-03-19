import { Lancamento } from '../../types/projeto';
import { API_URL } from './base';

export async function fetchLancamentosDeProjeto(projetoId: string, token: string): Promise<Lancamento[]> {
    const response = await fetch(`${API_URL}/lancamentos/projeto/${projetoId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Falha ao carregar lançamentos');
    return response.json();
}

export async function criarLancamento(data: Partial<Lancamento>, token: string): Promise<Lancamento> {
    const response = await fetch(`${API_URL}/lancamentos`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Falha ao criar lançamento');
    return response.json();
}

// Relatório Saiweb - Download de CSV
export async function downloadRelatorioSaiweb(token: string, projetoId?: string, trimestre?: number): Promise<void> {
    const params = new URLSearchParams();
    if (projetoId) params.append('projetoId', projetoId);
    if (trimestre) params.append('trimestre', trimestre.toString());

    const queryStr = params.toString() ? `?${params.toString()}` : '';

    const response = await fetch(`${API_URL}/relatorios/csv${queryStr}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) throw new Error('Falha ao gerar CSV');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_saiweb_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
}
