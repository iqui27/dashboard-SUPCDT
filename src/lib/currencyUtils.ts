/**
 * Utilitários robustos para manipulação de valores financeiros
 */

export interface ValidationResult {
  isValid: boolean;
  value: number;
  formatted: string;
  error?: string;
}

/**
 * Remove caracteres não numéricos de uma string, preservando sinais, vírgula e ponto.
 */
export function removeNonNumeric(value: string): string {
  return value.replace(/[^\d,.,-]/g, '');
}

/**
 * Normaliza string de valor para formato brasileiro "inteiro,centavos".
 * Aceita entradas com vírgulas ou pontos como separador decimal.
 */
export function normalizeCurrencyInput(value: string): string {
  if (!value) return '0,00';

  // Remove espaços e transforma vírgulas em pontos temporariamente
  const trimmed = value.trim().replace(/\s+/g, '');
  if (!trimmed) return '0,00';

  // Remove caracteres inválidos mantendo dígitos, vírgula, ponto e sinal
  const cleaned = trimmed.replace(/[^0-9,.-]/g, '');
  if (!cleaned) return '0,00';

  // Converte para formato numérico padrão usando ponto como separador decimal
  let numeric = cleaned.replace(/,/g, '.');

  // Se houver múltiplos pontos (milhares + decimal), mantém apenas o último como decimal
  const pointCount = (numeric.match(/\./g) || []).length;
  if (pointCount > 1) {
    const lastIndex = numeric.lastIndexOf('.');
    numeric = numeric.replace(/\./g, (_match, offset) => (offset === lastIndex ? '.' : ''));
  }

  const numberValue = Number.parseFloat(numeric);
  if (!Number.isFinite(numberValue)) return '0,00';

  const integerPart = Math.trunc(Math.abs(numberValue));
  const decimalPart = Math.round((Math.abs(numberValue) - integerPart) * 100);

  const formattedInteger = integerPart.toString();
  const formattedDecimal = decimalPart.toString().padStart(2, '0');

  const sign = numberValue < 0 ? '-' : '';
  return `${sign}${formattedInteger},${formattedDecimal}`;
}

/**
 * Converte string no formato brasileiro para número.
 */
export function currencyToNumber(value: string): number {
  if (!value) return 0;
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Formata número para moeda brasileira com símbolo.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

/**
 * Formata número para string "1.234,56" (sem símbolo).
 */
export function formatCurrencyInput(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
}

/**
 * Valida e normaliza valor digitado, retornando versão formatada e numérica.
 */
export function validateAndFormatCurrency(rawValue: string): ValidationResult {
  try {
    const cleaned = removeNonNumeric(rawValue);
    const normalized = normalizeCurrencyInput(cleaned);
    const numericValue = currencyToNumber(normalized);

    if (numericValue < 0) {
      return {
        isValid: false,
        value: 0,
        formatted: '0,00',
        error: 'Valor não pode ser negativo'
      };
    }

    if (numericValue > 999_999_999.99) {
      return {
        isValid: false,
        value: numericValue,
        formatted: normalized,
        error: 'Valor excede o limite permitido (R$ 999.999.999,99)'
      };
    }

    return {
      isValid: true,
      value: numericValue,
      formatted: normalized
    };
  } catch (error) {
    return {
      isValid: false,
      value: 0,
      formatted: '0,00',
      error: 'Formato inválido'
    };
  }
}

/**
 * Processa digitação incremental do usuário em campos de moeda.
 */
export function processCurrencyInput(_currentValue: string, newValue: string): string {
  if (!newValue) return '0,00';

  const result = validateAndFormatCurrency(newValue);
  return result.formatted;
}

/**
 * Validações específicas para contextos diferentes.
 */
export const CurrencyValidators = {
  /** Valor total do projeto */
  projectTotal(value: number): string | null {
    if (value < 1_000) {
      return 'Valor total mínimo é R$ 1.000,00';
    }
    if (value > 100_000_000) {
      return 'Valor total máximo é R$ 100.000.000,00';
    }
    return null;
  },

  /** Valor individual de emenda */
  emendaValue(value: number): string | null {
    if (value < 100) {
      return 'Valor mínimo da emenda é R$ 100,00';
    }
    if (value > 50_000_000) {
      return 'Valor máximo da emenda é R$ 50.000.000,00';
    }
    return null;
  },

  /** Valor adicional em aditivo */
  valorAdicional(adicional: number, novoTotal: number): string | null {
    if (adicional <= 0) {
      return 'Valor adicional deve ser maior que zero';
    }
    if (adicional >= novoTotal) {
      return 'Valor adicional deve ser menor que o novo valor total';
    }
    return null;
  }
};
