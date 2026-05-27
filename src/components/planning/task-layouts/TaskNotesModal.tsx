import React, { useState } from 'react'
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { FileText, X } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'

interface TaskNotesModalProps {
  visible: boolean
  notes: string
  taskTitle: string
  onClose: () => void
}

interface TaskNotesIconButtonProps {
  notes: string
  taskTitle: string
  backgroundColor: string
  iconColor: string
  iconSize?: number
  buttonSize?: number
  borderRadius?: number
}

interface TaskNotesPreviewButtonProps {
  notes: string
  taskTitle: string
  iconColor: string
}

export function TaskNotesModal({ visible, notes, taskTitle, onClose }: TaskNotesModalProps) {
  const theme = useAppTheme()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <FileText size={18} color={theme.colors.text.tertiary} />
              <Text className="font-sans-semibold text-lg text-content-primary ml-2">
                Notes
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close notes"
              accessibilityRole="button"
            >
              <X size={22} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <Text className="font-sans-medium text-sm text-content-secondary mb-3" numberOfLines={2}>
            {taskTitle}
          </Text>

          <ScrollView
            style={[styles.notesContainer, { backgroundColor: theme.colors.interactive.hover }]}
            contentContainerStyle={styles.notesContent}
          >
            <Text className="font-sans text-base text-content-primary" selectable>
              {notes}
            </Text>
          </ScrollView>

          <TouchableOpacity
            onPress={onClose}
            style={[styles.doneButton, { backgroundColor: theme.colors.brand.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text className="font-sans-semibold text-white">Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export function TaskNotesIconButton({
  notes,
  taskTitle,
  backgroundColor,
  iconColor,
  iconSize = 13,
  buttonSize = 28,
  borderRadius = 6,
}: TaskNotesIconButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={[
          styles.iconButton,
          { width: buttonSize, height: buttonSize, borderRadius, backgroundColor },
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Open notes"
      >
        <FileText size={iconSize} color={iconColor} />
      </TouchableOpacity>
      <TaskNotesModal
        visible={isOpen}
        notes={notes}
        taskTitle={taskTitle}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}

export function TaskNotesPreviewButton({
  notes,
  taskTitle,
  iconColor,
}: TaskNotesPreviewButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={styles.previewRow}
        accessibilityRole="button"
        accessibilityLabel="Open notes"
      >
        <FileText size={11} color={iconColor} />
        <Text
          className="font-sans text-xs text-content-tertiary ml-1"
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {notes}
        </Text>
      </TouchableOpacity>
      <TaskNotesModal
        visible={isOpen}
        notes={notes}
        taskTitle={taskTitle}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: 18,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  notesContainer: {
    borderRadius: 10,
    maxHeight: 280,
  },
  notesContent: {
    padding: 14,
  },
  doneButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
})
