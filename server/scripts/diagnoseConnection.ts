import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function diagnoseConnection() {
  console.log('🔍 Diagnosticando conexão com MongoDB...');
  console.log(`URI: ${process.env.MONGODB_URI?.substring(0, 50)}...`);
  
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('✅ Conectado ao MongoDB com sucesso!');
    
    // Listar databases
    const admin = client.db().admin();
    const databases = await admin.listDatabases();
    
    console.log('\n📋 Databases disponíveis:');
    databases.databases.forEach((db, index) => {
      console.log(`   ${index + 1}. ${db.name} (${Math.round((db.sizeOnDisk || 0) / 1024 / 1024)}MB)`);
    });
    
    // Verificar a database secti-dashboard
    const db = client.db('secti_dashboard');
    const collections = await db.listCollections().toArray();
    
    console.log('\n📋 Collections em secti-dashboard:');
    collections.forEach((coll, index) => {
      console.log(`   ${index + 1}. ${coll.name}`);
    });
    
    // Verificar custom_projects
    const customProjects = db.collection('custom_projects');
    const count = await customProjects.countDocuments();
    console.log(`\n📊 Documentos em custom_projects: ${count}`);
    
    if (count > 0) {
      const sample = await customProjects.findOne({});
      console.log('\n📋 Amostra de um documento:');
      console.log(JSON.stringify(sample, null, 2).substring(0, 500) + '...');
      
      // Verificar o campo statusProjeto especificamente
      const statusValues = await customProjects.distinct('statusProjeto');
      console.log(`\n📋 Valores distintos em statusProjeto: ${statusValues.length}`);
      statusValues.forEach((status, index) => {
        console.log(`   ${index + 1}. "${status}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error);
  } finally {
    await client.close();
  }
}

// Executar a função
diagnoseConnection().catch(console.error);
