import React, { useEffect, useState } from 'react'
import { View, Modal, Animated, StyleSheet } from 'react-native'
import { Heart, HandHeart } from 'lucide-react-native'

import { Text } from '~/components/ui'

interface AccountConfirmationOverlayProps {
  visible: boolean
  type: 'reactivated' | 'deleted'
  onDismiss: () => void
}

export function AccountConfirmationOverlay({
  visible,
  type,
  onDismiss,
}: AccountConfirmationOverlayProps) {
  // Use state for animated values to satisfy lint rules
  const [opacity] = useState(() => new Animated.Value(0))
  const [scale] = useState(() => new Animated.Value(0.8))

  useEffect(() => {
    if (visible) {
      // Reset values when becoming visible
      opacity.setValue(0)
      scale.setValue(0.8)

      // Animate in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start()

      // Auto-dismiss after 2.5 seconds
      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          onDismiss()
        })
      }, 2500)

      return () => clearTimeout(timer)
    }
  }, [visible, opacity, scale, onDismiss])

  const isReactivated = type === 'reactivated'

  const config = isReactivated
    ? {
        icon: Heart,
        iconColor: '#22c55e',
        bgColor: '#22c55e',
        title: 'Welcome Back!',
        subtitle: "We're glad you decided to stay.",
        message: 'Your account has been fully restored.',
      }
    : {
        icon: HandHeart,
        iconColor: '#a855f7',
        bgColor: '#a855f7',
        title: 'Sorry to See You Go',
        subtitle: "We'll miss you.",
        message: 'Sign back in within 30 days to reactivate your account anytime.',
      }

  const Icon = config.icon

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.container, { opacity }]}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          {/* Icon with pulse effect */}
          <View style={[styles.iconContainer, { backgroundColor: config.bgColor + '20' }]}>
            <Icon size={40} color={config.iconColor} fill={config.iconColor} />
          </View>

          {/* Title */}
          <Text className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">
            {config.title}
          </Text>

          {/* Subtitle */}
          <Text className="text-base text-slate-600 dark:text-slate-300 text-center mb-3">
            {config.subtitle}
          </Text>

          {/* Message */}
          <Text className="text-sm text-slate-500 dark:text-slate-400 text-center">
            {config.message}
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
})
