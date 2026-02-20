import { MongoClient, Db, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Mapa de normalização de parlamentares com separação de múltiplos
const PARLAMENTARES_NORMALIZATION_MAP: Record<string, string | string[]> = {
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
  "jaqueline silva": "Jaqueline Silva",
  
  // Joaquim Roriz Neto
  "joaquim roriz neto": "Joaquim Roriz Neto",
  "Joaquim Roriz Neto": "Joaquim Roriz Neto",
  
  // João Cardoso
  "joão cardoso": "João Cardoso",
  "João Cardoso": "João Cardoso",
  "joao cardoso": "João Cardoso",
  
  // Leandro Grass
  "leandro grass": "Leandro Grass",
  "Leandro Grass": "Leandro Grass",
  
  // Lígia Damasceno
  "lígia damasceno": "Lígia Damasceno",
  "Lígia Damasceno": "Lígia Damasceno",
  "ligia damasceno": "Lígia Damasceno",
  
  // Martins Machado
  "martins machado": "Martins Machado",
  "Martins Machado": "Martins Machado",
  
  // Professor Marcos
  "professor marcos": "Professor Marcos",
  "Professor Marcos": "Professor Marcos",
  "marcos": "Professor Marcos",
  
  // Rafael Momesso
  "rafael momesso": "Rafael Momesso",
  "Rafael Momesso": "Rafael Momesso",
  
  // Reginaldo Sampaio
  "reginaldo sampaio": "Reginaldo Sampaio",
  "Reginaldo Sampaio": "Reginaldo Sampaio",
  
  // Rodrigo Delmasso
  "rodrigo delmasso": "Rodrigo Delmasso",
  "Rodrigo Delmasso": "Rodrigo Delmasso",
  
  // Rogério Cruz
  "rogério cruz": "Rogério Cruz",
  "Rogério Cruz": "Rogério Cruz",
  
  // Thiago Manzoni
  "thiago manzoni": "Thiago Manzoni",
  "Thiago Manzoni": "Thiago Manzoni",
  
  // Valdemir Júnior
  "valdemir júnior": "Valdemir Júnior",
  "Valdemir Júnior": "Valdemir Júnior",
  "valdemir junior": "Valdemir Júnior"
};

// Função de normalização (mesma do script principal)
function normalizarNomeParlamentar(nome: string): string {
  const normalizacaoMap: Record<string, string> = {
    "doutora jane": "Doutora Jane",
    "eduardo pedrosa": "Eduardo Pedrosa",
    "iolando": "Iolando",
    "lolando": "Iolando",
    "lolano": "Iolando",
    "jaqueline silva": "Jaqueline Silva",
    "joaquim roriz neto": "Joaquim Roriz Neto",
    "joão cardoso": "João Cardoso",
    "joao cardoso": "João Cardoso",
    "leandro grass": "Leandro Grass",
    "lígia damasceno": "Lígia Damasceno",
    "ligia damasceno": "Lígia Damasceno",
    "martins machado": "Martins Machado",
    "professor marcos": "Professor Marcos",
    "marcos": "Professor Marcos",
    "rafael momesso": "Rafael Momesso",
    "reginaldo sampaio": "Reginaldo Sampaio",
    "rodrigo delmasso": "Rodrigo Delmasso",
    "rogério cruz": "Rogério Cruz",
    "thiago manzoni": "Thiago Manzoni",
    "valdemir júnior": "Valdemir Júnior",
    "valdemir junior": "Valdemir Júnior"
  };
  
  const nomeLimpo = nome.trim().toLowerCase();
  return normalizacaoMap[nomeLimpo] || nome;
}

// Função para separar múltiplos parlamentares
function separarMultiplosParlamentares(texto: string): string[] {
  if (!texto) return [];
  
  const textoLimpo = texto.trim();
  if (!textoLimpo || textoLimpo.toLowerCase() === 'não se aplica') return [];
  
  // Se já tem mapeamento direto (incluindo múltiplos)
  if (PARLAMENTARES_NORMALIZATION_MAP[textoLimpo]) {
    const mapeado = PARLAMENTARES_NORMALIZATION_MAP[textoLimpo];
    return Array.isArray(mapeado) ? mapeado : [mapeado];
  }
  
  // Separar por conectivos comuns
  const separadores = [' e ', ' & ', ' e ', ' com ', ' / ', ' | ', ' • '];
  
  for (const separador of separadores) {
    if (textoLimpo.includes(separador)) {
      const partes = textoLimpo.split(separador)
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      if (partes.length > 1) {
        // Normalizar cada parte
        return partes.map(parte => normalizarNomeParlamentar(parte));
      }
    }
  }
  
  // Se não encontrou separadores, normalizar o nome único
  return [normalizarNomeParlamentar(textoLimpo)];
}

async function inspectAndFixParlamentares() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db: Db = client.db('secti_dashboard');
    
    console.log('🔍 Inspecionando dados de parlamentares no custom_projects...');
    
    // 1. Buscar todos os projetos
    const projectsCollection = db.collection('custom_projects');
    const projects = await projectsCollection.find({}).toArray();
    
    console.log(`📊 Total de projetos encontrados: ${projects.length}`);
    
    // 2. Buscar parlamentares para referência
    const parlamentaresCollection = db.collection('parlamentares');
    const parlamentares = await parlamentaresCollection.find({}).toArray();
    
    console.log(`📋 Total de parlamentares únicos: ${parlamentares.length}`);
    
    // Criar mapa de nome para ObjectId
    const parlamentarMap = new Map<string, ObjectId>();
    parlamentares.forEach(p => {
      parlamentarMap.set(p.nome, p._id);
    });
    
    // 3. Analisar emendas parlamentares
    let totalEmendas = 0;
    let emendasProblema = 0;
    let projetosParaAtualizar = 0;
    const problemas: Array<{
      projectId: string;
      problema: string;
      valorAtual: any;
      valorCorrigido?: any;
    }> = [];
    
    for (const project of projects as any[]) {
      if (!project.emendasParlamentares || project.emendasParlamentares.length === 0) {
        continue;
      }
      
      let precisaAtualizar = false;
      const emendasCorrigidas: any[] = [];
      
      for (const emenda of project.emendasParlamentares) {
        totalEmendas++;
        
        // Verificar se ainda usa o formato antigo (com nome)
        if (emenda.nome && !emenda.parlamentarId) {
          console.log(`⚠️  Projeto ${project._id} ainda usa formato antigo com nome: ${emenda.nome}`);
          
          // Separar múltiplos parlamentares
          const nomesSeparados = separarMultiplosParlamentares(emenda.nome);
          
          if (nomesSeparados.length > 1) {
            console.log(`🔄 Separando múltiplos parlamentares: "${emenda.nome}" -> [${nomesSeparados.join(', ')}]`);
            emendasProblema++;
          }
          
          // Criar emendas separadas para cada parlamentar
          for (const nomeSeparado of nomesSeparados) {
            const parlamentarId = parlamentarMap.get(nomeSeparado);
            
            if (!parlamentarId) {
              console.log(`❌ Parlamentar não encontrado no mapa: ${nomeSeparado}`);
              problemas.push({
                projectId: project._id.toString(),
                problema: `Parlamentar não encontrado: ${nomeSeparado}`,
                valorAtual: emenda
              });
              continue;
            }
            
            emendasCorrigidas.push({
              parlamentarId: parlamentarId.toString(),
              valor: emenda.valor || 0,
              status: emenda.status || 'Bloqueada',
              descentralizacao: emenda.descentralizacao || false,
              numeroPortaria: emenda.numeroPortaria || '',
              historico: emenda.historico || []
            });
          }
          
          precisaAtualizar = true;
        } else if (emenda.parlamentarId) {
          // Já usa formato novo, apenas verificar
          emendasCorrigidas.push(emenda);
        }
      }
      
      // Atualizar projeto se necessário
      if (precisaAtualizar && emendasCorrigidas.length > 0) {
        projetosParaAtualizar++;
        
        console.log(`🔧 Atualizando projeto ${project._id}: ${project.emendasParlamentares.length} -> ${emendasCorrigidas.length} emendas`);
        
        await projectsCollection.updateOne(
          { _id: project._id },
          { 
            $set: { 
              emendasParlamentares: emendasCorrigidas,
              updatedAt: new Date()
            }
          }
        );
        
        problemas.push({
          projectId: project._id.toString(),
          problema: 'Formato antigo corrigido',
          valorAtual: project.emendasParlamentares.length,
          valorCorrigido: emendasCorrigidas.length
        });
      }
    }
    
    // 4. Relatório final
    console.log('\n📈 === RELATÓRIO FINAL ===');
    console.log(`✅ Total de projetos: ${projects.length}`);
    console.log(`✅ Total de parlamentares únicos: ${parlamentares.length}`);
    console.log(`✅ Total de emendas analisadas: ${totalEmendas}`);
    console.log(`⚠️  Emendas com problemas: ${emendasProblema}`);
    console.log(`🔧 Projetos atualizados: ${projetosParaAtualizar}`);
    
    if (problemas.length > 0) {
      console.log('\n🔍 Detalhes dos problemas:');
      problemas.forEach(p => {
        console.log(`  - Projeto ${p.projectId}: ${p.problema}`);
        if (p.valorCorrigido !== undefined) {
          console.log(`    Antes: ${p.valorAtual} | Depois: ${p.valorCorrigido}`);
        }
      });
    }
    
    // 5. Verificar estado final
    const projetosFinal = await projectsCollection.find({}).toArray();
    let emendasFinais = 0;
    let emendasComReferencia = 0;
    
    for (const project of projetosFinal as any[]) {
      if (project.emendasParlamentares) {
        emendasFinais += project.emendasParlamentares.length;
        for (const emenda of project.emendasParlamentares) {
          if (emenda.parlamentarId) {
            emendasComReferencia++;
          }
        }
      }
    }
    
    console.log('\n🎯 === ESTADO FINAL ===');
    console.log(`✅ Total de emendas finais: ${emendasFinais}`);
    console.log(`✅ Emendas com referência (parlamentarId): ${emendasComReferencia}`);
    console.log(`✅ Taxa de normalização: ${((emendasComReferencia / emendasFinais) * 100).toFixed(2)}%`);
    
    if (emendasComReferencia === emendasFinais) {
      console.log('🎉 TODAS AS EMENDAS ESTÃO NORMALIZADAS COM REFERÊNCIAS!');
    } else {
      console.log(`⚠️  Ainda existem ${emendasFinais - emendasComReferencia} emendas sem normalização.`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao inspecionar/fixar parlamentares:', error);
  } finally {
    await client.close();
  }
}

// Executar a função
inspectAndFixParlamentares().catch(console.error);
