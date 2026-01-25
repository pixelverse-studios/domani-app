import { create } from 'zustand'

import { supabase } from '~/lib/supabase'

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
  isLoading: boolean

  // Actions
  initializeTutorialState: (userId: string) => Promise<void>
  startTutorial: () => void
  nextStep: (step: TutorialStep) => void
  skipTutorial: () => void
  completeTutorial: () => void
  resetTutorial: () => void
}

/**
 * Helper to mark tutorial as completed in the database
 */
async function markTutorialCompleted(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('profiles')
    .update({ tutorial_completed_at: new Date().toISOString() })
    .eq('id', user.id)
}

/**
 * Helper to clear tutorial completion in the database (for replay)
 */
async function clearTutorialCompletion(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('profiles').update({ tutorial_completed_at: null }).eq('id', user.id)
}

export const useTutorialStore = create<TutorialStore>()((set) => ({
  // Initial state
  isActive: false,
  currentStep: null,
  hasCompletedTutorial: false,
  isLoading: true,

  // Initialize tutorial state from database
  initializeTutorialState: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('tutorial_completed_at')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching tutorial state:', error)
        set({ isLoading: false })
        return
      }

      const hasCompleted = data?.tutorial_completed_at !== null
      set({
        hasCompletedTutorial: hasCompleted,
        isLoading: false,
      })

      // Auto-start tutorial for new users who haven't completed it
      if (!hasCompleted) {
        set({
          isActive: true,
          currentStep: 'welcome',
        })
      }
    } catch (error) {
      console.error('Error initializing tutorial state:', error)
      set({ isLoading: false })
    }
  },

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
  skipTutorial: () => {
    markTutorialCompleted()
    set({
      isActive: false,
      currentStep: null,
      hasCompletedTutorial: true,
    })
  },

  // Complete the tutorial successfully
  completeTutorial: () => {
    markTutorialCompleted()
    set({
      isActive: false,
      currentStep: null,
      hasCompletedTutorial: true,
    })
  },

  // Reset tutorial state (for "Replay Tutorial" in Settings)
  resetTutorial: () => {
    clearTutorialCompletion()
    set({
      isActive: false,
      currentStep: null,
      hasCompletedTutorial: false,
    })
  },
}))
