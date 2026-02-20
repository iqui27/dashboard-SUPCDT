import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
// Carregar variáveis de ambiente
dotenv.config();
async function checkStatusValues() {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
    try {
        await client.connect();
        const db = client.db('secti_dashboard');
        console.log('🔍 Verificando valores exatos do campo statusProjeto...');
        const coll = db.collection('custom_projects');
        // Buscar todos os documentos e mostrar os valores de statusProjeto
        const documents = await coll.find({}).toArray();
        console.log(`\n📊 Total de documentos: ${documents.length}`);
        const statusMap = new Map();
        console.log('\n📋 Status encontrados:');
        documents.forEach((doc, index) => {
            const status = doc.statusProjeto;
            console.log(`   Documento ${index + 1}: "${status}" (Projeto: "${doc.projeto}")`);
            if (status) {
                const currentCount = statusMap.get(status) || 0;
                statusMap.set(status, currentCount + 1);
            }
        });
        console.log('\n📊 Resumo dos status:');
        for (const [status, count] of statusMap.entries()) {
            console.log(`   "${status}": ${count} documentos`);
        }
        // Verificar se há algum status que contenha "não" ou "nao"
        console.log('\n🔍 Procurando status contendo "não" ou "nao":');
        for (const [status, count] of statusMap.entries()) {
            if (status && (status.toLowerCase().includes('não') || status.toLowerCase().includes('nao'))) {
                console.log(`   ENCONTRADO: "${status}" (${count} documentos)`);
                // Mostrar exemplos
                const exemplos = await coll.find({ statusProjeto: status }).limit(3).toArray();
                exemplos.forEach((doc, index) => {
                    console.log(`     ${index + 1}. ID: ${doc._id}, Projeto: "${doc.projeto}"`);
                });
            }
        }
    }
    catch (error) {
        console.error('❌ Erro ao verificar documentos:', error);
    }
    finally {
        await client.close();
    }
}
// Executar a função
checkStatusValues().catch(console.error);
