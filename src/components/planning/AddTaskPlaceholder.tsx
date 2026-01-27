import React from 'react'
import { TouchableOpacity, StyleSheet, View } from 'react-native'
import { Plus, Lock } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { Text } from '~/components/ui'
import { useTutorialTarget, useTutorialAdvancement } from '~/components/tutorial'
import { colors } from '~/theme'

interface AddTaskPlaceholderProps {
  onPress?: () => void
  disabled?: boolean
  atLimit?: boolean
}

export function AddTaskPlaceholder({ onPress, disabled, atLimit }: AddTaskPlaceholderProps) {
  const { targetRef, measureTarget } = useTutorialTarget('add_task_button')
  const { advanceFromAddTaskButton } = useTutorialAdvancement()

  const handlePress = () => {
    advanceFromAddTaskButton()
    onPress?.()
  }

  // Show disabled state when free user is at task limit
  if (disabled && atLimit) {
    return (
      <View style={styles.buttonContainer} className="mx-5 mt-6">
        <View style={styles.disabledContainer}>
          <Lock size={18} color="#9ca3af" strokeWidth={2} />
          <Text className="text-slate-400 font-sans-medium text-sm ml-2">
            Task limit reached (3/3)
          </Text>
        </View>
        <Text className="text-slate-500 text-xs text-center mt-2">
          Upgrade to add unlimited tasks
        </Text>
      </View>
    )
  }

  return (
    <View ref={targetRef} onLayout={measureTarget}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={styles.buttonContainer}
        className="mx-5 mt-6"
        accessibilityRole="button"
        accessibilityLabel="Add new task"
        disabled={disabled}
      >
          <LinearGradient
          colors={[colors.brand.pink, colors.brand.pink, colors.brand.purple] as const}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Plus size={20} color="#ffffff" strokeWidth={2.5} />
          <Text className="text-white font-sans-semibold text-base ml-2">Add New Task</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  disabledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
})
