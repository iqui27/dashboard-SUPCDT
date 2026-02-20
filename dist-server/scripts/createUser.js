/**
 * Script para criar um novo usuário
 *
 * Uso:
 * tsx server/scripts/createUser.ts <username> <password>
 *
 * Exemplo:
 * tsx server/scripts/createUser.ts joao senha123
 */
import 'dotenv/config';
import { createUser } from '../services/users.js';
function parseRole(value) {
    if (!value) {
        return undefined;
    }
    const normalized = value.toLowerCase();
    if (normalized === 'admin' || normalized === 'editor' || normalized === 'viewer') {
        return normalized;
    }
    console.warn(`Perfil desconhecido "${value}". Valores aceitos: admin, editor, viewer. Usando viewer como padrão.`);
    return 'viewer';
}
function parseArgs() {
    const args = process.argv.slice(2);
    if (args.length < 2 || args.length > 4) {
        console.error('Uso: tsx server/scripts/createUser.ts <username> <password> [email] [perfil]');
        console.error('Perfis disponíveis: admin, editor, viewer (padrão: viewer)');
        console.error('Exemplo: tsx server/scripts/createUser.ts joao senha123 joao@secti.df.gov.br editor');
        process.exit(1);
    }
    const [username, password, email, roleArg] = args;
    return {
        username,
        password,
        email,
        role: parseRole(roleArg)
    };
}
async function main() {
    const { username, password, email, role } = parseArgs();
    try {
        console.log(`Criando usuário: ${username}`);
        const user = await createUser({ username, password, email, role });
        console.log('✅ Usuário criado com sucesso!');
        console.log(`   ID: ${user.id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email ?? 'não informado'}`);
        console.log(`   Perfil: ${user.role}`);
        console.log(`   Criado em: ${user.createdAt}`);
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Erro ao criar usuário:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
main();
