import React from 'react'
import { View, TextInput, TouchableOpacity } from 'react-native'
import { Lock } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'

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
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const textColor = isDark ? '#f8fafc' : '#0f172a'
  const textSecondaryColor = isDark ? '#94a3b8' : '#64748b'

  return (
    <View>
      {/* Label Row */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm text-slate-600 dark:text-slate-300">
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
        <View className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 min-h-[140px] items-center justify-center border border-slate-200 dark:border-slate-700">
          <Lock size={24} color={textSecondaryColor} />
          <Text className="text-sm text-slate-400 dark:text-slate-500 mt-2">{disabledMessage}</Text>
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
            className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-base text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 min-h-[140px]"
            style={{ color: textColor }}
          />
          {/* Character Counter */}
          <View className="flex-row justify-between mt-2">
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              {value.length} characters
            </Text>
            {showMinLabel && minCharacters !== undefined && minCharacters > 0 && (
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                Min. {minCharacters} characters
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  )
}
