import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
// Carregar variáveis de ambiente
dotenv.config();
async function updateNaoAssinadoToEmAndamento() {
    console.log('🔍 Atualizando status de "Não assinado" para "Em Andamento"...');
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
    try {
        await client.connect();
        const db = client.db('secti-dashboard');
        const coll = db.collection('custom_projects');
        // Contar documentos com "Não assinado"
        const naoAssinadosCount = await coll.countDocuments({
            statusProjeto: 'Não assinado'
        });
        console.log(`📊 Documentos com status "Não assinado": ${naoAssinadosCount}`);
        if (naoAssinadosCount > 0) {
            // Mostrar exemplos antes
            console.log('\n💡 Exemplos antes da atualização:');
            const exemplosAntes = await coll.find({ statusProjeto: 'Não assinado' }).limit(5).toArray();
            exemplosAntes.forEach((doc, index) => {
                console.log(`   ${index + 1}. "${doc.projeto}" - Status: "${doc.statusProjeto}"`);
            });
            // Atualizar todos os documentos
            const resultado = await coll.updateMany({ statusProjeto: 'Não assinado' }, { $set: { statusProjeto: 'Em andamento' } });
            console.log(`\n✅ Atualizados: ${resultado.modifiedCount} documentos`);
            // Verificar resultado
            const emAndamentoCount = await coll.countDocuments({
                statusProjeto: 'Em andamento'
            });
            console.log(`📊 Total de documentos com "Em andamento" após atualização: ${emAndamentoCount}`);
            // Mostrar exemplos depois
            console.log('\n💡 Exemplos depois da atualização:');
            const exemplosDepois = await coll.find({ statusProjeto: 'Em andamento' }).limit(5).toArray();
            exemplosDepois.forEach((doc, index) => {
                console.log(`   ${index + 1}. "${doc.projeto}" - Status: "${doc.statusProjeto}"`);
            });
            // Mostrar resumo final
            console.log('\n📊 Resumo final dos status:');
            const distinctStatus = await coll.distinct('statusProjeto');
            for (const status of distinctStatus) {
                const count = await coll.countDocuments({ statusProjeto: status });
                console.log(`   "${status}": ${count} documentos`);
            }
        }
        else {
            console.log('❌ Nenhum documento com status "Não assinado" encontrado.');
        }
        console.log('\n✅ Atualização concluída com sucesso!');
    }
    catch (error) {
        console.error('❌ Erro ao atualizar documentos:', error);
    }
    finally {
        await client.close();
    }
}
// Executar a função
updateNaoAssinadoToEmAndamento().catch(console.error);
