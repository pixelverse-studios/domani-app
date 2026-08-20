import { spawnSync } from 'node:child_process'

const STAGING_PROJECT_REF = 'ftgltnzejaxasdvfkqut'
const STAGING_POOLER_HOST = 'aws-1-us-west-2.pooler.supabase.com'
const publicSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
const databasePassword = process.env.SUPABASE_DB_PASSWORD

if (!databasePassword) {
  console.error('SUPABASE_DB_PASSWORD is required in the active local environment block.')
  process.exit(1)
}

if (publicSupabaseUrl !== `https://${STAGING_PROJECT_REF}.supabase.co`) {
  console.error('EXPO_PUBLIC_SUPABASE_URL must target Domani staging before a staging push.')
  process.exit(1)
}

const databaseUrl =
  `postgresql://postgres.${STAGING_PROJECT_REF}:` +
  `${encodeURIComponent(databasePassword)}@${STAGING_POOLER_HOST}:5432/postgres`

const result = spawnSync(
  'npx',
  ['supabase', 'db', 'push', '--db-url', databaseUrl, '--include-all', ...process.argv.slice(2)],
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
