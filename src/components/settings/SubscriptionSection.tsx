import React from 'react'
import { View, TouchableOpacity, ActivityIndicator } from 'react-native'
import { AlertCircle, Crown, Sparkles, RotateCcw, ChevronRight } from 'lucide-react-native'
import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useTranslation } from '~/hooks/useTranslation'
import { formatLocalizedDate } from '~/i18n/date'
import { SectionHeader } from './SectionHeader'
import { SubscriptionSkeleton } from './SettingsSkeletons'
import type {
  PurchaseAccessSyncAttemptContext,
  PurchaseAccessSyncPhase,
  SubscriptionStatus,
} from '~/hooks/useSubscription'

interface SubscriptionSectionProps {
  isLoading: boolean
  status: SubscriptionStatus
  isStartingTrial: boolean
  isRestoring: boolean
  isSyncingAccess: boolean
  isRedeemingPromoCode: boolean
  accessSyncPhase: PurchaseAccessSyncPhase
  accessSyncAttempt: PurchaseAccessSyncAttemptContext | null
  trialDaysRemaining: number | null
  trialExpirationDate: Date | null
  graceDaysRemaining: number | null
  graceExpirationDate: Date | null
  onStartTrial: () => void
  onRestore: () => void
  onSyncAccess: () => void
  onRedeemPromoCode?: () => void
  onOpenRedeemCode: () => void
  onUpgrade: () => void
  onOpenPurchaseHelp: () => void
}

/**
 * Subscription section shown on the Settings screen. Branches explicitly on
 * the discriminated `SubscriptionStatus` — there is no `canStartTrial` boolean,
 * since eligibility is now encoded directly in the status (`pre_trial` means
 * eligible to start, `expired` means not).
 */
export function SubscriptionSection({
  isLoading,
  status,
  isStartingTrial,
  isRestoring,
  isSyncingAccess,
  isRedeemingPromoCode,
  accessSyncPhase,
  accessSyncAttempt,
  trialDaysRemaining,
  trialExpirationDate,
  graceDaysRemaining,
  graceExpirationDate,
  onStartTrial,
  onRestore,
  onSyncAccess,
  onRedeemPromoCode,
  onOpenRedeemCode,
  onUpgrade,
  onOpenPurchaseHelp,
}: SubscriptionSectionProps) {
  const theme = useAppTheme()
  const { locale, t } = useTranslation()

  // Subscription status display config. Lives inside the component so it can
  // reference theme colors. `Record<SubscriptionStatus, …>` enforces an entry
  // for every status in the union at compile time.
  //
  // The trial state uses `theme.colors.accent.trial` (brand primary sage at
  // 70% opacity) for the label/icon color, with a lighter sage-derived bg for
  // the badge pill.
  const statusConfig: Record<
    SubscriptionStatus,
    { label: string; color: string; bgStyle: { backgroundColor: string } }
  > = {
    beta: {
      label: t('subscription.settings.statusBeta'),
      color: '#f59e0b',
      bgStyle: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
    },
    grace_period: {
      label: t('subscription.settings.statusGracePeriod'),
      color: theme.colors.accent.trial,
      bgStyle: { backgroundColor: `${theme.colors.brand.primary}26` },
    },
    pre_trial: {
      label: t('subscription.settings.statusPreTrial'),
      color: '#94a3b8',
      bgStyle: { backgroundColor: 'rgba(148, 163, 184, 0.2)' },
    },
    expired: {
      label: t('subscription.settings.statusExpired'),
      color: '#94a3b8',
      bgStyle: { backgroundColor: 'rgba(148, 163, 184, 0.2)' },
    },
    refunded: {
      label: t('subscription.settings.statusRefunded'),
      color: '#94a3b8',
      bgStyle: { backgroundColor: 'rgba(148, 163, 184, 0.2)' },
    },
    trialing: {
      label: t('subscription.settings.statusTrialing'),
      color: theme.colors.accent.trial,
      // Brand primary sage at ~15% opacity for the badge pill bg — pairs
      // with the 70% accent.trial foreground for contrast.
      bgStyle: { backgroundColor: `${theme.colors.brand.primary}26` },
    },
    lifetime: {
      label: t('subscription.settings.statusLifetime'),
      color: '#f59e0b',
      bgStyle: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
    },
  }
  const currentStatusConfig = statusConfig[status]
  const showSyncingAccess = accessSyncPhase === 'syncing' || isSyncingAccess
  const showVerificationFailed = accessSyncPhase === 'verification_failed'
  const showSyncAccessCta =
    accessSyncPhase === 'code_validated' ||
    accessSyncPhase === 'os_confirmation_attempted' ||
    showSyncingAccess ||
    showVerificationFailed
  const warningColor = theme.colors.accent.terracotta
  const attemptedContextLines = [
    accessSyncAttempt?.promoCode
      ? t('subscription.settings.promoContextCode', { code: accessSyncAttempt.promoCode })
      : null,
    accessSyncAttempt?.campaignId
      ? t('subscription.settings.promoContextCampaign', {
          campaign: accessSyncAttempt.campaignId,
        })
      : null,
    accessSyncAttempt?.promoOutcome
      ? accessSyncAttempt.promoOutcome === 'free'
        ? t('subscription.settings.promoContextOutcomeFree')
        : t('subscription.settings.promoContextOutcomeDiscounted')
      : null,
    accessSyncAttempt?.priceString
      ? t('subscription.settings.promoContextPrice', { price: accessSyncAttempt.priceString })
      : null,
  ].filter((line): line is string => !!line)

  // Type-level exhaustiveness nudge: the JSX branches below
  // ({status === 'beta' && …}, etc.) are NOT individually type-checked by
  // TypeScript — a new SubscriptionStatus could be added without rendering
  // anything for it and tsc would stay silent. This Record forces the
  // author to at least touch this file when adding a status, which should
  // prompt them to update the branches as well.
  //
  // Keep this in sync with every case in the JSX below.
  const _exhaustiveStatusCheck: Record<SubscriptionStatus, true> = {
    beta: true,
    grace_period: true,
    lifetime: true,
    trialing: true,
    pre_trial: true,
    expired: true,
    refunded: true,
  }
  void _exhaustiveStatusCheck

  return (
    <>
      <SectionHeader title={t('subscription.settings.sectionTitle')} />
      {isLoading ? (
        <SubscriptionSkeleton />
      ) : (
        <View className="mb-6">
          <View className="rounded-xl p-4 mb-2" style={{ backgroundColor: theme.colors.card }}>
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Crown size={20} color={currentStatusConfig.color} />
                <Text className="text-base font-medium text-content-primary ml-2">
                  {t('subscription.settings.currentPlan')}
                </Text>
              </View>
              <View className="px-3 py-1 rounded-full" style={currentStatusConfig.bgStyle}>
                <Text
                  style={{ color: currentStatusConfig.color }}
                  className="text-sm font-semibold"
                >
                  {currentStatusConfig.label}
                </Text>
              </View>
            </View>

            {/* Beta — full access, no CTAs */}
            {status === 'beta' && (
              <Text className="text-sm text-content-secondary">
                {t('subscription.settings.betaBody')}
              </Text>
            )}

            {status === 'grace_period' && (
              <>
                <View className="flex-row items-center mb-3">
                  <Sparkles size={16} color={theme.colors.accent.trial} />
                  <Text
                    className="text-sm font-medium ml-2"
                    style={{ color: theme.colors.accent.trial }}
                  >
                    {graceDaysRemaining === 1
                      ? t('subscription.settings.gracePeriodOneDay')
                      : t('subscription.settings.gracePeriodManyDays', {
                          count: graceDaysRemaining ?? 0,
                        })}
                  </Text>
                </View>
                <Text className="text-sm text-content-secondary mb-3">
                  {graceExpirationDate
                    ? t('subscription.settings.gracePeriodBodyWithDate', {
                        date: formatLocalizedDate(graceExpirationDate, 'MMMM d', locale),
                      })
                    : t('subscription.settings.gracePeriodBodyNoDate')}
                </Text>
                <TouchableOpacity
                  onPress={onUpgrade}
                  disabled={isRestoring}
                  activeOpacity={0.8}
                  className="py-3 rounded-xl items-center"
                  style={{
                    backgroundColor: theme.colors.brand.primary,
                    opacity: isRestoring ? 0.5 : 1,
                  }}
                >
                  <Text className="text-white font-semibold">
                    {t('subscription.settings.getLifetimeAccess')}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Pre-trial — user has never started a trial, offer Start Trial CTA */}
            {status === 'pre_trial' && (
              <>
                <Text className="text-sm text-content-secondary mb-3">
                  {t('subscription.settings.preTrialBody')}
                </Text>
                <TouchableOpacity
                  onPress={onStartTrial}
                  disabled={isStartingTrial}
                  activeOpacity={0.8}
                  className="py-3 rounded-xl items-center flex-row justify-center mb-2"
                  style={{
                    backgroundColor: theme.colors.accent.trial,
                    opacity: isStartingTrial ? 0.5 : 1,
                  }}
                >
                  {isStartingTrial ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Sparkles size={18} color="#fff" />
                      <Text className="text-white font-semibold ml-2">
                        {t('subscription.settings.startTrial')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Expired — trial was used and ended, offer Upgrade CTA */}
            {status === 'expired' && (
              <>
                <Text className="text-sm text-content-secondary mb-3">
                  {t('subscription.settings.expiredBody')}
                </Text>
                <TouchableOpacity
                  onPress={onUpgrade}
                  disabled={isRestoring}
                  activeOpacity={0.8}
                  className="py-3 rounded-xl items-center"
                  style={{
                    backgroundColor: theme.colors.brand.primary,
                    opacity: isRestoring ? 0.5 : 1,
                  }}
                >
                  <Text className="text-white font-semibold">
                    {t('subscription.settings.getLifetimeAccess')}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Refunded — purchase was refunded, offer re-purchase CTA */}
            {status === 'refunded' && (
              <>
                <Text className="text-sm text-content-secondary mb-3">
                  {t('subscription.settings.refundedBody')}
                </Text>
                <TouchableOpacity
                  onPress={onUpgrade}
                  disabled={isRestoring}
                  activeOpacity={0.8}
                  className="py-3 rounded-xl items-center"
                  style={{
                    backgroundColor: theme.colors.brand.primary,
                    opacity: isRestoring ? 0.5 : 1,
                  }}
                >
                  <Text className="text-white font-semibold">
                    {t('subscription.settings.getLifetimeAccess')}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Trialing — show days remaining + Upgrade CTA */}
            {status === 'trialing' && (
              <>
                <View className="flex-row items-center mb-3">
                  <Sparkles size={16} color={theme.colors.accent.trial} />
                  <Text
                    className="text-sm font-medium ml-2"
                    style={{ color: theme.colors.accent.trial }}
                  >
                    {t('subscription.settings.trialingDaysRemaining', {
                      count: trialDaysRemaining ?? 0,
                    })}
                  </Text>
                </View>
                <Text className="text-sm text-content-secondary mb-3">
                  {trialExpirationDate
                    ? t('subscription.settings.trialingBodyWithDate', {
                        date: formatLocalizedDate(trialExpirationDate, 'MMMM d', locale),
                      })
                    : t('subscription.settings.trialingBodyNoDate')}
                </Text>
                <TouchableOpacity
                  onPress={onUpgrade}
                  disabled={isRestoring}
                  activeOpacity={0.8}
                  className="py-3 rounded-xl items-center"
                  style={{
                    backgroundColor: theme.colors.brand.primary,
                    opacity: isRestoring ? 0.5 : 1,
                  }}
                >
                  <Text className="text-white font-semibold">
                    {t('subscription.settings.getLifetimeAccess')}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Lifetime — purchased, show purchase help as the only action */}
            {status === 'lifetime' && (
              <>
                <Text className="text-sm text-content-secondary">
                  {t('subscription.settings.lifetimeBody')}
                </Text>
                <TouchableOpacity
                  onPress={onOpenPurchaseHelp}
                  disabled={isRestoring}
                  activeOpacity={0.85}
                  className="mt-4 pt-4 flex-row items-center justify-between"
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(245, 158, 11, 0.12)',
                    opacity: isRestoring ? 0.5 : 1,
                  }}
                >
                  <View className="flex-1 pr-4">
                    <Text
                      className="text-sm font-semibold mb-1"
                      style={{ color: currentStatusConfig.color }}
                    >
                      {t('subscription.purchaseHelp.entryCta')}
                    </Text>
                    <Text className="text-xs leading-5 text-content-secondary">
                      {t('subscription.settings.lifetimePurchaseHelpBody')}
                    </Text>
                  </View>
                  <View
                    className="h-10 w-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)' }}
                  >
                    <ChevronRight size={18} color={currentStatusConfig.color} />
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>

          {status !== 'lifetime' && (
            <TouchableOpacity
              onPress={onOpenRedeemCode}
              disabled={isSyncingAccess || isRestoring || isRedeemingPromoCode}
              activeOpacity={0.8}
              className="rounded-xl p-4 mb-2 flex-row items-center justify-between"
              style={{
                backgroundColor: theme.colors.card,
                borderWidth: 1,
                borderColor: theme.colors.border.primary,
                opacity: isSyncingAccess || isRestoring || isRedeemingPromoCode ? 0.55 : 1,
              }}
              accessibilityLabel={t('subscription.settings.redeemCode')}
              accessibilityRole="button"
            >
              <Text className="font-sans-semibold text-content-primary">
                {t('subscription.settings.redeemCode')}
              </Text>
              <ChevronRight size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          )}

          {showSyncingAccess && (
            <View
              className="rounded-xl p-4 mb-2"
              style={{
                backgroundColor: `${theme.colors.brand.primary}12`,
                borderWidth: 1,
                borderColor: `${theme.colors.brand.primary}26`,
              }}
              accessibilityLiveRegion="polite"
            >
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-content-primary">
                    {t('subscription.settings.syncingAccessTitle')}
                  </Text>
                  <Text className="text-xs text-content-secondary mt-1">
                    {t('subscription.settings.syncingAccessBody')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {showVerificationFailed && (
            <View
              className="rounded-xl p-4 mb-2"
              style={{
                backgroundColor: `${warningColor}14`,
                borderWidth: 1,
                borderColor: `${warningColor}2E`,
              }}
              accessibilityRole="alert"
            >
              <View className="flex-row">
                <AlertCircle size={18} color={warningColor} />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-content-primary">
                    {t('subscription.settings.verificationFailedTitle')}
                  </Text>
                  <Text className="text-xs leading-5 text-content-secondary mt-1">
                    {t('subscription.settings.verificationFailedBody')}
                  </Text>
                  {attemptedContextLines.length > 0 && (
                    <View className="mt-2">
                      {attemptedContextLines.map((line) => (
                        <Text key={line} className="text-xs text-content-tertiary">
                          {line}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              </View>
              <View className="flex-row flex-wrap mt-3" style={{ gap: 8 }}>
                <TouchableOpacity
                  onPress={onSyncAccess}
                  disabled={isSyncingAccess || isRestoring || isRedeemingPromoCode}
                  activeOpacity={0.8}
                  className="px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: theme.colors.brand.primary,
                    opacity: isSyncingAccess || isRestoring || isRedeemingPromoCode ? 0.5 : 1,
                  }}
                >
                  <Text className="text-xs font-semibold text-white">
                    {t('subscription.settings.retrySync')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onRestore}
                  disabled={isSyncingAccess || isRestoring || isRedeemingPromoCode}
                  activeOpacity={0.8}
                  className="px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: theme.colors.card,
                    borderWidth: 1,
                    borderColor: theme.colors.border.primary,
                    opacity: isSyncingAccess || isRestoring || isRedeemingPromoCode ? 0.5 : 1,
                  }}
                >
                  <Text className="text-xs font-semibold text-content-primary">
                    {t('subscription.settings.restorePurchases')}
                  </Text>
                </TouchableOpacity>
                {onRedeemPromoCode && (
                  <TouchableOpacity
                    onPress={onRedeemPromoCode}
                    disabled={isSyncingAccess || isRestoring || isRedeemingPromoCode}
                    activeOpacity={0.8}
                    className="px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: theme.colors.card,
                      borderWidth: 1,
                      borderColor: theme.colors.border.primary,
                      opacity: isSyncingAccess || isRestoring || isRedeemingPromoCode ? 0.5 : 1,
                    }}
                  >
                    <Text className="text-xs font-semibold text-content-primary">
                      {t('subscription.settings.tryDifferentCode')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={onOpenPurchaseHelp}
                  disabled={isSyncingAccess || isRestoring || isRedeemingPromoCode}
                  activeOpacity={0.8}
                  className="px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: theme.colors.card,
                    borderWidth: 1,
                    borderColor: theme.colors.border.primary,
                    opacity: isSyncingAccess || isRestoring || isRedeemingPromoCode ? 0.5 : 1,
                  }}
                >
                  <Text className="text-xs font-semibold text-content-primary">
                    {t('subscription.settings.contactSupport')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {showSyncAccessCta && !showSyncingAccess && !showVerificationFailed && (
            <TouchableOpacity
              onPress={onSyncAccess}
              disabled={isSyncingAccess || isRestoring || isRedeemingPromoCode}
              activeOpacity={0.7}
              className="flex-row items-center justify-center py-2"
            >
              {isSyncingAccess || isRedeemingPromoCode ? (
                <ActivityIndicator size="small" color={theme.colors.text.tertiary} />
              ) : (
                <>
                  <RotateCcw size={14} color={theme.colors.text.tertiary} />
                  <Text className="text-sm text-content-secondary ml-1.5">
                    {t('subscription.settings.syncAccess')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Restore remains useful for users who lost applied access after a prior
              purchase. Keep it off the active lifetime view, which already has a
              dedicated purchase-help action in the card. */}
          {status === 'refunded' && (
            <>
              <TouchableOpacity
                onPress={onRestore}
                disabled={isRestoring}
                activeOpacity={0.7}
                className="flex-row items-center justify-center py-2"
              >
                {isRestoring ? (
                  <ActivityIndicator size="small" color={theme.colors.text.tertiary} />
                ) : (
                  <>
                    <RotateCcw size={14} color={theme.colors.text.tertiary} />
                    <Text className="text-sm text-content-secondary ml-1.5">
                      {t('subscription.settings.restorePurchases')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onOpenPurchaseHelp}
                disabled={isRestoring}
                activeOpacity={0.7}
                className="flex-row items-center justify-center py-2"
              >
                <Text
                  className="text-sm font-sans-medium"
                  style={{ color: theme.colors.brand.primary }}
                >
                  {t('subscription.purchaseHelp.entryCta')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </>
  )
}
