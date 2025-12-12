import React, { useMemo, useCallback } from 'react'
import { View } from 'react-native'
import { FlashList } from '@shopify/flash-list'

import { TaskItem } from './TaskItem'
import { Text } from '~/components/ui'
import type { TaskWithCategory } from '~/types'


interface TaskListProps {
  tasks: TaskWithCategory[]
  onToggle: (taskId: string, completed: boolean) => void
  onTaskPress?: (task: TaskWithCategory) => void
  onDeleteTask?: (task: TaskWithCategory) => void
}

export function TaskList({ tasks, onToggle, onTaskPress, onDeleteTask }: TaskListProps) {
  const incompleteTasks = useMemo(
    () => tasks.filter((task) => !task.completed_at),
    [tasks],
  )

  const renderItem = useCallback(
    ({ item }: { item: TaskWithCategory }) => (
      <TaskItem
        task={item}
        onToggle={onToggle}
        onPress={onTaskPress}
        onDelete={onDeleteTask}
      />
    ),
    [onToggle, onTaskPress, onDeleteTask],
  )

  const keyExtractor = useCallback((item: TaskWithCategory) => item.id, [])

  if (incompleteTasks.length === 0) {
    return (
      <View className="items-center justify-center py-8 mx-5">
        <Text className="text-slate-400 text-center">No tasks remaining. Great job!</Text>
      </View>
    )
  }

  return (
    <View className="mt-2">
      <FlashList
        data={incompleteTasks}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
      />
    </View>
  )
}
