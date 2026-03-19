import { expect, test } from '@playwright/test';

const e2eUsername = process.env.E2E_USERNAME;
const e2ePassword = process.env.E2E_PASSWORD;

test.describe('Smoke pública @public', () => {
  test('redireciona a raiz protegida para o login', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /Entrar no Dashboard SUPCDT/i })).toBeVisible();
    await expect(page.getByText(/Não há acesso de teste/i)).toBeVisible();
    await expect(page.getByText(/entrar sem login/i)).toHaveCount(0);
  });

  test('valida o domínio institucional no fluxo de recuperação', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.getByRole('heading', { name: /Recuperar senha/i })).toBeVisible();
    await page.getByLabel(/E-mail institucional/i).fill('usuario@gmail.com');
    await page.getByLabel(/E-mail pessoal/i).fill('pessoal@gmail.com');
    await page.getByRole('button', { name: /Enviar link de redefinição/i }).click();

    await expect(page.getByText(/deve ser do domínio @secti.df.gov.br/i)).toBeVisible();
  });

  test('renderiza o reset de senha com querystring e mostra erro sem token', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByText(/Token ausente/i)).toBeVisible();

    await page.goto('/reset-password?token=abc123');
    await expect(page.getByRole('heading', { name: /Definir nova senha/i })).toBeVisible();
    await expect(page.getByLabel('Nova senha', { exact: true })).toBeVisible();
  });
});

test.describe('Smoke autenticada @auth', () => {
  test.skip(!e2eUsername || !e2ePassword, 'Defina E2E_USERNAME e E2E_PASSWORD para validar fluxo autenticado.');

  test('autentica e acessa o módulo Wi‑Fi Social', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/Usuário ou e-mail/i).fill(e2eUsername!);
    await page.getByLabel(/Senha/i).fill(e2ePassword!);
    await page.getByRole('button', { name: /Entrar com credencial/i }).click();

    await expect(page.getByRole('button', { name: /Wi‑Fi Social/i })).toBeVisible();
    await page.getByRole('button', { name: /Wi‑Fi Social/i }).click();
    await expect(page.getByRole('heading', { name: /Operação territorial da rede/i })).toBeVisible();
    await expect(page.getByText(/Pontos carregados/i)).toBeVisible();
  });
});
