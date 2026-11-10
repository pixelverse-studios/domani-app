import { supabase } from '~/lib/supabase'

const VERSION = /^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$/
export interface VersionPolicy {
  enabled: boolean
  minimumVersion: string
  storeUrl: string
}

/** Strict numeric release versions; unknown/prerelease builds never imply adoption. */
export function compareReleaseVersions(left: string, right: string): number | null {
  if (!VERSION.test(left) || !VERSION.test(right)) return null
  const a = left.split('.').map(Number)
  const b = right.split('.').map(Number)
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1
  }
  return 0
}

export function parseVersionPolicy(value: unknown, platform: string): VersionPolicy | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const policy = value as Record<string, unknown>
  const storePattern =
    platform === 'ios'
      ? /^https:\/\/apps\.apple\.com\//
      : platform === 'android'
        ? /^https:\/\/play\.google\.com\/store\/apps\/details\?id=/
        : null
  if (
    policy.enabled !== true ||
    typeof policy.minimumVersion !== 'string' ||
    !VERSION.test(policy.minimumVersion) ||
    typeof policy.storeUrl !== 'string' ||
    !storePattern?.test(policy.storeUrl)
  )
    return null
  return { enabled: true, minimumVersion: policy.minimumVersion, storeUrl: policy.storeUrl }
}

export function requiresUpdate(version: string | null, policy: VersionPolicy | null): boolean {
  if (!version || !policy?.enabled) return false
  // Already released 1.1.1/1.1.3 have no gate; never claim this controls them.
  const gateCapable = compareReleaseVersions(version, '1.1.4')
  const comparison = compareReleaseVersions(version, policy.minimumVersion)
  return gateCapable !== null && gateCapable >= 0 && comparison !== null && comparison < 0
}

/** No persisted policy: an unavailable or malformed response always permits use. */
export async function fetchVersionPolicy(platform: string): Promise<VersionPolicy | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const { data, error } = await supabase
      .rpc('get_client_version_policy', {
        p_platform: platform,
      })
      .abortSignal(controller.signal)
    return error ? null : parseVersionPolicy(data, platform)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
