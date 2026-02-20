// Mapa de normalização de parlamentares com separação de múltiplos
// Variante encontrada -> Nome normalizado ou array de nomes (para múltiplos)

export const PARLAMENTARES_NORMALIZATION_MAP: Record<string, string | string[]> = {
  // Daniel Donizet
  "doutora jane": "Doutora Jane",
  
  // Eduardo Pedrosa - Case variations
  "eduardo pedrosa": "Eduardo Pedrosa",
  "Eduardo Pedrosa": "Eduardo Pedrosa",
  
  // Iolando - Multiple variations
  "iolando": "Iolando",
  "Iolando": "Iolando",
  "Lolando": "Iolando",  // Variação de "Lolando"
  "lolano": "Iolando",  // Variação de "lolano"
  "martins e iolando": ["Iolando", "Martins Machado"],  // Separar múltiplos
  
  // Jaqueline Silva
  "Jaqueline Silva": "Jaqueline Silva",
  "Jaqueline Silva e lolano": ["Jaqueline Silva", "Iolando"],  // Separar múltiplos
  "jaquelina": "Jaqueline Silva",  // Variação de "jaquelina"
  
  // Joaquim Roriz Neto - Case variations
  "joaquin roriz neto": "Joaquim Roriz Neto",
  "Joaquim Roriz Neto, Lolando": ["Joaquim Roriz Neto", "Iolando"],  // Separar múltiplos
  
  // Thiago Manzoni
  "manzoni": "Thiago Manzoni",  // Variação separada
  
  // Martins Machado - Case variations
  "MARTINS MACHADO": "Martins Machado",
  "martins": "Martins Machado",  // Variação separada
  "martins machado": "Martins Machado",
  "iolando, manzoni , martins machado": ["Iolando", "Thiago Manzoni", "Martins Machado"],  // Separar múltiplos
  
  // Pastor Daniel - Multiple variations
  "pastol daniel de castro": "Pastor Daniel de Castro",
  "pastor daniel": "Pastor Daniel de Castro",
  "pastor daniel /jaquelina": ["Pastor Daniel de Castro", "Jaqueline Silva"],  // Separar múltiplos
  "pastor daniel de casto": "Pastor Daniel de Castro",
  "pastor daniel de castro": "Pastor Daniel de Castro",
  
  // Ricardo Vale - Case variations
  "ricardo vale": "Ricardo Vale",
  
  // Outros - Já normalizados
  "Daniel Donizet": "Daniel Donizet",
  "Fábio Felix": "Fábio Felix",
  "Hermeto": "Hermeto",
  "João Cardoso": "João Cardoso",
  "Max Maciel": "Max Maciel",
  "Paula Belmonte": "Paula Belmonte",
  "Pepa": "Pepa",
  "Rogério Morro da Cruz": "Rogério Morro da Cruz",
  "Thiago Manzoni": "Thiago Manzoni"
};

/**
 * Função principal para normalizar e separar parlamentares
 * @param texto Texto original do parlamentar (pode conter múltiplos)
 * @returns Array de parlamentares normalizados
 */
export function normalizarParlamentares(texto: string): string[] {
  if (!texto) return [];
  
  const textoLimpo = texto.trim();
  if (!textoLimpo || textoLimpo.toLowerCase() === 'não se aplica') return [];
  
  // Se já tem mapeamento direto (incluindo múltiplos)
  if (PARLAMENTARES_NORMALIZATION_MAP[textoLimpo]) {
    const mapeado = PARLAMENTARES_NORMALIZATION_MAP[textoLimpo];
    return Array.isArray(mapeado) ? mapeado : [mapeado];
  }
  
  // Tentar detectar e separar múltiplos não mapeados
  const separadores = [/,/, / e /i, / \//i];
  let partes = [textoLimpo];
  
  separadores.forEach(sep => {
    partes = partes.flatMap(parte => parte.split(sep));
  });
  
  const normalizados = partes
    .map(parte => parte.trim())
    .filter(parte => parte && parte.toLowerCase() !== 'não se aplica')
    .map(parte => {
      // Aplicar normalização individual para cada parte
      const normalizado = PARLAMENTARES_NORMALIZATION_MAP[parte];
      return normalizado || parte;
    })
    .flatMap(item => Array.isArray(item) ? item : [item])
    .filter((item, index, arr) => arr.indexOf(item) === index); // Remover duplicados
  
  return normalizados;
}

/**
 * Verifica se um texto contém múltiplos parlamentares
 * @param texto Texto original
 * @returns true se contém múltiplos parlamentares
 */
export function temMultiplosParlamentares(texto: string): boolean {
  return normalizarParlamentares(texto).length > 1;
}

/**
 * Obtém o parlamentar principal (primeiro da lista normalizada)
 * @param texto Texto original
 * @returns Primeiro parlamentar normalizado ou string vazia
 */
export function getParlamentarPrincipal(texto: string): string {
  const normalizados = normalizarParlamentares(texto);
  return normalizados.length > 0 ? normalizados[0] : '';
}

/**
 * Gera um resumo dos parlamentares para exibição
 * @param texto Texto original ou array de parlamentares
 * @returns String formatada para exibição
 */
export function gerarResumoParlamentaresNormalizado(texto: string | string[]): string {
  let parlamentares: string[];
  
  if (Array.isArray(texto)) {
    parlamentares = texto;
  } else {
    parlamentares = normalizarParlamentares(texto);
  }
  
  if (parlamentares.length === 0) {
    return '';
  }
  
  if (parlamentares.length === 1) {
    return parlamentares[0];
  }
  
  if (parlamentares.length <= 3) {
    return parlamentares.join(', ');
  }
  
  return `${parlamentares.slice(0, 2).join(', ')} e ${parlamentares.length - 2} outros`;
}

/**
 * Lista todos os parlamentares únicos normalizados
 * @returns Array com nomes normalizados únicos
 */
export function getParlamentaresUnicos(): string[] {
  const todos = Object.values(PARLAMENTARES_NORMALIZATION_MAP)
    .flatMap(item => Array.isArray(item) ? item : [item]);
  return Array.from(new Set(todos)).sort();
}

/**
 * Estatísticas da normalização
 */
export const NORMALIZATION_STATS = {
  totalOriginal: 27,
  multiplasEntries: 5,
  totalAposSeparacao: 39,
  totalUnicos: getParlamentaresUnicos().length,
  listaFinal: getParlamentaresUnicos()
} as const;
