import { useAppTheme } from '~/hooks/useAppTheme'
import type { TaskLayout } from '~/stores/layoutStore'

export function useCardStyle(layout: TaskLayout) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  const styles: Record<TaskLayout, object> = {
    default: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: 16,
      padding: 24,
    },
    compact: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: 10,
      padding: 16,
    },
    minimal: {
      backgroundColor: 'transparent',
      borderBottomWidth: 1,
      borderBottomColor: `${theme.colors.border.primary}66`,
      borderRadius: 0,
      padding: 16,
      paddingHorizontal: 4,
    },
    detailed: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: 16,
      borderLeftWidth: 4,
      borderLeftColor: brandColor,
      padding: 24,
    },
    grid: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: 14,
      padding: 20,
      overflow: 'hidden' as const,
    },
    checklist: {
      backgroundColor: 'transparent',
      borderRadius: 0,
      padding: 16,
      paddingHorizontal: 4,
    },
  }

  return styles[layout]
}
