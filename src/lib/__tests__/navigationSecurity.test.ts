import { getAllowedNotificationRoute, isAllowedExternalStoreUrl } from '../navigationSecurity'

describe('navigationSecurity', () => {
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
