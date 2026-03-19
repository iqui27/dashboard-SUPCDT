import process from 'node:process';

import { loadValidatedLocalE2E, runCommand } from './local-e2e.js';

async function main() {
  const { env, username, password, npxCommand } = await loadValidatedLocalE2E();
  const extraArgs = process.argv.slice(2);

  console.log('Garantindo usuário local de smoke...');
  await runCommand(npxCommand, ['tsx', 'server/scripts/ensureSmokeUser.ts'], env);

  console.log('Preparando fixtures locais de usuários...');
  await runCommand(npxCommand, ['tsx', 'server/scripts/seedLocalQaUsers.ts'], env);

  console.log('Seedando dados locais de QA...');
  await runCommand(npxCommand, ['tsx', 'server/scripts/seedLocalQaData.ts'], env);

  console.log('Executando QA funcional local...');
  await runCommand(
    npxCommand,
    ['playwright', 'test', '--config=playwright.config.ts', '--workers=1', '--grep', '@local-functional', ...extraArgs],
    {
      ...env,
      E2E_USERNAME: username,
      E2E_PASSWORD: password
    }
  );
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
