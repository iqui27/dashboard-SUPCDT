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
  parlamentaresMultiplos?: string[];
  parlamentaresMultiplosNomes?: string[];
  [key: string]: any;
}

/**
 * Script para dividir OSCs com múltiplos parlamentares em linhas separadas
 */
async function dividirOSCsMultiplas() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('📋 Buscando OSCs com múltiplos parlamentares...');
    const oscsCollection = db.collection('oscs');
    
    // Buscar OSCs que têm múltiplos parlamentares
    const oscsMultiplas = await oscsCollection.find({
      parlamentaresMultiplos: { $exists: true, $ne: [] }
    }).toArray() as OSC[];
    
    console.log(`📊 Encontradas ${oscsMultiplas.length} OSCs com múltiplos parlamentares`);
    
    if (oscsMultiplas.length === 0) {
      console.log('✅ Nenhuma OSC com múltiplos parlamentares encontrada');
      return;
    }
    
    let criadas = 0;
    
    for (const oscOriginal of oscsMultiplas) {
      if (!oscOriginal.parlamentaresMultiplos || !oscOriginal.parlamentaresMultiplosNomes) {
        console.log(`⚠️  OSC sem dados de múltiplos parlamentares: ${oscOriginal.nome}`);
        continue;
      }
      
      console.log(`\n🔄 Processando OSC: ${oscOriginal.nome}`);
      console.log(`   Parlamentares: ${oscOriginal.parlamentaresMultiplosNomes.join(', ')}`);
      
      // Criar novas OSCs para cada parlamentar adicional (exceto o primeiro que já existe)
      const parlamentaresAdicionais = oscOriginal.parlamentaresMultiplos.slice(1);
      const nomesAdicionais = oscOriginal.parlamentaresMultiplosNomes.slice(1);
      
      const novasOSCs = [];
      
      for (let i = 0; i < parlamentaresAdicionais.length; i++) {
        const parlamentarId = parlamentaresAdicionais[i];
        const parlamentarNome = nomesAdicionais[i];
        
        // Criar cópia da OSC com o parlamentar específico
        const novaOSC: any = {
          ...oscOriginal,
          _id: new ObjectId(), // Novo ID
          parlamentarId: parlamentarId,
          parlamentarNormalizado: parlamentarNome,
          parlamentar: parlamentarNome, // Atualizar campo original também
          // Remover campos de múltiplos parlamentares
          parlamentaresMultiplos: undefined,
          parlamentaresMultiplosNomes: undefined,
          // Adicionar timestamp
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Remover o _id original para não duplicar
        delete novaOSC._id;
        
        novasOSCs.push(novaOSC);
      }
      
      // Inserir novas OSCs
      if (novasOSCs.length > 0) {
        const resultado = await oscsCollection.insertMany(novasOSCs);
        console.log(`   ✅ Criadas ${resultado.insertedCount} novas OSCs`);
        criadas += resultado.insertedCount;
        
        // Atualizar OSC original para manter apenas o primeiro parlamentar
        await oscsCollection.updateOne(
          { _id: oscOriginal._id },
          {
            $set: {
              parlamentarId: oscOriginal.parlamentaresMultiplos[0],
              parlamentarNormalizado: oscOriginal.parlamentaresMultiplosNomes[0],
              parlamentar: oscOriginal.parlamentaresMultiplosNomes[0],
              parlamentaresMultiplos: undefined,
              parlamentaresMultiplosNomes: undefined,
              updatedAt: new Date()
            }
          }
        );
        console.log(`   🔄 OSC original atualizada para: ${oscOriginal.parlamentaresMultiplosNomes[0]}`);
      }
    }
    
    console.log('\n📈 RESUMO DA OPERAÇÃO:');
    console.log(`✅ Novas OSCs criadas: ${criadas}`);
    console.log(`🔄 OSCs originais atualizadas: ${oscsMultiplas.length}`);
    
    // Verificar resultado final
    const totalOSCs = await oscsCollection.countDocuments();
    const oscsComMultiplas = await oscsCollection.countDocuments({
      parlamentaresMultiplos: { $exists: true, $ne: [] }
    });
    
    console.log(`📊 Total de OSCs no banco: ${totalOSCs}`);
    console.log(`📊 OSCs ainda com múltiplos parlamentares: ${oscsComMultiplas}`);
    
    console.log('\n🎉 Divisão concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a divisão:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Conexão com MongoDB encerrada');
  }
}

/**
 * Função para verificar como ficaram as OSCs após a divisão
 */
async function verificarDivisao() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('📋 Verificando resultado da divisão...');
    const oscsCollection = db.collection('oscs');
    
    // Agrupar por nome original para ver quais foram divididas
    const oscsAgrupadas = await oscsCollection.aggregate([
      {
        $group: {
          _id: '$nome',
          count: { $sum: 1 },
          parlamentares: { $push: '$parlamentarNormalizado' },
          exemplos: { $push: { _id: '$_id', parlamentar: '$parlamentarNormalizado' } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();
    
    console.log(`📊 Encontradas ${oscsAgrupadas.length} OSCs que foram divididas:\n`);
    
    for (const grupo of oscsAgrupadas) {
      console.log(`📄 ${grupo._id || 'sem nome'} (${grupo.count} registros):`);
      grupo.parlamentares.forEach((p: any, index: number) => {
        console.log(`   ${index + 1}. ${p}`);
      });
      console.log('');
    }
    
    // Estatísticas finais
    const totalOSCs = await oscsCollection.countDocuments();
    const parlamentaresCount = await oscsCollection.aggregate([
      {
        $group: {
          _id: '$parlamentarNormalizado',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();
    
    console.log('📊 Distribuição final por parlamentar:');
    parlamentaresCount.forEach((p: any) => {
      console.log(`   - ${p._id}: ${p.count} OSCs`);
    });
    
    console.log(`\n📈 Total final: ${totalOSCs} OSCs`);
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Conexão com MongoDB encerrada');
  }
}

// Executar divisão
dividirOSCsMultiplas()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    return verificarDivisao();
  })
  .then(() => {
    console.log('✅ Scripts concluídos');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falhou:', error);
    process.exit(1);
  });
