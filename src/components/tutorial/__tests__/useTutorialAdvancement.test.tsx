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
      tutorialCategoryId: null,
      tutorialTaskId: null,
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
      tutorialCategoryId: null,
      tutorialTaskId: null,
    })
  })

  it('moves through the passive planning steps in order', () => {
    const { result } = renderHookWithProviders(() => useTutorialAdvancement())

    setTutorialStep('title_input')
    act(() => result.current.advanceFromTitleInput())
    expect(useTutorialStore.getState().currentStep).toBe('category_selector')

    act(() => result.current.advanceFromCategorySelector())
    expect(useTutorialStore.getState().currentStep).toBe('more_categories_button')

    act(() => result.current.advanceFromMoreCategoriesButton())
    expect(useTutorialStore.getState().currentStep).toBe('priority_selector')
  })

  it('treats top priority as an informational stop before task completion', () => {
    const { result } = renderHookWithProviders(() => useTutorialAdvancement())

    setTutorialStep('priority_selector')
    act(() => result.current.advanceFromPrioritySelector('top'))
    expect(useTutorialStore.getState().currentStep).toBe('top_priority')

    act(() => result.current.advanceFromTopPriority())
    expect(useTutorialStore.getState().currentStep).toBe('complete_form')
  })

  it('can advance after creating a category without storing created IDs', () => {
    const { result } = renderHookWithProviders(() => useTutorialAdvancement())

    setTutorialStep('category_selector')
    act(() => result.current.advanceFromCreateCategory())

    expect(useTutorialStore.getState()).toMatchObject({
      currentStep: 'more_categories_button',
      tutorialCategoryId: null,
      tutorialTaskId: null,
    })
  })
})
