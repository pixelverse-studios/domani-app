import React from 'react'
import { View, TextInput, TouchableOpacity } from 'react-native'
import { Lock } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'

interface FormTextAreaProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  showClear?: boolean
  onClear?: () => void
  minCharacters?: number
  showMinLabel?: boolean
  disabledMessage?: string
}

export function FormTextArea({
  label,
  value,
  onChange,
  placeholder = '',
  disabled = false,
  showClear = false,
  onClear,
  minCharacters,
  showMinLabel = true,
  disabledMessage = 'Select a category to start',
}: FormTextAreaProps) {
  const theme = useAppTheme()

  const textColor = theme.colors.text.primary
  const textSecondaryColor = theme.colors.text.secondary

  return (
    <View>
      {/* Label Row */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm text-content-secondary">
          {label} <Text className="text-red-500">*</Text>
        </Text>
        {showClear && onClear && value.length > 0 && (
          <TouchableOpacity
            onPress={onClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text className="text-sm text-red-500">× Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Text Area or Disabled State */}
      {disabled ? (
        <View
          className="rounded-xl px-4 py-3 min-h-[140px] items-center justify-center border"
          style={{ backgroundColor: theme.colors.interactive.hover, borderColor: theme.colors.border.primary }}
        >
          <Lock size={24} color={textSecondaryColor} />
          <Text className="text-sm text-content-tertiary mt-2">{disabledMessage}</Text>
        </View>
      ) : (
        <>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={textSecondaryColor}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            className="rounded-xl px-4 text-base text-content-primary border min-h-[140px]"
            style={{ backgroundColor: theme.colors.interactive.hover, borderColor: theme.colors.border.primary, color: textColor, paddingTop: 14, paddingBottom: 14, lineHeight: undefined }}
          />
          {/* Character Counter */}
          <View className="flex-row justify-between mt-2">
            <Text className="text-xs text-content-secondary">
              {value.length} characters
            </Text>
            {showMinLabel && minCharacters !== undefined && minCharacters > 0 && (
              <Text className="text-xs text-content-secondary">
                Min. {minCharacters} characters
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  )
}
