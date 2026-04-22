import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function checkCurrentStatus() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db: Db = client.db('secti_dashboard');
    
    console.log('🔍 Verificando status atuais na collection custom_projects...');
    
    const coll = db.collection('custom_projects');
    
    // Contar total de documentos
    const totalCount = await coll.countDocuments();
    console.log(`📊 Total de documentos: ${totalCount}`);
    
    if (totalCount > 0) {
      // Buscar todos os status distintos
      const distinctStatus = await coll.distinct('statusProjeto');
      console.log('\n📋 Status encontrados:');
      distinctStatus.forEach((status, index) => {
        console.log(`   ${index + 1}. "${status}"`);
      });
      
      // Contar documentos por status
      console.log('\n📊 Contagem por status:');
      for (const status of distinctStatus) {
        const count = await coll.countDocuments({ statusProjeto: status });
        console.log(`   "${status}": ${count} documentos`);
        
        // Mostrar alguns exemplos de cada status
        if (count > 0) {
          const exemplos = await coll.find({ statusProjeto: status }).limit(3).toArray();
          console.log(`     Exemplos:`);
          exemplos.forEach((doc: any, index) => {
            console.log(`       ${index + 1}. ID: ${doc._id}, Projeto: "${doc.projeto}"`);
          });
        }
      }
      
      // Verificar se há outros campos relacionados a status
      console.log('\n🔍 Verificando outros campos relacionados a status...');
      const sampleDoc = await coll.findOne({});
      if (sampleDoc) {
        const statusRelatedFields = Object.keys(sampleDoc).filter(key => 
          key.toLowerCase().includes('status') || 
          key.toLowerCase().includes('situacao') ||
          key.toLowerCase().includes('etapa')
        );
        console.log('Campos relacionados a status encontrados:');
        statusRelatedFields.forEach(field => {
          console.log(`   - ${field}: "${sampleDoc[field]}"`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar documentos:', error);
  } finally {
    await client.close();
  }
}

// Executar a função
checkCurrentStatus().catch(console.error);
