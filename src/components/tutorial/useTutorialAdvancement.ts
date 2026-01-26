import { useCallback } from 'react'

import { useTutorialStore, TutorialStep } from '~/stores/tutorialStore'

/**
 * Hook for auto-advancing the tutorial based on user interactions.
 * Call the appropriate advance function when the user completes an action.
 */
export function useTutorialAdvancement() {
  const { isActive, currentStep, nextStep } = useTutorialStore()

  /**
   * Advance the tutorial when the user taps the "Add Task" button
   */
  const advanceFromAddTaskButton = useCallback(() => {
    if (isActive && currentStep === 'add_task_button') {
      nextStep('title_input')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance the tutorial when the user finishes typing in the title input.
   * Called on blur (when user taps elsewhere) rather than on every keystroke.
   */
  const advanceFromTitleInput = useCallback(() => {
    if (isActive && currentStep === 'title_input') {
      nextStep('category_selector')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance the tutorial when the user selects a category
   */
  const advanceFromCategorySelector = useCallback(() => {
    if (isActive && currentStep === 'category_selector') {
      nextStep('priority_selector')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance when user taps the "+ New" category button (shows create_category step)
   */
  const advanceToCreateCategory = useCallback(() => {
    if (isActive && currentStep === 'category_selector') {
      nextStep('create_category')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance from create category step after user creates a category
   */
  const advanceFromCreateCategory = useCallback(() => {
    if (isActive && currentStep === 'create_category') {
      nextStep('priority_selector')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance the tutorial when the user selects a priority
   * If they select TOP, show the top_priority info step first
   * Otherwise, dismiss the spotlight so user can complete the form
   */
  const advanceFromPrioritySelector = useCallback(
    (priority: string) => {
      if (!isActive) return

      if (currentStep === 'priority_selector') {
        if (priority === 'top') {
          // Show extra info about MIT (Most Important Task)
          nextStep('top_priority')
        } else {
          // Dismiss spotlight - tutorial continues passively until form is submitted
          // The day_toggle step is optional, user can proceed to submit
          nextStep('cleanup')
        }
      }
    },
    [isActive, currentStep, nextStep]
  )

  /**
   * Advance from the top_priority info step (user taps "Next" in spotlight)
   */
  const advanceFromTopPriority = useCallback(() => {
    if (isActive && currentStep === 'top_priority') {
      // Dismiss spotlight - tutorial continues passively until form is submitted
      nextStep('cleanup')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance the tutorial when the user interacts with the day toggle
   * (This is optional - user may skip this)
   */
  const advanceFromDayToggle = useCallback(() => {
    if (isActive && currentStep === 'day_toggle') {
      nextStep('cleanup')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Check if we should highlight a specific step
   */
  const shouldHighlight = useCallback(
    (step: TutorialStep) => {
      return isActive && currentStep === step
    },
    [isActive, currentStep]
  )

  return {
    isActive,
    currentStep,
    shouldHighlight,
    advanceFromAddTaskButton,
    advanceFromTitleInput,
    advanceFromCategorySelector,
    advanceToCreateCategory,
    advanceFromCreateCategory,
    advanceFromPrioritySelector,
    advanceFromTopPriority,
    advanceFromDayToggle,
  }
}
