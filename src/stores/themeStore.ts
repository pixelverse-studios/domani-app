import { create } from 'zustand'
import { type ThemeName, defaultTheme } from '~/theme/themes'

interface ThemeStore {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: defaultTheme,
  setTheme: (theme) => set({ theme }),
}))
