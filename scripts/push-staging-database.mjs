import { spawnSync } from 'node:child_process'

const STAGING_PROJECT_REF = 'ftgltnzejaxasdvfkqut'
const publicSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()

if (publicSupabaseUrl !== `https://${STAGING_PROJECT_REF}.supabase.co`) {
  console.error('EXPO_PUBLIC_SUPABASE_URL must target Domani staging before a staging push.')
  process.exit(1)
}

const result = spawnSync(
  'npx',
  [
    'supabase',
    'db',
    'push',
    '--project-ref',
    STAGING_PROJECT_REF,
    '--include-all',
    ...process.argv.slice(2),
  ],
  {
    stdio: 'inherit',
    shell: false,
  },
)

if (result.error) {
  console.error('Unable to start the Supabase CLI.')
  process.exit(1)
}

process.exit(result.status ?? 1)
