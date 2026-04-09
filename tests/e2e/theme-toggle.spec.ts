import { expect, test } from '@playwright/test';

import { THEME_STORAGE_KEY, type Theme } from '../../src/lib/theme';

const e2eUsername = process.env.E2E_USERNAME;
const e2ePassword = process.env.E2E_PASSWORD;

test.describe('Theme toggle', () => {
  test.skip(!e2eUsername || !e2ePassword, 'Defina E2E_USERNAME e E2E_PASSWORD para validar o toggle.');

  test('exibe o toggle de tema e alterna entre light/dark com persistência', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/Usuário ou e-mail/i).fill(e2eUsername!);
    await page.getByLabel(/Senha/i).fill(e2ePassword!);
    await page.getByRole('button', { name: /Entrar/i }).click();
    await page.waitForURL(/\//);

    const themeToggle = page.getByRole('button', { name: /alternar para tema/i });
    await expect(themeToggle).toBeVisible();

    const html = page.locator('html').first();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(html).toHaveClass(/(^|\s)light(\s|$)/);

    await themeToggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);

    const storedTheme = await page.evaluate((key) => window.localStorage.getItem(key), THEME_STORAGE_KEY);
    expect(storedTheme).toBe('dark');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);

    await themeToggle.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(html).toHaveClass(/(^|\s)light(\s|$)/);

    const storedThemeAfterToggle = await page.evaluate((key) => window.localStorage.getItem(key), THEME_STORAGE_KEY);
    expect(storedThemeAfterToggle).toBe('light');
  });

  test('mantém o tema dark após reload mesmo sem interação prévia', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, 'dark');
    }, THEME_STORAGE_KEY);

    await page.goto('/login');
    await page.getByLabel(/Usuário ou e-mail/i).fill(e2eUsername!);
    await page.getByLabel(/Senha/i).fill(e2ePassword!);
    await page.getByRole('button', { name: /Entrar/i }).click();
    await page.waitForURL(/\//);

    const html = page.locator('html').first();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);
  });

  test('fallback para light quando storage contém valor inválido', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, 'invalid-theme');
    }, THEME_STORAGE_KEY);

    await page.goto('/login');
    await page.getByLabel(/Usuário ou e-mail/i).fill(e2eUsername!);
    await page.getByLabel(/Senha/i).fill(e2ePassword!);
    await page.getByRole('button', { name: /Entrar/i }).click();
    await page.waitForURL(/\//);

    const html = page.locator('html').first();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(html).toHaveClass(/(^|\s)light(\s|$)/);
  });
});
