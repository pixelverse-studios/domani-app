import React, { createContext, useEffect, useMemo } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

import { ThemeMode, useThemeStore } from '~/stores/themeStore';

interface ThemeContextValue {
  mode: ThemeMode;
  activeTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemTheme = useRNColorScheme() ?? 'light';
  const { setColorScheme: setNativeWindColorScheme } = useNativeWindColorScheme();
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const activeTheme = mode === 'auto' ? systemTheme : mode;
  const nativeWindScheme = mode === 'auto' ? 'system' : activeTheme;

  useEffect(() => {
    setNativeWindColorScheme(nativeWindScheme);
  }, [nativeWindScheme, setNativeWindColorScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode,
      activeTheme: (activeTheme ?? 'light') as 'light' | 'dark'
    }),
    [mode, setMode, activeTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
