jest.mock('../supabase', () => ({ supabase: { rpc: jest.fn() } }))
import { supabase } from '../supabase'
import {
  compareReleaseVersions,
  parseVersionPolicy,
  requiresUpdate,
  fetchVersionPolicy,
} from '../rollout'

const policy = {
  enabled: true,
  minimumVersion: '1.2.0',
  storeUrl: 'https://apps.apple.com/app/id123',
}

describe('rollout versions and remote gate', () => {
  it('compares numeric components, including double digit patches and majors', () => {
    expect(compareReleaseVersions('1.1.10', '1.1.4')).toBe(1)
    expect(compareReleaseVersions('1.10.0', '1.2.0')).toBe(1)
    expect(compareReleaseVersions('2.0.0', '1.99.99')).toBe(1)
    expect(compareReleaseVersions('1.1.4', '1.1.4')).toBe(0)
  })
  it.each(['', '1.1', '1.1.4-beta', 'v1.1.4', '01.1.4', '999999999.1.4'])(
    'treats %s as unknown',
    (version) => {
      expect(compareReleaseVersions(version, '1.1.4')).toBeNull()
      expect(requiresUpdate(version, policy)).toBe(false)
    },
  )
  it('only gates known capable clients when a valid policy requires it', () => {
    expect(requiresUpdate('1.1.4', policy)).toBe(true)
    expect(requiresUpdate('1.2.0', policy)).toBe(false)
    expect(requiresUpdate('1.1.3', policy)).toBe(false)
    expect(requiresUpdate(null, policy)).toBe(false)
    expect(requiresUpdate('1.1.4', { ...policy, enabled: false })).toBe(false)
  })
  it('rejects malformed config and store URLs from other hosts or platforms', () => {
    expect(parseVersionPolicy(policy, 'ios')).toEqual(policy)
    expect(parseVersionPolicy(policy, 'android')).toBeNull()
    expect(
      parseVersionPolicy({ ...policy, storeUrl: 'https://apps.apple.com.evil.example/' }, 'ios'),
    ).toBeNull()
    expect(parseVersionPolicy({ ...policy, minimumVersion: 'bad' }, 'ios')).toBeNull()
    expect(parseVersionPolicy({ enabled: false }, 'ios')).toBeNull()
    expect(parseVersionPolicy(null, 'ios')).toBeNull()
  })
  it('fails open for network errors and remote RPC errors without stale policy reuse', async () => {
    const rpc = jest.mocked(supabase.rpc)
    rpc.mockReturnValueOnce({
      abortSignal: () => Promise.resolve({ data: policy, error: null }),
    } as never)
    expect(await fetchVersionPolicy('ios')).toEqual(policy)
    rpc.mockReturnValueOnce({ abortSignal: () => Promise.reject(new Error('offline')) } as never)
    expect(await fetchVersionPolicy('ios')).toBeNull()
    rpc.mockReturnValueOnce({
      abortSignal: () => Promise.resolve({ data: policy, error: {} }),
    } as never)
    expect(await fetchVersionPolicy('ios')).toBeNull()
  })
})
