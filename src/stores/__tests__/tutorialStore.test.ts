import { waitFor } from '~/test/test-utils'
import {
  type TutorialStep,
  type TutorialTargetMeasurement,
  useTutorialStore,
} from '~/stores/tutorialStore'
import { supabase } from '~/lib/supabase'

const tutorialSteps: TutorialStep[] = [
  'welcome',
  'plan_today_button',
  'today_add_task_button',
  'title_input',
  'category_selector',
  'create_category',
  'more_categories_button',
  'priority_selector',
  'top_priority',
  'day_toggle',
  'complete_form',
  'task_created',
  'today_screen',
  'cleanup',
  'completion',
  'settings_categories',
  'settings_reminders',
]

function emptyMeasurements(): Record<TutorialStep, TutorialTargetMeasurement | null> {
  return Object.fromEntries(tutorialSteps.map((step) => [step, null])) as Record<
    TutorialStep,
    TutorialTargetMeasurement | null
  >
}

function resetTutorialStore(overrides: Partial<ReturnType<typeof useTutorialStore.getState>> = {}) {
  useTutorialStore.setState({
    isActive: false,
    currentStep: null,
    hasCompletedTutorial: false,
    isLoading: true,
    isOverlayHidden: false,
    pausedAt: null,
    pausedStep: null,
    abandonCount: 0,
    tutorialCategoryId: null,
    tutorialTaskId: null,
    analyticsStartTime: null,
    analyticsViewedSteps: new Set<TutorialStep>(),
    targetMeasurements: emptyMeasurements(),
    ...overrides,
  })
}

type ProfilesQueryMock = {
  select: jest.Mock<ProfilesQueryMock, [string]>
  update: jest.Mock<ProfilesQueryMock, [unknown]>
  eq: jest.Mock<ProfilesQueryMock, [string, string]>
  single: jest.Mock<Promise<{ data: unknown; error: unknown }>, []>
}

function createProfilesQuery(
  result: { data: unknown; error: unknown } = { data: null, error: null },
) {
  const query: ProfilesQueryMock = {
    select: jest.fn((_columns: string) => query),
    update: jest.fn((_values: unknown) => query),
    eq: jest.fn((_column: string, _value: string) => query),
    single: jest.fn(() => Promise.resolve(result)),
  }

  return query
}

const mockFrom = supabase.from as unknown as jest.Mock
const mockGetUser = supabase.auth.getUser as unknown as jest.Mock

describe('tutorialStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetTutorialStore()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  })

  it('starts the tutorial for users without tutorial_completed_at', async () => {
    const query = createProfilesQuery({ data: { tutorial_completed_at: null }, error: null })
    mockFrom.mockReturnValue(query)

    await useTutorialStore.getState().initializeTutorialState('user-1')

    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(query.select).toHaveBeenCalledWith('tutorial_completed_at')
    expect(query.eq).toHaveBeenCalledWith('id', 'user-1')
    expect(useTutorialStore.getState()).toMatchObject({
      isActive: true,
      currentStep: 'welcome',
      hasCompletedTutorial: false,
      isLoading: false,
    })
  })

  it('does not start the tutorial for users who already completed it', async () => {
    const query = createProfilesQuery({
      data: { tutorial_completed_at: '2026-05-15T20:00:00.000Z' },
      error: null,
    })
    mockFrom.mockReturnValue(query)

    await useTutorialStore.getState().initializeTutorialState('user-1')

    expect(useTutorialStore.getState()).toMatchObject({
      isActive: false,
      currentStep: null,
      hasCompletedTutorial: true,
      isLoading: false,
    })
  })

  it('marks the tutorial complete when skipped', async () => {
    const query = createProfilesQuery()
    mockFrom.mockReturnValue(query)
    resetTutorialStore({ isActive: true, currentStep: 'priority_selector', isLoading: false })

    useTutorialStore.getState().skipTutorial()

    expect(useTutorialStore.getState()).toMatchObject({
      isActive: false,
      currentStep: null,
      hasCompletedTutorial: true,
    })

    await waitFor(() => {
      expect(query.update).toHaveBeenCalledWith({
        tutorial_completed_at: expect.any(String),
      })
      expect(query.eq).toHaveBeenCalledWith('id', 'user-1')
    })
  })

  it('marks the tutorial complete when finished', async () => {
    const query = createProfilesQuery()
    mockFrom.mockReturnValue(query)
    resetTutorialStore({ isActive: true, currentStep: 'settings_reminders', isLoading: false })

    useTutorialStore.getState().completeTutorial()

    expect(useTutorialStore.getState()).toMatchObject({
      isActive: false,
      currentStep: null,
      hasCompletedTutorial: true,
    })

    await waitFor(() => {
      expect(query.update).toHaveBeenCalledWith({
        tutorial_completed_at: expect.any(String),
      })
      expect(query.eq).toHaveBeenCalledWith('id', 'user-1')
    })
  })

  it('resets persisted completion and volatile tutorial data for replay', async () => {
    const query = createProfilesQuery()
    mockFrom.mockReturnValue(query)
    resetTutorialStore({
      isActive: false,
      currentStep: null,
      hasCompletedTutorial: true,
      tutorialCategoryId: 'category-1',
      tutorialTaskId: 'task-1',
      pausedAt: Date.now(),
      pausedStep: 'priority_selector',
      abandonCount: 2,
      analyticsStartTime: Date.now(),
      analyticsViewedSteps: new Set<TutorialStep>(['welcome', 'priority_selector']),
    })

    useTutorialStore.getState().resetTutorial()

    expect(useTutorialStore.getState()).toMatchObject({
      isActive: true,
      currentStep: 'welcome',
      hasCompletedTutorial: false,
      isOverlayHidden: false,
      tutorialCategoryId: null,
      tutorialTaskId: null,
      pausedAt: null,
      pausedStep: null,
      abandonCount: 0,
      analyticsStartTime: null,
    })
    expect(useTutorialStore.getState().analyticsViewedSteps.size).toBe(0)

    await waitFor(() => {
      expect(query.update).toHaveBeenCalledWith({ tutorial_completed_at: null })
      expect(query.eq).toHaveBeenCalledWith('id', 'user-1')
    })
  })

  it('advances steps without requiring tutorial task or category IDs', () => {
    resetTutorialStore({
      isActive: true,
      currentStep: 'category_selector',
      isLoading: false,
      isOverlayHidden: true,
      tutorialCategoryId: null,
      tutorialTaskId: null,
    })

    useTutorialStore.getState().nextStep('priority_selector')

    expect(useTutorialStore.getState()).toMatchObject({
      currentStep: 'priority_selector',
      isOverlayHidden: false,
      tutorialCategoryId: null,
      tutorialTaskId: null,
    })
  })
})
