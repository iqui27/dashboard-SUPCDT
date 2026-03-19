import { Projeto } from '../types/projeto';
import { normalizarParlamentares, gerarResumoParlamentaresNormalizado } from './parlamentaresNormalization';

// Usa URL relativa para funcionar com o proxy do Vite, ou variável de ambiente
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const PARLAMENTARES_API_BASE = API_BASE_URL 
  ? `${API_BASE_URL.replace(/\/$/, '')}/api`
  : '/api';

// Interface para parlamentar vindo da API
interface ParlamentarAPI {
  _id: string;
  nome: string;
  nomeNormalizado: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Obtém todos os parlamentares da API
 */
export async function getParlamentares(): Promise<ParlamentarAPI[]> {
  const response = await fetch(`${PARLAMENTARES_API_BASE}/parlamentares`);
  if (!response.ok) {
    throw new Error('Erro ao buscar parlamentares');
  }
  return response.json();
}

/**
 * Obtém mapa de nome para ID da API
 */
export async function getParlamentaresMap(): Promise<Map<string, string>> {
  const response = await fetch(`${PARLAMENTARES_API_BASE}/parlamentares/map`);
  if (!response.ok) {
    throw new Error('Erro ao buscar mapa de parlamentares');
  }
  const data = await response.json();
  return new Map(Object.entries(data));
}

/**
 * Popula dados do parlamentar em emendas via API
 */
export async function popularEmendasComParlamentares<T extends { parlamentarId?: string }>(
  emendas: T[]
): Promise<(T & { parlamentar?: ParlamentarAPI })[]> {
  const emendasValidas = emendas.filter((emenda): emenda is T & { parlamentarId: string } => Boolean(emenda.parlamentarId));
  if (emendasValidas.length === 0) return [];
  
  const response = await fetch(`${PARLAMENTARES_API_BASE}/parlamentares/popular-emendas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ emendas: emendasValidas }),
  });
  
  if (!response.ok) {
    throw new Error('Erro ao popular emendas com parlamentares');
  }
  
  return response.json();
}

/**
 * Extrai uma lista de nomes de parlamentares do campo emendasParlamentares
 * Se não houver emendas, retorna array vazio
 */
export function extrairNomesParlamentares(fomento: Projeto): string[] {
  if (!fomento.emendasParlamentares || fomento.emendasParlamentares.length === 0) {
    return [];
  }
  
  // Extrair nomes das emendas (se tiver dados populados) ou usar IDs
  return fomento.emendasParlamentares
    .map((emenda): string => {
      // Se tiver parlamentar populado, usar o nome
      if ('parlamentar' in emenda && emenda.parlamentar && typeof emenda.parlamentar === 'object' && 'nome' in emenda.parlamentar) {
        const parlamentar = emenda.parlamentar as { nome: string };
        return parlamentar.nome;
      }
      // Se tiver nome legado, usar ele
      if (emenda.nome) {
        return normalizarParlamentares(emenda.nome)[0];
      }
      // Caso contrário, retornar vazio
      return '';
    })
    .filter((nome): nome is string => Boolean(nome) && nome.toLowerCase() !== 'não se aplica');
}

/**
 * Gera uma string resumida dos parlamentares para exibição
 * Aplica normalização de nomes e separação de múltiplos
 */
export async function gerarResumoParlamentares(fomento: Projeto): Promise<string> {
  if (!fomento.emendasParlamentares || fomento.emendasParlamentares.length === 0) {
    // Se não há emendas, tentar usar o campo parlamentar antigo (se existir)
    if (fomento.parlamentar) {
      return gerarResumoParlamentaresNormalizado(fomento.parlamentar);
    }
    return '';
  }
  
  // Popular emendas com dados completos dos parlamentares
  const emendasPopuladas = await popularEmendasComParlamentares(fomento.emendasParlamentares);
  
  // Extrair nomes normalizados
  const nomes = emendasPopuladas
    .map(emenda => emenda.parlamentar?.nome || '')
    .filter(nome => nome && nome.toLowerCase() !== 'não se aplica');
  
  if (nomes.length === 0) {
    return '';
  }
  
  // Remover duplicados e gerar resumo
  const nomesUnicos = Array.from(new Set(nomes));
  return gerarResumoParlamentaresNormalizado(nomesUnicos);
}

/**
 * Interface para valor por parlamentar
 */
export interface ParlamentarValor {
  nome: string;
  valorTotal: number;
  quantidade: number;
}

/**
 * Calcula o valor total por parlamentar usando referências da API
 */
export async function calcularValorPorParlamentar(fomentos: Projeto[]): Promise<ParlamentarValor[]> {
  const parlamentaresMap = new Map<string, { valorTotal: number; quantidade: number }>();

  for (const fomento of fomentos) {
    if (!fomento.emendasParlamentares || fomento.emendasParlamentares.length === 0) {
      // Se não há emendas, tentar usar o campo parlamentar antigo
      if (fomento.parlamentar) {
        const nomesNormalizados = normalizarParlamentares(fomento.parlamentar);
        nomesNormalizados.forEach(nome => {
          if (!parlamentaresMap.has(nome)) {
            parlamentaresMap.set(nome, { valorTotal: 0, quantidade: 0 });
          }
          const atual = parlamentaresMap.get(nome)!;
          atual.valorTotal += fomento.valorTotal || 0;
          atual.quantidade += 1;
        });
      }
      continue;
    }

    // Popular emendas com dados completos dos parlamentares
    const emendasPopuladas = await popularEmendasComParlamentares(fomento.emendasParlamentares);

    // Processar emendas parlamentares com dados populados
    emendasPopuladas.forEach(emenda => {
      const nome = emenda.parlamentar?.nome;
      if (!nome || nome.toLowerCase() === 'não se aplica') {
        return;
      }

      const valor = (emenda as any).valor || fomento.valorTotal || 0;
      
      if (!parlamentaresMap.has(nome)) {
        parlamentaresMap.set(nome, { valorTotal: 0, quantidade: 0 });
      }
      
      const atual = parlamentaresMap.get(nome)!;
      atual.valorTotal += valor;
      atual.quantidade += 1;
    });
  }

  return Array.from(parlamentaresMap.entries())
    .map(([nome, dados]) => ({
      nome,
      valorTotal: dados.valorTotal,
      quantidade: dados.quantidade
    }))
    .sort((a, b) => b.valorTotal - a.valorTotal);
}

/**
 * Verifica se um fomento tem parlamentares cadastrados
 */
export function temParlamentares(fomento: Projeto): boolean {
  return extrairNomesParlamentares(fomento).length > 0;
}

/**
 * Gera uma string resumida dos parlamentares para exibição (versão síncrona)
 * Usa apenas dados disponíveis localmente sem consultar a API
 */
export function gerarResumoParlamentaresSync(fomento: Projeto): string {
  if (!fomento.emendasParlamentares || fomento.emendasParlamentares.length === 0) {
    // Se não há emendas, tentar usar o campo parlamentar antigo (se existir)
    if (fomento.parlamentar) {
      return gerarResumoParlamentaresNormalizado(fomento.parlamentar);
    }
    return '';
  }
  
  // Extrair nomes das emendas (versão síncrona, sem popular da API)
  const nomes = fomento.emendasParlamentares
    .map((emenda): string => {
      // Se tiver nome legado, usar ele normalizado
      if (emenda.nome) {
        return normalizarParlamentares(emenda.nome)[0];
      }
      // Se tiver parlamentar populado, usar o nome
      if ('parlamentar' in emenda && emenda.parlamentar && typeof emenda.parlamentar === 'object' && 'nome' in emenda.parlamentar) {
        const parlamentar = emenda.parlamentar as { nome: string };
        return parlamentar.nome;
      }
      return '';
    })
    .filter((nome): nome is string => Boolean(nome) && nome.toLowerCase() !== 'não se aplica');
  
  if (nomes.length === 0) {
    return '';
  }
  
  // Remover duplicados e gerar resumo
  const nomesUnicos = Array.from(new Set(nomes));
  return gerarResumoParlamentaresNormalizado(nomesUnicos);
}
