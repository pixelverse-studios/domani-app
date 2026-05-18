import React from 'react'

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

    fireEvent.press(screen.getByText('Got it'))

    await waitFor(() => {
      expect(useTutorialStore.getState().currentStep).toBe('complete_form')
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

    fireEvent.press(screen.getByText('Got it'))

    await waitFor(() => {
      expect(useTutorialStore.getState()).toMatchObject({
        isActive: false,
        currentStep: null,
        hasCompletedTutorial: true,
      })
    })
  })

  it('falls forward when an optional target is missing', async () => {
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

    await waitFor(() => {
      expect(useTutorialStore.getState().currentStep).toBe('priority_selector')
    })
  })
})
