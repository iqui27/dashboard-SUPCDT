import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { config as loadEnv } from 'dotenv';

const envFile = resolve(process.cwd(), '.env.e2e.local');

if (!existsSync(envFile)) {
  console.error('Arquivo .env.e2e.local não encontrado.');
  console.error('Use .env.e2e.local.example como base e ajuste as credenciais locais.');
  process.exit(1);
}

const result = loadEnv({ path: envFile });

if (result.error) {
  console.error('Falha ao carregar .env.e2e.local:', result.error.message);
  process.exit(1);
}

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('Uso: node scripts/run-with-e2e-env.js <comando> [...args]');
  process.exit(1);
}

const child = spawn(command, args, {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: { ...process.env }
});

child.on('exit', code => {
  process.exit(code ?? 1);
});
