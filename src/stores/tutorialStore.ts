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
  | 'more_categories_button'
  | 'priority_selector'
  | 'top_priority'
  | 'day_toggle'
  | 'complete_form'
  | 'task_created'
  | 'today_screen'
  | 'cleanup'
  | 'completion'

/**
 * Position and dimensions of a tutorial target element
 */
export interface TutorialTargetMeasurement {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Timeout threshold for soft resume (in milliseconds)
 * Under this: resume from current step
 * Over this: restart from welcome
 */
const SOFT_TIMEOUT_MS = 30_000 // 30 seconds

/**
 * Number of abandons before showing "want to skip?" prompt
 */
const MAX_ABANDON_COUNT = 3

interface TutorialStore {
  // State
  isActive: boolean
  currentStep: TutorialStep | null
  hasCompletedTutorial: boolean
  isLoading: boolean
  isOverlayHidden: boolean

  // Soft timeout state
  pausedAt: number | null // Timestamp when user left tutorial context
  pausedStep: TutorialStep | null // Step they were on when paused
  abandonCount: number // How many times they've abandoned and restarted

  // Tutorial data created during the flow
  tutorialCategoryId: string | null
  tutorialTaskId: string | null

  // Target element measurements for spotlight positioning
  targetMeasurements: Record<TutorialStep, TutorialTargetMeasurement | null>

  // Actions
  initializeTutorialState: (userId: string) => Promise<void>
  startTutorial: () => void
  nextStep: (step: TutorialStep) => void
  skipTutorial: () => void
  completeTutorial: () => void
  resetTutorial: () => void

  // Soft timeout actions
  pauseTutorial: () => void
  resumeOrRestart: () => void

  // Overlay visibility actions
  hideOverlay: () => void
  showOverlay: () => void

  // Tutorial data actions
  setTutorialCategoryId: (id: string) => void
  setTutorialTaskId: (id: string) => void
  clearTutorialData: () => void

  // Target measurement actions
  setTargetMeasurement: (step: TutorialStep, measurement: TutorialTargetMeasurement | null) => void
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

// Guard to prevent race conditions during initialization
const initState = { isInitializing: false }

export const useTutorialStore = create<TutorialStore>()((set, get) => ({
  // Initial state
  isActive: false,
  currentStep: null,
  hasCompletedTutorial: false,
  isLoading: true,
  isOverlayHidden: false,

  // Soft timeout state
  pausedAt: null,
  pausedStep: null,
  abandonCount: 0,

  tutorialCategoryId: null,
  tutorialTaskId: null,
  targetMeasurements: {
    welcome: null,
    add_task_button: null,
    title_input: null,
    category_selector: null,
    create_category: null,
    more_categories_button: null,
    priority_selector: null,
    top_priority: null,
    day_toggle: null,
    complete_form: null,
    task_created: null,
    today_screen: null,
    cleanup: null,
    completion: null,
  },

  // Initialize tutorial state from database
  initializeTutorialState: async (userId: string) => {
    if (initState.isInitializing) return
    initState.isInitializing = true

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
    } finally {
      initState.isInitializing = false
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
      isOverlayHidden: false,
    }),

  // Skip the tutorial entirely
  skipTutorial: () => {
    markTutorialCompleted().catch((err) =>
      console.error('Failed to save tutorial completion:', err)
    )
    set({
      isActive: false,
      currentStep: null,
      hasCompletedTutorial: true,
    })
  },

  // Complete the tutorial successfully
  completeTutorial: () => {
    markTutorialCompleted().catch((err) =>
      console.error('Failed to save tutorial completion:', err)
    )
    set({
      isActive: false,
      currentStep: null,
      hasCompletedTutorial: true,
    })
  },

  // Reset tutorial state and start it (for "Replay Tutorial" in Settings)
  resetTutorial: () => {
    clearTutorialCompletion().catch((err) =>
      console.error('Failed to clear tutorial completion:', err)
    )
    set({
      isActive: true,
      currentStep: 'welcome',
      hasCompletedTutorial: false,
      isOverlayHidden: false,
      tutorialCategoryId: null,
      tutorialTaskId: null,
      pausedAt: null,
      pausedStep: null,
      abandonCount: 0,
    })
  },

  // Pause tutorial when user leaves context (navigates away, app backgrounds)
  pauseTutorial: () => {
    const { isActive, currentStep, hasCompletedTutorial } = get()

    // Only pause if tutorial is actively in progress
    if (!isActive || !currentStep || hasCompletedTutorial) return

    // Don't pause if already on welcome (nothing to resume to)
    if (currentStep === 'welcome') return

    set({
      isActive: false,
      pausedAt: Date.now(),
      pausedStep: currentStep,
    })
  },

  // Resume or restart tutorial based on time elapsed
  resumeOrRestart: () => {
    const { pausedAt, pausedStep, hasCompletedTutorial, abandonCount } = get()

    // Already completed = do nothing
    if (hasCompletedTutorial) return

    // Never paused or no step to resume = nothing to do
    // (initializeTutorialState handles fresh starts)
    if (!pausedAt || !pausedStep) return

    const elapsedMs = Date.now() - pausedAt

    if (elapsedMs < SOFT_TIMEOUT_MS) {
      // Resume where they left off
      set({
        isActive: true,
        currentStep: pausedStep,
        pausedAt: null,
        pausedStep: null,
        isOverlayHidden: false,
      })
    } else {
      // Too long - restart fresh, increment abandon count
      const newAbandonCount = abandonCount + 1
      set({
        isActive: true,
        currentStep: 'welcome',
        pausedAt: null,
        pausedStep: null,
        isOverlayHidden: false,
        abandonCount: newAbandonCount,
      })

      // Log if they're frequently abandoning (could show different UI)
      if (newAbandonCount >= MAX_ABANDON_COUNT) {
        console.log('User has abandoned tutorial multiple times')
      }
    }
  },

  // Hide overlay temporarily (while waiting for user interaction)
  hideOverlay: () => set({ isOverlayHidden: true }),

  // Show overlay again
  showOverlay: () => set({ isOverlayHidden: false }),

  // Set the category ID created during tutorial
  setTutorialCategoryId: (id: string) => set({ tutorialCategoryId: id }),

  // Set the task ID created during tutorial
  setTutorialTaskId: (id: string) => set({ tutorialTaskId: id }),

  // Clear tutorial data (category/task IDs)
  clearTutorialData: () =>
    set({
      tutorialCategoryId: null,
      tutorialTaskId: null,
    }),

  // Set measurement for a target element
  setTargetMeasurement: (step, measurement) =>
    set((state) => ({
      targetMeasurements: {
        ...state.targetMeasurements,
        [step]: measurement,
      },
    })),
}))
