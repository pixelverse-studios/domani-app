import type { QueryClient } from '@tanstack/react-query'

import { act, renderHookWithProviders, waitFor, buildTaskWithCategory } from '~/test/test-utils'
import { supabase } from '~/lib/supabase'
import { NotificationService } from '~/lib/notifications'
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
const mockScheduleTaskReminder = NotificationService.scheduleTaskReminder as jest.Mock
const mockCancelTaskReminder = NotificationService.cancelTaskReminder as jest.Mock
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
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1')
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
      reminder_at: null,
      scheduled_date: '2026-05-16',
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks', 'user-1', '2026-05-16'] })
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

  it('persists reminder fields after task reminder scheduling succeeds', async () => {
    const reminderAt = '2026-05-16T14:30:00.000Z'
    const createdTask = buildTaskWithCategory({
      id: 'task-created',
      scheduled_date: '2026-05-16',
      title: 'Draft launch notes',
      reminder_at: null,
      notification_id: null,
    })
    const insertQuery = createQueryMock({ data: createdTask, error: null })
    const updateQuery = createQueryMock({ data: null, error: null })
    mockFrom.mockReturnValueOnce(insertQuery).mockReturnValueOnce(updateQuery)
    mockScheduleTaskReminder.mockResolvedValue('notification-1')

    const { result } = trackQueryClient(renderHookWithProviders(() => useCreateTask()))

    const task = await result.current.mutateAsync({
      scheduledDate: '2026-05-16',
      title: 'Draft launch notes',
      reminderAt,
    })

    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        reminder_at: null,
      }),
    )
    expect(mockScheduleTaskReminder).toHaveBeenCalledWith({
      id: 'task-created',
      title: 'Draft launch notes',
      is_mit: false,
      reminder_at: reminderAt,
      notes: null,
    })
    expect(updateQuery.update).toHaveBeenCalledWith({
      reminder_at: reminderAt,
      notification_id: 'notification-1',
    })
    expect(task.reminder_at).toBe(reminderAt)
    expect(task.notification_id).toBe('notification-1')
  })

  it('leaves reminder fields cleared when task reminder scheduling fails', async () => {
    const createdTask = buildTaskWithCategory({
      id: 'task-created',
      scheduled_date: '2026-05-16',
      title: 'Draft launch notes',
      reminder_at: null,
      notification_id: null,
    })
    const insertQuery = createQueryMock({ data: createdTask, error: null })
    mockFrom.mockReturnValueOnce(insertQuery)
    mockScheduleTaskReminder.mockResolvedValue(null)

    const { result } = trackQueryClient(renderHookWithProviders(() => useCreateTask()))

    const task = await result.current.mutateAsync({
      scheduledDate: '2026-05-16',
      title: 'Draft launch notes',
      reminderAt: '2026-05-16T14:30:00.000Z',
    })

    expect(mockScheduleTaskReminder).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(task.reminder_at).toBeNull()
    expect(task.notification_id).toBeNull()
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
    queryClient.setQueryData(['tasks', 'user-1', '2026-05-16'], [originalTask])
    queryClient.setQueryData(['tasks', 'user-1', '2026-05-17'], [])
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
    expect(queryClient.getQueryData(['tasks', 'user-1', '2026-05-16'])).toEqual([])
    expect(queryClient.getQueryData(['tasks', 'user-1', '2026-05-17'])).toEqual([
      { ...originalTask, scheduled_date: '2026-05-17' },
    ])
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks', 'user-1', '2026-05-17'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks', 'user-1', '2026-05-16'] })
  })

  it('clears reminder fields when updated task reminder scheduling fails', async () => {
    const reminderAt = '2026-05-16T14:30:00.000Z'
    const updatedTask = buildTaskWithCategory({
      id: 'task-update-reminder',
      scheduled_date: '2026-05-16',
      title: 'Draft launch notes',
      reminder_at: reminderAt,
      notification_id: null,
    })
    const existingQuery = createQueryMock({
      data: {
        notification_id: 'old-notification',
        reminder_at: null,
        title: 'Draft launch notes',
        is_mit: false,
      },
      error: null,
    })
    const updateQuery = createQueryMock({ data: updatedTask, error: null })
    const clearReminderQuery = createQueryMock({ data: null, error: null })
    mockFrom
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(clearReminderQuery)
    mockScheduleTaskReminder.mockResolvedValue(null)

    const { result } = trackQueryClient(renderHookWithProviders(() => useUpdateTask()))

    const response = await result.current.mutateAsync({
      taskId: 'task-update-reminder',
      originalDate: '2026-05-16',
      updates: { reminder_at: reminderAt },
    })

    expect(mockCancelTaskReminder).toHaveBeenCalledWith('old-notification')
    expect(mockScheduleTaskReminder).toHaveBeenCalledWith({
      id: 'task-update-reminder',
      title: 'Draft launch notes',
      is_mit: false,
      reminder_at: reminderAt,
      notes: null,
    })
    expect(clearReminderQuery.update).toHaveBeenCalledWith({
      reminder_at: null,
      notification_id: null,
    })
    expect(response.data.reminder_at).toBeNull()
    expect(response.data.notification_id).toBeNull()
  })

  it('deletes a task and broadly invalidates task queries', async () => {
    const existingQuery = createQueryMock({ data: { notification_id: null }, error: null })
    const deleteQuery = createQueryMock({ data: null, error: null })
    mockFrom.mockReturnValueOnce(existingQuery).mockReturnValueOnce(deleteQuery)

    const cachedTask = buildTaskWithCategory({ id: 'task-delete', completed_at: null })
    const { result, queryClient } = trackQueryClient(renderHookWithProviders(() => useDeleteTask()))
    queryClient.setQueryData(['tasks', 'user-1', '2026-05-16'], [cachedTask])
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync('task-delete')
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(deleteQuery.delete).toHaveBeenCalledTimes(1)
    expect(deleteQuery.eq).toHaveBeenCalledWith('id', 'task-delete')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks', 'user-1'] })
  })
})
