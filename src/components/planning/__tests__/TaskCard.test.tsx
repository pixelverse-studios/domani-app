import React from 'react'

import {
  buildSystemCategory,
  buildTaskWithCategory,
  fireEvent,
  renderWithProviders,
  screen,
} from '~/test/test-utils'
import { TaskCard } from '../TaskCard'
import { TASK_LAYOUTS, useLayoutStore } from '~/stores/layoutStore'

describe('TaskCard', () => {
  const task = buildTaskWithCategory({
    id: 'task-layout-test',
    title: 'Review launch checklist',
    priority: 'top',
    notes: 'Confirm core flows before build',
    system_category: buildSystemCategory({
      id: 'work-system-id',
      name: 'Work',
      icon: 'briefcase',
    }),
  })

  beforeEach(() => {
    useLayoutStore.setState({ taskLayout: 'default' })
  })

  it.each(TASK_LAYOUTS.map((layout) => layout.id))(
    'renders key task data with the %s layout',
    (taskLayout) => {
      useLayoutStore.setState({ taskLayout })

      renderWithProviders(<TaskCard task={task} onEdit={jest.fn()} onDelete={jest.fn()} />)

      expect(screen.getByText('Review launch checklist')).toBeTruthy()
      expect(screen.getByText('Work')).toBeTruthy()
    },
  )

  it('wires edit, delete, and completion callbacks', () => {
    const onEdit = jest.fn()
    const onDelete = jest.fn()
    const onToggleComplete = jest.fn()

    renderWithProviders(
      <TaskCard
        task={task}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleComplete={onToggleComplete}
        showCheckbox
      />,
    )

    fireEvent.press(screen.getByLabelText('Edit task'))
    fireEvent.press(screen.getByLabelText('Delete task'))
    fireEvent.press(screen.getByLabelText('Mark as complete'))

    expect(onEdit).toHaveBeenCalledWith('task-layout-test')
    expect(onDelete).toHaveBeenCalledWith('task-layout-test')
    expect(onToggleComplete).toHaveBeenCalledWith('task-layout-test', true)
  })
})
