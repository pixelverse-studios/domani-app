import type { Session } from '@supabase/supabase-js'

import { waitFor } from '~/test/test-utils'
import {
  completeOAuthCallback,
  parseOAuthCallback,
  runSingleFlight,
  waitForAuthSession,
} from '../authSession'

describe('authSession', () => {
  describe('runSingleFlight', () => {
    it('reuses a pending operation instead of starting another one', async () => {
      let resolveOperation: (value: string) => void = () => {}
      const ref = { current: null as Promise<string> | null }
      const operation = jest.fn(
        () =>
          new Promise<string>((resolve) => {
            resolveOperation = resolve
          }),
      )

      const first = runSingleFlight(ref, operation)
      const second = runSingleFlight(ref, operation)
      await Promise.resolve()
      expect(operation).toHaveBeenCalledTimes(1)
      resolveOperation('done')
      await expect(first).resolves.toBe('done')
      await expect(second).resolves.toBe('done')
      expect(ref.current).toBeNull()
    })

    it('clears the pending operation after rejection', async () => {
      const ref = { current: null as Promise<string> | null }
      await expect(
        runSingleFlight(ref, jest.fn().mockRejectedValue(new Error('failed'))),
      ).rejects.toThrow('failed')
      expect(ref.current).toBeNull()
    })

    it('normalizes synchronous operation failures into rejected promises', async () => {
      const ref = { current: null as Promise<string> | null }
      const operation = jest.fn(() => {
        throw new Error('failed synchronously')
      })

      await expect(runSingleFlight(ref, operation)).rejects.toThrow('failed synchronously')
      expect(ref.current).toBeNull()
    })
  })

  describe('parseOAuthCallback', () => {
    it.each([
      'domani://auth/callback?code=one-time-code',
      'https://www.domani-app.com/auth/callback?code=one-time-code',
    ])('accepts an approved PKCE callback: %s', (url) => {
      expect(parseOAuthCallback(url)).toEqual({ type: 'code', code: 'one-time-code' })
    })

    it.each([
      'domani://settings?code=code',
      'https://evil.example/auth/callback?code=code',
      'domani://auth/callback#access_token=secret&refresh_token=secret',
      'domani://auth/callback?code=one&code=two',
      'domani://auth/callback?code=code&next=/(tabs)',
    ])('rejects an unapproved callback: %s', (url) => {
      expect(parseOAuthCallback(url)).toEqual({ type: 'invalid' })
    })

    it('handles provider errors without exposing their values', () => {
      expect(
        parseOAuthCallback(
          'domani://auth/callback?error=access_denied&error_description=sensitive',
        ),
      ).toEqual({ type: 'error' })
    })
  })

  it('exchanges an approved callback code for a session', async () => {
    const session = { access_token: 'access' }
    const exchange = jest.fn().mockResolvedValue({ data: { session }, error: null })

    await expect(completeOAuthCallback('domani://auth/callback?code=code', exchange)).resolves.toBe(
      session,
    )
    expect(exchange).toHaveBeenCalledWith('code')
  })

  it('rejects an invalid callback before attempting a code exchange', async () => {
    const exchange = jest.fn()

    await expect(completeOAuthCallback('domani://settings?code=code', exchange)).rejects.toThrow(
      'OAuth callback was rejected.',
    )
    expect(exchange).not.toHaveBeenCalled()
  })

  it('reuses a pending callback exchange instead of exchanging the code twice', async () => {
    const session = { access_token: 'access' } as Session
    let resolveExchange: (value: {
      data: { session: typeof session }
      error: null
    }) => void = () => {}
    const exchange = jest.fn(
      () =>
        new Promise<{ data: { session: typeof session }; error: null }>((resolve) => {
          resolveExchange = resolve
        }),
    )
    const first = completeOAuthCallback('domani://auth/callback?code=code', exchange)
    const second = completeOAuthCallback('domani://auth/callback?code=code', exchange)
    await waitFor(() => expect(exchange).toHaveBeenCalledTimes(1))
    resolveExchange({ data: { session }, error: null })

    await expect(first).resolves.toBe(session)
    await expect(second).resolves.toBe(session)
  })

  it('rejects a different callback while another code exchange is in progress', async () => {
    const session = { access_token: 'access' } as Session
    let resolveExchange: (value: { data: { session: Session }; error: null }) => void = () => {}
    const exchange = jest.fn(
      () =>
        new Promise<{ data: { session: Session }; error: null }>((resolve) => {
          resolveExchange = resolve
        }),
    )

    const first = completeOAuthCallback('domani://auth/callback?code=first', exchange)
    await waitFor(() => expect(exchange).toHaveBeenCalledTimes(1))
    await expect(
      completeOAuthCallback('domani://auth/callback?code=second', exchange),
    ).rejects.toThrow('A different OAuth callback is already being processed.')
    resolveExchange({ data: { session }, error: null })
    await expect(first).resolves.toBe(session)
    expect(exchange).toHaveBeenCalledTimes(1)
  })

  describe('waitForAuthSession', () => {
    it('waits until a session is readable', async () => {
      const session = { access_token: 'access' }
      const getSession = jest
        .fn()
        .mockResolvedValueOnce({ data: { session: null } })
        .mockResolvedValueOnce({ data: { session } })
      await expect(waitForAuthSession(getSession, { attempts: 2, intervalMs: 0 })).resolves.toBe(
        session,
      )
      expect(getSession).toHaveBeenCalledTimes(2)
    })

    it('returns null when no session is found', async () => {
      const getSession = jest.fn(() => Promise.resolve({ data: { session: null } }))
      await expect(
        waitForAuthSession(getSession, { attempts: 2, intervalMs: 0 }),
      ).resolves.toBeNull()
      expect(getSession).toHaveBeenCalledTimes(2)
    })
  })
})
