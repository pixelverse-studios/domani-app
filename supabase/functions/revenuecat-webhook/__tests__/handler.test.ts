jest.mock('jsr:@supabase/functions-js/edge-runtime.d.ts', () => ({}), { virtual: true })
jest.mock('https://esm.sh/@supabase/supabase-js@2', () => ({ createClient: jest.fn() }), {
  virtual: true,
})
jest.mock('../../_shared/rolloutTelemetry', () => ({
  recordRolloutEvent: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../revenueSlack', () => ({
  sendRevenueSlackAlert: jest.fn().mockResolvedValue(undefined),
}))
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { recordRolloutEvent } from '../../_shared/rolloutTelemetry'

let handler: (request: unknown) => Promise<Response>
const userId = '00000000-0000-4000-8000-000000000001'
const rpc = jest.fn()
const admin = { rpc, from: jest.fn() }
beforeAll(() => {
  Object.assign(globalThis, {
    Deno: {
      env: { get: () => 'configured' },
      serve: (value: typeof handler) => {
        handler = value
      },
    },
  })
  require('../index')
})
beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(createClient).mockReturnValue(admin as never)
  rpc.mockImplementation((name: string, args: { p_event?: unknown }) =>
    Promise.resolve({
      data:
        name === 'claim_revenuecat_webhook_event'
          ? { status: 'claimed', token: 'claim-1', event: args.p_event }
          : { status: 'applied' },
      error: null,
    }),
  )
  admin.from.mockImplementation((table: string) => {
    const result = {
      data: table === 'revenuecat_webhook_events' ? [{ event_id: 'event-1' }] : { id: userId },
      error: null,
    }
    const query: Record<string, unknown> = {
      then: (done: (value: unknown) => unknown) => Promise.resolve(result).then(done),
    }
    for (const name of ['upsert', 'select', 'eq', 'maybeSingle', 'update', 'delete'])
      query[name] = () => query
    return query
  })
})
function request(type: string) {
  return {
    method: 'POST',
    headers: { get: () => 'Bearer configured' },
    text: async () =>
      JSON.stringify({
        event: {
          id: 'event-1',
          type,
          app_user_id: userId,
          product_id: 'domani_lifetime_friends',
          store: 'APP_STORE',
          environment: 'SANDBOX',
          event_timestamp_ms: Date.parse('2026-10-20T12:00:00Z'),
          purchased_at_ms: Date.parse('2026-10-01T12:00:00Z'),
          subscriber_attributes: {
            promo_redemption_attempt_id: 'attempt',
            promo_code_id: 'code',
            promo_campaign_id: 'campaign',
          },
        },
      }),
  }
}
it('uses store purchase time for a delayed promo grant and event time for refund reversal', async () => {
  const initial = await handler(request('INITIAL_PURCHASE'))
  expect(initial.status).toBe(200)
  expect(rpc).toHaveBeenLastCalledWith(
    'apply_revenuecat_webhook_transition_with_refund_state',
    expect.objectContaining({
      p_action: 'grant',
      p_purchase_at: '2026-10-01T12:00:00.000Z',
      p_event_at: '2026-10-20T12:00:00.000Z',
    }),
  )
  const reversal = await handler(request('REFUND_REVERSED'))
  expect(reversal.status).toBe(200)
  expect(rpc).toHaveBeenLastCalledWith(
    'apply_revenuecat_webhook_transition_with_refund_state',
    expect.objectContaining({
      p_action: 'reversal',
      p_purchase_at: '2026-10-20T12:00:00.000Z',
    }),
  )
  expect(recordRolloutEvent).toHaveBeenCalledWith(admin, 'webhook_success')
})

it('asks for retry while a delivery is already processing', async () => {
  rpc.mockResolvedValue({ data: { status: 'in_progress' }, error: null })
  expect((await handler(request('REFUND'))).status).toBe(503)
  expect(rpc).toHaveBeenCalledTimes(1)
})

it('acknowledges only a completed duplicate', async () => {
  rpc.mockResolvedValue({ data: { status: 'already_processed' }, error: null })
  expect((await handler(request('REFUND'))).status).toBe(200)
  expect(rpc).toHaveBeenCalledTimes(1)
})

it('routes the original stored payload when a retry body differs', async () => {
  rpc.mockResolvedValue({
    data: { status: 'claimed', token: 'claim-2', event: { id: 'event-1', type: 'TEST' } },
    error: null,
  })
  const response = await handler(request('REFUND'))
  expect(response.status).toBe(200)
  expect(rpc).toHaveBeenCalledTimes(1)
  expect(await response.json()).toEqual({ received: true, type: 'TEST' })
})
