import {
  buildAccountEmail,
  MAX_ACCOUNT_EMAIL_NAME_LENGTH,
  parseAccountEmailRequest,
  sanitizeAccountName,
} from '../accountEmailCore'

describe('accountEmailCore', () => {
  it('accepts only a supported message type with no caller-controlled fields', () => {
    expect(parseAccountEmailRequest({ type: 'account_deletion' })).toEqual({
      type: 'account_deletion',
    })
    expect(parseAccountEmailRequest({ type: 'account_reactivation' })).toEqual({
      type: 'account_reactivation',
    })

    expect(() =>
      parseAccountEmailRequest({ type: 'account_deletion', email: 'other@example.com' }),
    ).toThrow('INVALID_REQUEST')
    expect(() => parseAccountEmailRequest({ type: 'password_reset' })).toThrow('INVALID_REQUEST')
    expect(() => parseAccountEmailRequest(null)).toThrow('INVALID_REQUEST')
  })

  it('escapes and bounds server-derived display names', () => {
    expect(sanitizeAccountName('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;',
    )
    expect(sanitizeAccountName('x'.repeat(200))).toHaveLength(MAX_ACCOUNT_EMAIL_NAME_LENGTH)
  })

  it('builds deletion mail only from a valid server timestamp', () => {
    const email = buildAccountEmail('account_deletion', '<Phil>', '2026-09-22T12:00:00.000Z')

    expect(email.subject).toBe("We're sorry to see you go")
    expect(email.html).toContain('September 22, 2026')
    expect(email.html).toContain('&lt;Phil&gt;')
    expect(email.html).not.toContain('<Phil>')
    expect(() => buildAccountEmail('account_deletion', 'Phil', 'not-a-date')).toThrow(
      'INVALID_ACCOUNT_EVENT',
    )
  })

  it('builds reactivation mail without accepting a deletion date', () => {
    const email = buildAccountEmail('account_reactivation', 'Phil', null)
    expect(email.subject).toBe('Welcome back to Domani!')
    expect(email.html).toContain('scheduled account deletion has been cancelled')
  })
})
