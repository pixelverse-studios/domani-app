import React from 'react'

import { renderWithProviders } from '~/test/test-utils'
import TabLayout from '../_layout'
import { useAuth } from '~/hooks/useAuth'
import { useSubscription } from '~/hooks/useSubscription'
import { usePathname } from 'expo-router'

jest.mock('expo-router', () => {
  const React = require('react')
  const { Text, View } = require('react-native')

  function Tabs({ children }: { children: React.ReactNode }) {
    return <View testID="tabs">{children}</View>
  }
  function Screen({ name, options }: { name: string; options?: { href?: string | null } }) {
    return <Text>{`${name}:${options?.href === null ? 'hidden' : 'visible'}`}</Text>
  }
  function Redirect({ href }: { href: string }) {
    return <Text>{`redirect:${href}`}</Text>
  }
  Tabs.Screen = Screen

  return {
    Redirect,
    Tabs,
    usePathname: jest.fn(() => '/(tabs)'),
  }
})

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}))

jest.mock('~/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

jest.mock('~/hooks/useSubscription', () => ({
  hasFullAccess: jest.fn((status: string) => status === 'trialing' || status === 'lifetime'),
  useSubscription: jest.fn(),
}))

jest.mock('~/components/tutorial', () => ({
  TutorialSpotlight: () => null,
  WelcomeOverlay: () => null,
  useTutorialLifecycle: jest.fn(),
}))

jest.mock('~/stores/tutorialStore', () => ({
  useTutorialStore: jest.fn((selector) =>
    selector({
      initializeTutorialState: jest.fn(),
    }),
  ),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseSubscription = useSubscription as jest.MockedFunction<typeof useSubscription>
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

function mockAuthenticatedUser() {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1' },
    loading: false,
  } as ReturnType<typeof useAuth>)
}

function mockSubscription(status: 'pre_trial' | 'trialing', isLoading = false) {
  mockUseSubscription.mockReturnValue({
    status,
    isLoading,
  } as ReturnType<typeof useSubscription>)
}

describe('TabLayout access gating', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthenticatedUser()
    mockUsePathname.mockReturnValue('/(tabs)')
  })

  it('redirects gated direct Planning navigation back to Today before rendering tabs', () => {
    mockUsePathname.mockReturnValue('/(tabs)/planning')
    mockSubscription('pre_trial')

    const { getByText, queryByTestId } = renderWithProviders(<TabLayout />)

    expect(getByText('redirect:/(tabs)')).toBeTruthy()
    expect(queryByTestId('tabs')).toBeNull()
  })

  it('holds direct restricted navigation on loading while access resolves', () => {
    mockUsePathname.mockReturnValue('/(tabs)/planning')
    mockSubscription('pre_trial', true)

    const { queryByText, queryByTestId } = renderWithProviders(<TabLayout />)

    expect(queryByText('redirect:/(tabs)')).toBeNull()
    expect(queryByTestId('tabs')).toBeNull()
  })

  it('keeps Today and Settings visible while hiding locked tabs for gated users', () => {
    mockSubscription('pre_trial')

    const { getByText } = renderWithProviders(<TabLayout />)

    expect(getByText('index:visible')).toBeTruthy()
    expect(getByText('settings:visible')).toBeTruthy()
    expect(getByText('planning:hidden')).toBeTruthy()
    expect(getByText('feedback:hidden')).toBeTruthy()
    expect(getByText('analytics:hidden')).toBeTruthy()
  })

  it('does not mount tabs while subscription access is unresolved', () => {
    mockSubscription('trialing', true)

    const { queryByTestId } = renderWithProviders(<TabLayout />)
    expect(queryByTestId('tabs')).toBeNull()
  })

  it('redirects unauthenticated users without waiting for subscription state', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false } as ReturnType<typeof useAuth>)
    mockSubscription('pre_trial', true)

    const { getByText, queryByTestId } = renderWithProviders(<TabLayout />)

    expect(getByText('redirect:/welcome')).toBeTruthy()
    expect(queryByTestId('tabs')).toBeNull()
  })

  it('orders Feedback as the fourth tab after Progress', () => {
    mockSubscription('trialing')

    const { getAllByText } = renderWithProviders(<TabLayout />)

    expect(
      getAllByText(/^(index|planning|analytics|feedback|settings):(visible|hidden)$/).map(
        (node) => node.props.children,
      ),
    ).toEqual([
      'index:visible',
      'planning:visible',
      'analytics:visible',
      'feedback:visible',
      'settings:visible',
    ])
  })

  it('does not redirect full-access direct Planning navigation', () => {
    mockUsePathname.mockReturnValue('/(tabs)/planning')
    mockSubscription('trialing')

    const { getByTestId, queryByText } = renderWithProviders(<TabLayout />)

    expect(getByTestId('tabs')).toBeTruthy()
    expect(queryByText('redirect:/(tabs)')).toBeNull()
  })
})
