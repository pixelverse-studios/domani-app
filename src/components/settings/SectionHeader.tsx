import React from 'react'

import { Text } from '~/components/ui'

interface SectionHeaderProps {
  title: string
}

/**
 * Section header component for settings groups
 */
export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <Text className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
      {title}
    </Text>
  )
}
