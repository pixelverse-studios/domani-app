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
  default: 'bg-purple-100 dark:bg-purple-900/30',
  outline: 'border border-purple-300 dark:border-purple-700',
  success: 'bg-green-100 dark:bg-green-900/30',
  beta: 'bg-amber-100 dark:bg-amber-900/30',
}

const textClasses: Record<BadgeVariant, string> = {
  default: 'text-purple-700 dark:text-purple-300',
  outline: 'text-purple-700 dark:text-purple-300',
  success: 'text-green-700 dark:text-green-300',
  beta: 'text-amber-700 dark:text-amber-300',
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
