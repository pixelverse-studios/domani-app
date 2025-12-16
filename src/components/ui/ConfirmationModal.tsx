import React from 'react'
import { View, TouchableOpacity, Modal, StyleSheet } from 'react-native'
import { AlertTriangle } from 'lucide-react-native'

import { Text } from './Text'
import { useTheme } from '~/hooks/useTheme'

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
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const purpleColor = isDark ? '#a78bfa' : '#8b5cf6'

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
            },
          ]}
        >
          {/* Warning Icon */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
              },
            ]}
          >
            <AlertTriangle size={28} color="#ef4444" />
          </View>

          {/* Title */}
          <Text
            className="text-xl font-sans-bold text-slate-900 dark:text-white mt-4"
            style={{ textAlign: 'center' }}
          >
            {title}
          </Text>

          {/* Description */}
          <Text
            className="font-sans text-slate-500 dark:text-slate-400 mt-2"
            style={{ textAlign: 'center', fontSize: 15 }}
          >
            {description}
          </Text>

          {/* Item Name */}
          <Text
            className="font-sans-semibold mt-1"
            style={{ textAlign: 'center', fontSize: 16, color: purpleColor }}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            &quot;{itemName}&quot;
          </Text>

          {/* Warning */}
          <Text
            className="font-sans text-slate-400 dark:text-slate-500 mt-1"
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
                  backgroundColor: isDark ? '#334155' : '#e2e8f0',
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                className="font-sans-semibold text-slate-900 dark:text-white"
                style={{ fontSize: 16 }}
              >
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
