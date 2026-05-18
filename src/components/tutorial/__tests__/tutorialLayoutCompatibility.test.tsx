import React from 'react'
import fs from 'node:fs'
import path from 'node:path'

import { act, fireEvent, renderWithProviders, screen, waitFor } from '~/test/test-utils'
import { TASK_LAYOUTS, type TaskLayout, useLayoutStore } from '~/stores/layoutStore'
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

const PROJECT_ROOT = process.cwd()

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8')
}

function visibleMeasurements(): Record<TutorialStep, TutorialTargetMeasurement | null> {
  return Object.fromEntries(
    TUTORIAL_STEPS.map((step) => [
      step,
      step === 'welcome' ? null : { x: 24, y: 120, width: 180, height: 48 },
    ]),
  ) as Record<TutorialStep, TutorialTargetMeasurement | null>
}

function resetTutorialAt(step: TutorialStep) {
  useTutorialStore.setState({
    isActive: true,
    currentStep: step,
    hasCompletedTutorial: false,
    isLoading: false,
    isOverlayHidden: false,
    targetMeasurements: visibleMeasurements(),
  })
}

async function advanceTo(expectedStep: TutorialStep) {
  fireEvent.press(screen.getByText('Next'))

  await waitFor(() => {
    expect(useTutorialStore.getState().currentStep).toBe(expectedStep)
  })

  if (expectedStep !== 'complete') {
    act(() => {
      useTutorialStore
        .getState()
        .setTargetMeasurement(expectedStep, { x: 24, y: 120, width: 180, height: 48 })
    })

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeTruthy()
    })
  }
}

describe('tutorial layout compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useLayoutStore.setState({ taskLayout: 'default' })
    useTutorialStore.setState({
      isActive: false,
      currentStep: null,
      hasCompletedTutorial: false,
      isLoading: false,
      isOverlayHidden: false,
      targetMeasurements: visibleMeasurements(),
    })
  })

  it.each(TASK_LAYOUTS.map((layout) => layout.id))(
    'completes the passive walkthrough while %s layout is selected',
    async (taskLayout: TaskLayout) => {
      useLayoutStore.setState({ taskLayout })
      resetTutorialAt('today_primary_action')

      renderWithProviders(<TutorialSpotlight />)

      await advanceTo('planning_form')
      await advanceTo('task_title')
      await advanceTo('task_category')
      await advanceTo('task_priority')
      await advanceTo('task_reminder')
      await advanceTo('task_submit')
      await advanceTo('complete')

      fireEvent.press(screen.getByText('Done'))

      await waitFor(() => {
        expect(useTutorialStore.getState()).toMatchObject({
          isActive: false,
          currentStep: null,
          hasCompletedTutorial: true,
        })
      })
      expect(useLayoutStore.getState().taskLayout).toBe(taskLayout)
    },
  )

  it('keeps Today tutorial targets available for empty and populated task states', () => {
    expect(readSource('src/app/(tabs)/index.tsx')).not.toContain('useTutorialTarget')
    expect(readSource('src/components/today/NewUserEmptyState.tsx')).toContain(
      "useTutorialTarget('today_primary_action')",
    )
    expect(readSource('src/components/today/AddTaskButton.tsx')).toContain(
      "useTutorialTarget('today_primary_action')",
    )
  })

  it('does not anchor tutorial targets to layout-specific task card internals', () => {
    const taskCardSources = [
      'src/components/planning/TaskCard.tsx',
      'src/components/planning/task-layouts/CompactTaskCard.tsx',
      'src/components/planning/task-layouts/MinimalTaskCard.tsx',
      'src/components/planning/task-layouts/DetailedTaskCard.tsx',
      'src/components/planning/task-layouts/GridTaskCard.tsx',
      'src/components/planning/task-layouts/ChecklistTaskCard.tsx',
      'src/components/planning/TaskList.tsx',
      'src/components/today/TaskList.tsx',
      'src/components/today/CompletedSection.tsx',
      'src/components/today/FocusCard.tsx',
      'src/components/today/ProgressCard.tsx',
    ]

    for (const relativePath of taskCardSources) {
      expect(readSource(relativePath)).not.toContain('useTutorialTarget')
    }
  })
})
