import { create } from 'zustand'

import { supabase } from '~/lib/supabase'

/**
 * Tutorial steps in order of progression
 * Core planning loop walkthrough. Steps target stable layout surfaces and never
 * require the user to create data during the tutorial.
 */
export type TutorialStep =
  | 'welcome'
  | 'today_primary_action'
  | 'planning_form'
  | 'task_title'
  | 'task_category'
  | 'task_priority'
  | 'task_reminder'
  | 'task_submit'
  | 'complete'

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  'welcome',
  'today_primary_action',
  'planning_form',
  'task_title',
  'task_category',
  'task_priority',
  'task_reminder',
  'task_submit',
  'complete',
]

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

  // Analytics tracking state (shared across components)
  analyticsStartTime: number | null
  analyticsViewedSteps: Set<TutorialStep>

  // Target element measurements for spotlight positioning
  targetMeasurements: Record<TutorialStep, TutorialTargetMeasurement | null>

  // Actions
  initializeTutorialState: (userId: string) => Promise<void>
  startTutorial: () => void
  nextStep: (step?: TutorialStep) => void
  previousStep: () => void
  skipTutorial: () => void
  completeTutorial: () => void
  resetTutorial: () => void

  // Soft timeout actions
  pauseTutorial: () => void
  resumeOrRestart: () => void

  // Overlay visibility actions
  hideOverlay: () => void
  showOverlay: () => void

  // Target measurement actions
  setTargetMeasurement: (step: TutorialStep, measurement: TutorialTargetMeasurement | null) => void

  // Analytics tracking actions
  setAnalyticsStartTime: (time: number | null) => void
  addAnalyticsViewedStep: (step: TutorialStep) => boolean // Returns false if already viewed
  resetAnalyticsState: () => void
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

  analyticsStartTime: null,
  analyticsViewedSteps: new Set<TutorialStep>(),
  targetMeasurements: {
    welcome: null,
    today_primary_action: null,
    planning_form: null,
    task_title: null,
    task_category: null,
    task_priority: null,
    task_reminder: null,
    task_submit: null,
    complete: null,
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
      // Note: Analytics tracking (tutorial_started) happens in WelcomeOverlay when user
      // clicks "Let's Go", not here. We track explicit engagement, not passive exposure.
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

  // Advance through the ordered passive walkthrough, or jump to a supplied step
  // for existing navigation call sites while the tutorial UI is being migrated.
  nextStep: (step) =>
    set((state) => {
      if (step) {
        return {
          currentStep: step,
          isOverlayHidden: false,
        }
      }

      if (!state.currentStep) {
        return {
          currentStep: 'welcome',
          isOverlayHidden: false,
        }
      }

      const currentIndex = TUTORIAL_STEPS.indexOf(state.currentStep)
      const nextStepValue = TUTORIAL_STEPS[currentIndex + 1] ?? state.currentStep

      return {
        currentStep: nextStepValue,
        isOverlayHidden: false,
      }
    }),

  previousStep: () =>
    set((state) => {
      if (!state.currentStep) {
        return {
          currentStep: 'welcome',
          isOverlayHidden: false,
        }
      }

      const currentIndex = TUTORIAL_STEPS.indexOf(state.currentStep)
      const previousStepValue = TUTORIAL_STEPS[Math.max(currentIndex - 1, 0)] ?? 'welcome'

      return {
        currentStep: previousStepValue,
        isOverlayHidden: false,
      }
    }),

  // Skip the tutorial entirely
  skipTutorial: () => {
    markTutorialCompleted().catch((err) =>
      console.error('Failed to save tutorial completion:', err),
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
      console.error('Failed to save tutorial completion:', err),
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
      console.error('Failed to clear tutorial completion:', err),
    )
    set({
      isActive: true,
      currentStep: 'welcome',
      hasCompletedTutorial: false,
      isOverlayHidden: false,
      pausedAt: null,
      pausedStep: null,
      abandonCount: 0,
      analyticsStartTime: null,
      analyticsViewedSteps: new Set<TutorialStep>(),
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
      // Also reset analytics state so duration tracking starts fresh
      const newAbandonCount = abandonCount + 1
      set({
        isActive: true,
        currentStep: 'welcome',
        pausedAt: null,
        pausedStep: null,
        isOverlayHidden: false,
        abandonCount: newAbandonCount,
        analyticsStartTime: null,
        analyticsViewedSteps: new Set(),
      })

      // Log if they're frequently abandoning (could show different UI)
      if (__DEV__ && newAbandonCount >= MAX_ABANDON_COUNT) {
        console.log('User has abandoned tutorial multiple times')
      }
    }
  },

  // Hide overlay temporarily (while waiting for user interaction)
  hideOverlay: () => set({ isOverlayHidden: true }),

  // Show overlay again
  showOverlay: () => set({ isOverlayHidden: false }),

  // Set measurement for a target element
  setTargetMeasurement: (step, measurement) =>
    set((state) => ({
      targetMeasurements: {
        ...state.targetMeasurements,
        [step]: measurement,
      },
    })),

  // Set analytics start time
  setAnalyticsStartTime: (time) => set({ analyticsStartTime: time }),

  // Add a viewed step, returns false if already viewed
  addAnalyticsViewedStep: (step) => {
    const { analyticsViewedSteps } = get()
    if (analyticsViewedSteps.has(step)) {
      return false
    }
    const newSet = new Set(analyticsViewedSteps)
    newSet.add(step)
    set({ analyticsViewedSteps: newSet })
    return true
  },

  // Reset analytics tracking state
  resetAnalyticsState: () =>
    set({
      analyticsStartTime: null,
      analyticsViewedSteps: new Set<TutorialStep>(),
    }),
}))
