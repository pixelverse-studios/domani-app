import React, { useEffect } from 'react'
import {
  Modal,
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { Crown, Check, X, RotateCcw } from 'lucide-react-native'
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases'

import { Text } from '~/components/ui/Text'
import { GradientButton } from '~/components/ui/GradientButton'
import { useAppTheme } from '~/hooks/useAppTheme'

interface PaywallModalProps {
  visible: boolean
  onClose: () => void
  offerings: PurchasesOffering | null
  isPurchasing: boolean
  isRestoring: boolean
  onPurchase: (pkg: PurchasesPackage) => void
  onRestore: () => void
}

const VALUE_PROPS = [
  'Unlimited daily tasks',
  'Plan tomorrow, tonight',
  'All features, forever',
  'No subscriptions, ever',
]

export function PaywallModal({
  visible,
  onClose,
  offerings,
  isPurchasing,
  isRestoring,
  onPurchase,
  onRestore,
}: PaywallModalProps) {
  const theme = useAppTheme()
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current
  const fadeAnim = React.useRef(new Animated.Value(0)).current

  const lifetimePackage = offerings?.availablePackages?.[0] ?? null
  const priceString = lifetimePackage?.product?.priceString

  useEffect(() => {
    if (visible) {
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
  }, [visible, scaleAnim, fadeAnim])

  const handlePurchase = () => {
    if (lifetimePackage) {
      onPurchase(lifetimePackage)
    }
  }

  const isProcessing = isPurchasing || isRestoring

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.card,
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            disabled={isProcessing}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.closeButton}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <X size={24} color={theme.colors.text.tertiary} />
          </TouchableOpacity>

          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${theme.colors.brand.primary}1A` },
            ]}
          >
            <Crown size={48} color={theme.colors.brand.primary} strokeWidth={2} />
          </View>

          {/* Header */}
          <Text
            className="text-3xl font-sans-bold text-content-primary text-center mt-6"
            style={{ lineHeight: 36 }}
          >
            Get Lifetime Access
          </Text>

          {/* Subtitle */}
          <Text
            className="font-sans text-content-secondary text-center mt-2"
            style={{ fontSize: 15, lineHeight: 22 }}
          >
            One purchase. Yours forever.
          </Text>

          {/* Value props */}
          <View style={styles.valueProps}>
            {VALUE_PROPS.map((prop) => (
              <View key={prop} style={styles.valuePropRow}>
                <View
                  style={[
                    styles.checkCircle,
                    { backgroundColor: `${theme.colors.brand.primary}1A` },
                  ]}
                >
                  <Check size={14} color={theme.colors.brand.primary} strokeWidth={3} />
                </View>
                <Text
                  className="font-sans text-content-primary ml-3"
                  style={{ fontSize: 15, lineHeight: 22 }}
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

          {/* One-time purchase badge */}
          <Text className="font-sans-medium text-xs text-content-tertiary text-center mt-3">
            One-time purchase. No recurring charges.
          </Text>

          {/* Restore purchases */}
          <TouchableOpacity
            onPress={onRestore}
            disabled={isProcessing}
            activeOpacity={0.7}
            style={styles.restoreButton}
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
        </Animated.View>
      </View>
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
    padding: 32,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueProps: {
    width: '100%',
    marginTop: 24,
    marginBottom: 28,
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
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
})
