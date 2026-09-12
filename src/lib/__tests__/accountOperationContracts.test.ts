import fs from 'node:fs'
import path from 'node:path'

const sourceRoot = path.resolve(__dirname, '../..')

function runtimeSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') return []
      return runtimeSourceFiles(absolutePath)
    }
    return /\.tsx?$/.test(entry.name) && absolutePath !== path.join(sourceRoot, 'types/supabase.ts')
      ? [absolutePath]
      : []
  })
}

describe('account operation contracts', () => {
  const files = runtimeSourceFiles(sourceRoot)

  it('does not call mutable current-user RPCs without an expected owner', () => {
    const unboundRpcNames = [
      'cancel_current_user_account_deletion',
      'clear_current_user_refund_request_state',
      'confirm_current_user_promo_redemption',
      'ensure_current_user_profile',
      'increment_current_user_category_usage',
      'mark_current_user_refund_request_pending',
      'record_current_user_duplicate_refund_request_hint',
      'schedule_current_user_account_deletion',
      'set_current_user_expo_push_token',
      'start_current_user_trial',
      'update_current_user_category_positions',
      'update_current_user_favorite_categories',
      'update_current_user_promo_redemption_attempt',
    ]

    const violations = files.flatMap((file) => {
      const source = fs.readFileSync(file, 'utf8')
      return unboundRpcNames
        .filter((rpcName) => source.includes(`rpc('${rpcName}'`))
        .map((rpcName) => `${path.relative(sourceRoot, file)}: ${rpcName}`)
    })

    expect(violations).toEqual([])
  })

  it('does not discover persistence ownership from the live auth session inside stores', () => {
    const storeRoot = path.join(sourceRoot, 'stores')
    const violations = runtimeSourceFiles(storeRoot)
      .filter((file) => fs.readFileSync(file, 'utf8').includes('supabase.auth.getUser()'))
      .map((file) => path.relative(sourceRoot, file))

    expect(violations).toEqual([])
  })
})
