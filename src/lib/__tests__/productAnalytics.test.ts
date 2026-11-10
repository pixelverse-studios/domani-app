import { getScheduledFor } from '../productAnalytics'

describe('getScheduledFor', () => {
  const now = new Date('2026-08-16T15:00:00.000Z')

  it('classifies today, tomorrow, and other dates', () => {
    expect(getScheduledFor('2026-08-16', now)).toBe('today')
    expect(getScheduledFor('2026-08-17', now)).toBe('tomorrow')
    expect(getScheduledFor('2026-08-18', now)).toBe('other')
  })

  it('treats a missing scheduled date as other', () => {
    expect(getScheduledFor(null, now)).toBe('other')
  })
})
