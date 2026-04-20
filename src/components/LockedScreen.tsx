import React, { useState } from 'react'
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { Lock, Crown, RotateCcw, Settings, AlertCircle } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '~/components/ui/Text'
import { GradientButton } from '~/components/ui/GradientButton'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useSubscription } from '~/hooks/useSubscription'
import { PaywallModal } from '~/components/PaywallModal'
import { useTranslation } from '~/hooks/useTranslation'

export function LockedScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const subscription = useSubscription()
  const { t } = useTranslation()
  const isRefunded = subscription.status === 'refunded'
  const [showPaywall, setShowPaywall] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  const handleRestore = async () => {
    setRestoreError(null)
    try {
      const result = await subscription.restore()
      if (!result) {
        setRestoreError(t('subscription.locked.restoreNotFound'))
      }
    } catch {
      setRestoreError(t('subscription.locked.restoreError'))
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
          style={[styles.iconContainer, { backgroundColor: `${theme.colors.text.tertiary}1A` }]}
        >
          <Lock size={48} color={theme.colors.text.tertiary} strokeWidth={1.5} />
        </View>

        {/* Heading */}
        <Text
          className="text-2xl font-sans-bold text-content-primary text-center mt-6"
          style={{ lineHeight: 32 }}
        >
          {isRefunded
            ? t('subscription.locked.refundedTitle')
            : t('subscription.locked.expiredTitle')}
        </Text>

        {/* Subtext */}
        <Text
          className="font-sans text-content-secondary text-center mt-3"
          style={{ fontSize: 15, lineHeight: 22, paddingHorizontal: 16 }}
        >
          {isRefunded
            ? t('subscription.locked.refundedBody')
            : t('subscription.locked.expiredBody')}
        </Text>

        {/* Purchase CTA */}
        <View style={styles.ctaContainer}>
          <GradientButton
            onPress={() => {
              setRestoreError(null)
              setShowPaywall(true)
            }}
            disabled={subscription.isLoading}
            fullWidth
            icon={<Crown size={20} color="#fff" />}
          >
            {t('subscription.locked.getLifetimeAccess')}
          </GradientButton>
        </View>

        {/* Restore purchases */}
        <TouchableOpacity
          onPress={handleRestore}
          disabled={subscription.isRestoring}
          activeOpacity={0.7}
          style={styles.restoreButton}
          accessibilityLabel={t('subscription.locked.restorePurchases')}
          accessibilityRole="button"
        >
          {subscription.isRestoring ? (
            <ActivityIndicator size="small" color={theme.colors.text.tertiary} />
          ) : (
            <>
              <RotateCcw size={14} color={theme.colors.text.tertiary} />
              <Text className="text-sm text-content-secondary ml-1.5">
                {t('subscription.locked.restorePurchases')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Restore error */}
        {restoreError && (
          <View style={styles.errorRow} accessibilityRole="alert">
            <AlertCircle size={14} color={theme.colors.accent.brick} />
            <Text
              className="font-sans text-xs ml-1.5"
              style={{ color: theme.colors.accent.brick, flex: 1 }}
            >
              {restoreError}
            </Text>
          </View>
        )}
      </View>

      {/* Settings link at bottom */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/settings')}
        activeOpacity={0.7}
        style={styles.settingsLink}
        accessibilityLabel={t('subscription.locked.accountSettings')}
        accessibilityRole="button"
      >
        <Settings size={16} color={theme.colors.text.tertiary} />
        <Text className="text-sm text-content-tertiary ml-1.5">
          {t('subscription.locked.accountSettings')}
        </Text>
      </TouchableOpacity>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        offerings={subscription.offerings ?? null}
        offeringIdentifier={subscription.offeringIdentifier}
        isPurchasing={subscription.isPurchasing}
        isRestoring={subscription.isRestoring}
        onPurchase={subscription.purchase}
        onRestore={subscription.restore}
      />
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
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
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
