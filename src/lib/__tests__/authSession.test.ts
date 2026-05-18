import {
  parseOAuthTokensFromParams,
  parseOAuthTokensFromUrl,
  waitForAuthSession,
} from '../authSession'

describe('authSession', () => {
  describe('parseOAuthTokensFromUrl', () => {
    it('parses OAuth tokens from URL fragments', () => {
      expect(
        parseOAuthTokensFromUrl('domani://auth/callback#access_token=access&refresh_token=refresh'),
      ).toEqual({
        access_token: 'access',
        refresh_token: 'refresh',
      })
    })

    it('parses OAuth tokens from query params', () => {
      expect(
        parseOAuthTokensFromUrl('domani://auth/callback?access_token=access&refresh_token=refresh'),
      ).toEqual({
        access_token: 'access',
        refresh_token: 'refresh',
      })
    })

    it('returns null when tokens are incomplete', () => {
      expect(parseOAuthTokensFromUrl('domani://auth/callback#access_token=access')).toBeNull()
    })
  })

  describe('parseOAuthTokensFromParams', () => {
    it('parses OAuth tokens from router params', () => {
      expect(
        parseOAuthTokensFromParams({
          access_token: 'access',
          refresh_token: 'refresh',
        }),
      ).toEqual({
        access_token: 'access',
        refresh_token: 'refresh',
      })
    })

    it('uses the first value from array params', () => {
      expect(
        parseOAuthTokensFromParams({
          access_token: ['access'],
          refresh_token: ['refresh'],
        }),
      ).toEqual({
        access_token: 'access',
        refresh_token: 'refresh',
      })
    })
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
