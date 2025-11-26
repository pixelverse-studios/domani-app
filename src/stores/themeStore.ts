import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'auto'

interface ThemeStore {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: 'auto',
  setMode: (mode) => set({ mode }),
}))
