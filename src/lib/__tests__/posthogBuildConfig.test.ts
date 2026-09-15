import { getPostHogBuildConfig } from '../../../app.config'
import appJson from '../../../app.json'
import easJson from '../../../eas.json'

const productionKey = 'phc_production_abcdefghijklmnopqrstuvwxyz'
const stagingKey = 'phc_staging_abcdefghijklmnopqrstuvwxyz'

describe('PostHog build configuration', () => {
  it('selects the production destination for production builds', () => {
    expect(
      getPostHogBuildConfig({
        EAS_BUILD_PROFILE: 'production',
        EXPO_PUBLIC_POSTHOG_PRODUCTION_KEY: productionKey,
        EXPO_PUBLIC_POSTHOG_STAGING_KEY: stagingKey,
      }),
    ).toEqual({
      apiKey: productionKey,
      environment: 'production',
      host: 'https://us.i.posthog.com',
      releaseChannel: 'production',
    })
  })

  it('selects only the staging destination for preview builds', () => {
    expect(
      getPostHogBuildConfig({
        EAS_BUILD_PROFILE: 'preview',
        EXPO_PUBLIC_POSTHOG_KEY: productionKey,
        EXPO_PUBLIC_POSTHOG_STAGING_KEY: stagingKey,
      }),
    ).toEqual({
      apiKey: stagingKey,
      environment: 'staging',
      host: 'https://us.i.posthog.com',
      releaseChannel: 'preview',
    })
  })

  it('selects production for local Android and Xcode release builds using production Supabase', () => {
    expect(
      getPostHogBuildConfig({
        EXPO_PUBLIC_SUPABASE_URL: 'https://exxnnlhxcjujxnnwwrxv.supabase.co',
        EXPO_PUBLIC_POSTHOG_KEY: productionKey,
      }),
    ).toEqual({
      apiKey: productionKey,
      environment: 'production',
      host: 'https://us.i.posthog.com',
      releaseChannel: 'production',
    })
  })

  it('recognizes local staging config without requiring analytics during development', () => {
    expect(
      getPostHogBuildConfig({
        EXPO_PUBLIC_SUPABASE_URL: 'https://ftgltnzejaxasdvfkqut.supabase.co',
      }),
    ).toEqual({
      apiKey: undefined,
      environment: 'staging',
      host: 'https://us.i.posthog.com',
      releaseChannel: 'internal',
    })
  })

  it('does not put any project key into local development config', () => {
    expect(
      getPostHogBuildConfig({
        EXPO_PUBLIC_POSTHOG_KEY: productionKey,
        EXPO_PUBLIC_POSTHOG_PRODUCTION_KEY: productionKey,
        EXPO_PUBLIC_POSTHOG_STAGING_KEY: stagingKey,
      }),
    ).toEqual({
      apiKey: undefined,
      environment: 'development',
      host: 'https://us.i.posthog.com',
      releaseChannel: 'local',
    })
  })

  it('fails visibly when a release destination is missing or invalid', () => {
    expect(() => getPostHogBuildConfig({ EAS_BUILD_PROFILE: 'production' })).toThrow(
      'valid EXPO_PUBLIC_POSTHOG_PRODUCTION_KEY',
    )
    expect(() =>
      getPostHogBuildConfig({
        EAS_BUILD_PROFILE: 'preview',
        EXPO_PUBLIC_POSTHOG_STAGING_KEY: 'phx_personal_secret',
      }),
    ).toThrow('valid EXPO_PUBLIC_POSTHOG_STAGING_KEY')
  })

  it('does not commit a project token or personal key to mobile build manifests', () => {
    const buildManifests = JSON.stringify({ appJson, easJson })

    expect(buildManifests).not.toContain('phc_')
    expect(buildManifests).not.toContain('phx_')
    expect(buildManifests).not.toContain('POSTHOG_PERSONAL_API_KEY')
  })
})
