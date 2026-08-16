import { isRecentAuthTimestamp } from '../useAuthAnalytics'

describe('isRecentAuthTimestamp', () => {
  const now = new Date('2026-08-16T12:00:00.000Z').getTime()

  it('accepts an authentication timestamp inside the completion window', () => {
    expect(isRecentAuthTimestamp('2026-08-16T11:59:00.000Z', now)).toBe(true)
  })

  it('rejects a cached session timestamp outside the completion window', () => {
    expect(isRecentAuthTimestamp('2026-08-16T11:55:00.000Z', now)).toBe(false)
  })

  it('rejects missing and invalid timestamps', () => {
    expect(isRecentAuthTimestamp(undefined, now)).toBe(false)
    expect(isRecentAuthTimestamp('not-a-date', now)).toBe(false)
  })
})
