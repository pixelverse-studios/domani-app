import React from 'react'
import { TouchableOpacity, ActivityIndicator, StyleProp, ViewStyle, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { Text } from '~/components/ui/Text'
import { useAppTheme } from '~/hooks/useAppTheme'

interface GradientButtonProps {
  children: React.ReactNode
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
}

export function GradientButton({
  children,
  onPress,
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}: GradientButtonProps) {
  const theme = useAppTheme()

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      style={[
        styles.buttonContainer,
        fullWidth && styles.fullWidth,
        { opacity: disabled || loading ? 0.5 : 1 },
        style,
      ]}
    >
      <LinearGradient
        colors={[theme.colors.brand.primary, theme.colors.brand.primary, theme.colors.brand.dark] as const}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            {icon}
            <Text className={`text-white font-semibold text-base ${icon ? 'ml-2' : ''}`}>
              {children}
            </Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
})
