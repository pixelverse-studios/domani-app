import { create } from 'zustand'

interface CelebrationStore {
  shouldShowCelebration: boolean
  taskCount: number
  /** Trigger the celebration modal with the number of completed tasks. */
  trigger: (taskCount: number) => void
  /** Dismiss the modal and clear the flag. */
  dismiss: () => void
}

export const useCelebrationStore = create<CelebrationStore>((set) => ({
  shouldShowCelebration: false,
  taskCount: 0,
  trigger: (taskCount) => set({ shouldShowCelebration: true, taskCount }),
  dismiss: () => set({ shouldShowCelebration: false, taskCount: 0 }),
}))
