jest.mock('jsr:@supabase/functions-js/edge-runtime.d.ts', () => ({}), { virtual: true })
jest.mock('https://esm.sh/@supabase/supabase-js@2', () => ({ createClient: jest.fn() }), {
  virtual: true,
})
jest.mock('../../_shared/rolloutTelemetry', () => ({
  recordRolloutEvent: jest.fn().mockResolvedValue(undefined),
}))
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { recordRolloutEvent } from '../../_shared/rolloutTelemetry'

let handler: (request: unknown) => Promise<Response>
const userId = '00000000-0000-4000-8000-000000000001'
const rpc = jest.fn()
const authRpc = jest.fn()
const admin = { rpc }
const mockFetch = jest.fn()
const originalFetch = global.fetch
beforeAll(() => {
  Object.assign(globalThis, {
    Deno: {
      env: {
        get: (name: string) => (name === 'REVENUECAT_ENTITLEMENT_ID' ? 'lifetime' : 'configured'),
      },
      serve: (value: typeof handler) => {
        handler = value
      },
    },
  })
  require('../index')
})
beforeEach(() => {
  jest.clearAllMocks()
  jest
    .mocked(createClient)
    .mockReturnValueOnce({
      auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
      rpc: authRpc,
    } as never)
    .mockReturnValueOnce(admin as never)
  authRpc.mockResolvedValue({ data: {}, error: null })
  rpc.mockImplementation((name: string) =>
    Promise.resolve({
      data:
        name === 'claim_current_user_revenuecat_sync'
          ? '2026-10-20T12:00:00Z'
          : { status: 'synced', accessGranted: true },
      error: null,
    }),
  )
  global.fetch = mockFetch
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      subscriber: {
        entitlements: {
          lifetime: {
            product_identifier: 'domani_lifetime',
            purchase_date: '2026-01-01T00:00:00Z',
            expires_date: null,
          },
        },
      },
    }),
  })
})
afterAll(() => {
  global.fetch = originalFetch
})
function request(body: unknown) {
  return {
    method: 'POST',
    headers: { get: () => 'Bearer valid' },
    text: async () => JSON.stringify(body),
  }
}
it.each([{}, { userId: 'different-account' }])(
  'rejects missing or stale expected identity before queue or provider',
  async (body) => {
    const response = await handler(request(body))
    expect(response.status).toBe(403)
    expect(authRpc).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
    expect(recordRolloutEvent).toHaveBeenCalledWith(admin, 'rejection', userId)
  },
)
it('verifies the expected account and records a successful server grant', async () => {
  const response = await handler(request({ userId }))
  expect(response.status).toBe(200)
  expect(rpc).toHaveBeenCalledWith(
    'apply_verified_revenuecat_lifetime_access',
    expect.objectContaining({ p_user_id: userId }),
  )
  expect(recordRolloutEvent).toHaveBeenCalledWith(admin, 'verified_success', userId)
})
it('keeps delayed evidence separate from provider failures', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ subscriber: { entitlements: {} } }),
  })
  const pending = await handler(request({ userId }))
  expect(pending.status).toBe(200)
  expect(recordRolloutEvent).toHaveBeenCalledWith(admin, 'delayed_reconciliation', userId)
})
