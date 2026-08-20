import { spawnSync } from 'node:child_process'

const STAGING_PROJECT_REF = 'ftgltnzejaxasdvfkqut'
const databaseUrl = process.env.SUPABASE_STAGING_DB_URL?.trim()

if (!databaseUrl) {
  console.error('SUPABASE_STAGING_DB_URL is required in the local environment.')
  process.exit(1)
}

let parsedUrl

try {
  parsedUrl = new URL(databaseUrl)
} catch {
  console.error('SUPABASE_STAGING_DB_URL must be a valid Postgres connection URL.')
  process.exit(1)
}

const usesPostgresProtocol = ['postgres:', 'postgresql:'].includes(parsedUrl.protocol)
const targetsStaging =
  parsedUrl.hostname === `db.${STAGING_PROJECT_REF}.supabase.co` ||
  parsedUrl.username === `postgres.${STAGING_PROJECT_REF}`

if (!usesPostgresProtocol || !targetsStaging) {
  console.error('SUPABASE_STAGING_DB_URL must target the Domani staging project.')
  process.exit(1)
}

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
