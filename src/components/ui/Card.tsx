import React from 'react'
import { View, ViewProps } from 'react-native'
import clsx from 'clsx'

interface CardProps extends ViewProps {
  className?: string
}

export const Card = ({ children, className, ...rest }: CardProps) => {
  return (
    <View
      className={clsx('bg-surface-card border border-border-primary rounded-xl p-4', className)}
      {...rest}
    >
      {children}
    </View>
  )
}
