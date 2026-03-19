import 'dotenv/config';

import { closeMongoClient, getDatabase } from '../db/client.js';
import { createUser, getUserByUsername, updateUser } from '../services/users.js';

const USERS_COLLECTION = 'users';

async function ensureAdminUserFixture() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const email = process.env.ADMIN_EMAIL?.trim() || 'admin.local@secti.df.gov.br';

  if (!username || !password) {
    throw new Error('ADMIN_USERNAME e ADMIN_PASSWORD são obrigatórios para seed local de usuários.');
  }

  const existing = await getUserByUsername(username);

  if (!existing || !existing._id) {
    const created = await createUser({
      username,
      password,
      email,
      role: 'admin',
      fullName: 'Admin Local QA',
      department: 'QA'
    });

    console.log(`Usuário admin local criado: ${created.username}`);
    return;
  }

  const updated = await updateUser(existing._id.toString(), {
    password,
    email,
    role: 'admin',
    isActive: true,
    fullName: 'Admin Local QA',
    department: 'QA'
  });

  console.log(`Usuário admin local atualizado: ${updated.username}`);
}

async function resetCreatableUserFixture() {
  const db = await getDatabase();
  const result = await db.collection(USERS_COLLECTION).deleteMany({
    username: { $regex: '^qa\\.local\\.' }
  });

  console.log(`Fixtures de criação removidas: ${result.deletedCount}`);
}

async function main() {
  await ensureAdminUserFixture();
  await resetCreatableUserFixture();
}

main()
  .catch(error => {
    console.error('Falha ao seedar usuários locais de QA:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoClient().catch(() => undefined);
  });
