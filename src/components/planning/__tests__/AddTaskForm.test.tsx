import React from 'react'

import { fireEvent, renderWithProviders, screen, waitFor } from '~/test/test-utils'
import { AddTaskForm } from '../AddTaskForm'
import {
  useCreateUserCategory,
  useDeleteUserCategory,
  useFavoriteCategories,
  useSortedCategories,
} from '~/hooks/useCategories'
import { useProfile } from '~/hooks/useProfile'

jest.mock('~/components/tutorial', () => ({
  useTutorialTarget: jest.fn(() => ({
    targetRef: { current: null },
    measureTarget: jest.fn(),
  })),
}))

jest.mock('~/stores/tutorialStore', () => ({
  useTutorialStore: jest.fn(() => ({
    isActive: false,
    currentStep: null,
  })),
}))

jest.mock('../ReminderSection', () => ({
  ReminderSection: () => null,
}))

jest.mock('~/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}))

jest.mock('~/hooks/useCategories', () => ({
  useCreateUserCategory: jest.fn(),
  useDeleteUserCategory: jest.fn(),
  useFavoriteCategories: jest.fn(),
  useSortedCategories: jest.fn(),
}))

const mockUseProfile = useProfile as jest.MockedFunction<typeof useProfile>
const mockUseSortedCategories = useSortedCategories as jest.MockedFunction<typeof useSortedCategories>
const mockUseFavoriteCategories = useFavoriteCategories as jest.MockedFunction<
  typeof useFavoriteCategories
>
const mockUseCreateUserCategory = useCreateUserCategory as jest.MockedFunction<
  typeof useCreateUserCategory
>
const mockUseDeleteUserCategory = useDeleteUserCategory as jest.MockedFunction<
  typeof useDeleteUserCategory
>

const systemCategories = [
  {
    id: 'work-system-id',
    name: 'Work',
    icon: 'briefcase',
    color: 'test-purple',
    position: 1,
    usageCount: 0,
    isSystem: true,
    isFavorite: true,
  },
]

describe('AddTaskForm', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockUseProfile.mockReturnValue({
      profile: { auto_sort_categories: false },
    } as ReturnType<typeof useProfile>)
    mockUseSortedCategories.mockReturnValue(systemCategories)
    mockUseFavoriteCategories.mockReturnValue(systemCategories)
    mockUseCreateUserCategory.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateUserCategory>)
    mockUseDeleteUserCategory.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteUserCategory>)
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('keeps submit disabled until title, category, and priority are present', async () => {
    const onSubmit = jest.fn(() => new Promise<void>(() => {}))

    const { unmount } = renderWithProviders(
      <AddTaskForm onClose={jest.fn()} onSubmit={onSubmit} selectedTarget="tomorrow" />,
    )

    fireEvent.press(screen.getByText('Add Task'))
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.changeText(screen.getByPlaceholderText('What do you want to accomplish?'), 'Plan QA')
    fireEvent.press(screen.getByText('Work'))
    fireEvent.press(screen.getByLabelText('High priority'))
    fireEvent.press(screen.getByText('Add Task'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Plan QA',
          category: 'work',
          priority: 'high',
        }),
      )
    })

    unmount()
  })
})
