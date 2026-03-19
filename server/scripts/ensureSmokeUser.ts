import 'dotenv/config';

import { closeMongoClient } from '../db/client.js';
import { createUser, getUserByUsername, updateUser } from '../services/users.js';

async function main() {
  const username = process.env.E2E_USERNAME?.trim();
  const password = process.env.E2E_PASSWORD?.trim();
  const email = process.env.E2E_SMOKE_EMAIL?.trim() || 'smoke.qa@secti.df.gov.br';

  if (!username || !password) {
    console.error('E2E_USERNAME e E2E_PASSWORD são obrigatórios para garantir o usuário de smoke.');
    process.exit(1);
  }

  const existing = await getUserByUsername(username);

  if (!existing || !existing._id) {
    const created = await createUser({
      username,
      password,
      email,
      role: 'viewer',
      fullName: 'Smoke QA',
      department: 'QA'
    });

    console.log(`Smoke user criado: ${created.username}`);
    return;
  }

  const updated = await updateUser(existing._id.toString(), {
    password,
    email,
    role: 'viewer',
    isActive: true,
    fullName: 'Smoke QA',
    department: 'QA'
  });

  console.log(`Smoke user atualizado: ${updated.username}`);
}

main()
  .catch(error => {
    console.error('Falha ao garantir usuário de smoke:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoClient().catch(() => undefined);
  });
