import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type TaskLayout = 'default' | 'compact' | 'minimal' | 'detailed' | 'board' | 'checklist'

export const TASK_LAYOUTS: { id: TaskLayout; label: string; description: string }[] = [
  { id: 'default', label: 'Standard', description: 'Full cards with priority badge' },
  { id: 'compact', label: 'Compact', description: 'Condensed rows, more tasks visible' },
  { id: 'minimal', label: 'Minimal', description: 'Clean text rows, maximum density' },
  { id: 'detailed', label: 'Detailed', description: 'Enhanced cards with notes preview' },
  { id: 'board', label: 'Board', description: 'Color-tinted cards with top accent bar' },
  { id: 'checklist', label: 'Checklist', description: 'Simple bullet list, ultra-focused' },
]

interface LayoutState {
  taskLayout: TaskLayout
  setTaskLayout: (layout: TaskLayout) => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      taskLayout: 'default',
      setTaskLayout: (layout) => set({ taskLayout: layout }),
    }),
    {
      name: 'domani-layout-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
