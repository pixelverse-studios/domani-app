import { useMemo } from 'react'
import { themes, defaultTheme, type Theme } from '~/theme/themes'
import { useThemeStore } from '~/stores/themeStore'

/**
 * Returns the resolved theme for the active theme name.
 * Currently always returns the 'sage' theme.
 * Adding a new theme requires zero changes to this hook.
 */
export function useAppTheme(): Theme {
  const activeTheme = useThemeStore((s) => s.theme) ?? defaultTheme
  return useMemo(() => themes[activeTheme], [activeTheme])
}
