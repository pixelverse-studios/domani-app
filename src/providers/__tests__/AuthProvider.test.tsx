import React from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

import { act, render } from '~/test/test-utils'
import { LocalizationProvider } from '~/providers/LocalizationProvider'
import { AuthProvider } from '../AuthProvider'
import { supabase } from '~/lib/supabase'

const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock
const mockGetUser = supabase.auth.getUser as jest.Mock
const mockFrom = supabase.from as unknown as jest.Mock

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns from the auth listener before validating a cached session', async () => {
    let authListener:
      | ((event: AuthChangeEvent, session: Session | null) => void | Promise<void>)
      | null = null
    mockOnAuthStateChange.mockImplementation((listener) => {
      authListener = listener
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })

    render(
      <LocalizationProvider>
        <AuthProvider>
          <></>
        </AuthProvider>
      </LocalizationProvider>,
    )

    const session = {
      user: {
        id: 'user-1',
        email: 'one@example.com',
        identities: [],
        user_metadata: {},
        app_metadata: {},
      },
    } as unknown as Session
    mockGetUser.mockResolvedValue({ data: { user: session.user }, error: null })

    let listenerResult: void | Promise<void> | undefined
    act(() => {
      listenerResult = authListener?.('INITIAL_SESSION', session)
    })

    expect(listenerResult).toBeUndefined()
    expect(mockFrom).not.toHaveBeenCalled()

    await act(async () => {
      jest.runOnlyPendingTimers()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockFrom).toHaveBeenCalledWith('profiles')
  })
})
