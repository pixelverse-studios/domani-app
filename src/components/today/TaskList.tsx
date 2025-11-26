import React from 'react'
import { View } from 'react-native'

import { TaskItem } from './TaskItem'
import { Text } from '~/components/ui'
import type { TaskWithCategory } from '~/types'

interface TaskListProps {
  tasks: TaskWithCategory[]
  onToggle: (taskId: string, completed: boolean) => void
  onTaskPress?: (task: TaskWithCategory) => void
}

export function TaskList({ tasks, onToggle, onTaskPress }: TaskListProps) {
  const incompleteTasks = tasks.filter((task) => !task.completed_at)

  if (incompleteTasks.length === 0) {
    return (
      <View className="items-center justify-center py-8 mx-5">
        <Text className="text-slate-400 text-center">No tasks remaining. Great job!</Text>
      </View>
    )
  }

  return (
    <View className="mt-2">
      {incompleteTasks.map((task) => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} onPress={onTaskPress} />
      ))}
    </View>
  )
}
