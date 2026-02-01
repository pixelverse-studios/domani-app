import { useCallback } from 'react'

import { useAnalytics } from '~/providers/AnalyticsProvider'
import { TutorialStep, useTutorialStore } from '~/stores/tutorialStore'

/**
 * Step number mapping for analytics
 * Groups related steps together for clearer funnel analysis
 */
const STEP_NUMBERS: Record<TutorialStep, number> = {
  welcome: 1,
  plan_today_button: 2,
  today_add_task_button: 2, // Alternative entry point
  title_input: 3,
  category_selector: 4,
  create_category: 4,
  more_categories_button: 4,
  priority_selector: 5,
  top_priority: 5,
  day_toggle: 6,
  complete_form: 6,
  task_created: 7,
  today_screen: 8,
  cleanup: 9,
  completion: 9,
  settings_categories: 10,
  settings_reminders: 11,
}

/**
 * Hook for tracking tutorial analytics events.
 * Provides methods for tracking tutorial starts, step progression, skips, and completions.
 */
export function useTutorialAnalytics() {
  const { track } = useAnalytics()

  // Get analytics state and actions from store (shared across components)
  const analyticsStartTime = useTutorialStore((state) => state.analyticsStartTime)
  const setAnalyticsStartTime = useTutorialStore((state) => state.setAnalyticsStartTime)
  const addAnalyticsViewedStep = useTutorialStore((state) => state.addAnalyticsViewedStep)
  const resetAnalyticsState = useTutorialStore((state) => state.resetAnalyticsState)

  /**
   * Track tutorial start event.
   * Called when user explicitly starts the tutorial (clicks "Let's Go" or replays from Settings),
   * not on passive auto-start when welcome screen appears.
   */
  const trackTutorialStarted = useCallback(
    (source: 'onboarding' | 'settings') => {
      setAnalyticsStartTime(Date.now())
      track('tutorial_started', { source })
    },
    [setAnalyticsStartTime, track]
  )

  /**
   * Track step view event (only fires once per step)
   */
  const trackStepViewed = useCallback(
    (step: TutorialStep) => {
      // addAnalyticsViewedStep returns false if already tracked
      const isNewStep = addAnalyticsViewedStep(step)
      if (!isNewStep) return

      track('tutorial_step_viewed', {
        step,
        step_number: STEP_NUMBERS[step],
      })
    },
    [addAnalyticsViewedStep, track]
  )

  /**
   * Track tutorial skip event
   */
  const trackTutorialSkipped = useCallback(
    (lastStep: TutorialStep) => {
      track('tutorial_skipped', {
        last_step: lastStep,
        step_number: STEP_NUMBERS[lastStep],
      })

      // Reset analytics state
      resetAnalyticsState()
    },
    [resetAnalyticsState, track]
  )

  /**
   * Track tutorial completion event with duration
   */
  const trackTutorialCompleted = useCallback(() => {
    const durationSeconds = analyticsStartTime
      ? Math.round((Date.now() - analyticsStartTime) / 1000)
      : 0

    track('tutorial_completed', { duration_seconds: durationSeconds })

    // Reset analytics state
    resetAnalyticsState()
  }, [analyticsStartTime, resetAnalyticsState, track])

  /**
   * Track tutorial task creation
   */
  const trackTutorialTaskCreated = useCallback(() => {
    track('tutorial_task_created')
  }, [track])

  /**
   * Track tutorial category creation
   */
  const trackTutorialCategoryCreated = useCallback(() => {
    track('tutorial_category_created')
  }, [track])

  /**
   * Reset tracking state (called when replaying tutorial)
   */
  const resetTracking = useCallback(() => {
    resetAnalyticsState()
  }, [resetAnalyticsState])

  return {
    trackTutorialStarted,
    trackStepViewed,
    trackTutorialSkipped,
    trackTutorialCompleted,
    trackTutorialTaskCreated,
    trackTutorialCategoryCreated,
    resetTracking,
  }
}
