import React from 'react'

import { fireEvent, renderWithProviders, screen } from '~/test/test-utils'
import { CategorySelector } from '../CategorySelector'
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
  useTutorialAdvancement: jest.fn(() => ({
    isActive: false,
    advanceFromCategorySelector: jest.fn(),
    advanceFromCreateCategory: jest.fn(),
    advanceFromMoreCategoriesButton: jest.fn(),
  })),
}))

jest.mock('~/stores/tutorialStore', () => ({
  useTutorialStore: jest.fn(() => jest.fn()),
}))

jest.mock('~/hooks/useTutorialAnalytics', () => ({
  useTutorialAnalytics: jest.fn(() => ({
    trackTutorialCategoryCreated: jest.fn(),
  })),
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

const categories = [
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
  {
    id: 'wellness-system-id',
    name: 'Wellness',
    icon: 'heart',
    color: 'test-green',
    position: 2,
    usageCount: 0,
    isSystem: true,
    isFavorite: true,
  },
  {
    id: 'custom-deep-work',
    name: 'Deep Work',
    icon: 'tag',
    color: 'test-blue',
    position: 3,
    usageCount: 0,
    isSystem: false,
    isFavorite: true,
  },
]

describe('CategorySelector', () => {
  beforeEach(() => {
    mockUseProfile.mockReturnValue({
      profile: { auto_sort_categories: false },
    } as ReturnType<typeof useProfile>)
    mockUseSortedCategories.mockReturnValue(categories)
    mockUseFavoriteCategories.mockReturnValue(categories)
    mockUseCreateUserCategory.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateUserCategory>)
    mockUseDeleteUserCategory.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteUserCategory>)
  })

  it('selects a category and reports its form id and label', () => {
    const onSelectCategory = jest.fn()

    renderWithProviders(
      <CategorySelector
        selectedCategory={null}
        selectedCategoryLabel={null}
        onSelectCategory={onSelectCategory}
        onClearCategory={jest.fn()}
      />,
    )

    fireEvent.press(screen.getByText('Work'))

    expect(onSelectCategory).toHaveBeenCalledWith('work', 'Work')
  })

  it('clears the selected category from the selected badge', () => {
    const onClearCategory = jest.fn()

    renderWithProviders(
      <CategorySelector
        selectedCategory="work"
        selectedCategoryLabel="Work"
        onSelectCategory={jest.fn()}
        onClearCategory={onClearCategory}
      />,
    )

    fireEvent.press(screen.getByLabelText('Clear selected category'))

    expect(onClearCategory).toHaveBeenCalled()
  })
})
