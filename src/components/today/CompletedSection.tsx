import React, { useState } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { CheckCircle, ChevronUp, ChevronDown } from 'lucide-react-native'

import { TaskItem } from './TaskItem'
import { Text } from '~/components/ui'
import type { TaskWithCategory } from '~/types'

interface CompletedSectionProps {
  tasks: TaskWithCategory[]
  onToggle: (taskId: string, completed: boolean) => void
  onTaskPress?: (task: TaskWithCategory) => void
}

export function CompletedSection({ tasks, onToggle, onTaskPress }: CompletedSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const completedTasks = tasks.filter((task) => task.completed_at)

  if (completedTasks.length === 0) {
    return null
  }

  return (
    <View className="mt-4">
      {/* Header */}
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between bg-slate-800/30 rounded-xl mx-5 px-4 py-3"
        accessibilityLabel={isExpanded ? 'Collapse completed tasks' : 'Expand completed tasks'}
      >
        <View className="flex-row items-center gap-2">
          <CheckCircle size={20} color="#a855f7" />
          <Text className="text-base text-slate-300 font-medium">
            Completed ({completedTasks.length})
          </Text>
          <View className="bg-purple-500/20 px-2 py-0.5 rounded-full ml-2">
            <Text className="text-xs text-purple-400">Great job!</Text>
          </View>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color="#9ca3af" />
        ) : (
          <ChevronDown size={20} color="#9ca3af" />
        )}
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && (
        <View className="mt-3">
          {completedTasks.map((task) => (
            <TaskItem key={task.id} task={task} onToggle={onToggle} onPress={onTaskPress} />
          ))}
        </View>
      )}
    </View>
  )
}
