import React, { useState, useEffect } from 'react'
import { View, Modal, TouchableOpacity, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'

interface TimePickerModalProps {
  visible: boolean
  value: Date
  title?: string
  is24Hour?: boolean
  onConfirm: (date: Date) => void
  onCancel: () => void
}

export function TimePickerModal({
  visible,
  value,
  title = 'Select Time',
  is24Hour,
  onConfirm,
  onCancel,
}: TimePickerModalProps) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary
  const iconColor = theme.colors.text.tertiary
  const borderColor = `${theme.colors.border.primary}33`

  const [tempValue, setTempValue] = useState(value)

  useEffect(() => {
    if (visible) setTempValue(value)
  }, [visible, value])

  if (Platform.OS !== 'ios') return null

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onCancel}
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          className="rounded-t-2xl pb-8"
          style={{ backgroundColor: theme.colors.card }}
        >
          <View
            className="flex-row justify-between items-center px-4 py-3 border-b"
            style={{ borderColor }}
          >
            <TouchableOpacity onPress={onCancel}>
              <Text className="text-base" style={{ color: iconColor }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text className="text-base font-sans-semibold text-content-primary">{title}</Text>
            <TouchableOpacity
              onPress={() => {
                onConfirm(tempValue)
              }}
            >
              <Text className="text-base font-sans-semibold" style={{ color: brandColor }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={tempValue}
            mode="time"
            display="spinner"
            is24Hour={is24Hour}
            onChange={(_, date) => {
              if (date) setTempValue(date)
            }}
            themeVariant="light"
            style={{ height: 200, alignSelf: 'center' }}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}
