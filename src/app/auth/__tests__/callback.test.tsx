import React from 'react'

import { render, waitFor } from '~/test/test-utils'
import AuthCallbackScreen from '../callback'

const mockReplace = jest.fn()
const mockExchange = jest.fn()
const mockGetSession = jest.fn()
let mockCallbackUrl = ''

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }))
jest.mock('expo-linking', () => ({ useLinkingURL: () => mockCallbackUrl }))
jest.mock('~/lib/supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => mockExchange(...args),
      getSession: () => mockGetSession(),
    },
  },
}))

describe('OAuth callback screen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'existing-session' } } })
  })

  it('rejects callback tokens and never logs raw callback parameters', async () => {
    mockCallbackUrl = 'domani://auth/callback#access_token=raw-secret&refresh_token=raw-refresh'
    const log = jest.spyOn(console, 'log').mockImplementation(() => {})
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      render(<AuthCallbackScreen />)
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'))
      expect(mockExchange).not.toHaveBeenCalled()
      expect(JSON.stringify([...log.mock.calls, ...error.mock.calls])).not.toContain('raw-secret')
      expect(JSON.stringify([...log.mock.calls, ...error.mock.calls])).not.toContain('raw-refresh')
    } finally {
      log.mockRestore()
      error.mockRestore()
    }
  })

  it('exchanges an approved code once across rerenders', async () => {
    mockCallbackUrl = 'domani://auth/callback?code=approved-code'
    mockExchange.mockResolvedValue({ data: { session: { access_token: 'session' } }, error: null })
    const screen = render(<AuthCallbackScreen />)
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'))
    screen.rerender(<AuthCallbackScreen />)
    expect(mockExchange).toHaveBeenCalledTimes(1)
    expect(mockExchange).toHaveBeenCalledWith('approved-code')
  })
})

it('recovers a callback route with no underlying link instead of spinning forever', async () => {
  mockCallbackUrl = ''
  mockGetSession.mockResolvedValue({ data: { session: { access_token: 'existing-session' } } })
  render(<AuthCallbackScreen />)
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'))
})
