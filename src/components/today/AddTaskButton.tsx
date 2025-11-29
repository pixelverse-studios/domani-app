import React from 'react'
import { TouchableOpacity, View } from 'react-native'
import { Plus } from 'lucide-react-native'

import { Text } from '~/components/ui'

interface AddTaskButtonProps {
  onPress: () => void
  disabled?: boolean
}

export function AddTaskButton({ onPress, disabled }: AddTaskButtonProps) {
  // Button stays purple across themes - it's a primary action
  return (
    <View className="px-5 pb-4">
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        className={`flex-row items-center justify-center py-4 rounded-xl ${
          disabled ? 'bg-purple-500/50' : 'bg-purple-600 dark:bg-purple-500'
        }`}
        accessibilityLabel="Add new task"
        accessibilityRole="button"
      >
        <Plus size={20} color="white" />
        <Text className="text-white font-semibold text-base ml-2">Add Task</Text>
      </TouchableOpacity>
    </View>
  )
}
