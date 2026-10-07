import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const PROJECTS = {
  staging: 'ftgltnzejaxasdvfkqut',
  production: 'exxnnlhxcjujxnnwwrxv',
}

const [target, action] = process.argv.slice(2)
const projectRef = PROJECTS[target]

if (!projectRef || (action && action !== '--apply') || process.argv.length > 4) {
  console.error('Usage: push-database.mjs <staging|production> [--apply]')
  process.exit(1)
}

const expectedUrl = `https://${projectRef}.supabase.co`
if (process.env.EXPO_PUBLIC_SUPABASE_URL !== expectedUrl) {
  console.error(`Refusing ${target} database command: .env must target ${expectedUrl}`)
  process.exit(1)
}

if (!process.env.SUPABASE_ACCESS_TOKEN || !process.env.SUPABASE_DB_PASSWORD) {
  console.error('SUPABASE_ACCESS_TOKEN and SUPABASE_DB_PASSWORD are required')
  process.exit(1)
}

const cli = resolve('node_modules', '.bin', process.platform === 'win32' ? 'supabase.cmd' : 'supabase')
const environment = { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' }

function push(dryRun) {
  const args = ['db', 'push', '--project-ref', projectRef, '--skip-vault']
  if (dryRun) args.push('--dry-run')

  const result = spawnSync(cli, args, { stdio: 'inherit', env: environment })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log(`Checking ${target} (${projectRef}) migration plan`)
push(true)

if (action === '--apply') {
  if (process.env.DOMANI_DB_PUSH_CONFIRM !== `${target}:${projectRef}`) {
    console.error(`Dry run complete. Set DOMANI_DB_PUSH_CONFIRM=${target}:${projectRef} to apply.`)
    process.exit(1)
  }

  console.log(`Applying migrations to ${target} (${projectRef})`)
  push(false)
}
