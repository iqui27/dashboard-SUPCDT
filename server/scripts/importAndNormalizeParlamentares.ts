import { MongoClient, Db, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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
  "joaquin roriz neto": "Joaquim Roriz Neto"
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

// Função para parse de moeda BRL
function parseBRLCurrency(valor: string): number {
  if (!valor) return 0;
  
  // Remover R$, pontos e vírgulas
  const clean = valor
    .replace(/R\$\s*/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '');
  
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

async function importAndNormalizeParlamentares() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db: Db = client.db('secti_dashboard');
    
    console.log('📁 Importando dados da planilha e normalizando parlamentares...');
    
    // 1. Ler arquivo CSV
    const csvPath = path.join(process.cwd(), '2025 - CONTROLE INTERNO_ SUAG  - fomentos 2025.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ Arquivo CSV não encontrado:', csvPath);
      return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 Planilha encontrada com ${lines.length - 1} linhas de dados`);
    
    // 2. Buscar parlamentares para referência
    const parlamentaresCollection = db.collection('parlamentares');
    const parlamentares = await parlamentaresCollection.find({}).toArray();
    
    console.log(`📋 Total de parlamentares únicos: ${parlamentares.length}`);
    
    // Criar mapa de nome para ObjectId
    const parlamentarMap = new Map<string, ObjectId>();
    parlamentares.forEach(p => {
      parlamentarMap.set(p.nome, p._id);
    });
    
    // 3. Processar CSV e importar para custom_projects
    const customProjectsCollection = db.collection('custom_projects');
    const projectsToInsert: any[] = [];
    
    let totalLinhas = 0;
    let emendasProcessadas = 0;
    let multiplosDetectados = 0;
    let nomesNaoNormalizados = 0;
    
    // Pular header (linha 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      totalLinhas++;
      
      // Parse CSV simples (considerando vírgulas entre aspas)
      const parts = [];
      let current = '';
      let inQuotes = false;
      
      for (let char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim());
      
      const [processo, osc, valor, projeto, parlamentar, cnpj] = parts;
      
      console.log(`\n📋 Linha ${i}: ${projeto}`);
      console.log(`   Parlamentar original: "${parlamentar}"`);
      
      // Separar e normalizar parlamentares
      const nomesSeparados = separarMultiplosParlamentares(parlamentar);
      
      if (nomesSeparados.length > 1) {
        multiplosDetectados++;
        console.log(`   🔄 Múltiplos parlamentares: [${nomesSeparados.join(', ')}]`);
      }
      
      // Criar emendas parlamentares com referências
      const emendasParlamentares: any[] = [];
      
      for (const nomeSeparado of nomesSeparados) {
        const nomeNormalizado = normalizarNomeParlamentar(nomeSeparado);
        
        if (nomeNormalizado !== nomeSeparado.trim()) {
          nomesNaoNormalizados++;
          console.log(`   📝 Nome normalizado: "${nomeSeparado}" -> "${nomeNormalizado}"`);
        }
        
        const parlamentarId = parlamentarMap.get(nomeNormalizado);
        
        if (!parlamentarId) {
          console.log(`   ❌ Parlamentar não encontrado no mapa: "${nomeNormalizado}"`);
          continue;
        }
        
        const emenda = {
          parlamentarId: parlamentarId.toString(),
          valor: parseBRLCurrency(valor),
          status: 'Bloqueada',
          descentralizacao: false,
          numeroPortaria: '',
          historico: []
        };
        
        emendasParlamentares.push(emenda);
        emendasProcessadas++;
        
        console.log(`   ✅ Emenda criada: ${nomeNormalizado} -> ID: ${parlamentarId.toString()}, Valor: ${parseBRLCurrency(valor)}`);
      }
      
      // Criar projeto
      const project = {
        _id: new ObjectId().toString(),
        processoSEI: processo,
        osc: osc,
        valorTotal: parseBRLCurrency(valor),
        projeto: projeto,
        parlamentar: parlamentar, // Manter campo original para referência
        emendasParlamentares: emendasParlamentares,
        cnpj: cnpj,
        statusProjeto: 'Em análise',
        situacao: 'Aguardando análise',
        etapaProjeto: 'Inscrição',
        origin: 'custom',
        createdAt: new Date(),
        updatedAt: new Date(),
        historicoMovimentacoes: [],
        statusDesde: new Date()
      };
      
      projectsToInsert.push(project);
    }
    
    // 4. Inserir projetos no banco
    if (projectsToInsert.length > 0) {
      console.log(`\n💾 Inserindo ${projectsToInsert.length} projetos em custom_projects...`);
      
      // Limpar collection antes de inserir
      await customProjectsCollection.deleteMany({});
      console.log('🧹 Collection custom_projects limpa');
      
      // Inserir novos projetos
      const result = await customProjectsCollection.insertMany(projectsToInsert);
      console.log(`✅ ${result.insertedCount} projetos inseridos com sucesso!`);
    }
    
    // 5. Relatório final
    console.log('\n📈 === RELATÓRIO FINAL DA IMPORTAÇÃO ===');
    console.log(`✅ Linhas processadas: ${totalLinhas}`);
    console.log(`✅ Projetos importados: ${projectsToInsert.length}`);
    console.log(`✅ Emendas processadas: ${emendasProcessadas}`);
    console.log(`🔄 Múltiplos parlamentares detectados: ${multiplosDetectados}`);
    console.log(`📝 Nomes normalizados: ${nomesNaoNormalizados}`);
    
    // 6. Verificar estado final
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
    
    console.log('\n🎯 === ESTADO FINAL NO BANCO ===');
    console.log(`✅ Total de projetos em custom_projects: ${projetosFinal.length}`);
    console.log(`✅ Total de emendas finais: ${emendasFinais}`);
    console.log(`✅ Emendas com referência (parlamentarId): ${emendasFinaisComReferencia}`);
    console.log(`✅ Taxa de normalização: ${emendasFinais > 0 ? ((emendasFinaisComReferencia / emendasFinais) * 100).toFixed(2) : 0}%`);
    
    if (emendasFinaisComReferencia === emendasFinais && emendasFinais > 0) {
      console.log('🎉 TODAS AS EMENDAS ESTÃO NORMALIZADAS COM REFERÊNCIAS!');
    }
    
    // 7. Mostrar amostra dos dados importados
    console.log('\n📋 === AMOSTRA DOS DADOS IMPORTADOS ===');
    const amostra = await customProjectsCollection.find({}).limit(3).toArray();
    
    for (const project of amostra as any[]) {
      console.log(`\n📋 Projeto: ${project.projeto}`);
      console.log(`   Processo: ${project.processoSEI}`);
      console.log(`   OSC: ${project.osc}`);
      console.log(`   Valor: ${project.valorTotal}`);
      console.log(`   Parlamentar original: ${project.parlamentar}`);
      console.log(`   Emendas parlamentares: ${project.emendasParlamentares.length}`);
      
      project.emendasParlamentares.forEach((emenda: any, index: number) => {
        console.log(`     ${index + 1}. parlamentarId: ${emenda.parlamentarId}, valor: ${emenda.valor}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao importar e normalizar:', error);
  } finally {
    await client.close();
  }
}

// Executar a função
importAndNormalizeParlamentares().catch(console.error);
