import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Tutorial steps in order of progression
 * Based on docs/plans/interactive-tutorial-proposal.md
 */
export type TutorialStep =
  | 'welcome'
  | 'add_task_button'
  | 'title_input'
  | 'category_selector'
  | 'create_category'
  | 'priority_selector'
  | 'top_priority'
  | 'day_toggle'
  | 'task_created'
  | 'today_screen'
  | 'cleanup'
  | 'completion'

interface TutorialStore {
  // State
  isActive: boolean
  currentStep: TutorialStep | null
  hasCompletedTutorial: boolean

  // Actions
  startTutorial: () => void
  nextStep: (step: TutorialStep) => void
  skipTutorial: () => void
  completeTutorial: () => void
  resetTutorial: () => void
}

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set) => ({
      // Initial state
      isActive: false,
      currentStep: null,
      hasCompletedTutorial: false,

      // Start the tutorial from the beginning
      startTutorial: () =>
        set({
          isActive: true,
          currentStep: 'welcome',
        }),

      // Advance to a specific step
      nextStep: (step) =>
        set({
          currentStep: step,
        }),

      // Skip the tutorial entirely
      skipTutorial: () =>
        set({
          isActive: false,
          currentStep: null,
          hasCompletedTutorial: true,
        }),

      // Complete the tutorial successfully
      completeTutorial: () =>
        set({
          isActive: false,
          currentStep: null,
          hasCompletedTutorial: true,
        }),

      // Reset tutorial state (for "Replay Tutorial" in Settings)
      resetTutorial: () =>
        set({
          isActive: false,
          currentStep: null,
          hasCompletedTutorial: false,
        }),
    }),
    {
      name: 'tutorial-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasCompletedTutorial: state.hasCompletedTutorial,
      }),
    },
  ),
)
