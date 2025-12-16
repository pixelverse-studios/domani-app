import React from 'react'
import { TextInput, TextInputProps } from 'react-native'
import clsx from 'clsx'

interface InputProps extends TextInputProps {
  className?: string
}

export const Input = ({ className, style, ...rest }: InputProps) => {
  return (
    <TextInput
      placeholderTextColor="rgba(100,116,139,0.8)"
      className={clsx(
        'w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-base text-slate-900 dark:text-slate-50',
        'focus:border-purple-600 dark:focus:border-purple-500',
        className,
      )}
      style={[{ lineHeight: 24 }, style]}
      {...rest}
    />
  )
}
