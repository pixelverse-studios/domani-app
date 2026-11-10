const { spawnSync } = require('node:child_process')
const { resolve } = require('node:path')

const script = resolve(__dirname, '..', 'push-database.mjs')

function run(args, env = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      EXPO_PUBLIC_SUPABASE_URL: '',
      SUPABASE_ACCESS_TOKEN: '',
      SUPABASE_DB_PASSWORD: '',
      ...env,
    },
  })
}

describe('database push target guard', () => {
  it('rejects unknown targets before invoking the CLI', () => {
    const result = run(['other'])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Usage: push-database.mjs')
  })

  it('rejects an environment pointed at the wrong project', () => {
    const result = run(['production'], {
      EXPO_PUBLIC_SUPABASE_URL: 'https://ftgltnzejaxasdvfkqut.supabase.co',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Refusing production database command')
  })

  it('requires credentials before attempting a dry run', () => {
    const result = run(['production'], {
      EXPO_PUBLIC_SUPABASE_URL: 'https://exxnnlhxcjujxnnwwrxv.supabase.co',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('SUPABASE_ACCESS_TOKEN and SUPABASE_DB_PASSWORD are required')
    expect(result.stdout).not.toContain('Checking production')
  })
})
