import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { AlertTriangle, Crown } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'

export type Priority = 'top' | 'high' | 'medium' | 'low'

interface PrioritySelectorProps {
  selectedPriority: Priority | null
  onSelectPriority: (priority: Priority) => void
  /** Existing TOP priority task in this plan (for MIT warning) */
  existingTopPriorityTask?: { id: string; title: string } | null
  /** ID of the task being edited (to exclude self from TOP check) */
  editingTaskId?: string
  disabled?: boolean
}

export function PrioritySelector({
  selectedPriority,
  onSelectPriority,
  existingTopPriorityTask,
  editingTaskId,
  disabled = false,
}: PrioritySelectorProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const purpleColor = isDark ? '#a78bfa' : '#8b5cf6'
  const iconColor = isDark ? '#94a3b8' : '#64748b'
  const amberColor = '#f59e0b'

  // MIT message logic: determine which message to show when TOP is selected
  const isEditingCurrentTopTask = editingTaskId && existingTopPriorityTask?.id === editingTaskId
  const showMitReplaceWarning =
    selectedPriority === 'top' && existingTopPriorityTask && !isEditingCurrentTopTask
  const showMitFirstTimeMessage =
    selectedPriority === 'top' && !existingTopPriorityTask && !isEditingCurrentTopTask

  const priorities: Priority[] = ['top', 'high', 'medium', 'low']

  const priorityColors: Record<Priority, { bg: string; text: string }> = {
    top: {
      bg: isDark ? 'rgba(234, 179, 8, 0.15)' : 'rgba(234, 179, 8, 0.1)',
      text: '#eab308',
    },
    high: {
      bg: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
      text: '#ef4444',
    },
    medium: {
      bg: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)',
      text: '#f97316',
    },
    low: {
      bg: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
      text: '#22c55e',
    },
  }

  return (
    <View className="mt-5">
      <View className="flex-row items-center mb-3">
        <AlertTriangle size={16} color={iconColor} />
        <Text className="font-sans-medium text-slate-900 dark:text-white ml-2">Priority</Text>
      </View>

      {/* Priority Segmented Control */}
      <View
        className="flex-row rounded-xl overflow-hidden"
        style={{
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderWidth: 1,
          borderColor: isDark ? '#334155' : '#e2e8f0',
        }}
      >
        {priorities.map((priority, index) => {
          const isSelected = selectedPriority === priority
          const textColor = isSelected
            ? priorityColors[priority].text
            : isDark
              ? '#94a3b8'
              : '#64748b'

          return (
            <TouchableOpacity
              key={priority}
              onPress={() => onSelectPriority(priority)}
              disabled={disabled}
              className="flex-1 py-3 items-center justify-center flex-row"
              style={[
                isSelected && {
                  backgroundColor: priorityColors[priority].bg,
                },
                index < priorities.length - 1 && {
                  borderRightWidth: 1,
                  borderRightColor: isDark ? '#334155' : '#e2e8f0',
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              {priority === 'top' && <Crown size={16} color={textColor} className="mr-1.5" />}
              <Text
                className="font-sans-medium"
                style={{ color: textColor, marginLeft: priority === 'top' ? 4 : 0 }}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* MIT Message - Replace Warning */}
      {showMitReplaceWarning && existingTopPriorityTask && (
        <View
          className="rounded-xl p-3 mt-3"
          style={{
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.08)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.25)',
          }}
        >
          <View className="flex-row items-center">
            <AlertTriangle size={16} color={amberColor} />
            <Text className="flex-1 ml-2" style={{ color: amberColor }}>
              <Text className="font-sans">This will replace </Text>
              <Text className="font-sans-bold">{existingTopPriorityTask.title}</Text>
              <Text className="font-sans"> as your Most Important Task</Text>
            </Text>
          </View>
        </View>
      )}

      {/* MIT Message - First Time TOP */}
      {showMitFirstTimeMessage && (
        <View
          className="rounded-xl p-3 mt-3"
          style={{
            backgroundColor: isDark ? 'rgba(234, 179, 8, 0.1)' : 'rgba(234, 179, 8, 0.08)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(234, 179, 8, 0.3)' : 'rgba(234, 179, 8, 0.25)',
          }}
        >
          <View className="flex-row items-center">
            <Crown size={16} color="#eab308" />
            <Text className="font-sans ml-2" style={{ color: '#eab308' }}>
              This will be your Most Important Task
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}
