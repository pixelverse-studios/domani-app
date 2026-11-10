import React from 'react'
import { AppState, Text, type AppStateStatus } from 'react-native'
import { act, render, waitFor } from '@testing-library/react-native'
import { RolloutProvider } from '../RolloutProvider'
import { useAuth } from '~/hooks/useAuth'
import { supabase } from '~/lib/supabase'
import { fetchVersionPolicy } from '~/lib/rollout'

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.1.4',
  nativeBuildVersion: '114',
}))
jest.mock('~/hooks/useAuth', () => ({ useAuth: jest.fn() }))
jest.mock('~/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }))
jest.mock('~/lib/rollout', () => ({
  ...jest.requireActual('~/lib/rollout'),
  fetchVersionPolicy: jest.fn(),
}))
jest.mock('~/components/ui/Button', () => ({
  Button: ({ children, onPress }: { children: React.ReactNode; onPress: () => void }) => {
    const { Text } = require('react-native')
    return <Text onPress={onPress}>{children}</Text>
  },
}))
let foreground: (state: AppStateStatus) => void
beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(useAuth).mockReturnValue({ user: { id: 'account-1' } } as never)
  jest.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)
  jest.mocked(fetchVersionPolicy).mockResolvedValue(null)
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    foreground = listener
    return { remove: jest.fn() }
  })
})
afterEach(() => {
  jest.restoreAllMocks()
})
it('observes normal activity without feedback and throttles foreground observations per account', async () => {
  const result = render(
    <RolloutProvider>
      <Text>My plans</Text>
    </RolloutProvider>,
  )
  await waitFor(() =>
    expect(supabase.rpc).toHaveBeenCalledWith(
      'observe_current_user_client',
      expect.objectContaining({
        p_app_version: '1.1.4',
        p_build: '114',
      }),
    ),
  )
  await act(async () => {
    foreground('active')
  })
  expect(supabase.rpc).toHaveBeenCalledTimes(1)
  jest.mocked(useAuth).mockReturnValue({ user: { id: 'account-2' } } as never)
  result.rerender(
    <RolloutProvider>
      <Text>My plans</Text>
    </RolloutProvider>,
  )
  await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(2))
})
it('keeps signed-out activity anonymous and allows use on an unavailable gate', async () => {
  jest.mocked(useAuth).mockReturnValue({ user: null } as never)
  const result = render(
    <RolloutProvider>
      <Text>My plans</Text>
    </RolloutProvider>,
  )
  await waitFor(() => expect(fetchVersionPolicy).toHaveBeenCalled())
  expect(supabase.rpc).not.toHaveBeenCalled()
  expect(result.getByText('My plans')).toBeTruthy()
})
it('shows the future update experience and clears it on a failed foreground config check', async () => {
  jest.mocked(fetchVersionPolicy).mockResolvedValueOnce({
    enabled: true,
    minimumVersion: '1.2.0',
    storeUrl: 'https://apps.apple.com/app/id123',
  })
  const result = render(
    <RolloutProvider>
      <Text>My plans</Text>
    </RolloutProvider>,
  )
  await waitFor(() => expect(result.getByText('Update Domani')).toBeTruthy())
  expect(result.queryByText('My plans')).toBeNull()
  await act(async () => {
    foreground('active')
  })
  await waitFor(() => expect(result.getByText('My plans')).toBeTruthy())
})

it('ignores an older blocking response after a newer check permits use', async () => {
  let resolveFirst: (value: Awaited<ReturnType<typeof fetchVersionPolicy>>) => void = () => {}
  jest
    .mocked(fetchVersionPolicy)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve
        }),
    )
    .mockResolvedValueOnce(null)
  const result = render(
    <RolloutProvider>
      <Text>My plans</Text>
    </RolloutProvider>,
  )
  await act(async () => {
    foreground('active')
  })
  await act(async () => {
    resolveFirst({
      enabled: true,
      minimumVersion: '1.2.0',
      storeUrl: 'https://apps.apple.com/app/id123',
    })
  })
  expect(result.queryByText('Update Domani')).toBeNull()
  expect(result.getByText('My plans')).toBeTruthy()
})
