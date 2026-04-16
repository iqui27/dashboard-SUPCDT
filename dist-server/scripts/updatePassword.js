import 'dotenv/config';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('❌ MONGODB_URI não configurado');
    process.exit(1);
}
async function updatePassword() {
    const username = process.argv[2] || 'admin';
    const newPassword = process.argv[3] || 'Admin@2026';
    console.log(`Atualizando senha de: ${username}`);
    const client = new MongoClient(uri);
    await client.connect();
    const dbName = uri.includes('secti-dashboard') ? 'secti-dashboard' : 'dashboard_supcdt';
    const db = client.db(dbName);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await db.collection('users').updateOne({ username }, { $set: { passwordHash } });
    if (result.modifiedCount === 1) {
        console.log('✅ Senha atualizada com sucesso!');
        console.log(`   Username: ${username}`);
        console.log(`   Nova senha: ${newPassword}`);
    }
    else if (result.matchedCount === 0) {
        console.log('❌ Usuário não encontrado');
    }
    else {
        console.log('⚠️ Nenhuma alteração realizada');
    }
    await client.close();
}
updatePassword().catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
});
