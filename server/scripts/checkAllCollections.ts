import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function checkAllCollections() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db: Db = client.db('secti_dashboard');
    
    console.log('🔍 Verificando todas as collections no banco de dados...');
    
    // Listar todas as collections
    const collections = await db.listCollections().toArray();
    console.log(`📋 Collections encontradas: ${collections.length}`);
    
    for (const collection of collections) {
      const collName = collection.name;
      const coll = db.collection(collName);
      const count = await coll.countDocuments();
      
      console.log(`\n📊 Collection: ${collName}`);
      console.log(`   Total de documentos: ${count}`);
      
      if (count > 0 && count <= 10) {
        // Mostrar primeiros documentos se não for muitos
        const samples = await coll.find({}).limit(3).toArray();
        console.log('   Amostras:');
        samples.forEach((doc, index) => {
          console.log(`     ${index + 1}.`, JSON.stringify(doc, null, 2).substring(0, 200) + '...');
        });
      } else if (count > 10) {
        // Mostrar apenas um exemplo se for muitos documentos
        const sample = await coll.findOne({});
        console.log('   Exemplo:', JSON.stringify(sample, null, 2).substring(0, 200) + '...');
      }
      
      // Verificar se tem campos de parlamentares
      if (count > 0) {
        const hasParlamentarField = await coll.findOne({ 
          $or: [
            { parlamentar: { $exists: true } },
            { emendasParlamentares: { $exists: true } },
            { 'emendasParlamentares.0.nome': { $exists: true } },
            { 'emendasParlamentares.0.parlamentarId': { $exists: true } }
          ]
        });
        
        if (hasParlamentarField) {
          console.log('   ⚠️  Contém dados de parlamentares');
          
          // Analisar estrutura dos campos de parlamentar
          const parlamentarSamples = await coll.find({
            $or: [
              { parlamentar: { $exists: true } },
              { emendasParlamentares: { $exists: true } }
            ]
          }).limit(5).toArray();
          
          console.log('   Estrutura dos dados de parlamentar:');
          parlamentarSamples.forEach((doc: any, index) => {
            console.log(`     ${index + 1}.`);
            if (doc.parlamentar) {
              console.log(`        parlamentar: "${doc.parlamentar}"`);
            }
            if (doc.emendasParlamentares && doc.emendasParlamentares.length > 0) {
              doc.emendasParlamentares.forEach((emenda: any, emendaIndex: number) => {
                console.log(`        emenda[${emendaIndex}]:`, JSON.stringify(emenda, null, 6).substring(0, 100) + '...');
              });
            }
          });
        }
      }
    }
    
    // Verificar especificamente a collection parlamentares
    const parlamentaresCollection = db.collection('parlamentares');
    const parlamentaresCount = await parlamentaresCollection.countDocuments();
    
    if (parlamentaresCount > 0) {
      console.log('\n👥 === PARLAMENTARES CADASTRADOS ===');
      const parlamentares = await parlamentaresCollection.find({}).toArray();
      parlamentares.forEach((p: any, index) => {
        console.log(`   ${index + 1}. ${p.nome} (${p.nomeNormalizado})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar collections:', error);
  } finally {
    await client.close();
  }
}

// Executar a função
checkAllCollections().catch(console.error);
