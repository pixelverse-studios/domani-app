import { recordRolloutEvent } from '../rolloutTelemetry'

it('records only the bounded outcome and optional account key', async () => {
  const abortSignal = jest.fn().mockResolvedValue({ data: null, error: null })
  const rpc = jest.fn(() => ({ abortSignal }))
  await recordRolloutEvent({ rpc } as never, 'verified_success', 'user-1')
  expect(rpc).toHaveBeenCalledWith('record_rollout_event', {
    p_event: 'verified_success',
    p_user_id: 'user-1',
  })
})
it('does not throw or replace the purchase outcome when monitoring is unavailable', async () => {
  const rpc = jest.fn(() => ({ abortSignal: () => Promise.reject(new Error('unavailable')) }))
  await expect(recordRolloutEvent({ rpc } as never, 'unresolved_failure')).resolves.toBeUndefined()
})
