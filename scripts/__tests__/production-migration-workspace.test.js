const { spawnSync } = require('node:child_process')
const { readdirSync } = require('node:fs')
const { resolve } = require('node:path')

const repoRoot = resolve(__dirname, '..', '..')

it('excludes only the three fresh-replay shims from the production plan', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { readdirSync, rmSync } from 'node:fs';
       import { join } from 'node:path';
       import { createProductionMigrationWorkspace } from './scripts/production-migration-workspace.mjs';
       const root = createProductionMigrationWorkspace(process.cwd());
       try { console.log(JSON.stringify(readdirSync(join(root, 'supabase', 'migrations')).sort())); }
       finally { rmSync(root, { recursive: true, force: true }); }`,
    ],
    { cwd: repoRoot, encoding: 'utf8' },
  )

  expect(result.status).toBe(0)
  const staged = JSON.parse(result.stdout)
  const source = readdirSync(resolve(repoRoot, 'supabase', 'migrations'))
    .filter((file) => file.endsWith('.sql'))
    .sort()
  expect(staged).toEqual(
    source.filter(
      (file) =>
        ![
          '0035_capture_dashboard_baseline.sql',
          '0135_replay_feedback_device_metadata.sql',
          '0245_backfill_top_priority.sql',
        ].includes(file),
    ),
  )
})
