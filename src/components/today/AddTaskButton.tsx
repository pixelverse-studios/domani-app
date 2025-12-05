import React from 'react'
import { TouchableOpacity, View, StyleSheet } from 'react-native'
import { Plus } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { Text } from '~/components/ui'
import { colors } from '~/theme'

interface AddTaskButtonProps {
  onPress: () => void
  disabled?: boolean
  label?: string
}

export function AddTaskButton({ onPress, disabled, label = 'Add Task' }: AddTaskButtonProps) {
  return (
    <View className="px-5 pb-4">
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityRole="button"
        activeOpacity={0.8}
        style={[styles.buttonContainer, { opacity: disabled ? 0.5 : 1 }]}
      >
        <LinearGradient
          colors={[colors.brand.pink, colors.brand.pink, colors.brand.purple] as const}
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
