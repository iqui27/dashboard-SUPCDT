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
  parlamentarNormalizado?: string;
  [key: string]: any;
}

/**
 * Script para separar múltiplos parlamentares e criar referências individuais
 */
async function separarParlamentaresMultiplos() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Mapeamento para separar e normalizar múltiplos parlamentares
    const separacoes: Record<string, string[]> = {
      "iolando, manzoni , martins machado": ["Iolando", "Thiago Manzoni", "Martins Machado"],
      "pastor daniel /jaquelina": ["Pastor Daniel de Castro", "Jaqueline Silva"],
      "Joaquim Roriz Neto, Lolando": ["Joaquim Roriz Neto", "Iolando"],
      "martins e iolando": ["Martins Machado", "Iolando"],
      "Jaqueline Silva e lolano": ["Jaqueline Silva", "Iolando"]
    };
    
    console.log('📋 Buscando parlamentares para criar mapa de referências...');
    const parlamentaresCollection = db.collection('parlamentares');
    const parlamentares = await parlamentaresCollection.find({}).toArray();
    
    // Criar mapa de nome para ObjectId
    const nomeParaId = new Map<string, string>();
    parlamentares.forEach((p: any) => {
      nomeParaId.set(p.nome.toLowerCase(), p._id.toString());
      nomeParaId.set(p.nomeNormalizado?.toLowerCase() || p.nome.toLowerCase(), p._id.toString());
    });
    
    console.log(`✅ Encontrados ${parlamentares.length} parlamentares no banco`);
    
    console.log('📋 Processando OSCs com múltiplos parlamentares...');
    const oscsCollection = db.collection('oscs');
    
    let atualizadas = 0;
    let naoEncontrados = 0;
    
    for (const [combinado, separados] of Object.entries(separacoes)) {
      console.log(`\n🔄 Processando: "${combinado}"`);
      
      // Buscar OSCs com este parlamentar combinado
      const oscs = await oscsCollection.find({ 
        parlamentar: { $regex: new RegExp(combinado, 'i') }
      }).toArray() as OSC[];
      
      console.log(`📊 Encontradas ${oscs.length} OSCs`);
      
      for (const osc of oscs) {
        // Para cada parlamentar separado, buscar seu ID
        const idsEncontrados: string[] = [];
        const nomesNaoEncontrados: string[] = [];
        
        for (const nome of separados) {
          const id = nomeParaId.get(nome.toLowerCase());
          if (id) {
            idsEncontrados.push(id);
          } else {
            nomesNaoEncontrados.push(nome);
          }
        }
        
        if (idsEncontrados.length > 0) {
          // Atualizar OSC com o primeiro parlamentar encontrado
          // (ou poderíamos criar múltiplas referências se necessário)
          await oscsCollection.updateOne(
            { _id: osc._id },
            { 
              $set: { 
                parlamentarId: idsEncontrados[0],
                parlamentarNormalizado: separados[0],
                parlamentaresMultiplos: idsEncontrados, // Guardar todos os IDs
                parlamentaresMultiplosNomes: separados, // Guardar todos os nomes
                updatedAt: new Date()
              }
            }
          );
          
          console.log(`✅ OSC "${osc.nome}" atualizada: ${combinado} → ${separados[0]} (${idsEncontrados[0]})`);
          
          if (idsEncontrados.length > 1) {
            console.log(`   📝 Também referenciados: ${idsEncontrados.slice(1).join(', ')}`);
          }
          
          atualizadas++;
        } else {
          console.log(`❌ Nenhum parlamentar encontrado para: ${separados.join(', ')}`);
          naoEncontrados++;
        }
      }
    }
    
    console.log('\n📈 RESUMO:');
    console.log(`✅ OSCs atualizadas: ${atualizadas}`);
    console.log(`❌ Não processadas: ${naoEncontrados}`);
    console.log('\n🎉 Processamento concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o processamento:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Conexão com MongoDB encerrada');
  }
}

// Executar script
separarParlamentaresMultiplos()
  .then(() => {
    console.log('✅ Script concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falhou:', error);
    process.exit(1);
  });
