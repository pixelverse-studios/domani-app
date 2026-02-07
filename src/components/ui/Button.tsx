import React, { forwardRef } from 'react'
import { ActivityIndicator, StyleProp, Text, TouchableOpacity, ViewStyle, View } from 'react-native'
import clsx from 'clsx'
import { useAppTheme } from '~/hooks/useAppTheme'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children: React.ReactNode
  onPress?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  className?: string
  style?: StyleProp<ViewStyle>
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-primary',
  secondary: 'bg-surface-card border border-border-primary',
  ghost: 'bg-transparent',
  destructive: 'bg-red-500',
}

const textClasses: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-content-primary',
  ghost: 'text-brand-primary',
  destructive: 'text-white',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-6 py-4 text-lg',
}

export const Button = forwardRef<View, ButtonProps>(
  (
    {
      children,
      onPress,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      className,
      style,
    },
    ref,
  ) => {
    const theme = useAppTheme()

    const loaderColor =
      variant === 'secondary' ? theme.colors.text.primary : '#ffffff'

    return (
      <TouchableOpacity
        ref={ref}
        accessibilityRole="button"
        onPress={onPress}
        disabled={disabled || loading}
        style={style}
        className={clsx(
          'rounded-lg font-semibold active:opacity-80 items-center justify-center',
          variantClasses[variant],
          sizeClasses[size],
          (disabled || loading) && 'opacity-60',
          className,
        )}
      >
        {loading ? (
          <ActivityIndicator color={loaderColor} />
        ) : (
          <Text className={textClasses[variant]}>{children}</Text>
        )}
      </TouchableOpacity>
    )
  },
)

Button.displayName = 'Button'
