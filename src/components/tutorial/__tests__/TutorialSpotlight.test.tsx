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
    setSpotlightStep('task_priority')

    renderWithProviders(<TutorialSpotlight />)

    fireEvent.press(screen.getByText('Next'))

    await waitFor(() => {
      expect(useTutorialStore.getState().currentStep).toBe('task_reminder')
    })
  })

  it('moves back to the previous passive step', async () => {
    setSpotlightStep('task_priority')

    renderWithProviders(<TutorialSpotlight />)

    fireEvent.press(screen.getByText('Back'))

    await waitFor(() => {
      expect(useTutorialStore.getState().currentStep).toBe('task_category')
    })
  })

  it('navigates when moving back across tutorial screens', async () => {
    setSpotlightStep('planning_form')

    renderWithProviders(<TutorialSpotlight />)

    fireEvent.press(screen.getByText('Back'))

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)/')
      expect(useTutorialStore.getState().currentStep).toBe('today_primary_action')
    })
  })

  it('navigates to Planning before advancing from the Today CTA step', async () => {
    setSpotlightStep('today_primary_action')

    renderWithProviders(<TutorialSpotlight />)

    fireEvent.press(screen.getByText('Next'))

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith(
        '/(tabs)/planning?defaultPlanningFor=tomorrow&openForm=true',
      )
      expect(useTutorialStore.getState().currentStep).toBe('planning_form')
    })
  })

  it('navigates back to Today when returning from the planning form step', async () => {
    setSpotlightStep('planning_form')

    renderWithProviders(<TutorialSpotlight />)

    fireEvent.press(screen.getByText('Back'))

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)/')
      expect(useTutorialStore.getState().currentStep).toBe('today_primary_action')
    })
  })

  it('skips and completes the tutorial from the overlay', async () => {
    setSpotlightStep('task_priority')

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
    setSpotlightStep('complete')

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
        currentStep: 'complete',
        hasCompletedTutorial: false,
        isLoading: false,
        isOverlayHidden: false,
        targetMeasurements: emptyMeasurements(),
      })
    })

    renderWithProviders(<TutorialSpotlight />)

    expect(screen.getByText('You’re Ready')).toBeTruthy()

    fireEvent.press(screen.getByText('Done'))

    await waitFor(() => {
      expect(useTutorialStore.getState()).toMatchObject({
        isActive: false,
        currentStep: null,
        hasCompletedTutorial: true,
      })
    })
  })
})
