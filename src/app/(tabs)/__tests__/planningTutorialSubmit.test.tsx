import React from 'react'

import { fireEvent, renderWithProviders, screen, waitFor } from '~/test/test-utils'
import PlanningScreen from '../planning'
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '~/hooks/useTasks'

const mockReplace = jest.fn()
const mockSetParams = jest.fn()
const mockCreateTask = jest.fn()

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({})),
  useRouter: jest.fn(() => ({
    replace: mockReplace,
    setParams: mockSetParams,
  })),
}))

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('~/components/planning', () => {
  const React = require('react')
  const { Text, TouchableOpacity } = require('react-native')

  return {
    PlanningHeader: () => null,
    PlanningTip: () => null,
    AddTaskPlaceholder: ({ onPress }: { onPress: () => void }) => (
      <TouchableOpacity onPress={onPress}>
        <Text>Open Form</Text>
      </TouchableOpacity>
    ),
    AddTaskForm: ({ onSubmit }: { onSubmit: (task: unknown) => Promise<void> }) => (
      <TouchableOpacity
        onPress={() =>
          onSubmit({
            title: 'Plan QA',
            category: 'work',
            priority: 'high',
            notes: null,
            reminderAt: null,
          })
        }
      >
        <Text>Submit Tutorial Task</Text>
      </TouchableOpacity>
    ),
    PlanningEmptyState: () => null,
    TaskList: () => null,
    TasksRecap: () => null,
    RolloverModal: () => null,
  }
})

jest.mock('~/hooks/useTasks', () => ({
  useTasks: jest.fn(),
  useCreateTask: jest.fn(),
  useDeleteTask: jest.fn(),
  useUpdateTask: jest.fn(),
}))

jest.mock('~/hooks/useCategories', () => ({
  useSystemCategories: jest.fn(() => [
    {
      id: 'work-system-id',
      name: 'Work',
    },
  ]),
}))

jest.mock('~/stores/notificationStore', () => ({
  useNotificationStore: jest.fn(() => jest.fn()),
}))

jest.mock('~/hooks/useScreenTracking', () => ({
  useScreenTracking: jest.fn(),
}))

jest.mock('~/hooks/useCarryForwardTasks', () => ({
  useCarryForwardTasks: jest.fn(() => ({
    mutateAsync: jest.fn(),
  })),
}))

jest.mock('~/hooks/useCurrentDate', () => ({
  useCurrentDate: jest.fn(() => ({
    today: '2026-05-17',
    tomorrow: '2026-05-18',
  })),
}))

jest.mock('~/hooks/useEveningRolloverTasks', () => ({
  useEveningRolloverTasks: jest.fn(() => ({
    mitTask: null,
    otherTasks: [],
    shouldShow: false,
    isLoading: false,
    markEveningPrompted: jest.fn(),
  })),
}))

const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>
const mockUseCreateTask = useCreateTask as jest.MockedFunction<typeof useCreateTask>
const mockUseUpdateTask = useUpdateTask as jest.MockedFunction<typeof useUpdateTask>
const mockUseDeleteTask = useDeleteTask as jest.MockedFunction<typeof useDeleteTask>

describe('PlanningScreen tutorial submit flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateTask.mockResolvedValue({ id: 'task-1' })
    mockUseTasks.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useTasks>)
    mockUseCreateTask.mockReturnValue({
      mutateAsync: mockCreateTask,
    } as unknown as ReturnType<typeof useCreateTask>)
    mockUseUpdateTask.mockReturnValue({
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useUpdateTask>)
    mockUseDeleteTask.mockReturnValue({
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useDeleteTask>)
  })

  it('creates a task without tutorial-driven navigation after form submission', async () => {
    renderWithProviders(<PlanningScreen />)

    fireEvent.press(screen.getByText('Open Form'))
    fireEvent.press(screen.getByText('Submit Tutorial Task'))

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledDate: '2026-05-18',
          title: 'Plan QA',
          priority: 'high',
        }),
      )
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })
})
