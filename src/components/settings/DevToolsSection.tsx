import React from 'react'
import { View, TouchableOpacity } from 'react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useAppConfigStore } from '~/stores/appConfigStore'
import type { AppPhase } from '~/types/appConfig'

interface DevToolsSectionProps {
  onOpenPaywall?: () => void
}

export function DevToolsSection({ onOpenPaywall }: DevToolsSectionProps) {
  const theme = useAppTheme()
  const phase = useAppConfigStore((s) => s.phase)
  const setPhaseOverride = useAppConfigStore((s) => s.setPhaseOverride)
  const isBetaPhase = phase === 'closed_beta' || phase === 'open_beta'

  const buttonStyle = {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: 12,
    padding: 14,
  }

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        className="text-xs font-sans-bold text-content-tertiary mb-3"
        style={{ letterSpacing: 1 }}
      >
        DEV TOOLS
      </Text>

      {/* Phase Override Toggle */}
      <TouchableOpacity
        onPress={() => {
          const nextPhase: AppPhase = isBetaPhase ? 'production' : 'open_beta'
          setPhaseOverride(nextPhase)
        }}
        activeOpacity={0.7}
        style={buttonStyle}
      >
        <Text className="font-sans-semibold text-sm" style={{ color: theme.colors.text.primary }}>
          {isBetaPhase ? 'Switch to Production Mode' : 'Switch to Beta Mode'}
        </Text>
        <Text className="font-sans text-xs mt-0.5" style={{ color: theme.colors.text.tertiary }}>
          Current: {phase} — {isBetaPhase ? 'subscription UI hidden' : 'subscription UI visible'}
        </Text>
      </TouchableOpacity>

      {/* Open Paywall Modal */}
      {onOpenPaywall && (
        <TouchableOpacity
          onPress={onOpenPaywall}
          activeOpacity={0.7}
          style={{ ...buttonStyle, marginTop: 8 }}
        >
          <Text
            className="font-sans-semibold text-sm"
            style={{ color: theme.colors.text.primary }}
          >
            Open Paywall Modal
          </Text>
          <Text className="font-sans text-xs mt-0.5" style={{ color: theme.colors.text.tertiary }}>
            Preview paywall regardless of subscription state
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
