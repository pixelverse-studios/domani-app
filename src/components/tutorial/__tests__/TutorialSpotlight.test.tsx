import React from 'react'
import { router } from 'expo-router'

import { act, fireEvent, renderWithProviders, screen, waitFor } from '~/test/test-utils'
import {
  TUTORIAL_STEPS,
  type TutorialStep,
  type TutorialTargetMeasurement,
  useTutorialStore,
} from '~/stores/tutorialStore'
import { TutorialSpotlight } from '../TutorialSpotlight'

jest.mock('~/hooks/useTutorialAnalytics', () => ({
  useTutorialAnalytics: jest.fn(() => ({
    trackStepViewed: jest.fn(),
    trackTutorialSkipped: jest.fn(),
    trackTutorialCompleted: jest.fn(),
  })),
}))

function emptyMeasurements(): Record<TutorialStep, TutorialTargetMeasurement | null> {
  return Object.fromEntries(TUTORIAL_STEPS.map((step) => [step, null])) as Record<
    TutorialStep,
    TutorialTargetMeasurement | null
  >
}

function visibleMeasurements(
  step: TutorialStep,
): Record<TutorialStep, TutorialTargetMeasurement | null> {
  return {
    ...emptyMeasurements(),
    [step]: { x: 24, y: 120, width: 180, height: 48 },
  }
}

function setSpotlightStep(step: TutorialStep) {
  act(() => {
    useTutorialStore.setState({
      isActive: true,
      currentStep: step,
      hasCompletedTutorial: false,
      isLoading: false,
      isOverlayHidden: false,
      targetMeasurements: visibleMeasurements(step),
    })
  })
}

describe('TutorialSpotlight', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useTutorialStore.setState({
      isActive: false,
      currentStep: null,
      hasCompletedTutorial: false,
      isLoading: false,
      isOverlayHidden: false,
      targetMeasurements: emptyMeasurements(),
    })
  })

  it('advances overlay controls to the next passive step', async () => {
    setSpotlightStep('top_priority')

    renderWithProviders(<TutorialSpotlight />)

    fireEvent.press(screen.getByText('Next'))

    await waitFor(() => {
      expect(useTutorialStore.getState().currentStep).toBe('day_toggle')
    })
  })

  it('moves back to the previous passive step', async () => {
    setSpotlightStep('priority_selector')

    renderWithProviders(<TutorialSpotlight />)

    fireEvent.press(screen.getByText('Back'))

    await waitFor(() => {
      expect(useTutorialStore.getState().currentStep).toBe('more_categories_button')
    })
  })

  it('navigates when moving back across tutorial screens', async () => {
    setSpotlightStep('settings_categories')

    renderWithProviders(<TutorialSpotlight />)

    fireEvent.press(screen.getByText('Back'))

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)/')
      expect(useTutorialStore.getState().currentStep).toBe('today_screen')
    })
  })

  it('navigates to Planning before advancing from the Today CTA step', async () => {
    setSpotlightStep('today_add_task_button')

    renderWithProviders(<TutorialSpotlight />)

    fireEvent.press(screen.getByText('Next'))

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith(
        '/(tabs)/planning?defaultPlanningFor=tomorrow&openForm=true',
      )
      expect(useTutorialStore.getState().currentStep).toBe('title_input')
    })
  })

  it('navigates back to Today when returning from the planning form title step', async () => {
    setSpotlightStep('title_input')

    renderWithProviders(<TutorialSpotlight />)

    fireEvent.press(screen.getByText('Back'))

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)/')
      expect(useTutorialStore.getState().currentStep).toBe('today_add_task_button')
    })
  })

  it('skips and completes the tutorial from the overlay', async () => {
    setSpotlightStep('priority_selector')

    renderWithProviders(<TutorialSpotlight />)

    fireEvent.press(screen.getByText('Skip tour'))

    await waitFor(() => {
      expect(useTutorialStore.getState()).toMatchObject({
        isActive: false,
        currentStep: null,
        hasCompletedTutorial: true,
      })
    })
  })

  it('marks the tutorial complete from the final done step', async () => {
    setSpotlightStep('settings_reminders')

    renderWithProviders(<TutorialSpotlight />)

    fireEvent.press(screen.getByText('Done'))

    await waitFor(() => {
      expect(useTutorialStore.getState()).toMatchObject({
        isActive: false,
        currentStep: null,
        hasCompletedTutorial: true,
      })
    })
  })

  it('shows fallback content and allows navigation when a target is missing', async () => {
    act(() => {
      useTutorialStore.setState({
        isActive: true,
        currentStep: 'more_categories_button',
        hasCompletedTutorial: false,
        isLoading: false,
        isOverlayHidden: false,
        targetMeasurements: emptyMeasurements(),
      })
    })

    renderWithProviders(<TutorialSpotlight />)

    expect(screen.getByText('See All Categories')).toBeTruthy()

    fireEvent.press(screen.getByText('Next'))

    await waitFor(() => {
      expect(useTutorialStore.getState().currentStep).toBe('priority_selector')
    })
  })
})
