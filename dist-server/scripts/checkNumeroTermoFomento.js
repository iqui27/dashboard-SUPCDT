import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
// Carregar variáveis de ambiente
dotenv.config();
async function checkNumeroTermoFomento() {
    console.log('🔍 Verificando campo numeroTermoFomento nos documentos...');
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
    try {
        await client.connect();
        const db = client.db('secti-dashboard');
        const coll = db.collection('custom_projects');
        // Verificar se há documentos com numeroTermoFomento
        const hasNumeroTermo = await coll.findOne({
            numeroTermoFomento: { $exists: true, $ne: null }
        });
        if (hasNumeroTermo) {
            console.log('✅ Encontrados documentos com numeroTermoFomento');
            // Mostrar exemplos
            const exemplos = await coll.find({
                numeroTermoFomento: { $exists: true, $ne: null }
            }).limit(5).toArray();
            console.log('\n💡 Exemplos com numeroTermoFomento:');
            exemplos.forEach((doc, index) => {
                console.log(`   ${index + 1}. "${doc.projeto}" - numeroTermoFomento: "${doc.numeroTermoFomento}"`);
            });
            // Contar distinct values
            const distinctValues = await coll.distinct('numeroTermoFomento');
            console.log(`\n📋 Valores distintos em numeroTermoFomento: ${distinctValues.length}`);
            for (let i = 0; i < distinctValues.length; i++) {
                const value = distinctValues[i];
                const count = await coll.countDocuments({ numeroTermoFomento: value });
                console.log(`   ${i + 1}. "${value}" (${count} docs)`);
            }
        }
        else {
            console.log('❌ Nenhum documento com numeroTermoFomento encontrado');
        }
        // Verificar documentos com status "Não assinado" para ver se têm numeroTermoFomento
        const naoAssinados = await coll.find({
            statusProjeto: 'Não assinado'
        }).limit(5).toArray();
        console.log('\n📋 Documentos com status "Não assinado":');
        if (naoAssinados.length > 0) {
            naoAssinados.forEach((doc, index) => {
                console.log(`   ${index + 1}. "${doc.projeto}" - Status: "${doc.statusProjeto}" - numeroTermoFomento: "${doc.numeroTermoFomento || 'N/A'}"`);
            });
        }
        else {
            console.log('   Nenhum documento com status "Não assinado" encontrado (já foram atualizados)');
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
checkNumeroTermoFomento().catch(console.error);
