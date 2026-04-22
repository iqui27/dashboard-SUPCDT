import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function updateNumeroTermoFomento() {
  console.log('🔍 Atualizando numeroTermoFomento de "Não assinado" para "Em Andamento"...');
  
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db: Db = client.db('secti-dashboard');
    const coll = db.collection('custom_projects');
    
    // Verificar documentos com numeroTermoFomento "Não assinado"
    const naoAssinadoVariations = ['Não assinado', 'Não Assinado', 'nao assinado', 'Nao assinado'];
    
    let totalAtualizados = 0;
    
    for (const variacao of naoAssinadoVariations) {
      const count = await coll.countDocuments({ 
        numeroTermoFomento: variacao 
      });
      
      console.log(`\n📊 Documentos com numeroTermoFomento "${variacao}": ${count}`);
      
      if (count > 0) {
        // Mostrar exemplos antes
        console.log('💡 Exemplos antes da atualização:');
        const exemplosAntes = await coll.find({ numeroTermoFomento: variacao }).limit(3).toArray();
        exemplosAntes.forEach((doc: any, index) => {
          console.log(`   ${index + 1}. "${doc.projeto}" - numeroTermoFomento: "${doc.numeroTermoFomento}" - Status: "${doc.statusProjeto}"`);
        });
        
        // Atualizar todos os documentos
        const resultado = await coll.updateMany(
          { numeroTermoFomento: variacao },
          { $set: { numeroTermoFomento: 'Em Andamento' } }
        );
        
        console.log(`✅ Atualizados: ${resultado.modifiedCount} documentos`);
        totalAtualizados += resultado.modifiedCount;
        
        // Mostrar exemplos depois
        console.log('💡 Exemplos depois da atualização:');
        const exemplosDepois = await coll.find({ 
          numeroTermoFomento: 'Em Andamento',
          projeto: { $in: exemplosAntes.map((d: any) => d.projeto) }
        }).toArray();
        
        exemplosDepois.forEach((doc: any, index) => {
          console.log(`   ${index + 1}. "${doc.projeto}" - numeroTermoFomento: "${doc.numeroTermoFomento}" - Status: "${doc.statusProjeto}"`);
        });
      }
    }
    
    // Verificar também documentos que foram atualizados no status mas ainda têm numeroTermoFomento antigo
    console.log('\n🔍 Verificando documentos com status "Em andamento" mas numeroTermoFomento antigo...');
    
    const emAndamentoComNumeroAntigo = await coll.find({
      statusProjeto: 'Em andamento',
      numeroTermoFomento: { $in: naoAssinadoVariations }
    }).toArray();
    
    if (emAndamentoComNumeroAntigo.length > 0) {
      console.log(`📊 Encontrados ${emAndamentoComNumeroAntigo.length} documentos com status "Em andamento" mas numeroTermoFomento antigo`);
      
      for (const doc of emAndamentoComNumeroAntigo) {
        console.log(`   "${doc.projeto}" - numeroTermoFomento: "${doc.numeroTermoFomento}"`);
      }
      
      // Atualizar esses também
      const resultado = await coll.updateMany(
        {
          statusProjeto: 'Em andamento',
          numeroTermoFomento: { $in: naoAssinadoVariations }
        },
        { $set: { numeroTermoFomento: 'Em Andamento' } }
      );
      
      console.log(`✅ Atualizados adicionais: ${resultado.modifiedCount} documentos`);
      totalAtualizados += resultado.modifiedCount;
    }
    
    // Mostrar resumo final
    console.log('\n📊 Resumo final dos numeroTermoFomento:');
    const distinctValues = await coll.distinct('numeroTermoFomento');
    
    for (let i = 0; i < distinctValues.length; i++) {
      const value = distinctValues[i];
      const count = await coll.countDocuments({ numeroTermoFomento: value });
      if (count > 0) {
        console.log(`   "${value}": ${count} documentos`);
      }
    }
    
    console.log(`\n✅ Total de documentos atualizados: ${totalAtualizados}`);
    console.log('✅ Atualização concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar documentos:', error);
  } finally {
    await client.close();
  }
}

// Executar a função
updateNumeroTermoFomento().catch(console.error);
