import { sortTasksByPriority } from '../sortTasks'
import { buildTaskWithCategory } from '~/test/factories'

describe('sortTasksByPriority', () => {
  it('sorts tasks by priority from top to none', () => {
    const low = buildTaskWithCategory({ id: 'low', priority: 'low', title: 'Low task' })
    const none = buildTaskWithCategory({ id: 'none', priority: null, title: 'No priority task' })
    const top = buildTaskWithCategory({ id: 'top', priority: 'top', title: 'Top task' })
    const high = buildTaskWithCategory({ id: 'high', priority: 'high', title: 'High task' })
    const medium = buildTaskWithCategory({ id: 'medium', priority: 'medium', title: 'Medium task' })

    expect(sortTasksByPriority([low, none, top, high, medium]).map((task) => task.id)).toEqual([
      'top',
      'high',
      'medium',
      'low',
      'none',
    ])
  })

  it('sorts matching priorities alphabetically without mutating the original array', () => {
    const original = [
      buildTaskWithCategory({ id: 'z', priority: 'medium', title: 'Zoom' }),
      buildTaskWithCategory({ id: 'a', priority: 'medium', title: 'alpha' }),
      buildTaskWithCategory({ id: 'b', priority: 'medium', title: 'Beta' }),
    ]

    const sorted = sortTasksByPriority(original)

    expect(sorted.map((task) => task.id)).toEqual(['a', 'b', 'z'])
    expect(original.map((task) => task.id)).toEqual(['z', 'a', 'b'])
  })

  it('does not let completed state override priority ordering', () => {
    const completedTop = buildTaskWithCategory({
      id: 'completed-top',
      completed_at: '2026-01-02T12:00:00.000Z',
      priority: 'top',
      title: 'Completed top task',
    })
    const openLow = buildTaskWithCategory({
      id: 'open-low',
      completed_at: null,
      priority: 'low',
      title: 'Open low task',
    })

    expect(sortTasksByPriority([openLow, completedTop]).map((task) => task.id)).toEqual([
      'completed-top',
      'open-low',
    ])
  })
})
