import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  DEFAULT_THEME,
  type Theme,
  applyThemeToRoot,
  getThemeStorage,
  readStoredTheme,
  resolveTheme,
  syncThemeColor,
  writeStoredTheme
} from '../lib/theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = DEFAULT_THEME }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return defaultTheme;
    }

    return readStoredTheme(getThemeStorage(), defaultTheme);
  });

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      setThemeState(resolveTheme(nextTheme, defaultTheme));
    },
    [defaultTheme]
  );

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(
    function syncThemeWithBrowserSurfaces() {
      const storage = getThemeStorage();
      const resolvedTheme = applyThemeToRoot(theme);

      writeStoredTheme(resolvedTheme, storage);
      syncThemeColor(resolvedTheme);
    },
    [theme]
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme
    }),
    [setTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
