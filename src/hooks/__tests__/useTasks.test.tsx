import type { QueryClient } from '@tanstack/react-query'

import { act, renderHookWithProviders, waitFor, buildTaskWithCategory } from '~/test/test-utils'
import { supabase } from '~/lib/supabase'
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '../useTasks'

const mockIncrementUsageMutate = jest.fn()

jest.mock('~/hooks/useCategories', () => ({
  useIncrementCategoryUsage: jest.fn(() => ({
    mutate: mockIncrementUsageMutate,
  })),
}))

jest.mock('~/lib/notifications', () => ({
  NotificationService: {
    cancelTaskReminder: jest.fn(),
    scheduleTaskReminder: jest.fn(),
  },
}))

jest.mock('~/lib/sentry', () => ({
  addBreadcrumb: jest.fn(),
}))

type QueryMock = {
  select: jest.Mock<QueryMock, [string?]>
  insert: jest.Mock<QueryMock, [unknown]>
  update: jest.Mock<QueryMock, [unknown]>
  delete: jest.Mock<QueryMock, []>
  eq: jest.Mock<QueryMock, [string, unknown]>
  is: jest.Mock<QueryMock, [string, unknown]>
  order: jest.Mock<Promise<{ data: unknown; error: unknown }>, [string]>
  single: jest.Mock<Promise<{ data: unknown; error: unknown }>, []>
}

function createQueryMock(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const query: QueryMock = {
    select: jest.fn((_columns?: string) => query),
    insert: jest.fn((_values: unknown) => query),
    update: jest.fn((_values: unknown) => query),
    delete: jest.fn(() => query),
    eq: jest.fn((_column: string, _value: unknown) => query),
    is: jest.fn((_column: string, _value: unknown) => query),
    order: jest.fn((_column: string) => Promise.resolve(result)),
    single: jest.fn(() => Promise.resolve(result)),
  }

  return query
}

const mockFrom = supabase.from as unknown as jest.Mock
const mockGetUser = supabase.auth.getUser as unknown as jest.Mock
const queryClients: QueryClient[] = []
const unmountHooks: Array<() => void> = []

function trackQueryClient<T extends { queryClient: QueryClient; unmount: () => void }>(
  result: T,
): T {
  queryClients.push(result.queryClient)
  unmountHooks.push(result.unmount)
  return result
}

describe('task hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  })

  afterEach(() => {
    unmountHooks.forEach((unmount) => unmount())
    unmountHooks.length = 0
    queryClients.forEach((queryClient) => queryClient.clear())
    queryClients.length = 0
  })

  it('fetches tasks for a scheduled date', async () => {
    const tasks = [
      buildTaskWithCategory({
        id: 'task-1',
        scheduled_date: '2026-05-16',
        title: 'Plan tomorrow',
      }),
    ]
    const query = createQueryMock({ data: tasks, error: null })
    mockFrom.mockReturnValue(query)

    const { result } = trackQueryClient(renderHookWithProviders(() => useTasks('2026-05-16')))

    await waitFor(() => {
      expect(result.current.data).toEqual(tasks)
    })

    expect(mockFrom).toHaveBeenCalledWith('tasks')
    expect(query.eq).toHaveBeenCalledWith('scheduled_date', '2026-05-16')
    expect(query.is).toHaveBeenCalledWith('rolled_over_at', null)
    expect(query.order).toHaveBeenCalledWith('position')
  })

  it('returns an empty task list without querying when date is missing', () => {
    const { result } = trackQueryClient(renderHookWithProviders(() => useTasks(undefined)))

    expect(result.current.data).toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('inserts the expected create payload and invalidates the scheduled date', async () => {
    const createdTask = buildTaskWithCategory({
      id: 'task-created',
      scheduled_date: '2026-05-16',
      title: 'Draft launch notes',
      system_category_id: 'system-category-test-id',
      priority: 'top',
    })
    const insertQuery = createQueryMock({ data: createdTask, error: null })
    mockFrom.mockReturnValue(insertQuery)

    const { result, queryClient } = trackQueryClient(renderHookWithProviders(() => useCreateTask()))
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync({
        scheduledDate: '2026-05-16',
        title: 'Draft launch notes',
        systemCategoryId: 'system-category-test-id',
        priority: 'top',
        notes: 'Use short bullets',
      })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(insertQuery.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      title: 'Draft launch notes',
      description: undefined,
      system_category_id: 'system-category-test-id',
      user_category_id: undefined,
      priority: 'top',
      estimated_duration_minutes: undefined,
      notes: 'Use short bullets',
      reminder_at: undefined,
      scheduled_date: '2026-05-16',
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks', '2026-05-16'] })
    expect(mockIncrementUsageMutate).toHaveBeenCalledWith({
      systemCategoryId: 'system-category-test-id',
      userCategoryId: null,
    })
  })

  it('surfaces create errors without invalidating task queries', async () => {
    const insertQuery = createQueryMock({
      data: null,
      error: new Error('insert failed'),
    })
    mockFrom.mockReturnValue(insertQuery)

    const { result, queryClient } = trackQueryClient(renderHookWithProviders(() => useCreateTask()))
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    await expect(
      result.current.mutateAsync({
        scheduledDate: '2026-05-16',
        title: 'Draft launch notes',
      }),
    ).rejects.toThrow('insert failed')
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('updates a moved task and invalidates both old and new dates', async () => {
    const originalTask = buildTaskWithCategory({
      id: 'task-move',
      scheduled_date: '2026-05-16',
      title: 'Move me',
    })
    const movedTask = {
      ...originalTask,
      scheduled_date: '2026-05-17',
    }
    const existingQuery = createQueryMock({
      data: { notification_id: null, reminder_at: null, title: 'Move me', is_mit: false },
      error: null,
    })
    const updateQuery = createQueryMock({ data: movedTask, error: null })
    mockFrom.mockReturnValueOnce(existingQuery).mockReturnValueOnce(updateQuery)

    const { result, queryClient } = trackQueryClient(renderHookWithProviders(() => useUpdateTask()))
    queryClient.setQueryData(['tasks', '2026-05-16'], [originalTask])
    queryClient.setQueryData(['tasks', '2026-05-17'], [])
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync({
        taskId: 'task-move',
        originalDate: '2026-05-16',
        updates: { scheduled_date: '2026-05-17' },
      })
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(updateQuery.update).toHaveBeenCalledWith({ scheduled_date: '2026-05-17' })
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'task-move')
    expect(queryClient.getQueryData(['tasks', '2026-05-16'])).toEqual([])
    expect(queryClient.getQueryData(['tasks', '2026-05-17'])).toEqual([
      { ...originalTask, scheduled_date: '2026-05-17' },
    ])
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks', '2026-05-17'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks', '2026-05-16'] })
  })

  it('deletes a task and broadly invalidates task queries', async () => {
    const existingQuery = createQueryMock({ data: { notification_id: null }, error: null })
    const deleteQuery = createQueryMock({ data: null, error: null })
    mockFrom.mockReturnValueOnce(existingQuery).mockReturnValueOnce(deleteQuery)

    const cachedTask = buildTaskWithCategory({ id: 'task-delete', completed_at: null })
    const { result, queryClient } = trackQueryClient(renderHookWithProviders(() => useDeleteTask()))
    queryClient.setQueryData(['tasks', '2026-05-16'], [cachedTask])
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync('task-delete')
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(deleteQuery.delete).toHaveBeenCalledTimes(1)
    expect(deleteQuery.eq).toHaveBeenCalledWith('id', 'task-delete')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks'] })
  })
})
