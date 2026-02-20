import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'secti-dashboard';

interface OSC {
  _id?: ObjectId;
  nome?: string;
  parlamentar?: string;
  parlamentarId?: string;
  // Outros campos que possam existir
  [key: string]: any;
}

interface Parlamentar {
  _id: ObjectId;
  nome: string;
  nomeNormalizado: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Script para migrar tabela OSCs:
 * 1. Normalizar nomes de parlamentares
 * 2. Referenciar tabela parlamentares em vez de texto
 */
async function migrateOSCs() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('📋 Buscando parlamentares para criar mapa de referências...');
    const parlamentaresCollection = db.collection('parlamentares');
    const parlamentares = await parlamentaresCollection.find({}).toArray() as Parlamentar[];
    
    // Criar mapa de normalização de nomes para ObjectId
    const nomeParaParlamentarId = new Map<string, string>();
    const nomeNormalizadoMap: Record<string, string> = {
      "doutora jane": "Doutora Jane",
      "eduardo pedrosa": "Eduardo Pedrosa", 
      "iolando": "Iolando",
      "Lolando": "Iolando",
      "lolano": "Iolando",
      "Jaqueline Silva": "Jaqueline Silva",
      "jaquelina": "Jaqueline Silva",
      "joaquin roriz neto": "Joaquim Roriz Neto",
      "manzoni": "Thiago Manzoni",
      "MARTINS MACHADO": "Martins Machado",
      "martins": "Martins Machado",
      "martins machado": "Martins Machado",
      "pastol daniel de castro": "Pastor Daniel de Castro",
      "pastor daniel": "Pastor Daniel de Castro",
      "pastor daniel de casto": "Pastor Daniel de Castro",
      "pastor daniel de castro": "Pastor Daniel de Castro",
      "ricardo vale": "Ricardo Vale",
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
    
    // Popular mapa com parlamentares existentes
    parlamentares.forEach(p => {
      nomeParaParlamentarId.set(p.nome.toLowerCase(), p._id.toString());
      nomeParaParlamentarId.set(p.nomeNormalizado.toLowerCase(), p._id.toString());
    });
    
    console.log(`✅ Encontrados ${parlamentares.length} parlamentares no banco`);
    
    console.log('📋 Buscando OSCs para migrar...');
    const oscsCollection = db.collection('oscs');
    const oscs = await oscsCollection.find({}).toArray() as OSC[];
    
    console.log(`📊 Encontradas ${oscs.length} OSCs para processar`);
    
    let atualizadas = 0;
    let naoEncontrados = 0;
    const parlamentaresNaoEncontrados = new Set<string>();
    
    for (const osc of oscs) {
      if (!osc.parlamentar || osc.parlamentar.trim() === '') {
        console.log(`⚠️  OSC sem parlamentar: ${osc.nome || 'sem nome'}`);
        continue;
      }
      
      // Normalizar nome do parlamentar
      const nomeOriginal = osc.parlamentar.trim();
      const nomeNormalizado = nomeNormalizadoMap[nomeOriginal.toLowerCase()] || nomeOriginal;
      
      // Buscar ID do parlamentar
      let parlamentarId = nomeParaParlamentarId.get(nomeNormalizado.toLowerCase());
      
      if (!parlamentarId) {
        // Tentar busca case-insensitive
        for (const [nome, id] of nomeParaParlamentarId) {
          if (nome.toLowerCase() === nomeNormalizado.toLowerCase()) {
            parlamentarId = id;
            break;
          }
        }
      }
      
      if (parlamentarId) {
        // Atualizar OSC com referência ao parlamentar
        await oscsCollection.updateOne(
          { _id: osc._id },
          { 
            $set: { 
              parlamentarId: parlamentarId,
              parlamentarNormalizado: nomeNormalizado,
              updatedAt: new Date()
            }
          }
        );
        
        console.log(`✅ OSC "${osc.nome}" atualizada: ${nomeOriginal} → ${nomeNormalizado} (${parlamentarId})`);
        atualizadas++;
      } else {
        console.log(`❌ Parlamentar não encontrado: "${nomeOriginal}" (normalizado: "${nomeNormalizado}")`);
        parlamentaresNaoEncontrados.add(nomeNormalizado);
        naoEncontrados++;
      }
    }
    
    console.log('\n📈 RESUMO DA MIGRAÇÃO:');
    console.log(`✅ OSCs atualizadas: ${atualizadas}`);
    console.log(`❌ Parlamentares não encontrados: ${naoEncontrados}`);
    
    if (parlamentaresNaoEncontrados.size > 0) {
      console.log('\n📝 Parlamentares que precisam ser adicionados à tabela:');
      Array.from(parlamentaresNaoEncontrados).sort().forEach(nome => {
        console.log(`   - ${nome}`);
      });
    }
    
    console.log('\n🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Conexão com MongoDB encerrada');
  }
}

/**
 * Função auxiliar para adicionar parlamentares faltantes
 */
async function adicionarParlamentaresFaltantes(nomes: string[]) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const parlamentaresCollection = db.collection('parlamentares');
    
    const novosParlamentares = nomes.map(nome => ({
      nome: nome,
      nomeNormalizado: nome,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    if (novosParlamentares.length > 0) {
      const result = await parlamentaresCollection.insertMany(novosParlamentares);
      console.log(`✅ Adicionados ${result.insertedCount} novos parlamentares`);
      
      // Retornar para poder usar na migração
      return result.insertedIds;
    }
  } catch (error) {
    console.error('❌ Erro ao adicionar parlamentares:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Executar migração
migrateOSCs()
  .then(() => {
    console.log('✅ Script concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falhou:', error);
    process.exit(1);
  });

export { migrateOSCs, adicionarParlamentaresFaltantes };
