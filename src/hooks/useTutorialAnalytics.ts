import { useCallback, useRef } from 'react'

import { useAnalytics } from '~/providers/AnalyticsProvider'
import { TutorialStep } from '~/stores/tutorialStore'

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

  // Track tutorial start time for duration calculation
  const startTimeRef = useRef<number | null>(null)

  // Track which steps have been viewed to avoid duplicate events
  const viewedStepsRef = useRef<Set<TutorialStep>>(new Set())

  /**
   * Track tutorial start event
   */
  const trackTutorialStarted = useCallback(
    (source: 'onboarding' | 'settings') => {
      startTimeRef.current = Date.now()
      viewedStepsRef.current.clear()
      track('tutorial_started', { source })
    },
    [track]
  )

  /**
   * Track step view event (only fires once per step)
   */
  const trackStepViewed = useCallback(
    (step: TutorialStep) => {
      // Skip if already tracked this step in this session
      if (viewedStepsRef.current.has(step)) return

      viewedStepsRef.current.add(step)
      track('tutorial_step_viewed', {
        step,
        step_number: STEP_NUMBERS[step],
      })
    },
    [track]
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

      // Reset refs
      startTimeRef.current = null
      viewedStepsRef.current.clear()
    },
    [track]
  )

  /**
   * Track tutorial completion event with duration
   */
  const trackTutorialCompleted = useCallback(() => {
    const startTime = startTimeRef.current
    const durationSeconds = startTime ? Math.round((Date.now() - startTime) / 1000) : 0

    track('tutorial_completed', { duration_seconds: durationSeconds })

    // Reset refs
    startTimeRef.current = null
    viewedStepsRef.current.clear()
  }, [track])

  /**
   * Track tutorial task creation
   */
  const trackTutorialTaskCreated = useCallback(
    (taskId: string) => {
      track('tutorial_task_created', { task_id: taskId })
    },
    [track]
  )

  /**
   * Track tutorial category creation
   */
  const trackTutorialCategoryCreated = useCallback(
    (categoryId: string) => {
      track('tutorial_category_created', { category_id: categoryId })
    },
    [track]
  )

  /**
   * Reset tracking state (called when replaying tutorial)
   */
  const resetTracking = useCallback(() => {
    startTimeRef.current = null
    viewedStepsRef.current.clear()
  }, [])

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
