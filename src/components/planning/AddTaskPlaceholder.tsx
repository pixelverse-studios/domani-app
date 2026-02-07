import React from 'react'
import { TouchableOpacity, StyleSheet, View } from 'react-native'
import { Plus, Lock } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'

interface AddTaskPlaceholderProps {
  onPress?: () => void
  disabled?: boolean
  atLimit?: boolean
}

export function AddTaskPlaceholder({ onPress, disabled, atLimit }: AddTaskPlaceholderProps) {
  const theme = useAppTheme()
  const handlePress = () => {
    onPress?.()
  }

  // Show disabled state when free user is at task limit
  if (disabled && atLimit) {
    return (
      <View style={styles.buttonContainer} className="mx-5 mt-6">
        <View style={[styles.disabledContainer, { backgroundColor: theme.colors.interactive.hover, borderColor: theme.colors.border.primary }]}>
          <Lock size={18} color={theme.colors.text.tertiary} strokeWidth={2} />
          <Text className="text-content-tertiary font-sans-medium text-sm ml-2">
            Task limit reached (3/3)
          </Text>
        </View>
        <Text className="text-content-secondary text-xs text-center mt-2">
          Upgrade to add unlimited tasks
        </Text>
      </View>
    )
  }

  return (
    <View>
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
          colors={theme.gradients.brandButton.colors}
          locations={theme.gradients.brandButton.locations}
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
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
})
