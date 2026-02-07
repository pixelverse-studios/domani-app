import React from 'react'
import { Text, View } from 'react-native'
import clsx from 'clsx'

type BadgeVariant = 'default' | 'outline' | 'success' | 'beta'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const badgeClasses: Record<BadgeVariant, string> = {
  default: 'bg-brand-primary/10',
  outline: 'border border-brand-primary/30',
  success: 'bg-green-100',
  beta: 'bg-amber-100',
}

const textClasses: Record<BadgeVariant, string> = {
  default: 'text-brand-dark',
  outline: 'text-brand-dark',
  success: 'text-green-700',
  beta: 'text-amber-700',
}

export const Badge = ({ children, variant = 'default', className }: BadgeProps) => (
  <View
    className={clsx(
      'flex-row items-center rounded-full px-3 py-1',
      badgeClasses[variant],
      className,
    )}
  >
    <Text className={clsx('text-xs font-semibold uppercase tracking-tight', textClasses[variant])}>
      {children}
    </Text>
  </View>
)
