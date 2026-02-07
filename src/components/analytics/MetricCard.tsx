import React from 'react'
import { View } from 'react-native'
import { LucideIcon } from 'lucide-react-native'

import { Text, Card } from '~/components/ui'
import { CircularProgress } from '~/components/ui/CircularProgress'
import { useAppTheme } from '~/hooks/useAppTheme'

export interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  /** Display a circular progress ring instead of just the value */
  showProgress?: boolean
  /** Progress value 0-100 (only used when showProgress is true) */
  progress?: number
  /** Accent color for the icon background */
  accentColor?: string
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  showProgress = false,
  progress = 0,
  accentColor,
}: MetricCardProps) {
  const theme = useAppTheme()
  const resolvedAccent = accentColor ?? theme.colors.brand.primary
  // Icon background with reduced opacity
  const iconBgColor = `${resolvedAccent}20` // 12% opacity

  return (
    <Card className="p-5">
      <View className="flex-row items-center gap-5">
        {/* Left side: Icon or Progress Ring */}
        {showProgress ? (
          <CircularProgress progress={progress} size={96} strokeWidth={8} />
        ) : Icon ? (
          <View
            className="w-14 h-14 rounded-full items-center justify-center"
            style={{ backgroundColor: iconBgColor }}
          >
            <Icon size={28} color={resolvedAccent} strokeWidth={1.5} />
          </View>
        ) : null}

        {/* Right side: Content */}
        <View className="flex-1">
          <Text className="text-sm font-medium text-content-secondary mb-1">
            {title}
          </Text>
          {!showProgress && (
            <Text className="text-4xl font-bold text-content-primary">{value}</Text>
          )}
          {subtitle && (
            <Text className="text-sm text-content-secondary mt-1">{subtitle}</Text>
          )}
        </View>
      </View>
    </Card>
  )
}
