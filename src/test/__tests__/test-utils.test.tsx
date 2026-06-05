import React from 'react'
import { useQuery } from '@tanstack/react-query'

import { Text } from '~/components/ui/Text'
import { useAuth } from '~/hooks/useAuth'
import { useLocalization } from '~/providers/LocalizationProvider'
import {
  buildProfile,
  buildTask,
  buildTaskWithCategory,
  renderHookWithProviders,
  renderWithProviders,
  screen,
} from '../test-utils'

function LocalizedLabel() {
  const { t } = useLocalization()

  return <Text>{t('common.today')}</Text>
}

describe('test utilities', () => {
  it('renders components with app localization and theme context', () => {
    renderWithProviders(<LocalizedLabel />)

    expect(screen.getByText('Today')).toBeTruthy()
  })

  it('renders hooks with a React Query client that disables retries', () => {
    const { result } = renderHookWithProviders(() =>
      useQuery({
        queryKey: ['test-utils-smoke'],
        queryFn: () => 'ready',
      }),
    )

    expect(result.current.failureCount).toBe(0)
  })

  it('passes auth user overrides into hook wrappers', () => {
    const { result } = renderHookWithProviders(() => useAuth(), {
      user: null,
    })

    expect(result.current.user).toBeNull()
  })

  it('builds common model factories with useful defaults', () => {
    expect(buildProfile({ tier: 'lifetime' }).tier).toBe('lifetime')
    expect(buildTask({ title: 'Factory task' }).title).toBe('Factory task')
    expect(buildTaskWithCategory().system_category?.name).toBe('Work')
  })
})
