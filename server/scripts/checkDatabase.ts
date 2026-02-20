import { getMongoClient } from '../db/client.js';

async function checkDatabase() {
  console.log('🔍 Verificando estrutura do banco de dados...');
  
  try {
    const client = await getMongoClient();
    const db = client.db('secti-dashboard');

    // Listar todas as coleções
    const collections = await db.listCollections().toArray();
    
    console.log(`\n📁 Coleções encontradas: ${collections.length}`);
    
    if (collections.length === 0) {
      console.log('   Nenhuma coleção encontrada. O banco está vazio.');
      return;
    }

    for (const collection of collections) {
      console.log(`\n📋 Coleção: ${collection.name}`);
      const coll = db.collection(collection.name);
      const count = await coll.countDocuments();
      console.log(`   Documentos: ${count}`);
      
      if (count > 0) {
        // Verificar campos de parlamentar em alguns documentos
        const samples = await coll.find({}).limit(2).toArray();
        
        const hasParlamentar = samples.some((doc: any) => doc.parlamentar !== undefined);
        const hasParlamentares = samples.some((doc: any) => doc.parlamentares !== undefined);
        const hasEmendas = samples.some((doc: any) => doc.emendasParlamentares !== undefined);
        
        console.log(`   Campos de parlamentar:`);
        console.log(`     - parlamentar: ${hasParlamentar ? '✅' : '❌'}`);
        console.log(`     - parlamentares: ${hasParlamentares ? '✅' : '❌'}`);
        console.log(`     - emendasParlamentares: ${hasEmendas ? '✅' : '❌'}`);
        
        // Mostrar estrutura de um documento
        if (samples.length > 0) {
          console.log(`   Estrutura de campos: ${Object.keys(samples[0]).sort().join(', ')}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error);
    process.exit(1);
  } finally {
    const client = await getMongoClient();
    await client.close();
  }
}

checkDatabase().catch(console.error);
