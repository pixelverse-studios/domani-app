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
const requestSeenAt = '2026-10-20T12:00:00Z'
let resolves = 0
let staleResolutionFails = false
const rpc = jest.fn()
const admin = { rpc, from: jest.fn() }
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
  resolves = 0
  staleResolutionFails = false
  jest.mocked(createClient).mockReturnValue(admin as never)
  rpc.mockImplementation((name: string) => {
    let result: unknown = { data: null, error: null }
    if (name === 'claim_pending_revenuecat_reconciliations')
      result = {
        data: [{ user_id: userId, requested_at: requestSeenAt }],
        error: null,
      }
    if (name === 'resolve_stale_revenuecat_reconciliation') {
      resolves += 1
      result = { data: resolves > 1, error: resolves > 1 && staleResolutionFails ? {} : null }
    }
    if (name === 'apply_verified_revenuecat_lifetime_access')
      result = { data: { status: 'stale_refund' }, error: null }
    const promise = Promise.resolve(result)
    return Object.assign(promise, { abortSignal: () => promise })
  })
  admin.from.mockImplementation(() => {
    const query: Record<string, unknown> = {
      then: (done: (value: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(done),
    }
    for (const name of ['select', 'eq', 'order', 'limit']) query[name] = () => query
    return query
  })
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
function request() {
  return { method: 'POST', headers: { get: () => 'Bearer configured' } }
}
it('records exactly one success after safely resolving a stale refunded purchase', async () => {
  const response = await handler(request())
  expect(response.status).toBe(200)
  expect(recordRolloutEvent).toHaveBeenCalledTimes(1)
  expect(recordRolloutEvent).toHaveBeenCalledWith(admin, 'reconciliation_success', userId)
})
it('records failure without success when stale refund resolution fails', async () => {
  staleResolutionFails = true
  await handler(request())
  expect(recordRolloutEvent).toHaveBeenCalledTimes(1)
  expect(recordRolloutEvent).toHaveBeenCalledWith(admin, 'unresolved_failure', userId)
})
it('records provider outage separately from delayed evidence', async () => {
  mockFetch.mockResolvedValueOnce({ ok: false })
  await handler(request())
  expect(recordRolloutEvent).toHaveBeenCalledWith(admin, 'unresolved_failure', userId)
})
it('records pending evidence without implying purchase rejection or success', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ subscriber: { entitlements: {} } }),
  })
  await handler(request())
  expect(recordRolloutEvent).toHaveBeenCalledTimes(1)
  expect(recordRolloutEvent).toHaveBeenCalledWith(admin, 'delayed_reconciliation', userId)
})
