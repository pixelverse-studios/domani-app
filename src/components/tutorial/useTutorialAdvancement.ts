import { useCallback } from 'react'

import { useTutorialStore, TutorialStep } from '~/stores/tutorialStore'

/**
 * Hook for auto-advancing the tutorial based on user interactions.
 * Call the appropriate advance function when the user completes an action.
 */
export function useTutorialAdvancement() {
  const { isActive, currentStep, nextStep } = useTutorialStore()

  /**
   * Advance the tutorial when the user taps "Plan Today" or "Add More Tasks" button on Today screen
   */
  const advanceFromTodayButton = useCallback(() => {
    if (isActive && (currentStep === 'plan_today_button' || currentStep === 'today_add_task_button')) {
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
   * Advance the tutorial when the user selects any category (existing or newly created).
   * Goes to more_categories_button to teach users about the category sheet.
   */
  const advanceFromCategorySelector = useCallback(() => {
    if (isActive && currentStep === 'category_selector') {
      nextStep('more_categories_button')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance from category_selector step after user creates a new category.
   * Goes to more_categories_button to teach users about the category sheet.
   */
  const advanceFromCreateCategory = useCallback(() => {
    if (isActive && currentStep === 'category_selector') {
      nextStep('more_categories_button')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance from more categories button when user opens the category sheet.
   */
  const advanceFromMoreCategoriesButton = useCallback(() => {
    if (isActive && currentStep === 'more_categories_button') {
      nextStep('priority_selector')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance the tutorial when the user selects a priority
   * If they select TOP, show the top_priority info step first
   * Otherwise, go to complete_form to prompt user to finish
   */
  const advanceFromPrioritySelector = useCallback(
    (priority: string) => {
      if (!isActive) return

      if (currentStep === 'priority_selector') {
        if (priority === 'top') {
          // Show extra info about MIT (Most Important Task)
          nextStep('top_priority')
        } else {
          // Go to complete_form step to prompt user to finish the task
          nextStep('complete_form')
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
      // Go to complete_form step to prompt user to finish the task
      nextStep('complete_form')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance from complete_form step when user submits the form (creates task)
   * Goes to task_created to highlight the newly created task
   */
  const advanceFromCompleteForm = useCallback(() => {
    if (isActive && currentStep === 'complete_form') {
      nextStep('task_created')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance from task_created step to navigate to Today screen
   */
  const advanceFromTaskCreated = useCallback(() => {
    if (isActive && currentStep === 'task_created') {
      nextStep('today_screen')
    }
  }, [isActive, currentStep, nextStep])

  /**
   * Advance from today_screen step to completion
   * Called when user taps "Got it" on the Today screen focus card highlight
   */
  const advanceFromTodayScreen = useCallback(() => {
    if (isActive && currentStep === 'today_screen') {
      nextStep('completion')
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
    advanceFromTodayButton,
    advanceFromTitleInput,
    advanceFromCategorySelector,
    advanceFromCreateCategory,
    advanceFromMoreCategoriesButton,
    advanceFromPrioritySelector,
    advanceFromTopPriority,
    advanceFromCompleteForm,
    advanceFromTaskCreated,
    advanceFromTodayScreen,
    advanceFromDayToggle,
  }
}
