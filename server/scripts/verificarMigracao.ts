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
  updatedAt?: Date;
}

/**
 * Script para verificar o status final da migração
 */
async function verificarMigracao() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('📋 Buscando parlamentares...');
    const parlamentaresCollection = db.collection('parlamentares');
    const parlamentares = await parlamentaresCollection.find({}).toArray();
    
    console.log(`✅ Encontrados ${parlamentares.length} parlamentares no banco`);
    console.log('📝 Lista de parlamentares:');
    parlamentares.forEach((p: any) => {
      console.log(`   - ${p.nome} (${p._id})`);
    });
    
    console.log('\n📋 Verificando OSCs migradas...');
    const oscsCollection = db.collection('oscs');
    const oscs = await oscsCollection.find({}).toArray() as OSC[];
    
    console.log(`📊 Total de OSCs: ${oscs.length}`);
    
    let comParlamentarId = 0;
    let comMultiplos = 0;
    let semParlamentar = 0;
    
    const parlamentaresCount = new Map<string, number>();
    
    for (const osc of oscs) {
      if (osc.parlamentarId) {
        comParlamentarId++;
        
        // Contar parlamentares referenciados
        if (osc.parlamentaresMultiplos && osc.parlamentaresMultiplos.length > 1) {
          comMultiplos++;
          osc.parlamentaresMultiplos.forEach(id => {
            const count = parlamentaresCount.get(id) || 0;
            parlamentaresCount.set(id, count + 1);
          });
        } else {
          const count = parlamentaresCount.get(osc.parlamentarId) || 0;
          parlamentaresCount.set(osc.parlamentarId, count + 1);
        }
      } else if (!osc.parlamentar || osc.parlamentar.trim() === '') {
        semParlamentar++;
      }
    }
    
    console.log('\n📈 ESTATÍSTICAS:');
    console.log(`✅ OSCs com parlamentarId: ${comParlamentarId}`);
    console.log(`📊 OSCs com múltiplos parlamentares: ${comMultiplos}`);
    console.log(`⚪  OSCs sem parlamentar: ${semParlamentar}`);
    
    console.log('\n📊 CONTAGEM POR PARLAMENTAR:');
    const sortedParlamentares = Array.from(parlamentaresCount.entries())
      .sort((a, b) => b[1] - a[1]);
    
    for (const [parlamentarId, count] of sortedParlamentares) {
      const parlamentar = parlamentares.find((p: any) => p._id.toString() === parlamentarId);
      if (parlamentar) {
        console.log(`   - ${(parlamentar as any).nome}: ${count} OSCs`);
      }
    }
    
    console.log('\n🔍 EXEMPLOS DE OSCs ATUALIZADAS:');
    const exemplos = oscs
      .filter(osc => osc.parlamentarId)
      .slice(0, 5);
    
    for (const osc of exemplos) {
      console.log(`\n📄 OSC: ${osc.nome || 'sem nome'}`);
      console.log(`   Parlamentar original: ${osc.parlamentar}`);
      console.log(`   Parlamentar normalizado: ${osc.parlamentarNormalizado}`);
      console.log(`   Parlamentar ID: ${osc.parlamentarId}`);
      
      if (osc.parlamentaresMultiplos && osc.parlamentaresMultiplos.length > 1) {
        console.log(`   Múltiplos parlamentares:`);
        osc.parlamentaresMultiplosNomes?.forEach((nome, index) => {
          console.log(`     - ${nome} (${osc.parlamentaresMultiplos?.[index]})`);
        });
      }
    }
    
    console.log('\n🎉 Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Conexão com MongoDB encerrada');
  }
}

// Executar script
verificarMigracao()
  .then(() => {
    console.log('✅ Script concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falhou:', error);
    process.exit(1);
  });
