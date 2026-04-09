import { expect, test } from '@playwright/test';

const e2eUsername = process.env.E2E_USERNAME;
const e2ePassword = process.env.E2E_PASSWORD;

test.describe('Theme business surfaces', () => {
  test.skip(!e2eUsername || !e2ePassword, 'Defina E2E_USERNAME e E2E_PASSWORD para validar telas de negócio.');

  test('Dashboard Geral renderiza com tokens semânticos em light e dark', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/Usuário ou e-mail/i).fill(e2eUsername!);
    await page.getByLabel(/Senha/i).fill(e2ePassword!);
    await page.getByRole('button', { name: /Entrar/i }).click();
    await page.waitForURL(/\//);

    const html = page.locator('html').first();
    await expect(html).toHaveAttribute('data-theme', 'light');

    const dashboardCards = page.locator('[data-theme-surface="dashboard-card"], .rounded-\\[1\\.45rem\\].border-border');
    await expect(dashboardCards.first()).toBeVisible();

    const cardStyles = await dashboardCards.first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        backgroundColor: cs.backgroundColor,
        borderColor: cs.borderColor,
        color: cs.color
      };
    });

    expect(cardStyles.backgroundColor).toBeTruthy();
    expect(cardStyles.borderColor).toBeTruthy();

    await page.getByRole('button', { name: /alternar para tema/i }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    const darkCardStyles = await dashboardCards.first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        backgroundColor: cs.backgroundColor,
        borderColor: cs.borderColor,
        color: cs.color
      };
    });

    expect(darkCardStyles.backgroundColor).not.toBe(cardStyles.backgroundColor);
  });

  test('Lista de Projetos renderiza com tokens semânticos', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/Usuário ou e-mail/i).fill(e2eUsername!);
    await page.getByLabel(/Senha/i).fill(e2ePassword!);
    await page.getByRole('button', { name: /Entrar/i }).click();
    await page.waitForURL(/\//);

    await page.getByRole('button', { name: /Projetos/i }).click();

    const projectCards = page.locator('.rounded-\\[1\\.45rem\\].border-border');
    await expect(projectCards.first()).toBeVisible();

    const styles = await projectCards.first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        backgroundColor: cs.backgroundColor,
        borderColor: cs.borderColor
      };
    });

    expect(styles.backgroundColor).toBeTruthy();
  });
});
