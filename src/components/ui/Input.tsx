import React from 'react'
import { TextInput, TextInputProps } from 'react-native'
import clsx from 'clsx'
import { useAppTheme } from '~/hooks/useAppTheme'

interface InputProps extends TextInputProps {
  className?: string
}

export const Input = ({ className, style, ...rest }: InputProps) => {
  const theme = useAppTheme()

  return (
    <TextInput
      placeholderTextColor={theme.colors.text.tertiary}
      className={clsx(
        'w-full rounded-xl border border-border-primary bg-surface-bg px-4 text-base text-content-primary',
        'focus:border-brand-primary',
        className,
      )}
      style={[{ paddingTop: 14, paddingBottom: 14, lineHeight: undefined }, style]}
      {...rest}
    />
  )
}
