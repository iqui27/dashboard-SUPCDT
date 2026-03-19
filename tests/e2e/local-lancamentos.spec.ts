import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

const e2eUsername = process.env.E2E_USERNAME;
const e2ePassword = process.env.E2E_PASSWORD;

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/Usuário ou e-mail/i).fill(e2eUsername!);
  await page.getByLabel(/Senha/i).fill(e2ePassword!);
  await page.getByRole('button', { name: /Entrar com credencial/i }).click();
}

test.describe('QA local de lançamentos @local-functional', () => {
  test.skip(!e2eUsername || !e2ePassword, 'Defina E2E_USERNAME e E2E_PASSWORD para validar lançamentos no fluxo local.');

  test('registra novo lançamento e exporta o conteúdo no CSV', async ({ page }) => {
    const atividade = `Lançamento QA local ${Date.now()}`;
    const localAtendido = 'Ceilândia Norte - rota funcional';
    const projectCard = page.locator('button').filter({ hasText: 'Projeto Wi-Fi Social QA Local' }).first();

    await login(page);

    await page.getByRole('button', { name: /Projetos/i }).click();
    await expect(projectCard).toBeVisible();
    await projectCard.click();

    await page.getByRole('button', { name: /Novo lançamento/i }).click();

    const lancamentoModal = page.locator('div.fixed').last();
    await lancamentoModal.getByPlaceholder(/Ex: CEF 01 do Recanto das Emas/i).fill(localAtendido);
    await lancamentoModal.getByPlaceholder(/Descreva o que foi feito/i).fill(atividade);
    await lancamentoModal.locator('input[type="number"]').first().fill('2');
    await lancamentoModal.getByRole('button', { name: /Registrar Lançamento/i }).click();

    await expect(page.getByText(/Lançamento registrado com sucesso!/i)).toBeVisible();
    await expect(page.getByText(atividade, { exact: true })).toBeVisible();
    await expect(page.getByText(localAtendido, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /Voltar para a carteira de projetos/i }).click();
    await page.getByRole('button', { name: /Relatórios/i }).click();
    await expect(page.getByRole('heading', { name: /Saída honesta do que já está pronto/i })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Baixar CSV do Saiweb/i }).click();
    const download = await downloadPromise;
    await expect(download.failure()).resolves.toBeNull();

    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    const csvContent = await readFile(downloadPath!, 'utf8');
    expect(csvContent).toContain('Projeto Wi-Fi Social QA Local');
    expect(csvContent).toContain(atividade);
    expect(csvContent).toContain(localAtendido);
    expect(csvContent).toContain('M1');
  });
});
