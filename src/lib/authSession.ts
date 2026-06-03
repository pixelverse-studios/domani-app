import type { Session } from '@supabase/supabase-js'

export interface OAuthTokens {
  access_token: string
  refresh_token: string
}

export type AuthSessionGetter = () => Promise<{
  data: { session: Session | null }
  error?: unknown
}>

export interface PendingPromiseRef<T> {
  current: Promise<T> | null
}

export const runSingleFlight = async <T>(
  pendingRef: PendingPromiseRef<T>,
  operation: () => Promise<T>,
): Promise<T> => {
  const pending = pendingRef.current
  if (pending) {
    return pending
  }

  const promise = Promise.resolve().then(operation)
  pendingRef.current = promise

  try {
    return await promise
  } finally {
    if (pendingRef.current === promise) {
      pendingRef.current = null
    }
  }
}

const getFirstParamValue = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

const getTokensFromSearchParams = (params: URLSearchParams): OAuthTokens | null => {
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (!accessToken || !refreshToken) {
    return null
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  }
}

export const parseOAuthTokensFromUrl = (url: string): OAuthTokens | null => {
  const hashIndex = url.indexOf('#')
  if (hashIndex !== -1) {
    const fragment = url.substring(hashIndex + 1)
    const tokens = getTokensFromSearchParams(new URLSearchParams(fragment))
    if (tokens) return tokens
  }

  try {
    return getTokensFromSearchParams(new URL(url).searchParams)
  } catch {
    return null
  }
}

export const parseOAuthTokensFromParams = (
  params: Record<string, string | string[] | undefined>,
): OAuthTokens | null => {
  const accessToken = getFirstParamValue(params.access_token)
  const refreshToken = getFirstParamValue(params.refresh_token)

  if (!accessToken || !refreshToken) {
    return null
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  }
}

export const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

export const waitForAuthSession = async (
  getSession: AuthSessionGetter,
  options: { attempts?: number; intervalMs?: number } = {},
): Promise<Session | null> => {
  const attempts = options.attempts ?? 12
  const intervalMs = options.intervalMs ?? 200

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const {
      data: { session },
    } = await getSession()

    if (session) {
      return session
    }

    if (attempt < attempts - 1) {
      await delay(intervalMs)
    }
  }

  return null
}
