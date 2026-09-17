import {
  getAllowedIncomingSystemPath,
  getAllowedNotificationRoute,
  isAllowedExternalStoreUrl,
} from '../navigationSecurity'

describe('navigationSecurity', () => {
  it.each([
    'domani://auth/callback?code=one-time-code',
    'https://www.domani-app.com/auth/callback?error=access_denied',
  ])('preserves an approved incoming OAuth callback: %s', (url) => {
    expect(getAllowedIncomingSystemPath(url)).toBe(url)
  })

  it.each([
    'domani://redeem-code?source=external',
    'domani://purchase-help?source=locked',
    'https://evil.example/auth/callback?code=code',
    'domani://auth/callback?code=code&next=/(tabs)',
  ])('redirects an unapproved incoming system path to the app root: %s', (url) => {
    expect(getAllowedIncomingSystemPath(url)).toBe('/')
  })

  it.each(['/', 'domani://', 'exp+domani-app://'])(
    'normalizes a normal native launch: %s',
    (url) => {
      expect(getAllowedIncomingSystemPath(url)).toBe('/')
    },
  )

  it('allows only known notification destinations', () => {
    expect(getAllowedNotificationRoute('/(tabs)')).toBe('/(tabs)')
    expect(
      getAllowedNotificationRoute(
        '/(tabs)/planning?defaultPlanningFor=tomorrow&openForm=true&trigger=planning_reminder',
      ),
    ).toContain('/planning')
    expect(getAllowedNotificationRoute('/settings')).toBeNull()
    expect(getAllowedNotificationRoute('https://evil.example')).toBeNull()
  })

  it.each([
    'https://play.google.com/redeem?code=SAVE50',
    'https://play.google.com/store/account/orderhistory',
  ])('allows an approved Play Store URL: %s', (url) => {
    expect(isAllowedExternalStoreUrl(url)).toBe(true)
  })

  it.each([
    'http://play.google.com/redeem?code=SAVE50',
    'https://evil.example/redeem?code=SAVE50',
    'https://play.google.com/redeem?code=SAVE50&next=evil',
    'https://play.google.com/store/account/orderhistory?next=evil',
  ])('rejects an unapproved external URL: %s', (url) => {
    expect(isAllowedExternalStoreUrl(url)).toBe(false)
  })
})
