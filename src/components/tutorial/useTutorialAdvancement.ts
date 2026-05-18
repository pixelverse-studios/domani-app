import { useCallback } from 'react'

import { useTutorialStore, TutorialStep } from '~/stores/tutorialStore'

/**
 * Hook for auto-advancing the tutorial based on user interactions.
 * Call the appropriate advance function when the user completes an action.
 */
export function useTutorialAdvancement() {
  const { isActive, currentStep, nextStep } = useTutorialStore()

  /**
   * Advance the tutorial when the user taps the primary action on Today.
   */
  const advanceFromTodayButton = useCallback(() => {
    if (isActive && currentStep === 'today_primary_action') {
      nextStep('planning_form')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance the tutorial when the user finishes typing in the title input.
   * Called on blur (when user taps elsewhere) rather than on every keystroke.
   */
  const advanceFromTitleInput = useCallback(() => {
    if (isActive && currentStep === 'task_title') {
      nextStep('task_category')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance the tutorial when the user selects any category.
   */
  const advanceFromCategorySelector = useCallback(() => {
    if (isActive && currentStep === 'task_category') {
      nextStep('task_priority')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance from task_category after user creates a new category.
   */
  const advanceFromCreateCategory = useCallback(() => {
    if (isActive && currentStep === 'task_category') {
      nextStep('task_priority')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance from more categories button when user opens the category sheet.
   */
  const advanceFromMoreCategoriesButton = useCallback(() => {
    if (isActive && currentStep === 'task_category') {
      nextStep('task_priority')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance the tutorial when the user selects a priority.
   */
  const advanceFromPrioritySelector = useCallback(
    (_priority: string) => {
      if (!isActive) return

      if (currentStep === 'task_priority') {
        nextStep('task_reminder')
      }
    },
    [isActive, currentStep, nextStep],
  )

  /**
   * Backward-compatible helper for older priority call sites.
   */
  const advanceFromTopPriority = useCallback(() => {
    if (isActive && currentStep === 'task_priority') {
      nextStep('task_reminder')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance from task_submit step to completion.
   */
  const advanceFromCompleteForm = useCallback(() => {
    if (isActive && currentStep === 'task_submit') {
      nextStep('complete')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance from complete step if an older call site invokes this helper.
   */
  const advanceFromTodayScreen = useCallback(() => {
    if (isActive && currentStep === 'complete') {
      nextStep()
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance the tutorial when the user interacts with the day toggle
   * (This is optional - user may skip this)
   */
  const advanceFromDayToggle = useCallback(() => {
    if (isActive && currentStep === 'task_reminder') {
      nextStep('task_submit')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Check if we should highlight a specific step
   */
  const shouldHighlight = useCallback(
    (step: TutorialStep) => {
      return isActive && currentStep === step
    },
    [isActive, currentStep],
  )

  return {
    isActive,
    currentStep,
    shouldHighlight,
    advanceFromTodayButton,
    advanceFromTitleInput,
    advanceFromCategorySelector,
    advanceFromCreateCategory,
    advanceFromMoreCategoriesButton,
    advanceFromPrioritySelector,
    advanceFromTopPriority,
    advanceFromCompleteForm,
    advanceFromTodayScreen,
    advanceFromDayToggle,
  }
}
