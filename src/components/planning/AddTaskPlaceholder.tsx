import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { Plus } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { Text } from '~/components/ui'
import { colors } from '~/theme'

interface AddTaskPlaceholderProps {
  onPress?: () => void
}

export function AddTaskPlaceholder({ onPress }: AddTaskPlaceholderProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.buttonContainer}
      className="mx-5 mt-6"
      accessibilityRole="button"
      accessibilityLabel="Add new task"
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
})
