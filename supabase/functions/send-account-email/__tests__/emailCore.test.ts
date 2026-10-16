import {
  escapeEmailHtml,
  formatRecordedDeletionDate,
  parseAccountEmailType,
  sendClaimedAccountEmail,
} from '../emailCore'

describe('account email request compatibility', () => {
  it('accepts current and released client bodies using only the event type', () => {
    expect(parseAccountEmailType({ type: 'account_deletion' })).toBe('account_deletion')
    expect(parseAccountEmailType({
      type: 'account_reactivation',
      email: 'forged@example.com',
      name: '<script>forged</script>',
      deletionDate: 'tomorrow',
    })).toBe('account_reactivation')
    expect(parseAccountEmailType({ type: 'unrelated' })).toBeNull()
    expect(parseAccountEmailType([])).toBeNull()
  })

  it('escapes server-recorded names before inserting them into HTML', () => {
    expect(escapeEmailHtml('A <B> & "C"')).toBe('A &lt;B&gt; &amp; &quot;C&quot;')
  })

  it('formats the server-recorded deletion deadline', () => {
    expect(formatRecordedDeletionDate('2026-11-14T18:00:00Z'))
      .toBe('November 14, 2026 at 6:00 PM UTC')
    expect(() => formatRecordedDeletionDate('forged')).toThrow('INVALID_RECORDED_DELETION_DATE')
  })

  it('retries a provider failure with the same event ID and payload', async () => {
    const originalFetch = global.fetch
    const mockedFetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
    global.fetch = mockedFetch as typeof fetch
    try {
      await expect(sendClaimedAccountEmail({
        apiKey: 'server-secret',
        from: 'Domani <noreply@domani.app>',
        eventId: 'recorded-event',
        email: 'verified@example.com',
        subject: 'Recorded event',
        html: '<p>Recorded</p>',
      })).resolves.toEqual({ sent: true, status: 200 })
      expect(mockedFetch).toHaveBeenCalledTimes(2)
      expect(mockedFetch.mock.calls[0][1].body).toBe(mockedFetch.mock.calls[1][1].body)
      expect(mockedFetch.mock.calls[0][1].headers['Idempotency-Key'])
        .toBe('account-email/recorded-event')
      expect(JSON.parse(mockedFetch.mock.calls[0][1].body).to)
        .toEqual(['verified@example.com'])
    } finally {
      global.fetch = originalFetch
    }
  })

  it('does not retry a malformed provider request', async () => {
    const originalFetch = global.fetch
    const mockedFetch = jest.fn().mockResolvedValue({ ok: false, status: 400 })
    global.fetch = mockedFetch as typeof fetch
    try {
      await expect(sendClaimedAccountEmail({
        apiKey: 'server-secret',
        from: 'Domani <noreply@domani.app>',
        eventId: 'recorded-event',
        email: 'verified@example.com',
        subject: 'Recorded event',
        html: '<p>Recorded</p>',
      })).resolves.toEqual({ sent: false, status: 400 })
      expect(mockedFetch).toHaveBeenCalledTimes(1)
    } finally {
      global.fetch = originalFetch
    }
  })
})
