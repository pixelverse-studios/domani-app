import type { QueryClient } from '@tanstack/react-query'

import { act, renderHookWithProviders, waitFor, buildTaskWithCategory } from '~/test/test-utils'
import { useCarryForwardTasks } from '../useCarryForwardTasks'
import { carryForwardTasks } from '~/lib/rollover'

jest.mock('~/lib/rollover', () => ({
  carryForwardTasks: jest.fn(),
}))

const mockCarryForwardTasks = carryForwardTasks as jest.MockedFunction<typeof carryForwardTasks>
const queryClients: QueryClient[] = []
const unmountHooks: Array<() => void> = []

function trackQueryClient<T extends { queryClient: QueryClient; unmount: () => void }>(
  result: T,
): T {
  queryClients.push(result.queryClient)
  unmountHooks.push(result.unmount)
  return result
}

describe('useCarryForwardTasks', () => {
  let consoleLogSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => {
    unmountHooks.forEach((unmount) => unmount())
    unmountHooks.length = 0
    queryClients.forEach((queryClient) => queryClient.clear())
    queryClients.length = 0
    consoleLogSpy.mockRestore()
  })

  it('carries selected rollover tasks and invalidates affected task queries', async () => {
    const createdTasks = [
      buildTaskWithCategory({
        id: 'carried-task-1',
        scheduled_date: '2026-05-16',
        title: 'Carry this forward',
      }),
    ]
    mockCarryForwardTasks.mockResolvedValue(createdTasks)

    const { result, queryClient } = trackQueryClient(
      renderHookWithProviders(() => useCarryForwardTasks()),
    )
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const input = {
      selectedTaskIds: ['old-task-1'],
      targetDate: '2026-05-16',
      shouldMakeMIT: true,
      keepReminderTimes: false,
    }

    let returnedTasks: typeof createdTasks | undefined
    await act(async () => {
      returnedTasks = await result.current.mutateAsync(input)
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockCarryForwardTasks).toHaveBeenCalledWith(input, expect.any(Object))
    expect(returnedTasks).toEqual(createdTasks)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks', 'user-1'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rolloverTasks', 'user-1'] })
  })
})
