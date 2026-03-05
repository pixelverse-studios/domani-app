import React from 'react'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import type { TaskWithCategory } from '~/types'

interface TasksRecapProps {
  tasks: TaskWithCategory[]
}

export function TasksRecap({ tasks }: TasksRecapProps) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  if (tasks.length === 0) return null

  return (
    <Text
      className="font-sans-semibold"
      style={{ fontSize: 15, color: brandColor }}
    >
      {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
    </Text>
  )
}
