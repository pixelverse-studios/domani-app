import React from 'react'
import { TouchableOpacity, View, StyleSheet } from 'react-native'
import { Plus } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { Text } from '~/components/ui'
import { useTutorialTarget, useTutorialAdvancement } from '~/components/tutorial'
import { useAppTheme } from '~/hooks/useAppTheme'

interface AddTaskButtonProps {
  onPress: () => void
  disabled?: boolean
  label?: string
}

export function AddTaskButton({ onPress, disabled, label = 'Add Task' }: AddTaskButtonProps) {
  const theme = useAppTheme()
  const { targetRef, measureTarget } = useTutorialTarget('today_add_task_button')
  const { advanceFromTodayButton } = useTutorialAdvancement()

  const handlePress = () => {
    advanceFromTodayButton()
    onPress()
  }

  return (
    <View ref={targetRef} onLayout={measureTarget} className="px-5 pb-4">
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityRole="button"
        activeOpacity={0.8}
        style={[styles.buttonContainer, { opacity: disabled ? 0.5 : 1 }]}
      >
        <LinearGradient
          colors={[theme.colors.brand.primary, theme.colors.brand.primary, theme.colors.brand.dark] as const}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Plus size={18} color="white" />
          <Text className="text-white font-semibold text-base ml-2">{label}</Text>
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
    paddingVertical: 14,
  },
})
