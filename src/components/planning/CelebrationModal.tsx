import React, { useEffect } from 'react'
import { Modal, View, StyleSheet, Animated } from 'react-native'
import { Sparkles } from 'lucide-react-native'

import { Button } from '~/components/ui/Button'
import { Text } from '~/components/ui/Text'
import { useAppTheme } from '~/hooks/useAppTheme'

interface CelebrationModalProps {
  visible: boolean
  taskCount: number
  onDismiss: () => void
}

export function CelebrationModal({ visible, taskCount, onDismiss }: CelebrationModalProps) {
  const theme = useAppTheme()
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current
  const fadeAnim = React.useRef(new Animated.Value(0)).current

  // Animate modal entrance
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
      // Reset animation values when modal closes
      scaleAnim.setValue(0.9)
      fadeAnim.setValue(0)
    }
  }, [visible, scaleAnim, fadeAnim])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
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
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${theme.colors.brand.primary}1A` }, // 10% opacity
            ]}
          >
            <Sparkles size={48} color={theme.colors.brand.primary} strokeWidth={2} />
          </View>

          {/* Header */}
          <Text
            className="text-3xl font-sans-bold text-content-primary text-center mt-6"
            style={{ lineHeight: 36 }}
          >
            You did it!
          </Text>

          {/* Body */}
          <Text
            className="font-sans text-content-secondary text-center mt-4 px-4"
            style={{ fontSize: 16, lineHeight: 24 }}
          >
            You completed everything you planned for yesterday. That&apos;s the power of intentional
            planning.
          </Text>

          {/* Task count indicator */}
          <View style={styles.statsContainer}>
            <Text className="font-sans-medium text-sm text-content-tertiary">
              {taskCount} {taskCount === 1 ? 'task' : 'tasks'} completed
            </Text>
          </View>

          {/* Action Button */}
          <Button onPress={onDismiss} variant="primary" size="lg" className="w-full mt-6">
            Start Today
          </Button>
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
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
})
