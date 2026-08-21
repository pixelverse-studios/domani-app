const PRODUCTION_PROJECT_REF = 'exxnnlhxcjujxnnwwrxv'
const STAGING_PROJECT_REF = 'ftgltnzejaxasdvfkqut'

export type RevenueCatRuntimeEnvironment = 'production' | 'staging' | 'unknown'

export function resolveRevenueCatRuntimeEnvironment(
  configuredEnvironment: string | null | undefined,
  supabaseUrl: string | null | undefined,
): RevenueCatRuntimeEnvironment {
  const normalized = configuredEnvironment?.trim().toLowerCase()
  if (normalized === 'production' || normalized === 'prod') return 'production'
  if (
    normalized === 'staging' ||
    normalized === 'stage' ||
    normalized === 'development' ||
    normalized === 'dev' ||
    normalized === 'test'
  ) {
    return 'staging'
  }

  if (supabaseUrl?.includes(PRODUCTION_PROJECT_REF)) return 'production'
  if (supabaseUrl?.includes(STAGING_PROJECT_REF)) return 'staging'
  return 'unknown'
}

export function shouldRejectRevenueCatSandboxEvent(
  eventEnvironment: unknown,
  runtimeEnvironment: RevenueCatRuntimeEnvironment,
  allowSandboxEvents: boolean,
) {
  if (allowSandboxEvents) return false
  if (typeof eventEnvironment !== 'string') return false
  if (eventEnvironment.toUpperCase() !== 'SANDBOX') return false

  // Fail closed for unknown deployments: only a recognized non-production
  // environment may process sandbox purchases without an explicit override.
  return runtimeEnvironment !== 'staging'
}
