import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';
import process from 'node:process';
import { config as loadEnv } from 'dotenv';

function isLocalHttpUrl(url) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return ['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function isLocalMongoUri(uri) {
  if (!uri) {
    return false;
  }

  return /(localhost|127\.0\.0\.1|host\.docker\.internal|mongodb:\/\/mongo|mongodb:\/\/mongodb)/i.test(uri);
}

function getMongoSocketTarget(uri) {
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?([^/?,]+)/i);

  if (!match) {
    return null;
  }

  const primaryHost = match[1].split(',')[0];
  const [host, rawPort] = primaryHost.split(':');

  return {
    host,
    port: Number(rawPort || 27017)
  };
}

function checkTcp(host, port) {
  return new Promise(resolvePromise => {
    const socket = net.connect({ host, port });

    socket.once('connect', () => {
      socket.end();
      resolvePromise(true);
    });

    socket.once('error', () => {
      socket.destroy();
      resolvePromise(false);
    });

    socket.setTimeout(1500, () => {
      socket.destroy();
      resolvePromise(false);
    });
  });
}

export function runCommand(command, args, env) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      env
    });

    child.on('exit', code => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${command} ${args.join(' ')} failed with code ${code ?? 1}`));
    });
  });
}

export async function loadValidatedLocalE2E() {
  const envFile = resolve(process.cwd(), '.env.e2e.local');

  if (!existsSync(envFile)) {
    throw new Error('Arquivo .env.e2e.local não encontrado. Use .env.e2e.local.example como base e ajuste o ambiente local.');
  }

  const result = loadEnv({ path: envFile });

  if (result.error) {
    throw new Error(`Falha ao carregar .env.e2e.local: ${result.error.message}`);
  }

  const apiBaseUrl = process.env.VITE_API_BASE_URL?.trim() || '';
  const mongoUri = process.env.MONGODB_URI?.trim() || '';
  const username = process.env.E2E_USERNAME?.trim() || '';
  const password = process.env.E2E_PASSWORD?.trim() || '';
  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  if (!isLocalHttpUrl(apiBaseUrl)) {
    throw new Error('VITE_API_BASE_URL precisa apontar para localhost/127.0.0.1 no fluxo E2E local.');
  }

  if (!isLocalMongoUri(mongoUri)) {
    throw new Error('MONGODB_URI precisa apontar para banco local no fluxo E2E local.');
  }

  const mongoTarget = getMongoSocketTarget(mongoUri);

  if (!mongoTarget) {
    throw new Error('Não foi possível interpretar host/porta de MONGODB_URI.');
  }

  const isMongoReachable = await checkTcp(mongoTarget.host, mongoTarget.port);

  if (!isMongoReachable) {
    throw new Error(`Mongo local indisponível em ${mongoTarget.host}:${mongoTarget.port}. Suba o Mongo local antes de rodar o fluxo E2E local.`);
  }

  if (!username || !password) {
    throw new Error('E2E_USERNAME e E2E_PASSWORD são obrigatórios em .env.e2e.local.');
  }

  return {
    env: { ...process.env },
    username,
    password,
    npxCommand
  };
}
