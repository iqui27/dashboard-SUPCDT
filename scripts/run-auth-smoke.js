import { spawn } from 'node:child_process';
import process from 'node:process';
import { config as loadEnv } from 'dotenv';

loadEnv();

function isRemoteApi(url) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return !['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

const apiBaseUrl = process.env.VITE_API_BASE_URL?.trim() || '';
const allowAdminFallback = process.env.E2E_USE_ADMIN_FROM_ENV === 'true';
const allowRemoteApi = process.env.E2E_ALLOW_REMOTE_API === 'true';

const username = process.env.E2E_USERNAME?.trim() || (allowAdminFallback ? process.env.ADMIN_USERNAME?.trim() : '');
const password = process.env.E2E_PASSWORD?.trim() || (allowAdminFallback ? process.env.ADMIN_PASSWORD?.trim() : '');

if (!username || !password) {
  console.error('Credenciais E2E ausentes.');
  console.error('Defina E2E_USERNAME e E2E_PASSWORD, ou use E2E_USE_ADMIN_FROM_ENV=true para reutilizar ADMIN_USERNAME/ADMIN_PASSWORD do .env.');
  process.exit(1);
}

if (isRemoteApi(apiBaseUrl) && !allowRemoteApi) {
  console.error('A API configurada no .env é remota.');
  console.error('Por segurança, o smoke autenticado foi bloqueado.');
  console.error('Se quiser executar mesmo assim, rode com E2E_ALLOW_REMOTE_API=true.');
  process.exit(1);
}

console.log(`Smoke autenticado preparado com API ${isRemoteApi(apiBaseUrl) ? 'remota' : 'local'}.`);
console.log(`Origem das credenciais: ${process.env.E2E_USERNAME && process.env.E2E_PASSWORD ? 'E2E_USERNAME/E2E_PASSWORD' : 'fallback ADMIN_* do .env'}.`);

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const extraArgs = process.argv.slice(2);
const child = spawn(
  npxCommand,
  ['playwright', 'test', '--config=playwright.config.ts', '--grep', '@auth', ...extraArgs],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      E2E_USERNAME: username,
      E2E_PASSWORD: password
    }
  }
);

child.on('exit', code => {
  process.exit(code ?? 1);
});
