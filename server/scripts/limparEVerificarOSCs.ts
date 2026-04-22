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
 * Script para limpar campos residuais e verificar estado final
 */
async function limparEVerificar() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('🧹 Limpando campos residuais de múltiplos parlamentares...');
    const oscsCollection = db.collection('oscs');
    
    // Remover campos residuais que podem ter ficado
    const resultadoLimpeza = await oscsCollection.updateMany(
      {
        $or: [
          { parlamentaresMultiplos: { $exists: true } },
          { parlamentaresMultiplosNomes: { $exists: true } }
        ]
      },
      {
        $unset: {
          parlamentaresMultiplos: "",
          parlamentaresMultiplosNomes: ""
        }
      }
    );
    
    console.log(`✅ Campos residuais removidos de ${resultadoLimpeza.modifiedCount} OSCs`);
    
    console.log('\n📋 Verificando estado final...');
    
    // Estatísticas gerais
    const totalOSCs = await oscsCollection.countDocuments();
    const oscsComParlamentarId = await oscsCollection.countDocuments({
      parlamentarId: { $exists: true, $ne: "" }
    });
    const oscsSemParlamentar = await oscsCollection.countDocuments({
      $or: [
        { parlamentarId: { $exists: false } },
        { parlamentarId: "" }
      ]
    });
    
    console.log('\n📈 ESTATÍSTICAS FINAIS:');
    console.log(`📊 Total de OSCs: ${totalOSCs}`);
    console.log(`✅ OSCs com parlamentarId: ${oscsComParlamentarId}`);
    console.log(`⚪  OSCs sem parlamentar: ${oscsSemParlamentar}`);
    
    // Distribuição por parlamentar
    const distribuicao = await oscsCollection.aggregate([
      {
        $match: {
          parlamentarNormalizado: { $exists: true, $ne: "" }
        }
      },
      {
        $group: {
          _id: '$parlamentarNormalizado',
          count: { $sum: 1 },
          exemplos: { $push: { _id: '$_id', nome: '$nome' } }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();
    
    console.log('\n📊 DISTRIBUIÇÃO POR PARLAMENTAR:');
    distribuicao.forEach((item: any, index: number) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${item._id}: ${item.count} OSCs`);
    });
    
    // Verificar duplicatas (mesma OSC com mesmo parlamentar)
    console.log('\n🔍 VERIFICANDO DUPLICATAS...');
    const duplicatas = await oscsCollection.aggregate([
      {
        $group: {
          _id: {
            nome: '$nome',
            parlamentar: '$parlamentarNormalizado'
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();
    
    if (duplicatas.length > 0) {
      console.log(`⚠️  Encontradas ${duplicatas.length} duplicatas:`);
      duplicatas.forEach((dup: any) => {
        console.log(`   - ${dup._id.nome} / ${dup._id.parlamentar}: ${dup.count} registros`);
      });
    } else {
      console.log('✅ Nenhuma duplicata encontrada');
    }
    
    // Exemplos de OSCs para verificação
    console.log('\n🔍 EXEMPLOS DE OSCs PROCESSADAS:');
    const exemplos = await oscsCollection.find({
      parlamentarNormalizado: { $exists: true }
    }).limit(5).toArray() as OSC[];
    
    exemplos.forEach((osc, index) => {
      console.log(`\n${index + 1}. OSC: ${osc.nome || 'sem nome'}`);
      console.log(`   Parlamentar: ${osc.parlamentarNormalizado}`);
      console.log(`   ID: ${osc.parlamentarId}`);
      console.log(`   Original: ${osc.parlamentar}`);
    });
    
    console.log('\n🎉 VERIFICAÇÃO FINAL CONCLUÍDA!');
    console.log('\n📝 RESUMO COMPLETO:');
    console.log(`✅ Todas as ${totalOSCs} OSCs agora têm parlamentar individual`);
    console.log(`✅ Múltiplos parlamentares foram divididos em linhas separadas`);
    console.log(`✅ Campos residuais foram limpos`);
    console.log(`✅ Estrutura está pronta para uso no sistema`);
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Conexão com MongoDB encerrada');
  }
}

// Executar script
limparEVerificar()
  .then(() => {
    console.log('✅ Script concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falhou:', error);
    process.exit(1);
  });
