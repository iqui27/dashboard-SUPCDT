import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
// Carregar variáveis de ambiente
dotenv.config();
async function findAllProjectData() {
    console.log('🔍 Procurando dados de projetos em todas as collections...');
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
    try {
        await client.connect();
        const db = client.db('secti-dashboard');
        const collections = await db.listCollections().toArray();
        console.log('\n📋 Verificando cada collection por dados de projetos:');
        for (const collection of collections) {
            const coll = db.collection(collection.name);
            const count = await coll.countDocuments();
            console.log(`\n📊 Collection: ${collection.name} (${count} documentos)`);
            if (count > 0) {
                // Verificar se tem campos de projeto
                const hasProjectFields = await coll.findOne({
                    $or: [
                        { projeto: { $exists: true } },
                        { statusProjeto: { $exists: true } },
                        { processoSEI: { $exists: true } }
                    ]
                });
                if (hasProjectFields) {
                    console.log(`   ✅ Contém dados de projetos!`);
                    // Mostrar status distintos
                    try {
                        const statusValues = await coll.distinct('statusProjeto');
                        console.log(`   📋 Status encontrados: ${statusValues.length}`);
                        for (let i = 0; i < statusValues.length; i++) {
                            const status = statusValues[i];
                            const statusCount = await coll.countDocuments({ statusProjeto: status });
                            console.log(`     ${i + 1}. "${status}" (${statusCount} docs)`);
                            // Se encontrar "Não assinado", mostrar exemplos
                            if (status && status.toString().toLowerCase().includes('não')) {
                                const exemplos = await coll.find({ statusProjeto: status }).limit(3).toArray();
                                console.log(`        💡 Exemplos com "${status}":`);
                                exemplos.forEach((doc, exIndex) => {
                                    console.log(`          ${exIndex + 1}. "${doc.projeto}" (ID: ${doc._id})`);
                                });
                            }
                        }
                    }
                    catch (error) {
                        console.log(`   ⚠️  Erro ao buscar status: ${error.message}`);
                    }
                    // Mostrar alguns exemplos
                    const samples = await coll.find({}).limit(2).toArray();
                    console.log(`   📋 Amostras:`);
                    samples.forEach((doc, index) => {
                        console.log(`     ${index + 1}. Projeto: "${doc.projeto || 'N/A'}", Status: "${doc.statusProjeto || 'N/A'}"`);
                    });
                }
                else {
                    console.log(`   ❌ Não contém dados de projetos`);
                }
            }
        }
    }
    catch (error) {
        console.error('❌ Erro:', error);
    }
    finally {
        await client.close();
    }
}
// Executar a função
findAllProjectData().catch(console.error);
