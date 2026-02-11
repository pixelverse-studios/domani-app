import React from 'react'
import { View, TouchableOpacity, Modal, StyleSheet } from 'react-native'
import { AlertTriangle } from 'lucide-react-native'

import { Text } from './Text'
import { useAppTheme } from '~/hooks/useAppTheme'

interface ConfirmationModalProps {
  visible: boolean
  title: string
  itemName: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function ConfirmationModal({
  visible,
  title,
  itemName,
  description = 'Are you sure you want to delete:',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationModalProps) {
  const theme = useAppTheme()

  const brandColor = theme.colors.brand.primary

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          {/* Warning Icon */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
              },
            ]}
          >
            <AlertTriangle size={28} color="#ef4444" />
          </View>

          {/* Title */}
          <Text
            className="text-xl font-sans-bold text-content-primary mt-4"
            style={{ textAlign: 'center' }}
          >
            {title}
          </Text>

          {/* Description */}
          <Text
            className="font-sans text-content-secondary mt-2"
            style={{ textAlign: 'center', fontSize: 15 }}
          >
            {description}
          </Text>

          {/* Item Name */}
          <Text
            className="font-sans-semibold mt-1"
            style={{ textAlign: 'center', fontSize: 16, color: brandColor }}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            &quot;{itemName}&quot;
          </Text>

          {/* Warning */}
          <Text
            className="font-sans text-content-tertiary mt-1"
            style={{ textAlign: 'center', fontSize: 13 }}
          >
            This cannot be undone.
          </Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {/* Delete Button */}
            <TouchableOpacity
              onPress={onConfirm}
              disabled={isLoading}
              style={[styles.button, styles.deleteButton, isLoading && { opacity: 0.6 }]}
              activeOpacity={0.8}
            >
              <Text className="font-sans-semibold text-white" style={{ fontSize: 16 }}>
                {isLoading ? 'Deleting...' : confirmLabel}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={onCancel}
              disabled={isLoading}
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.interactive.hover,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text className="font-sans-semibold text-content-primary" style={{ fontSize: 16 }}>
                {cancelLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    maxHeight: '75%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
})
