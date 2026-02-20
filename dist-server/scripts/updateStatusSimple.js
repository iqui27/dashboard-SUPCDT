import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
// Carregar variáveis de ambiente
dotenv.config();
async function updateStatusProjects() {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
    try {
        await client.connect();
        const db = client.db('secti_dashboard');
        console.log('🔍 Atualizando status dos projetos de "Não assinado" para "Em Andamento" na collection custom_projects...');
        const coll = db.collection('custom_projects');
        // Verificar todos os status distintos
        const distinctStatus = await coll.distinct('statusProjeto');
        console.log('\n📋 Status encontrados antes da atualização:');
        distinctStatus.forEach((status, index) => {
            console.log(`   ${index + 1}. "${status}"`);
        });
        // Contar documentos por status
        console.log('\n📊 Contagem por status antes da atualização:');
        for (const status of distinctStatus) {
            const count = await coll.countDocuments({ statusProjeto: status });
            console.log(`   "${status}": ${count} documentos`);
        }
        // Verificar especificamente "Não assinado"
        const naoAssinadosCount = await coll.countDocuments({
            statusProjeto: 'Não assinado'
        });
        console.log(`\n📊 Documentos com status "Não assinado": ${naoAssinadosCount}`);
        if (naoAssinadosCount > 0) {
            // Mostrar alguns exemplos antes da atualização
            const exemplos = await coll.find({ statusProjeto: 'Não assinado' }).limit(5).toArray();
            console.log('\n💡 Exemplos antes da atualização:');
            exemplos.forEach((doc, index) => {
                console.log(`   ${index + 1}. ID: ${doc._id}, Projeto: "${doc.projeto}", Status: "${doc.statusProjeto}"`);
            });
            // Atualizar todos os documentos
            const resultado = await coll.updateMany({ statusProjeto: 'Não assinado' }, { $set: { statusProjeto: 'Em Andamento' } });
            console.log(`\n✅ Atualizados: ${resultado.modifiedCount} documentos`);
            // Verificar a atualização mostrando alguns exemplos depois
            const exemplosDepois = await coll.find({ statusProjeto: 'Em Andamento' }).limit(5).toArray();
            console.log('\n💡 Exemplos depois da atualização:');
            exemplosDepois.forEach((doc, index) => {
                console.log(`   ${index + 1}. ID: ${doc._id}, Projeto: "${doc.projeto}", Status: "${doc.statusProjeto}"`);
            });
        }
        // Verificar também se há algum campo com variação de escrita
        console.log('\n🔍 Verificando variações de escrita...');
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
                const resultado = await coll.updateMany({ statusProjeto: variacao }, { $set: { statusProjeto: 'Em Andamento' } });
                console.log(`   ✅ Atualizados: ${resultado.modifiedCount} documentos`);
            }
        }
        // Verificar o total final
        console.log('\n📊 Contagem por status depois da atualização:');
        const distinctStatusAfter = await coll.distinct('statusProjeto');
        for (const status of distinctStatusAfter) {
            const count = await coll.countDocuments({ statusProjeto: status });
            console.log(`   "${status}": ${count} documentos`);
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
updateStatusProjects().catch(console.error);
