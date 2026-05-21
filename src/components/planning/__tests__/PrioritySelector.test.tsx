import React from 'react'

import { fireEvent, renderWithProviders, screen } from '~/test/test-utils'
import { PrioritySelector } from '../PrioritySelector'

jest.mock('~/components/tutorial', () => ({
  useTutorialTarget: jest.fn(() => ({
    targetRef: { current: null },
    measureTarget: jest.fn(),
  })),
}))

describe('PrioritySelector', () => {
  it('calls back with the selected priority', () => {
    const onSelectPriority = jest.fn()

    renderWithProviders(
      <PrioritySelector selectedPriority={null} onSelectPriority={onSelectPriority} />,
    )

    fireEvent.press(screen.getByLabelText('High priority'))

    expect(onSelectPriority).toHaveBeenCalledWith('high')
  })

  it('shows first-time top priority messaging', () => {
    renderWithProviders(
      <PrioritySelector selectedPriority="top" onSelectPriority={jest.fn()} />,
    )

    expect(screen.getByText('This will be your top priority task')).toBeTruthy()
    expect(screen.getByLabelText('Top priority').props.accessibilityState).toMatchObject({
      selected: true,
    })
  })

  it('warns when top priority would replace an existing task', () => {
    renderWithProviders(
      <PrioritySelector
        selectedPriority="top"
        onSelectPriority={jest.fn()}
        existingTopPriorityTask={{ id: 'task-1', title: 'Draft launch notes' }}
      />,
    )

    expect(screen.getByText('This will replace ')).toBeTruthy()
    expect(screen.getByText('Draft launch notes')).toBeTruthy()
    expect(screen.getByText(' as your top priority')).toBeTruthy()
  })
})
