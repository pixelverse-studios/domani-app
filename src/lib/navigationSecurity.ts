import { parseOAuthCallback } from './authSession'

const PLAY_STORE_HOST = 'play.google.com'

export const getAllowedIncomingSystemPath = (value: string): string => {
  if (value === '/') return '/'
  return parseOAuthCallback(value).type === 'invalid' ? '/' : value
}

export const getAllowedNotificationRoute = (value: unknown): `/${string}` | null => {
  if (value === '/(tabs)') return value
  if (
    value === '/(tabs)/planning?defaultPlanningFor=tomorrow&openForm=true&trigger=planning_reminder'
  ) {
    return value
  }
  return null
}

export const isAllowedExternalStoreUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false

  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.hostname !== PLAY_STORE_HOST ||
      url.port ||
      url.username ||
      url.password ||
      url.hash
    )
      return false

    if (url.pathname === '/store/account/orderhistory') return url.search === ''
    if (url.pathname !== '/redeem') return false

    const codes = url.searchParams.getAll('code')
    return (
      Array.from(url.searchParams.keys()).every((key) => key === 'code') &&
      codes.length === 1 &&
      codes[0].length > 0 &&
      codes[0].length <= 128
    )
  } catch {
    return false
  }
}
