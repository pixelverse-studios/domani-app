import {
  resolveRevenueCatRuntimeEnvironment,
  shouldRejectRevenueCatSandboxEvent,
} from '../webhookSecurity'

describe('RevenueCat webhook environment isolation', () => {
  it('infers production and staging from explicit config or the project URL', () => {
    expect(resolveRevenueCatRuntimeEnvironment('production', null)).toBe('production')
    expect(
      resolveRevenueCatRuntimeEnvironment(null, 'https://ftgltnzejaxasdvfkqut.supabase.co'),
    ).toBe('staging')
    expect(
      resolveRevenueCatRuntimeEnvironment(null, 'https://exxnnlhxcjujxnnwwrxv.supabase.co'),
    ).toBe('production')
  })

  it('rejects sandbox events in production and unknown deployments', () => {
    expect(shouldRejectRevenueCatSandboxEvent('SANDBOX', 'production', false)).toBe(true)
    expect(shouldRejectRevenueCatSandboxEvent('SANDBOX', 'unknown', false)).toBe(true)
  })

  it('allows production events, staging sandbox events, and explicit overrides', () => {
    expect(shouldRejectRevenueCatSandboxEvent('PRODUCTION', 'production', false)).toBe(false)
    expect(shouldRejectRevenueCatSandboxEvent('SANDBOX', 'staging', false)).toBe(false)
    expect(shouldRejectRevenueCatSandboxEvent('SANDBOX', 'production', true)).toBe(false)
  })
})
