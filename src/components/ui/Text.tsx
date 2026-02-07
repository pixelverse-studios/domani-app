import React from 'react'
import { Text as RNText, TextProps } from 'react-native'

type TextVariant = 'title' | 'subtitle' | 'body' | 'caption' | 'none'

interface TypographyProps extends TextProps {
  variant?: TextVariant
  className?: string
}

const variantClasses: Record<TextVariant, string> = {
  title: 'text-3xl font-sans-semibold text-content-primary',
  subtitle: 'text-xl font-sans-medium text-content-secondary',
  body: 'text-base font-sans text-content-primary',
  caption: 'text-sm font-sans text-content-tertiary',
  none: '',
}

export const Text = ({ variant = 'body', className, ...rest }: TypographyProps) => {
  // If className contains text size classes, skip variant styling to allow full override
  const hasTextSizeOverride =
    className && /text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)/.test(className)
  const baseClasses = hasTextSizeOverride ? '' : variantClasses[variant]

  return (
    <RNText {...rest} className={baseClasses ? `${baseClasses} ${className || ''}` : className} />
  )
}
