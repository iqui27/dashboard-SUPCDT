import { expect, test } from '@playwright/test';

const e2eUsername = process.env.E2E_USERNAME;
const e2ePassword = process.env.E2E_PASSWORD;

test.describe('QA funcional local @local-functional', () => {
  test.skip(!e2eUsername || !e2ePassword, 'Defina E2E_USERNAME e E2E_PASSWORD para validar o fluxo funcional local.');

  test('navega por projetos e Wi-Fi Social com fixtures locais', async ({ page }) => {
    const projectCard = page.locator('button').filter({ hasText: 'Projeto Wi-Fi Social QA Local' }).first();

    await page.goto('/login');

    await page.getByLabel(/Usuário ou e-mail/i).fill(e2eUsername!);
    await page.getByLabel(/Senha/i).fill(e2ePassword!);
    await page.getByRole('button', { name: /Entrar com credencial/i }).click();

    await expect(page.getByRole('button', { name: /Projetos/i })).toBeVisible();
    await page.getByRole('button', { name: /Projetos/i }).click();

    await expect(page.getByRole('heading', { name: /Projetos monitorados/i })).toBeVisible();
    await expect(projectCard).toBeVisible();
    await projectCard.click();

    await expect(page.getByRole('heading', { name: /Projeto Wi-Fi Social QA Local/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Atualizar monitoramento/i })).toBeVisible();
    await expect(page.getByText('Equipe QA Local', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: /Voltar para a carteira de projetos/i }).click();
    await expect(page.getByRole('heading', { name: /Projetos monitorados/i })).toBeVisible();

    await page.getByRole('button', { name: /Wi‑Fi Social/i }).click();
    await expect(page.getByRole('heading', { name: /Operação territorial da rede/i })).toBeVisible();
    await page.getByRole('button', { name: /Lista/i }).click();
    const wifiTable = page.getByRole('table');
    await expect(wifiTable.getByText(/^Ponto QA Asa Norte$/)).toBeVisible();
    await expect(wifiTable.getByText(/^Ponto QA Ceilandia$/)).toBeVisible();

    await page.getByPlaceholder(/Buscar por ponto,.*RA ou responsável/i).fill('Ceilandia');
    await expect(wifiTable.getByText(/^Ponto QA Ceilandia$/)).toBeVisible();
  });
});
