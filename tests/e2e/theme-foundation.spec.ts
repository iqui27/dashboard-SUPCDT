import { expect, test, type Page } from '@playwright/test';

import {
  THEME_COLOR_BY_THEME,
  THEME_COLOR_META_SELECTOR,
  THEMES,
  THEME_STORAGE_KEY,
  type Theme
} from '../../src/lib/theme';

type RootThemeState = {
  dataTheme: string | null;
  themeClasses: string[];
  storedTheme: string | null;
  themeColor: string | null;
};

type LoginSurfaceSnapshot = {
  shellBackgroundImage: string;
  shellBackgroundColor: string;
  cardBackgroundColor: string;
  cardBorderColor: string;
  cardTextColor: string;
  inputBackgroundColor: string;
  inputBorderColor: string;
};

async function readRootThemeState(page: Page): Promise<RootThemeState> {
  return page.evaluate(
    ({ storageKey, themeClasses, themeColorSelector }) => {
      const root = document.documentElement;
      const validThemeClasses = root.className
        .split(/\s+/)
        .filter(Boolean)
        .filter((className) => themeClasses.includes(className));

      let storedTheme: string | null = null;
      try {
        storedTheme = window.localStorage.getItem(storageKey);
      } catch {
        storedTheme = null;
      }

      const themeColor = document.querySelector<HTMLMetaElement>(themeColorSelector)?.getAttribute('content') ?? null;

      return {
        dataTheme: root.dataset.theme ?? null,
        themeClasses: validThemeClasses,
        storedTheme,
        themeColor
      };
    },
    {
      storageKey: THEME_STORAGE_KEY,
      themeClasses: [...THEMES],
      themeColorSelector: THEME_COLOR_META_SELECTOR
    }
  );
}

async function readLoginSurfaceSnapshot(page: Page): Promise<LoginSurfaceSnapshot> {
  return page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>('[data-theme-surface="login-shell"]');
    const card = document.querySelector<HTMLElement>('[data-theme-surface="login-card"]');
    const input = document.querySelector<HTMLInputElement>('#username');

    if (!shell || !card || !input) {
      throw new Error('Login theme surfaces not found');
    }

    const shellStyles = window.getComputedStyle(shell);
    const cardStyles = window.getComputedStyle(card);
    const inputStyles = window.getComputedStyle(input);

    return {
      shellBackgroundImage: shellStyles.backgroundImage,
      shellBackgroundColor: shellStyles.backgroundColor,
      cardBackgroundColor: cardStyles.backgroundColor,
      cardBorderColor: cardStyles.borderColor,
      cardTextColor: cardStyles.color,
      inputBackgroundColor: inputStyles.backgroundColor,
      inputBorderColor: inputStyles.borderColor
    };
  });
}

async function expectThemeContract(page: Page, expectedTheme: Theme, expectedStoredTheme: string | null = expectedTheme) {
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /Entrar no Dashboard/i })).toBeVisible();

  await expect.poll(async () => (await readRootThemeState(page)).dataTheme).toBe(expectedTheme);
  await expect.poll(async () => (await readRootThemeState(page)).themeClasses).toEqual([expectedTheme]);
  await expect.poll(async () => (await readRootThemeState(page)).storedTheme).toBe(expectedStoredTheme);
  await expect.poll(async () => (await readRootThemeState(page)).themeColor).toBe(THEME_COLOR_BY_THEME[expectedTheme]);
}

async function gotoLogin(page: Page) {
  await page.goto('/login');
}

test.describe('Theme foundation @public', () => {
  test('aplica fallback light e normaliza a ausência da chave', async ({ page }) => {
    await page.addInitScript((storageKey) => {
      window.localStorage.removeItem(storageKey);
    }, THEME_STORAGE_KEY);

    await gotoLogin(page);
    await expectThemeContract(page, 'light');
  });

  for (const invalidTheme of ['', 'legacy-theme', 'BLUE']) {
    test(`ignora valor inválido "${invalidTheme || '<vazio>'}" e sobrescreve com light`, async ({ page }) => {
      await page.addInitScript(
        ({ storageKey, value }) => {
          window.localStorage.setItem(storageKey, value);
        },
        { storageKey: THEME_STORAGE_KEY, value: invalidTheme }
      );

      await gotoLogin(page);
      await expectThemeContract(page, 'light');
    });
  }

  test('normaliza valor misto para dark e mantém somente uma classe válida', async ({ page }) => {
    await page.addInitScript(
      ({ storageKey, value }) => {
        window.localStorage.setItem(storageKey, value);
      },
      { storageKey: THEME_STORAGE_KEY, value: '  DaRk  ' }
    );

    await gotoLogin(page);
    await expectThemeContract(page, 'dark');
  });

  test('alterna entre light e dark por bootstrap sem acumular classes antigas', async ({ page }) => {
    await gotoLogin(page);
    await expectThemeContract(page, 'light');

    await page.evaluate((storageKey) => {
      window.localStorage.setItem(storageKey, 'dark');
    }, THEME_STORAGE_KEY);
    await page.reload();
    await expectThemeContract(page, 'dark');

    await page.evaluate((storageKey) => {
      window.localStorage.setItem(storageKey, 'light');
    }, THEME_STORAGE_KEY);
    await page.reload();
    await expectThemeContract(page, 'light');
  });

  test('muda as superfícies públicas compartilhadas entre light e dark', async ({ page }) => {
    await gotoLogin(page);
    await expectThemeContract(page, 'light');
    const lightSnapshot = await readLoginSurfaceSnapshot(page);

    await page.evaluate((storageKey) => {
      window.localStorage.setItem(storageKey, 'dark');
    }, THEME_STORAGE_KEY);
    await page.reload();
    await expectThemeContract(page, 'dark');
    const darkSnapshot = await readLoginSurfaceSnapshot(page);

    expect(darkSnapshot.shellBackgroundImage).not.toBe(lightSnapshot.shellBackgroundImage);
    expect(darkSnapshot.cardBackgroundColor).not.toBe(lightSnapshot.cardBackgroundColor);
    expect(darkSnapshot.cardBorderColor).not.toBe(lightSnapshot.cardBorderColor);
    expect(darkSnapshot.cardTextColor).not.toBe(lightSnapshot.cardTextColor);
    expect(darkSnapshot.inputBackgroundColor).not.toBe(lightSnapshot.inputBackgroundColor);
    expect(darkSnapshot.inputBorderColor).not.toBe(lightSnapshot.inputBorderColor);
  });

  test('segue com fallback light quando localStorage está indisponível', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new Error('localStorage blocked for test');
        }
      });
    });

    await gotoLogin(page);
    await expectThemeContract(page, 'light', null);
  });
});
