import { MongoClient, Db } from 'mongodb';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function checkAllDatabases() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  
  try {
    await client.connect();
    
    console.log('🔍 Verificando todos os bancos de dados disponíveis...');
    
    // Listar todos os bancos de dados
    const admin = client.db().admin();
    const databases = await admin.listDatabases();
    
    console.log(`📋 Bancos de dados encontrados: ${databases.databases.length}`);
    
    for (const dbInfo of databases.databases) {
      const dbName = dbInfo.name;
      const sizeOnDisk = dbInfo.sizeOnDisk ? Math.round(dbInfo.sizeOnDisk / 1024 / 1024) : 0;
      console.log(`\n🗄️  Banco: ${dbName} (tamanho: ${sizeOnDisk}MB)`);
      
      // Pular bancos do sistema
      if (['admin', 'config', 'local'].includes(dbName)) {
        console.log('   ⚙️  Banco do sistema - pulando...');
        continue;
      }
      
      const db: Db = client.db(dbName);
      
      // Listar collections do banco
      const collections = await db.listCollections().toArray();
      console.log(`   📋 Collections: ${collections.length}`);
      
      for (const collection of collections) {
        const collName = collection.name;
        const coll = db.collection(collName);
        const count = await coll.countDocuments();
        
        console.log(`      • ${collName}: ${count} documentos`);
        
        // Verificar se é a collection custom_projects
        if (collName === 'custom_projects' && count > 0) {
          console.log(`         🎯 ENCONTRADO! custom_projects com ${count} documentos`);
          
          // Mostrar amostra dos dados
          const samples = await coll.find({}).limit(2).toArray();
          
          console.log('         📋 Amostra dos dados:');
          samples.forEach((doc: any, index) => {
            console.log(`           ${index + 1}. Projeto: ${doc.projeto || 'Sem nome'}`);
            console.log(`              Processo: ${doc.processoSEI || 'Sem processo'}`);
            
            if (doc.emendasParlamentares && doc.emendasParlamentares.length > 0) {
              console.log(`              Emendas parlamentares: ${doc.emendasParlamentares.length}`);
              
              doc.emendasParlamentares.forEach((emenda: any, emendaIndex: number) => {
                console.log(`                ${emendaIndex + 1}.`, JSON.stringify(emenda, null, 8).substring(0, 150) + '...');
              });
            }
            
            if (doc.parlamentar) {
              console.log(`              Parlamentar (campo antigo): "${doc.parlamentar}"`);
            }
          });
          
          // Verificar estrutura das emendas
          console.log('         🔍 Análise da estrutura das emendas:');
          const emendasAnalysis = await coll.aggregate([
            { $unwind: '$emendasParlamentares' },
            { 
              $group: {
                _id: null,
                totalEmendas: { $sum: 1 },
                comNome: { 
                  $sum: { 
                    $cond: [{ $and: [{ $exists: '$emendasParlamentares.nome' }, { $ne: '$emendasParlamentares.nome' }] }, 1, 0] 
                  } 
                },
                comParlamentarId: { 
                  $sum: { 
                    $cond: [{ $and: [{ $exists: '$emendasParlamentares.parlamentarId' }, { $ne: '$emendasParlamentares.parlamentarId' }] }, 1, 0] 
                  } 
                }
              }
            }
          ]).toArray();
          
          if (emendasAnalysis.length > 0) {
            const analysis = emendasAnalysis[0];
            console.log(`           Total de emendas: ${analysis.totalEmendas}`);
            console.log(`           Com campo "nome": ${analysis.comNome}`);
            console.log(`           Com campo "parlamentarId": ${analysis.comParlamentarId}`);
            
            if (analysis.comNome > 0 && analysis.comParlamentarId === 0) {
              console.log('           ⚠️  Usa formato antigo (apenas nome)');
            } else if (analysis.comParlamentarId > 0 && analysis.comNome === 0) {
              console.log('           ✅ Usa formato novo (apenas parlamentarId)');
            } else if (analysis.comNome > 0 && analysis.comParlamentarId > 0) {
              console.log('           🔄 Formato misto (nome e parlamentarId)');
            }
          }
        }
        
        // Verificar se tem parlamentares
        if (collName === 'parlamentares' && count > 0) {
          console.log(`         👥 Parlamentares: ${count} cadastrados`);
          
          const parlamentares = await coll.find({}).limit(5).toArray();
          console.log('         📋 Amostra dos parlamentares:');
          parlamentares.forEach((p: any, index) => {
            console.log(`           ${index + 1}. ${p.nome} (${p.nomeNormalizado})`);
          });
        }
      }
    }
    
    // Verificar especificamente o banco que estamos usando no código
    console.log('\n🎯 === BANCO ATUAL DO CÓDIGO ===');
    const currentDb = client.db('secti_dashboard');
    const currentCollections = await currentDb.listCollections().toArray();
    
    console.log(`Banco: secti_dashboard`);
    console.log(`Collections: ${currentCollections.length}`);
    
    for (const collection of currentCollections) {
      const count = await currentDb.collection(collection.name).countDocuments();
      console.log(`  • ${collection.name}: ${count} documentos`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar bancos:', error);
  } finally {
    await client.close();
  }
}

// Executar a função
checkAllDatabases().catch(console.error);
