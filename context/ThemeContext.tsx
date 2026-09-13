import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, Platform, useColorScheme as useSystemColorScheme } from 'react-native';

import {
  loadColorScheme,
  saveColorScheme,
  type ColorScheme,
} from '@/lib/storage';

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveSystemScheme(system: ReturnType<typeof useSystemColorScheme>): ColorScheme {
  return system === 'dark' ? 'dark' : 'light';
}

function applyNativeScheme(scheme: ColorScheme) {
  try {
    Appearance.setColorScheme(scheme);
  } catch {
    // Appearance.setColorScheme is unavailable on some web/SSR paths.
  }
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.style.colorScheme = scheme;
    document.body.style.backgroundColor = scheme === 'dark' ? '#0B1220' : '#F8FAFC';
  }
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useSystemColorScheme();
  const [colorScheme, setSchemeState] = useState<ColorScheme>(() =>
    resolveSystemScheme(system)
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadColorScheme();
      if (cancelled) return;
      const next = stored ?? resolveSystemScheme(system);
      setSchemeState(next);
      applyNativeScheme(next);
    })();
    return () => {
      cancelled = true;
    };
    // Hydrate once from storage; after that the in-app switch owns the scheme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setSchemeState(scheme);
    applyNativeScheme(scheme);
    void saveColorScheme(scheme);
  }, []);

  const value = useMemo(
    () => ({ colorScheme, setColorScheme }),
    [colorScheme, setColorScheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useColorScheme(): ColorScheme {
  const ctx = useContext(ThemeContext);
  const system = useSystemColorScheme();
  return ctx?.colorScheme ?? resolveSystemScheme(system);
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return ctx;
}
