import { MongoClient, Db, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Mapa de normalização de parlamentares com separação de múltiplos
const PARLAMENTARES_NORMALIZATION_MAP: Record<string, string | string[]> = {
  "doutora jane": "Doutora Jane",
  "eduardo pedrosa": "Eduardo Pedrosa",
  "Eduardo Pedrosa": "Eduardo Pedrosa",
  "iolando": "Iolando",
  "Iolando": "Iolando",
  "Lolando": "Iolando",
  "lolano": "Iolando",
  "martins e iolando": ["Iolando", "Martins Machado"],
  "Jaqueline Silva": "Jaqueline Silva",
  "jaqueline silva": "Jaqueline Silva",
  "joaquim roriz neto": "Joaquim Roriz Neto",
  "Joaquim Roriz Neto": "Joaquim Roriz Neto",
  "joão cardoso": "João Cardoso",
  "João Cardoso": "João Cardoso",
  "joao cardoso": "João Cardoso",
  "leandro grass": "Leandro Grass",
  "Leandro Grass": "Leandro Grass",
  "lígia damasceno": "Lígia Damasceno",
  "Lígia Damasceno": "Lígia Damasceno",
  "ligia damasceno": "Lígia Damasceno",
  "martins machado": "Martins Machado",
  "Martins Machado": "Martins Machado",
  "professor marcos": "Professor Marcos",
  "Professor Marcos": "Professor Marcos",
  "marcos": "Professor Marcos",
  "rafael momesso": "Rafael Momesso",
  "Rafael Momesso": "Rafael Momesso",
  "reginaldo sampaio": "Reginaldo Sampaio",
  "Reginaldo Sampaio": "Reginaldo Sampaio",
  "rodrigo delmasso": "Rodrigo Delmasso",
  "Rodrigo Delmasso": "Rodrigo Delmasso",
  "rogério cruz": "Rogério Cruz",
  "Rogério Cruz": "Rogério Cruz",
  "thiago manzoni": "Thiago Manzoni",
  "Thiago Manzoni": "Thiago Manzoni",
  "valdemir júnior": "Valdemir Júnior",
  "Valdemir Júnior": "Valdemir Júnior",
  "valdemir junior": "Valdemir Júnior",
  "pastor daniel de castro": "Pastor Daniel de Castro",
  "pastor daniel": "Pastor Daniel de Castro",
  "daniel de castro": "Pastor Daniel de Castro",
  "joaquin roriz neto": "Joaquim Roriz Neto",
  // Adicionar parlamentares que estão nos dados
  "max maciel": "Max Maciel",
  "Max Maciel": "Max Maciel",
  "pepa": "Pepa",
  "Pepa": "Pepa"
};

// Função de normalização
function normalizarNomeParlamentar(nome: string): string {
  const nomeLimpo = nome.trim().toLowerCase();
  return PARLAMENTARES_NORMALIZATION_MAP[nomeLimpo] as string || nome;
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

async function inspectCustomProjects() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db: Db = client.db('secti-dashboard');
    
    console.log('🔍 Inspecionando custom_projects - campo emendasParlamentares...');
    
    // 1. Buscar todos os projetos da collection custom_projects
    const customProjectsCollection = db.collection('custom_projects');
    const projects = await customProjectsCollection.find({}).toArray();
    
    console.log(`📊 Total de projetos em custom_projects: ${projects.length}`);
    
    if (projects.length === 0) {
      console.log('❌ Nenhum projeto encontrado em custom_projects');
      return;
    }
    
    // 2. Buscar parlamentares para referência
    const parlamentaresCollection = db.collection('parlamentares');
    const parlamentares = await parlamentaresCollection.find({}).toArray();
    
    console.log(`📋 Total de parlamentares únicos: ${parlamentares.length}`);
    
    // Criar mapa de nome para ObjectId
    const parlamentarMap = new Map<string, ObjectId>();
    parlamentares.forEach(p => {
      parlamentarMap.set(p.nome, p._id);
    });
    
    // 3. Analisar emendas parlamentares em cada projeto
    let totalProjetosComEmendas = 0;
    let totalEmendas = 0;
    let emendasComNome = 0;
    let emendasComReferencia = 0;
    let emendasComMultiplos = 0;
    let projetosParaAtualizar = 0;
    
    const problemas: Array<{
      projectId: string;
      projeto: string;
      problema: string;
      emendas: any[];
      emendasCorrigidas?: any[];
    }> = [];
    
    console.log('\n🔍 Analisando emendas parlamentares...');
    
    for (const project of projects as any[]) {
      const projectId = project._id.toString();
      const projetoNome = project.projeto || 'Sem nome';
      
      if (!project.emendasParlamentares || project.emendasParlamentares.length === 0) {
        continue;
      }
      
      totalProjetosComEmendas++;
      totalEmendas += project.emendasParlamentares.length;
      
      console.log(`\n📋 Projeto: ${projetoNome} (${projectId})`);
      console.log(`   Emendas: ${project.emendasParlamentares.length}`);
      
      let precisaAtualizar = false;
      const emendasCorrigidas: any[] = [];
      const emendasProblema: any[] = [];
      
      for (const emenda of project.emendasParlamentares) {
        console.log(`   • Emenda: ${JSON.stringify(emenda)}`);
        
        // Verificar se ainda usa o formato antigo (com nome)
        if (emenda.nome && !emenda.parlamentarId) {
          emendasComNome++;
          console.log(`     ⚠️  Usa formato antigo - nome: "${emenda.nome}"`);
          
          // Separar múltiplos parlamentares
          const nomesSeparados = separarMultiplosParlamentares(emenda.nome);
          
          if (nomesSeparados.length > 1) {
            emendasComMultiplos++;
            console.log(`     🔄 Múltiplos parlamentares detectados: "${emenda.nome}" -> [${nomesSeparados.join(', ')}]`);
          }
          
          // Criar emendas separadas para cada parlamentar
          for (const nomeSeparado of nomesSeparados) {
            const parlamentarId = parlamentarMap.get(nomeSeparado);
            
            if (!parlamentarId) {
              console.log(`     ❌ Parlamentar não encontrado no mapa: "${nomeSeparado}"`);
              emendasProblema.push({
                problema: `Parlamentar não encontrado: ${nomeSeparado}`,
                emendaOriginal: emenda
              });
              continue;
            }
            
            const novaEmenda = {
              parlamentarId: parlamentarId.toString(),
              valor: emenda.valor || 0,
              status: emenda.status || 'Bloqueada',
              descentralizacao: emenda.descentralizacao || false,
              numeroPortaria: emenda.numeroPortaria || '',
              historico: emenda.historico || []
            };
            
            emendasCorrigidas.push(novaEmenda);
            console.log(`     ✅ Criada referência: ${nomeSeparado} -> ${parlamentarId.toString()}`);
          }
          
          precisaAtualizar = true;
        } else if (emenda.parlamentarId) {
          emendasComReferencia++;
          console.log(`     ✅ Já usa referência: parlamentarId = ${emenda.parlamentarId}`);
          emendasCorrigidas.push(emenda);
        } else {
          console.log(`     ❌ Formato inválido: sem nome e sem parlamentarId`);
          emendasProblema.push({
            problema: 'Formato inválido: sem nome e sem parlamentarId',
            emendaOriginal: emenda
          });
        }
      }
      
      // Se há problemas ou precisa atualizar
      if (precisaAtualizar || emendasProblema.length > 0) {
        projetosParaAtualizar++;
        
        problemas.push({
          projectId,
          projeto: projetoNome,
          problema: precisaAtualizar ? 'Precisa atualizar para referências' : 'Tem emendas com problemas',
          emendas: project.emendasParlamentares,
          emendasCorrigidas: precisaAtualizar ? emendasCorrigidas : undefined
        });
        
        // Atualizar no banco se necessário
        if (precisaAtualizar && emendasCorrigidas.length > 0) {
          console.log(`   🔧 Atualizando projeto: ${project.emendasParlamentares.length} -> ${emendasCorrigidas.length} emendas`);
          
          await customProjectsCollection.updateOne(
            { _id: project._id },
            { 
              $set: { 
                emendasParlamentares: emendasCorrigidas,
                updatedAt: new Date()
              }
            }
          );
          console.log(`   ✅ Projeto atualizado com sucesso!`);
        }
      }
    }
    
    // 4. Relatório final
    console.log('\n📈 === RELATÓRIO FINAL ===');
    console.log(`✅ Total de projetos em custom_projects: ${projects.length}`);
    console.log(`✅ Projetos com emendas parlamentares: ${totalProjetosComEmendas}`);
    console.log(`✅ Total de emendas analisadas: ${totalEmendas}`);
    console.log(`⚠️  Emendas com formato antigo (nome): ${emendasComNome}`);
    console.log(`✅ Emendas com referência (parlamentarId): ${emendasComReferencia}`);
    console.log(`🔄 Emendas com múltiplos parlamentares: ${emendasComMultiplos}`);
    console.log(`🔧 Projetos que precisaram de atualização: ${projetosParaAtualizar}`);
    
    if (problemas.length > 0) {
      console.log('\n🔍 Detalhes dos problemas/correções:');
      problemas.forEach(p => {
        console.log(`\n  📋 Projeto: ${p.projeto} (${p.projectId})`);
        console.log(`     Problema: ${p.problema}`);
        console.log(`     Emendas originais: ${p.emendas.length}`);
        if (p.emendasCorrigidas) {
          console.log(`     Emendas corrigidas: ${p.emendasCorrigidas.length}`);
        }
      });
    }
    
    // 5. Verificar estado final após correções
    const projetosFinal = await customProjectsCollection.find({}).toArray();
    let emendasFinais = 0;
    let emendasFinaisComReferencia = 0;
    
    for (const project of projetosFinal as any[]) {
      if (project.emendasParlamentares) {
        emendasFinais += project.emendasParlamentares.length;
        for (const emenda of project.emendasParlamentares) {
          if (emenda.parlamentarId) {
            emendasFinaisComReferencia++;
          }
        }
      }
    }
    
    console.log('\n🎯 === ESTADO FINAL APÓS CORREÇÕES ===');
    console.log(`✅ Total de emendas finais: ${emendasFinais}`);
    console.log(`✅ Emendas com referência (parlamentarId): ${emendasFinaisComReferencia}`);
    console.log(`✅ Taxa de normalização: ${emendasFinais > 0 ? ((emendasFinaisComReferencia / emendasFinais) * 100).toFixed(2) : 0}%`);
    
    if (emendasFinaisComReferencia === emendasFinais && emendasFinais > 0) {
      console.log('🎉 TODAS AS EMENDAS ESTÃO NORMALIZADAS COM REFERÊNCIAS!');
    } else if (emendasFinais === 0) {
      console.log('📋 NÃO HÁ EMENDAS PARA ANALISAR');
    } else {
      console.log(`⚠️  Ainda existem ${emendasFinais - emendasFinaisComReferencia} emendas sem normalização.`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao inspecionar custom_projects:', error);
  } finally {
    await client.close();
  }
}

// Executar a função
inspectCustomProjects().catch(console.error);
