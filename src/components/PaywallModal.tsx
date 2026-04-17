import React, { useEffect, useState } from 'react'
import {
  Modal,
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native'
import { Crown, Check, X, RotateCcw, AlertCircle, PartyPopper } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { PACKAGE_TYPE } from 'react-native-purchases'
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases'

import { Text } from '~/components/ui/Text'
import { GradientButton } from '~/components/ui/GradientButton'
import { useAppTheme } from '~/hooks/useAppTheme'

interface PaywallModalProps {
  visible: boolean
  onClose: () => void
  offerings: PurchasesOffering | null
  offeringIdentifier: string
  isPurchasing: boolean
  isRestoring: boolean
  onPurchase: (pkg: PurchasesPackage) => Promise<unknown | null>
  onRestore: () => Promise<unknown | null>
}

const DISCOUNT_CONFIG: Record<string, { label: string; badge: string }> = {
  early_adopter: { label: 'Early adopter pricing', badge: '71% off' },
  friends_family: { label: 'Friends & family pricing', badge: '86% off' },
}

const VALUE_PROPS = [
  'Unlimited daily tasks',
  'Plan tomorrow, tonight',
  'All features, forever',
  'No subscriptions, ever',
]

const SUCCESS_PROPS = [
  'Plan tomorrow, tonight',
  'Small daily wins build lasting habits',
  'Built to keep you focused, not busy',
  'The strategy top performers swear by',
]

export function PaywallModal({
  visible,
  onClose,
  offerings,
  offeringIdentifier,
  isPurchasing,
  isRestoring,
  onPurchase,
  onRestore,
}: PaywallModalProps) {
  const theme = useAppTheme()
  const router = useRouter()
  const { height } = useWindowDimensions()
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current
  const fadeAnim = React.useRef(new Animated.Value(0)).current
  const [error, setError] = useState<string | null>(null)
  const [failCount, setFailCount] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const successScaleAnim = React.useRef(new Animated.Value(0.8)).current

  const lifetimePackage =
    offerings?.availablePackages?.find((pkg) => pkg.packageType === PACKAGE_TYPE.LIFETIME) ??
    offerings?.availablePackages?.[0] ??
    null
  const priceString = lifetimePackage?.product?.priceString
  const discount = DISCOUNT_CONFIG[offeringIdentifier]
  const isCompactHeight = height < 780
  const isVeryCompactHeight = height < 700

  const layout = {
    overlayPadding: isVeryCompactHeight ? 12 : isCompactHeight ? 16 : 20,
    containerPadding: isVeryCompactHeight ? 20 : isCompactHeight ? 24 : 32,
    closeOffset: isVeryCompactHeight ? 10 : 16,
    iconContainerSize: isVeryCompactHeight ? 72 : isCompactHeight ? 84 : 96,
    iconSize: isVeryCompactHeight ? 36 : isCompactHeight ? 42 : 48,
    titleFontSize: isVeryCompactHeight ? 28 : isCompactHeight ? 30 : 32,
    titleLineHeight: isVeryCompactHeight ? 32 : isCompactHeight ? 34 : 36,
    titleMarginTop: isVeryCompactHeight ? 16 : 24,
    bodyFontSize: isVeryCompactHeight ? 14 : 15,
    bodyLineHeight: isVeryCompactHeight ? 20 : 22,
    valueSectionTop: isVeryCompactHeight ? 16 : isCompactHeight ? 20 : 24,
    valueSectionBottom: isVeryCompactHeight ? 20 : isCompactHeight ? 24 : 28,
    valueRowVertical: isVeryCompactHeight ? 5 : isCompactHeight ? 6 : 8,
    checkCircleSize: isVeryCompactHeight ? 24 : isCompactHeight ? 26 : 28,
    checkIconSize: isVeryCompactHeight ? 12 : 14,
    restoreMarginTop: isVeryCompactHeight ? 2 : 4,
  }

  // Reset error state when modal opens
  useEffect(() => {
    if (visible) {
      setError(null)
      setFailCount(0)
      setShowSuccess(false)
      successScaleAnim.setValue(0.8)
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      scaleAnim.setValue(0.9)
      fadeAnim.setValue(0)
    }
  }, [visible, scaleAnim, fadeAnim, successScaleAnim])

  const transitionToSuccess = () => {
    setShowSuccess(true)
    Animated.spring(successScaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start()
  }

  const handlePurchase = async () => {
    if (!lifetimePackage) return
    setError(null)
    try {
      const result = await onPurchase(lifetimePackage)
      if (result) transitionToSuccess()
    } catch {
      const count = failCount + 1
      setFailCount(count)
      setError(
        count >= 2
          ? 'This keeps happening. Please contact support if the issue persists.'
          : 'Something went wrong with your purchase. Please try again.',
      )
    }
  }

  const handleRestore = async () => {
    setError(null)
    try {
      const result = await onRestore()
      if (result) {
        transitionToSuccess()
      } else {
        setError('No previous purchases found for this account.')
      }
    } catch {
      setError('Could not restore purchases. Please try again.')
    }
  }

  const isProcessing = isPurchasing || isRestoring

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={isProcessing ? undefined : onClose}
        style={[styles.overlay, { padding: layout.overlayPadding }]}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.modalTouchArea}>
          <Animated.View
            style={[
              styles.container,
              {
                backgroundColor: theme.colors.card,
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
                padding: layout.containerPadding,
                maxHeight: height - layout.overlayPadding * 2,
              },
            ]}
          >
          {showSuccess ? (
            /* ── Success View ── */
            <Animated.View
              style={[styles.successContent, { transform: [{ scale: successScaleAnim }] }]}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    width: layout.iconContainerSize,
                    height: layout.iconContainerSize,
                    borderRadius: layout.iconContainerSize / 2,
                  },
                  { backgroundColor: `${theme.colors.brand.primary}1A` },
                ]}
              >
                <PartyPopper
                  size={layout.iconSize}
                  color={theme.colors.brand.primary}
                  strokeWidth={2}
                />
              </View>

              <Text
                className="font-sans-bold text-content-primary text-center"
                style={{
                  fontSize: layout.titleFontSize,
                  lineHeight: layout.titleLineHeight,
                  marginTop: layout.titleMarginTop,
                }}
              >
                You're All Set!
              </Text>

              <Text
                className="font-sans text-content-secondary text-center mt-2 mb-2"
                style={{ fontSize: layout.bodyFontSize, lineHeight: layout.bodyLineHeight }}
              >
                Lifetime access unlocked. Welcome to Domani.
              </Text>

              <View style={styles.successChecks}>
                {SUCCESS_PROPS.map((prop) => (
                  <View key={prop} style={styles.valuePropRow}>
                    <View
                      style={[
                        styles.checkCircle,
                        {
                          width: layout.checkCircleSize,
                          height: layout.checkCircleSize,
                          borderRadius: layout.checkCircleSize / 2,
                        },
                        { backgroundColor: `${theme.colors.brand.primary}1A` },
                      ]}
                    >
                      <Check
                        size={layout.checkIconSize}
                        color={theme.colors.brand.primary}
                        strokeWidth={3}
                      />
                    </View>
                    <Text
                      className="font-sans text-content-primary ml-3"
                      style={{ fontSize: layout.bodyFontSize, lineHeight: layout.bodyLineHeight }}
                    >
                      {prop}
                    </Text>
                  </View>
                ))}
              </View>

              <GradientButton onPress={onClose} fullWidth>
                Start Planning
              </GradientButton>

              {/* Close link for users who don't want to navigate */}
              <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ marginTop: 12 }}>
                <Text className="font-sans text-sm text-content-tertiary">Dismiss</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            /* ── Purchase View ── */
            <>
              {/* Close button */}
              <TouchableOpacity
                onPress={onClose}
                disabled={isProcessing}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={[styles.closeButton, { top: layout.closeOffset, right: layout.closeOffset }]}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <X size={24} color={theme.colors.text.tertiary} />
              </TouchableOpacity>

              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    width: layout.iconContainerSize,
                    height: layout.iconContainerSize,
                    borderRadius: layout.iconContainerSize / 2,
                  },
                  { backgroundColor: `${theme.colors.brand.primary}1A` },
                ]}
              >
                <Crown size={layout.iconSize} color={theme.colors.brand.primary} strokeWidth={2} />
              </View>

              {/* Header */}
              <Text
                className="font-sans-bold text-content-primary text-center"
                style={{
                  fontSize: layout.titleFontSize,
                  lineHeight: layout.titleLineHeight,
                  marginTop: layout.titleMarginTop,
                }}
              >
                Get Lifetime Access
              </Text>

              {/* Subtitle */}
              <Text
                className="font-sans text-content-secondary text-center mt-2"
                style={{ fontSize: layout.bodyFontSize, lineHeight: layout.bodyLineHeight }}
              >
                One purchase. Yours forever.
              </Text>

              {/* Discount badge for early adopter / friends & family */}
              {discount && (
                <View
                  style={[
                    styles.discountBadge,
                    { backgroundColor: `${theme.colors.brand.primary}1F` },
                  ]}
                >
                  <Text
                    className="font-sans-bold text-xs"
                    style={{ color: theme.colors.brand.dark, letterSpacing: 0.3 }}
                  >
                    {discount.badge}
                  </Text>
                  <Text className="font-sans text-xs text-content-secondary ml-1.5">
                    — {discount.label}
                  </Text>
                </View>
              )}

              {/* Value props */}
              <View
                style={[
                  styles.valueProps,
                  {
                    marginTop: layout.valueSectionTop,
                    marginBottom: layout.valueSectionBottom,
                  },
                ]}
              >
                {VALUE_PROPS.map((prop) => (
                  <View key={prop} style={[styles.valuePropRow, { paddingVertical: layout.valueRowVertical }]}>
                    <View
                      style={[
                        styles.checkCircle,
                        {
                          width: layout.checkCircleSize,
                          height: layout.checkCircleSize,
                          borderRadius: layout.checkCircleSize / 2,
                        },
                        { backgroundColor: `${theme.colors.brand.primary}1A` },
                      ]}
                    >
                      <Check
                        size={layout.checkIconSize}
                        color={theme.colors.brand.primary}
                        strokeWidth={3}
                      />
                    </View>
                    <Text
                      className="font-sans text-content-primary ml-3"
                      style={{ fontSize: layout.bodyFontSize, lineHeight: layout.bodyLineHeight }}
                    >
                      {prop}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Purchase CTA */}
              <GradientButton
                onPress={handlePurchase}
                loading={isPurchasing}
                disabled={!lifetimePackage || isProcessing}
                fullWidth
                icon={<Crown size={20} color="#fff" />}
              >
                {priceString ? `Get Lifetime Access — ${priceString}` : 'Get Lifetime Access'}
              </GradientButton>

              {/* Inline error message */}
              {error && (
                <View style={styles.errorContainer} accessibilityRole="alert">
                  <View style={styles.errorRow}>
                    <AlertCircle size={14} color={theme.colors.accent.brick} />
                    <Text
                      className="font-sans text-xs ml-1.5"
                      style={{ color: theme.colors.accent.brick, flex: 1 }}
                    >
                      {error}
                    </Text>
                  </View>
                  {failCount >= 2 && (
                    <TouchableOpacity
                      onPress={() => {
                        onClose()
                        router.push('/contact-support')
                      }}
                      activeOpacity={0.7}
                      style={styles.contactSupport}
                    >
                      <Text
                        className="font-sans-medium text-xs"
                        style={{ color: theme.colors.brand.primary }}
                      >
                        Contact Support
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* One-time purchase badge */}
              {!error && (
                <Text className="font-sans-medium text-xs text-content-tertiary text-center mt-3">
                  One-time purchase. No recurring charges.
                </Text>
              )}

              {/* Restore purchases */}
              <TouchableOpacity
                onPress={handleRestore}
                disabled={isProcessing}
                activeOpacity={0.7}
                style={[styles.restoreButton, { marginTop: layout.restoreMarginTop }]}
                accessibilityLabel="Restore previous purchases"
                accessibilityRole="button"
              >
                {isRestoring ? (
                  <ActivityIndicator size="small" color={theme.colors.text.tertiary} />
                ) : (
                  <>
                    <RotateCcw size={14} color={theme.colors.text.tertiary} />
                    <Text className="text-sm text-content-secondary ml-1.5">Restore Purchases</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    alignItems: 'center',
  },
  modalTouchArea: {
    width: '100%',
    maxWidth: 380,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  valueProps: {
    width: '100%',
  },
  valuePropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContent: {
    alignItems: 'center',
    width: '100%',
  },
  successChecks: {
    width: '100%',
    marginTop: 16,
    marginBottom: 24,
  },
  errorContainer: {
    width: '100%',
    marginTop: 12,
    alignItems: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactSupport: {
    marginTop: 8,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
})
