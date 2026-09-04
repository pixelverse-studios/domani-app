import { act, renderHook, waitFor } from '~/test/test-utils'

import { useEveningRolloverOnAppOpen } from '../useEveningRolloverOnAppOpen'
import { supabase } from '~/lib/supabase'
import { useNotificationStore } from '~/stores/notificationStore'
import {
  resetAccountLifecycleCoordinatorForTests,
  setActiveAccount,
} from '~/lib/accountLifecycleCoordinator'
import { wasPromptedInCurrentCycle } from '~/lib/rollover'

const mockUseAuth = jest.fn()

jest.mock('~/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('~/lib/rollover', () => ({
  isPastReminderTime: jest.fn(() => true),
  wasPromptedInCurrentCycle: jest.fn(),
}))

jest.mock('../useEveningRolloverTasks', () => ({
  useEveningRolloverTasks: jest.fn(() => ({
    eligibleTasks: [],
    isFetched: true,
    isLoading: false,
    markEveningPrompted: jest.fn(() => Promise.resolve()),
    mitTask: null,
    otherTasks: [],
    shouldShow: false,
  })),
}))

const mockFrom = supabase.from as unknown as jest.Mock
const mockWasPrompted = wasPromptedInCurrentCycle as jest.Mock

function createProfileQuery() {
  type ProfileQuery = {
    select: jest.Mock<ProfileQuery, [string]>
    eq: jest.Mock<ProfileQuery, [string, string]>
    maybeSingle: jest.Mock
  }
  const query = {} as ProfileQuery
  query.select = jest.fn((_columns: string) => query)
  query.eq = jest.fn((_column: string, _value: string) => query)
  query.maybeSingle = jest.fn(() =>
    Promise.resolve({ data: { planning_reminder_time: '19:00:00' }, error: null }),
  )
  return query
}

describe('useEveningRolloverOnAppOpen account ownership', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetAccountLifecycleCoordinatorForTests()
    setActiveAccount('user-1')
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue(createProfileQuery())
    useNotificationStore.setState({
      devForceBypass: false,
      devRolloverRecheckCounter: 0,
      eveningRolloverSource: null,
    })
  })

  it('does not commit account A rollover state after account B becomes active', async () => {
    let finishPromptCheck!: (alreadyPrompted: boolean) => void
    mockWasPrompted
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            finishPromptCheck = resolve
          }),
      )
      .mockResolvedValueOnce(true)

    const { result, rerender } = renderHook(() => useEveningRolloverOnAppOpen())
    await waitFor(() => expect(mockWasPrompted).toHaveBeenCalledWith('19:00:00', 'user-1'))

    act(() => {
      setActiveAccount('user-2')
      mockUseAuth.mockReturnValue({ user: { id: 'user-2' } })
      rerender(undefined)
    })
    await act(async () => {
      finishPromptCheck(false)
      await Promise.resolve()
    })

    expect(useNotificationStore.getState().eveningRolloverSource).toBeNull()
    expect(result.current.shouldPromptPlanning).toBe(false)
    expect(result.current.shouldShow).toBe(false)
  })
})
