import { waitFor } from '~/test/test-utils'
import {
  TUTORIAL_STEPS,
  type TutorialStep,
  type TutorialTargetMeasurement,
  useTutorialStore,
} from '~/stores/tutorialStore'
import { supabase } from '~/lib/supabase'

function emptyMeasurements(): Record<TutorialStep, TutorialTargetMeasurement | null> {
  return Object.fromEntries(TUTORIAL_STEPS.map((step) => [step, null])) as Record<
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
    resetTutorialStore({ isActive: true, currentStep: 'task_priority', isLoading: false })

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
    resetTutorialStore({ isActive: true, currentStep: 'complete', isLoading: false })

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

  it('resets persisted completion and volatile tutorial progress for replay', async () => {
    const query = createProfilesQuery()
    mockFrom.mockReturnValue(query)
    resetTutorialStore({
      isActive: false,
      currentStep: null,
      hasCompletedTutorial: true,
      pausedAt: Date.now(),
      pausedStep: 'task_priority',
      abandonCount: 2,
      analyticsStartTime: Date.now(),
      analyticsViewedSteps: new Set<TutorialStep>(['welcome', 'task_priority']),
      targetMeasurements: {
        ...emptyMeasurements(),
        planning_form: { x: 10, y: 20, width: 200, height: 100 },
      },
    })

    useTutorialStore.getState().resetTutorial()

    expect(useTutorialStore.getState()).toMatchObject({
      isActive: true,
      currentStep: 'welcome',
      hasCompletedTutorial: false,
      isOverlayHidden: false,
      pausedAt: null,
      pausedStep: null,
      abandonCount: 0,
      analyticsStartTime: null,
    })
    expect(useTutorialStore.getState().analyticsViewedSteps.size).toBe(0)
    expect(useTutorialStore.getState().targetMeasurements.planning_form).toBeNull()

    await waitFor(() => {
      expect(query.update).toHaveBeenCalledWith({ tutorial_completed_at: null })
      expect(query.eq).toHaveBeenCalledWith('id', 'user-1')
    })
  })

  it('advances to the next ordered step without requiring created tutorial data', () => {
    resetTutorialStore({
      isActive: true,
      currentStep: 'task_category',
      isLoading: false,
      isOverlayHidden: true,
      targetMeasurements: {
        ...emptyMeasurements(),
        task_priority: { x: 10, y: 20, width: 200, height: 100 },
      },
    })

    useTutorialStore.getState().nextStep()

    expect(useTutorialStore.getState()).toMatchObject({
      currentStep: 'task_priority',
      isOverlayHidden: false,
    })
    expect(useTutorialStore.getState().targetMeasurements.task_priority).toBeNull()
  })

  it('moves backward through ordered tutorial steps', () => {
    resetTutorialStore({
      isActive: true,
      currentStep: 'task_priority',
      isLoading: false,
      isOverlayHidden: true,
    })

    useTutorialStore.getState().previousStep()

    expect(useTutorialStore.getState()).toMatchObject({
      currentStep: 'task_category',
      isOverlayHidden: false,
    })
  })
})
