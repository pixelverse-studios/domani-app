import type { Session } from '@supabase/supabase-js'

export interface PendingPromiseRef<T> {
  current: Promise<T> | null
}

export type OAuthCallbackResult =
  | { type: 'code'; code: string }
  | { type: 'error' }
  | { type: 'invalid' }

type OAuthCodeExchanger = (code: string) => Promise<{
  data: { session: Session | null }
  error: unknown
}>

const callbackPromiseRef: PendingPromiseRef<Session> = { current: null }
let pendingCallbackCode: string | null = null
const ALLOWED_CALLBACKS = new Set([
  'domani://auth/callback',
  'https://www.domani-app.com/auth/callback',
])
const ALLOWED_ERROR_PARAMS = new Set(['error', 'error_code', 'error_description'])
const MAX_CODE_LENGTH = 4096

export const runSingleFlight = async <T>(
  pendingRef: PendingPromiseRef<T>,
  operation: () => Promise<T>,
): Promise<T> => {
  const pending = pendingRef.current
  if (pending) return pending

  const promise = Promise.resolve().then(operation)
  pendingRef.current = promise

  try {
    return await promise
  } finally {
    if (pendingRef.current === promise) pendingRef.current = null
  }
}

export const parseOAuthCallback = (value: string): OAuthCallbackResult => {
  try {
    const url = new URL(value)
    const callback = `${url.protocol}//${url.host}${url.pathname}`

    if (
      !ALLOWED_CALLBACKS.has(callback) ||
      url.hash ||
      url.username ||
      url.password ||
      Array.from(url.searchParams.keys()).some(
        (key) => key !== 'code' && !ALLOWED_ERROR_PARAMS.has(key),
      )
    ) {
      return { type: 'invalid' }
    }

    const codes = url.searchParams.getAll('code')
    const errors = url.searchParams.getAll('error')
    if (codes.length === 1 && errors.length === 0) {
      const code = codes[0]
      return code.length > 0 && code.length <= MAX_CODE_LENGTH
        ? { type: 'code', code }
        : { type: 'invalid' }
    }

    if (codes.length === 0 && errors.length === 1) return { type: 'error' }
    return { type: 'invalid' }
  } catch {
    return { type: 'invalid' }
  }
}

export const completeOAuthCallback = async (
  callbackUrl: string,
  exchangeCodeForSession: OAuthCodeExchanger,
): Promise<Session> => {
  const callback = parseOAuthCallback(callbackUrl)
  if (callback.type === 'error') throw new Error('OAuth sign in was not completed.')
  if (callback.type !== 'code') throw new Error('OAuth callback was rejected.')

  if (callbackPromiseRef.current) {
    if (pendingCallbackCode !== callback.code) {
      throw new Error('A different OAuth callback is already being processed.')
    }
    return callbackPromiseRef.current
  }

  pendingCallbackCode = callback.code

  try {
    return await runSingleFlight(callbackPromiseRef, async () => {
      const { data, error } = await exchangeCodeForSession(callback.code)
      if (error) throw error
      if (!data.session) throw new Error('OAuth sign in completed without a session.')
      return data.session
    })
  } finally {
    pendingCallbackCode = null
  }
}

export const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

export const waitForAuthSession = async (
  getSession: () => Promise<{ data: { session: Session | null }; error?: unknown }>,
  options: { attempts?: number; intervalMs?: number } = {},
): Promise<Session | null> => {
  const attempts = options.attempts ?? 12
  const intervalMs = options.intervalMs ?? 200

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const {
      data: { session },
    } = await getSession()
    if (session) return session
    if (attempt < attempts - 1) await delay(intervalMs)
  }
  return null
}
