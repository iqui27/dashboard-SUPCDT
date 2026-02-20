import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function updateStatusProjects() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db: Db = client.db('secti_dashboard');
    
    console.log('🔍 Atualizando status dos projetos de "Não assinado" para "Em Andamento" na collection custom_projects...');
    
    const coll = db.collection('custom_projects');
    
    // Verificar se há documentos com status "Não assinado"
    const naoAssinadosCount = await coll.countDocuments({ 
      statusProjeto: 'Não assinado' 
    });
    
    console.log(`📊 Documentos com status "Não assinado": ${naoAssinadosCount}`);
    
    if (naoAssinadosCount > 0) {
      // Mostrar alguns exemplos antes da atualização
      const exemplos = await coll.find({ statusProjeto: 'Não assinado' }).limit(5).toArray();
      console.log('   Exemplos antes da atualização:');
      exemplos.forEach((doc: any, index) => {
        console.log(`     ${index + 1}. ID: ${doc._id}, Projeto: "${doc.projeto}", Status: "${doc.statusProjeto}"`);
      });
      
      // Atualizar todos os documentos
      const resultado = await coll.updateMany(
        { statusProjeto: 'Não assinado' },
        { $set: { statusProjeto: 'Em Andamento' } }
      );
      
      console.log(`   ✅ Atualizados: ${resultado.modifiedCount} documentos`);
      
      // Verificar a atualização mostrando alguns exemplos depois
      const exemplosDepois = await coll.find({ statusProjeto: 'Em Andamento' }).limit(5).toArray();
      console.log('   Exemplos depois da atualização:');
      exemplosDepois.forEach((doc: any, index) => {
        console.log(`     ${index + 1}. ID: ${doc._id}, Projeto: "${doc.projeto}", Status: "${doc.statusProjeto}"`);
      });
    }
    
    // Verificar também se há algum campo com variação de escrita
    console.log('\n🔍 Verificando variações de escrita "Não assinados"...');
    
    const variacoes = [
      'Não assinados',
      'Nao assinado',
      'Nao assinados',
      'não assinado',
      'não assinados',
      'nao assinado',
      'nao assinados'
    ];
    
    for (const variacao of variacoes) {
      const count = await coll.countDocuments({ statusProjeto: variacao });
      if (count > 0) {
        console.log(`   Encontrados ${count} documentos com status "${variacao}"`);
        
        const resultado = await coll.updateMany(
          { statusProjeto: variacao },
          { $set: { statusProjeto: 'Em Andamento' } }
        );
        
        console.log(`   ✅ Atualizados: ${resultado.modifiedCount} documentos`);
      }
    }
    
    // Verificar o total final de documentos com "Em Andamento"
    const emAndamentoCount = await coll.countDocuments({ 
      statusProjeto: 'Em Andamento' 
    });
    
    console.log(`\n📊 Total final de documentos com status "Em Andamento": ${emAndamentoCount}`);
    console.log('\n✅ Atualização concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar documentos:', error);
  } finally {
    await client.close();
  }
}

// Executar a função
updateStatusProjects().catch(console.error);
