import { act, renderHookWithProviders } from '~/test/test-utils'
import { type TutorialStep, useTutorialStore } from '~/stores/tutorialStore'
import { useTutorialAdvancement } from '../useTutorialAdvancement'

function setTutorialStep(step: TutorialStep) {
  act(() => {
    useTutorialStore.setState({
      isActive: true,
      currentStep: step,
      hasCompletedTutorial: false,
      isLoading: false,
      isOverlayHidden: false,
    })
  })
}

describe('useTutorialAdvancement', () => {
  beforeEach(() => {
    useTutorialStore.setState({
      isActive: false,
      currentStep: null,
      hasCompletedTutorial: false,
      isLoading: false,
      isOverlayHidden: false,
    })
  })

  it('moves through the passive planning steps in order', () => {
    const { result } = renderHookWithProviders(() => useTutorialAdvancement())

    setTutorialStep('task_title')
    act(() => result.current.advanceFromTitleInput())
    expect(useTutorialStore.getState().currentStep).toBe('task_category')

    act(() => result.current.advanceFromCategorySelector())
    expect(useTutorialStore.getState().currentStep).toBe('task_priority')

    act(() => result.current.advanceFromMoreCategoriesButton())
    expect(useTutorialStore.getState().currentStep).toBe('task_priority')
  })

  it('moves from priority to reminder before task submission', () => {
    const { result } = renderHookWithProviders(() => useTutorialAdvancement())

    setTutorialStep('task_priority')
    act(() => result.current.advanceFromPrioritySelector('top'))
    expect(useTutorialStore.getState().currentStep).toBe('task_reminder')

    act(() => result.current.advanceFromDayToggle())
    expect(useTutorialStore.getState().currentStep).toBe('task_submit')
  })

  it('can advance after category setup without storing created IDs', () => {
    const { result } = renderHookWithProviders(() => useTutorialAdvancement())

    setTutorialStep('task_category')
    act(() => result.current.advanceFromCreateCategory())

    expect(useTutorialStore.getState()).toMatchObject({
      currentStep: 'task_priority',
    })
  })
})
