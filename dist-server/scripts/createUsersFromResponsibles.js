import 'dotenv/config';
import { getDatabase } from '../db/client.js';
import { createUser, getUserByUsername, updateUser } from '../services/users.js';
const DEFAULT_EMAIL_DOMAIN = process.env.DEFAULT_USER_EMAIL_DOMAIN || 'secti.df.gov.br';
function toSlug(value) {
    return value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9. ]+/g, '')
        .replace(/\s+/g, '.');
}
function buildEmail(name) {
    const clean = name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z\s]+/g, ' ');
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length === 0) {
        return `usuario@${DEFAULT_EMAIL_DOMAIN}`;
    }
    if (parts.length === 1) {
        return `${parts[0]}@${DEFAULT_EMAIL_DOMAIN}`;
    }
    return `${parts[0]}.${parts[parts.length - 1]}@${DEFAULT_EMAIL_DOMAIN}`;
}
async function fetchResponsibles() {
    const db = await getDatabase();
    const collection = db.collection('status_responsibles');
    return collection.find({}).sort({ name: 1 }).toArray();
}
async function createUsersFromResponsibles() {
    console.log('🚀 Iniciando sincronização de usuários a partir da coleção status_responsibles...\n');
    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'Secti@2025';
    const responsibles = await fetchResponsibles();
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    for (const responsible of responsibles) {
        const name = responsible.name?.trim();
        if (!name) {
            console.warn('⚠️  Registro ignorado por não possuir nome:', responsible);
            skipped++;
            continue;
        }
        const department = responsible.department?.trim();
        const username = toSlug(name);
        const email = responsible.email?.trim() || buildEmail(name);
        const isActive = responsible.active !== false;
        try {
            const user = await createUser({
                username,
                password: defaultPassword,
                email,
                fullName: name,
                department,
                isAdmin: false
            });
            if (!isActive) {
                await updateUser(user.id, { isActive: false });
            }
            console.log(`✅ Criado: ${username} (${name})${department ? ` - ${department}` : ''}${!isActive ? ' [inativo]' : ''}`);
            created++;
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Usuário já existe') {
                try {
                    const existing = await getUserByUsername(username);
                    if (!existing?._id) {
                        console.warn(`⚠️  Usuário ${username} encontrado sem _id. Ignorando.`);
                        skipped++;
                        continue;
                    }
                    await updateUser(existing._id.toString(), {
                        email,
                        fullName: name,
                        department,
                        isActive
                    });
                    console.log(`♻️  Atualizado: ${username} (${name})${department ? ` - ${department}` : ''}${!isActive ? ' [inativo]' : ''}`);
                    updated++;
                }
                catch (updateError) {
                    console.error(`❌ Falha ao atualizar usuário existente ${username}:`, updateError instanceof Error ? updateError.message : updateError);
                    errors++;
                }
            }
            else {
                console.error(`❌ Erro ao criar usuário ${name}:`, error instanceof Error ? error.message : error);
                errors++;
            }
        }
    }
    console.log(`\n📊 Resumo:`);
    console.log(`   ✅ Criados: ${created}`);
    console.log(`   ♻️  Atualizados: ${updated}`);
    console.log(`   ⏭️  Ignorados: ${skipped}`);
    console.log(`   ❌ Erros: ${errors}`);
    console.log(`\n🔑 Senha padrão para novos usuários: ${defaultPassword}`);
    console.log('   (Configure DEFAULT_USER_PASSWORD no .env para alterar)');
}
createUsersFromResponsibles()
    .then(() => {
    console.log('\n✨ Processo concluído!');
    process.exit(0);
})
    .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
});
