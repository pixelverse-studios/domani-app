import type { TaskWithCategory } from '~/types'

const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
  null: 3,
}

/**
 * Sort tasks by priority (high → medium → low → null), then alphabetically by title.
 * Creates a new array, does not mutate the original.
 */
export function sortTasksByPriority<T extends Pick<TaskWithCategory, 'priority' | 'title'>>(
  tasks: T[],
): T[] {
  return [...tasks].sort((a, b) => {
    const priorityA = PRIORITY_ORDER[a.priority ?? 'null']
    const priorityB = PRIORITY_ORDER[b.priority ?? 'null']

    // Primary sort: by priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    // Secondary sort: alphabetical by title (case-insensitive)
    return (a.title ?? '').toLowerCase().localeCompare((b.title ?? '').toLowerCase())
  })
}
