import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const REPLAY_ONLY_MIGRATIONS = [
  '0035_capture_dashboard_baseline.sql',
  '0135_replay_feedback_device_metadata.sql',
  '0245_backfill_top_priority.sql',
]

export function createProductionMigrationWorkspace(repoRoot) {
  const source = join(repoRoot, 'supabase')
  const files = readdirSync(join(source, 'migrations')).filter((file) => file.endsWith('.sql'))
  for (const replayFile of REPLAY_ONLY_MIGRATIONS) {
    if (!files.includes(replayFile)) throw new Error(`Missing replay-only migration: ${replayFile}`)
  }

  const root = mkdtempSync(join(tmpdir(), 'domani-production-migrations-'))
  try {
    const target = join(root, 'supabase')
    mkdirSync(join(target, 'migrations'), { recursive: true })
    copyFileSync(join(source, 'config.toml'), join(target, 'config.toml'))
    for (const file of files) {
      if (!REPLAY_ONLY_MIGRATIONS.includes(file)) {
        copyFileSync(join(source, 'migrations', file), join(target, 'migrations', file))
      }
    }
    return root
  } catch (error) {
    rmSync(root, { recursive: true, force: true })
    throw error
  }
}
