import { create } from 'zustand'
import { type ThemeName, defaultTheme } from '~/theme/themes'

/** @deprecated Use ThemeName instead. Kept for backward compatibility during migration. */
export type ThemeMode = 'light' | 'dark' | 'auto'

interface ThemeStore {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  /** @deprecated Use theme/setTheme instead. Kept for backward compatibility during migration. */
  mode: ThemeMode
  /** @deprecated Use theme/setTheme instead. Kept for backward compatibility during migration. */
  setMode: (mode: ThemeMode) => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: defaultTheme,
  setTheme: (theme) => set({ theme }),
  // Legacy API — remove in DOM-293
  mode: 'auto',
  setMode: (mode) => set({ mode }),
}))
