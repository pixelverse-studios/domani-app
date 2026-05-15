import React from 'react'
import {
  render,
  renderHook,
  type RenderHookResult,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AnalyticsProvider } from '~/providers/AnalyticsProvider'
import { LocalizationProvider } from '~/providers/LocalizationProvider'
import { ThemeProvider } from '~/providers/ThemeProvider'

type TestProviderOptions = {
  queryClient?: QueryClient
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
      },
    },
  })
}

export function createTestWrapper(options: TestProviderOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient()

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <LocalizationProvider>
        <ThemeProvider>
          <AnalyticsProvider>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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
  const { queryClient: _queryClient, ...renderOptions } = options

  return {
    queryClient,
    ...render(ui, {
      wrapper: createTestWrapper({ queryClient }),
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
      wrapper: createTestWrapper({ queryClient }),
    }),
  }
}

export * from '@testing-library/react-native'
export * from './factories'
