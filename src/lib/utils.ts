import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Projeto, StatusProjeto, getProjetoNome, getProjetoOsc, getProjetoStatus, parseProjetoDate } from '../types/projeto';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createLocalId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function toInputDate(date: Date | string | number | null | undefined): string {
  if (date === null || date === undefined || date === '') return '';

  let parsedDate: Date | null = null;
  if (date instanceof Date) {
    parsedDate = date;
  } else if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) return '';
    const candidate = new Date(trimmed);
    if (!Number.isNaN(candidate.getTime())) {
      parsedDate = candidate;
    }
  } else if (typeof date === 'number' && Number.isFinite(date)) {
    const candidate = new Date(date);
    if (!Number.isNaN(candidate.getTime())) {
      parsedDate = candidate;
    }
  }

  if (!parsedDate) return '';

  const year = parsedDate.getFullYear();
  const month = `${parsedDate.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsedDate.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromInputDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return isNaN(date.getTime()) ? null : date;
}
export function parseBRLCurrency(value: string): number {
  if (!value || typeof value !== 'string') return 0;
  
  // Remove R$ and whitespace, but keep decimal separators
  let cleaned = value.replace(/R\$/g, '').trim();
  
  // Handle Brazilian format: 1.234,56 -> 1234.56
  // Only remove dots if they are thousand separators (not decimal)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Format like 1.234,56 - remove thousand separators (dots)
    cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
  } else if (cleaned.includes(',')) {
    // Format like 1234,56 - just replace comma with dot
    cleaned = cleaned.replace(/,/g, '.');
  } else {
    // Format like 1234.56 or 1234 - already in decimal format
    // Remove dots only if there are multiple (thousand separators)
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}
export function parseBRDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Try dd/MM/yyyy or dd/MM/yy
  const brDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (brDateMatch) {
    let [, day, month, year] = brDateMatch;
    if (year.length === 2) {
      year = `20${year}`;
    }
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    return isNaN(date.getTime()) ? null : date;
  }
  // Try ISO format
  const isoDate = new Date(dateStr);
  return isNaN(isoDate.getTime()) ? null : isoDate;
}
export function formatBRDate(date: Date | null): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  }).format(date);
}

export function formatProcessoSEI(value: string): string {
  // Remove todos os caracteres não numéricos
  const numbers = value.replace(/\D/g, '');
  
  // Aplica a máscara: xxxxx-xxxxxxxx/xxxx-xx
  // 5 dígitos + hífen + 8 dígitos + barra + 4 dígitos + hífen + 2 dígitos
  if (numbers.length <= 5) {
    return numbers;
  } else if (numbers.length <= 13) {
    return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
  } else if (numbers.length <= 17) {
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 13)}/${numbers.slice(13)}`;
  } else if (numbers.length <= 19) {
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 13)}/${numbers.slice(13, 17)}-${numbers.slice(17)}`;
  } else {
    // Limita a 19 dígitos (tamanho máximo)
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 13)}/${numbers.slice(13, 17)}-${numbers.slice(17, 19)}`;
  }
}

export function formatBRDateTime(date: Date | null): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  }).format(date);
}
export function getStatusBadgeVariant(status: StatusProjeto): 'default' | 'secondary' | 'destructive' | 'outline' {
  const normalized = status.toLowerCase();
  if (normalized.includes('ativo') || normalized.includes('assinado')) return 'default';
  if (normalized.includes('andamento') || normalized.includes('planejamento') || normalized.includes('analise')) return 'secondary';
  if (normalized.includes('reprov') || normalized.includes('atras') || normalized.includes('paralis')) return 'destructive';
  if (normalized.includes('encerr') || normalized.includes('conclu')) return 'outline';
  return 'secondary';
}
export function getStatusColor(status: StatusProjeto): string {
  const normalized = status.toLowerCase();
  if (normalized.includes('ativo') || normalized.includes('assinado') || normalized.includes('andamento')) return '#0f766e';
  if (normalized.includes('planejamento') || normalized.includes('analise')) return '#2563eb';
  if (normalized.includes('reprov') || normalized.includes('atras') || normalized.includes('paralis')) return '#dc2626';
  if (normalized.includes('encerr') || normalized.includes('conclu')) return '#475569';
  return '#64748b';
}
export function getCategoriaColor(categoria: string): string {
  switch (categoria) {
    case 'Inclusão Digital':
      return '#0f766e';
    case 'Infraestrutura':
      return '#2563eb';
    case 'Eventos':
      return '#d97706';
    case 'Popularização da Ciência':
      return '#7c3aed';
    case 'Sustentabilidade':
      return '#16a34a';
    case 'Emenda':
      return '#8b5cf6';
    case 'INEX':
      return '#06b6d4';
    case 'Convênio':
      return '#10b981';
    case 'Recurso Proprio':
      return '#000000';
    case 'Outro':
      return '#6b7280';
    default:
      return '#6b7280';
  }
}
export function calculateValorExecutado(fomento: Projeto): number {
  const percentualExecucao = Number(fomento.monitoramento?.percentualExecucao) || 0;
  return fomento.valorTotal > 0 ? (fomento.valorTotal * percentualExecucao) / 100 : 0;
}
export function isProjectUrgent(vigenciaFinal: Date | string | null): boolean {
  const parsed = vigenciaFinal instanceof Date ? vigenciaFinal : parseProjetoDate(vigenciaFinal);
  if (!parsed) return false;
  const today = new Date();
  const daysUntilEnd = Math.ceil((parsed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilEnd > 0 && daysUntilEnd <= 30;
}
export function calculatePercentageExecuted(fomento: Projeto): number {
  if (fomento.valorTotal === 0) return 0;
  const executado = calculateValorExecutado(fomento);
  return Math.round(executado / fomento.valorTotal * 100);
}
export function buildAssinaturaDistribution(fomentos: Projeto[]): Record<StatusProjeto, number> {
  return fomentos.reduce((acc, fomento) => {
    const status = getProjetoStatus(fomento);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<StatusProjeto, number>);
}
export function exportToCSV(data: Projeto[], filename: string = 'fomentos.csv'): void {
  const headers = ['Status', 'Número Único', 'Número Termo', 'Processo SEI', 'Projeto', 'OSC', 'Categoria', 'Território', 'Início', 'Fim', 'Valor Total', 'Responsável'];
  const rows = data.map(f => [
    getProjetoStatus(f),
    f.numeroUnico || '',
    f.numeroTermo || '',
    f.processoSEI || '',
    getProjetoNome(f),
    getProjetoOsc(f) || '',
    f.categoria || '',
    f.raPerigao || '',
    formatBRDate(parseProjetoDate(f.dataInicio)),
    formatBRDate(parseProjetoDate(f.dataFim)),
    formatBRL(f.valorTotal),
    f.responsavelSECTI || ''
  ]);
  const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;'
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export interface OSCImportData {
  processo: string;
  osc: string;
  valor: number;
  projeto: string;
  parlamentar: string;
  cnpj?: string;
}

export function parseOSCImportCSV(csvText: string): OSCImportData[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return []; // Header + at least one data row
  
  // Skip header line
  const dataLines = lines.slice(1);
  
  return dataLines.map((line) => {
    // Parse CSV handling quoted fields with commas
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim()); // Add last field
    
    // Map fields to expected positions
    return {
      processo: fields[0] || '',
      osc: fields[1] || '',
      valor: parseBRLCurrency(fields[2]) || 0,
      projeto: fields[3] || '',
      parlamentar: fields[4] || '',
      cnpj: fields[5] || undefined
    };
  }).filter(item => item.osc && item.projeto); // Filter out empty rows
}
