import React from 'react'
import {
  render,
  renderHook,
  type RenderHookResult,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'

import { AuthContext } from '~/providers/AuthProvider'
import { AnalyticsProvider } from '~/providers/AnalyticsProvider'
import { LocalizationProvider } from '~/providers/LocalizationProvider'
import { ThemeProvider } from '~/providers/ThemeProvider'

type TestProviderOptions = {
  queryClient?: QueryClient
  user?: User | null
}

type CustomRenderOptions = RenderOptions & TestProviderOptions

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
        gcTime: Infinity,
      },
    },
  })
}

export function createTestWrapper(options: TestProviderOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient()
  const user =
    options.user === undefined
      ? ({ id: 'user-1', email: 'test@example.com' } as User)
      : options.user
  const authValue = {
    session: null,
    user,
    loading: false,
    accountRecoveryError: null,
    retryAccountRecovery: jest.fn().mockResolvedValue(true),
    signInWithGoogle: jest.fn(),
    signInWithApple: jest.fn(),
    signOut: jest.fn(),
    accountReactivated: false,
    clearAccountReactivated: jest.fn(),
  }

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <LocalizationProvider>
        <ThemeProvider>
          <AnalyticsProvider>
            <AuthContext.Provider value={authValue}>
              <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            </AuthContext.Provider>
          </AnalyticsProvider>
        </ThemeProvider>
      </LocalizationProvider>
    )
  }
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const queryClient = options.queryClient ?? createTestQueryClient()
  const { queryClient: _queryClient, user, ...renderOptions } = options

  return {
    queryClient,
    ...render(ui, {
      wrapper: createTestWrapper({ queryClient, user }),
      ...renderOptions,
    }),
  }
}

export function renderHookWithProviders<Result, Props>(
  callback: (props: Props) => Result,
  options: TestProviderOptions & { initialProps?: Props } = {},
): RenderHookResult<Result, Props> & { queryClient: QueryClient } {
  const queryClient = options.queryClient ?? createTestQueryClient()

  return {
    queryClient,
    ...renderHook(callback, {
      initialProps: options.initialProps,
      wrapper: createTestWrapper({ queryClient, user: options.user }),
    }),
  }
}

export * from '@testing-library/react-native'
export * from './factories'
