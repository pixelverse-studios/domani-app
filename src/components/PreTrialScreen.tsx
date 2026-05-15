import React, { useState } from 'react'
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { Sparkles, Settings, AlertCircle } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '~/components/ui/Text'
import { GradientButton } from '~/components/ui/GradientButton'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useSubscription } from '~/hooks/useSubscription'
import { useTranslation } from '~/hooks/useTranslation'

/**
 * Gate shown to users in the `pre_trial` state — authenticated users who
 * have never started a trial. Distinct from LockedScreen (which handles
 * `expired` users): here the primary action is "Start Free Trial", not
 * "Get Lifetime Access". There is intentionally no auto-start and no
 * Restore Purchases button, since there's nothing to restore yet.
 *
 * Users can still reach Account Settings from this screen to log out or
 * switch accounts.
 */
export function PreTrialScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const subscription = useSubscription()
  const { t } = useTranslation()
  const [startError, setStartError] = useState<string | null>(null)

  const handleStartTrial = async () => {
    setStartError(null)
    try {
      await subscription.startTrial()
    } catch (err) {
      // Log the underlying error so we can distinguish guard-check failures
      // (e.g. "Trial cannot be started from current state", which should be
      // unreachable in practice but would indicate a state-machine bug) from
      // genuine DB/network failures. User still sees a generic message.
      console.error('[PreTrialScreen] startTrial failed:', err)
      setStartError(t('subscription.preTrial.error'))
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View
          style={[styles.iconContainer, { backgroundColor: `${theme.colors.brand.primary}1A` }]}
        >
          <Sparkles size={48} color={theme.colors.brand.primary} strokeWidth={1.5} />
        </View>

        {/* Heading */}
        <Text
          className="text-2xl font-sans-bold text-content-primary text-center mt-6"
          style={{ lineHeight: 32 }}
        >
          {t('subscription.preTrial.title')}
        </Text>

        {/* Subtext */}
        <Text
          className="font-sans text-content-secondary text-center mt-3"
          style={{ fontSize: 15, lineHeight: 22, paddingHorizontal: 16 }}
        >
          {t('subscription.preTrial.body')}
        </Text>

        {/* Start Trial CTA */}
        <View style={styles.ctaContainer}>
          <GradientButton
            onPress={handleStartTrial}
            disabled={subscription.isLoading || subscription.isStartingTrial}
            fullWidth
            icon={subscription.isStartingTrial ? undefined : <Sparkles size={20} color="#fff" />}
          >
            {subscription.isStartingTrial ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              t('subscription.preTrial.startTrial')
            )}
          </GradientButton>
        </View>

        {/* Start-trial error */}
        {startError && (
          <View style={styles.errorRow} accessibilityRole="alert">
            <AlertCircle size={14} color={theme.colors.accent.brick} />
            <Text
              className="font-sans text-xs ml-1.5"
              style={{ color: theme.colors.accent.brick, flex: 1 }}
            >
              {startError}
            </Text>
          </View>
        )}
      </View>

      {/* Settings link at bottom */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/settings')}
        activeOpacity={0.7}
        style={styles.settingsLink}
        accessibilityLabel={t('subscription.preTrial.accountSettings')}
        accessibilityRole="button"
      >
        <Settings size={16} color={theme.colors.text.tertiary} />
        <Text className="text-sm text-content-tertiary ml-1.5">
          {t('subscription.preTrial.accountSettings')}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaContainer: {
    width: '100%',
    marginTop: 32,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
})
