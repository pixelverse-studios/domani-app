import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const supabase = resolve(
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'supabase.cmd' : 'supabase',
)

function run(args, options = {}) {
  const result = spawnSync(supabase, args, {
    stdio: 'inherit',
    ...options,
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`supabase ${args.join(' ')} exited with status ${result.status}`)
  }
}

let started = false

try {
  run(['start'])
  started = true
  run(['db', 'reset', '--local'])
  run(['test', 'db'])
  run(['db', 'lint', '--local', '--level', 'error', '--fail-on', 'error'])
} finally {
  if (started) {
    run(['stop', '--no-backup'])
  }
}
