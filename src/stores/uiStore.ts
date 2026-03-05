import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type RecapLayout = 'inline' | 'minimal' | 'card'

interface UIStore {
  showUpgradePrompt: boolean
  planningDate: Date
  recapLayout: RecapLayout
  toggleUpgradePrompt: (show: boolean) => void
  setPlanningDate: (date: Date) => void
  setRecapLayout: (layout: RecapLayout) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      showUpgradePrompt: false,
      planningDate: new Date(),
      recapLayout: 'card',
      toggleUpgradePrompt: (show) => set({ showUpgradePrompt: show }),
      setPlanningDate: (date) => set({ planningDate: date }),
      setRecapLayout: (layout) => set({ recapLayout: layout }),
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        recapLayout: state.recapLayout,
      }),
    },
  ),
)
