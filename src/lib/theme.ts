export const THEMES = ['light', 'dark'] as const;

export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = 'light';
export const THEME_STORAGE_KEY = 'dashboard-supcdt:theme:v1';
export const THEME_ATTRIBUTE = 'data-theme';
export const THEME_COLOR_META_SELECTOR = 'meta[name="theme-color"][data-dynamic-theme="true"]';
export const THEME_COLOR_BY_THEME: Record<Theme, string> = {
  light: '#285ea4',
  dark: '#151822'
};

export type ThemeStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function isTheme(value: string | null | undefined): value is Theme {
  return value === 'light' || value === 'dark';
}

export function normalizeTheme(value: string | null | undefined): Theme | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  return isTheme(normalizedValue) ? normalizedValue : null;
}

export function resolveTheme(value: string | null | undefined, fallback: Theme = DEFAULT_THEME): Theme {
  return normalizeTheme(value) ?? fallback;
}

export function getThemeStorage(): ThemeStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredTheme(storage: ThemeStorage | null, fallback: Theme = DEFAULT_THEME): Theme {
  if (!storage) {
    return fallback;
  }

  try {
    return resolveTheme(storage.getItem(THEME_STORAGE_KEY), fallback);
  } catch {
    return fallback;
  }
}

export function writeStoredTheme(theme: Theme, storage: ThemeStorage | null): Theme {
  const resolvedTheme = resolveTheme(theme);

  if (!storage) {
    return resolvedTheme;
  }

  try {
    storage.setItem(THEME_STORAGE_KEY, resolvedTheme);
  } catch {
    // Ignora indisponibilidade/quota do storage e segue com o tema em memória.
  }

  return resolvedTheme;
}

export function applyThemeToRoot(theme: Theme, root: HTMLElement | null | undefined = typeof document !== 'undefined' ? document.documentElement : null): Theme {
  const resolvedTheme = resolveTheme(theme);

  if (!root) {
    return resolvedTheme;
  }

  for (const themeClass of THEMES) {
    root.classList.remove(themeClass);
  }

  root.classList.add(resolvedTheme);
  root.setAttribute(THEME_ATTRIBUTE, resolvedTheme);
  root.style.colorScheme = resolvedTheme;

  return resolvedTheme;
}

export function syncThemeColor(theme: Theme, doc: Document | null | undefined = typeof document !== 'undefined' ? document : null): Theme {
  const resolvedTheme = resolveTheme(theme);

  if (!doc) {
    return resolvedTheme;
  }

  const themeColorMeta = doc.querySelector<HTMLMetaElement>(THEME_COLOR_META_SELECTOR);
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', THEME_COLOR_BY_THEME[resolvedTheme]);
  }

  return resolvedTheme;
}
