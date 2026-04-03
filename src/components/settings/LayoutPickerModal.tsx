import React from 'react'
import { View, TouchableOpacity, Modal, ScrollView } from 'react-native'
import { X, Check } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useLayoutStore, TASK_LAYOUTS, type TaskLayout } from '~/stores/layoutStore'

interface LayoutPickerModalProps {
  visible: boolean
  onClose: () => void
}

function LayoutPreview({
  layout,
  isSelected,
  onSelect,
}: {
  layout: (typeof TASK_LAYOUTS)[number]
  isSelected: boolean
  onSelect: () => void
}) {
  const theme = useAppTheme()
  const priorityColor = theme.priority.high.color

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.7}
      style={{
        borderRadius: 14,
        borderWidth: 2,
        borderColor: isSelected ? theme.colors.brand.primary : theme.colors.border.primary,
        backgroundColor: theme.colors.card,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text className="font-sans-semibold text-base text-content-primary">{layout.label}</Text>
          <Text className="font-sans text-sm text-content-secondary mt-0.5">
            {layout.description}
          </Text>
        </View>
        {isSelected && (
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: theme.colors.brand.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 12,
            }}
          >
            <Check size={14} color="#fff" strokeWidth={3} />
          </View>
        )}
      </View>

      {/* Mini preview of the layout */}
      <View
        style={{
          marginTop: 12,
          borderRadius: 8,
          backgroundColor: theme.colors.background,
          padding: 10,
        }}
      >
        <LayoutMiniPreview layoutId={layout.id} priorityColor={priorityColor} theme={theme} />
      </View>
    </TouchableOpacity>
  )
}

function LayoutMiniPreview({
  layoutId,
  priorityColor,
  theme,
}: {
  layoutId: TaskLayout
  priorityColor: string
  theme: ReturnType<typeof useAppTheme>
}) {
  const cardBg = theme.colors.card
  const textPrimary = theme.colors.text.primary
  const textSecondary = theme.colors.text.tertiary
  const borderColor = theme.colors.border.primary

  if (layoutId === 'default') {
    return (
      <View style={{ borderRadius: 6, backgroundColor: cardBg, borderWidth: 1, borderColor, borderLeftWidth: 3, borderLeftColor: priorityColor, padding: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ width: '55%', height: 8, borderRadius: 4, backgroundColor: textPrimary, opacity: 0.6 }} />
          <View style={{ width: 32, height: 12, borderRadius: 4, backgroundColor: `${priorityColor}26` }} />
        </View>
        <View style={{ height: 1, backgroundColor: borderColor, marginVertical: 6 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: '35%', height: 6, borderRadius: 3, backgroundColor: textSecondary, opacity: 0.4 }} />
          <View style={{ flexDirection: 'row', gap: 3 }}>
            <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: theme.colors.interactive.hover }} />
            <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: theme.colors.interactive.hover }} />
          </View>
        </View>
      </View>
    )
  }

  if (layoutId === 'compact') {
    return (
      <View style={{ gap: 4 }}>
        {[0.6, 0.45].map((w, i) => (
          <View key={i} style={{ borderRadius: 5, backgroundColor: cardBg, borderWidth: 1, borderColor, borderLeftWidth: 2, borderLeftColor: i === 0 ? priorityColor : theme.priority.medium.color, paddingHorizontal: 8, paddingVertical: 5, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: `${w * 100}%`, height: 7, borderRadius: 3, backgroundColor: textPrimary, opacity: 0.5 }} />
            <View style={{ flex: 1 }} />
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: theme.colors.interactive.hover }} />
          </View>
        ))}
      </View>
    )
  }

  if (layoutId === 'minimal') {
    return (
      <View style={{ gap: 0 }}>
        {[0.5, 0.65, 0.4].map((w, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: `${borderColor}66` }}>
            <View style={{ width: 5, height: 5, borderRadius: 1, backgroundColor: i === 0 ? priorityColor : i === 1 ? theme.priority.medium.color : theme.priority.low.color, marginRight: 8 }} />
            <View style={{ width: `${w * 100}%`, height: 6, borderRadius: 3, backgroundColor: textPrimary, opacity: 0.5 }} />
          </View>
        ))}
      </View>
    )
  }

  if (layoutId === 'grid') {
    const colors = [priorityColor, theme.priority.medium.color, theme.priority.low.color, theme.priority.high.color]
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {[0.7, 0.5, 0.6, 0.45].map((w, i) => (
          <View key={i} style={{ width: '48%', borderRadius: 6, backgroundColor: cardBg, borderWidth: 1, borderColor, overflow: 'hidden' }}>
            <View style={{ height: 2, backgroundColor: colors[i] }} />
            <View style={{ padding: 6 }}>
              <View style={{ width: `${w * 100}%`, height: 6, borderRadius: 3, backgroundColor: textPrimary, opacity: 0.5, marginBottom: 4 }} />
              <View style={{ width: '40%', height: 4, borderRadius: 2, backgroundColor: textSecondary, opacity: 0.3 }} />
            </View>
          </View>
        ))}
      </View>
    )
  }

  if (layoutId === 'checklist') {
    return (
      <View style={{ gap: 2 }}>
        {[0.55, 0.7, 0.4].map((w, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: i === 0 ? priorityColor : i === 1 ? theme.priority.medium.color : theme.priority.low.color, marginRight: 8 }} />
            <View style={{ width: `${w * 100}%`, height: 6, borderRadius: 3, backgroundColor: textPrimary, opacity: 0.5 }} />
          </View>
        ))}
      </View>
    )
  }

  // detailed
  return (
    <View style={{ borderRadius: 8, backgroundColor: cardBg, borderWidth: 1, borderColor, borderLeftWidth: 3, borderLeftColor: priorityColor, padding: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <View style={{ width: 40, height: 10, borderRadius: 4, backgroundColor: `${priorityColor}26` }} />
        <View style={{ width: '25%', height: 6, borderRadius: 3, backgroundColor: textSecondary, opacity: 0.3 }} />
      </View>
      <View style={{ width: '70%', height: 8, borderRadius: 4, backgroundColor: textPrimary, opacity: 0.6, marginBottom: 6 }} />
      <View style={{ borderRadius: 4, backgroundColor: theme.colors.interactive.hover, padding: 6 }}>
        <View style={{ width: '90%', height: 5, borderRadius: 2, backgroundColor: textSecondary, opacity: 0.25, marginBottom: 3 }} />
        <View style={{ width: '60%', height: 5, borderRadius: 2, backgroundColor: textSecondary, opacity: 0.25 }} />
      </View>
    </View>
  )
}

export function LayoutPickerModal({ visible, onClose }: LayoutPickerModalProps) {
  const theme = useAppTheme()
  const taskLayout = useLayoutStore((s) => s.taskLayout)
  const setTaskLayout = useLayoutStore((s) => s.setTaskLayout)

  const handleSelect = (layout: TaskLayout) => {
    setTaskLayout(layout)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View
          className="rounded-t-3xl max-h-[85%]"
          style={{ backgroundColor: theme.colors.background }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
            <Text className="text-lg font-sans-semibold text-content-primary">
              Task Card Layout
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={24} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <Text className="text-sm text-content-secondary px-5 mb-4">
            Choose how your tasks are displayed
          </Text>

          <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 40 }}>
            {TASK_LAYOUTS.map((layout) => (
              <LayoutPreview
                key={layout.id}
                layout={layout}
                isSelected={taskLayout === layout.id}
                onSelect={() => handleSelect(layout.id)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
