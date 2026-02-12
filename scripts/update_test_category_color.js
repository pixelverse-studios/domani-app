const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://exxnnlhxcjujxnnwwrxv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function updateTestCategoryColor() {
  try {
    const targetEmail = 'arfusop.dev@gmail.com'

    // Get user
    const { data: userData } = await supabase.auth.admin.listUsers()
    const targetUser = userData.users.find((u) => u.email === targetEmail)

    console.log('Updating Test Category color to match sage theme...\n')

    // Update the Test Category color to a muted mauve that fits sage theme
    const { data, error } = await supabase
      .from('user_categories')
      .update({
        color: '#A78295', // Muted mauve/dusty rose - earthy and calm
      })
      .eq('user_id', targetUser.id)
      .eq('name', 'Test Category')
      .select()

    if (error) throw error

    console.log('✅ Updated "Test Category" color:')
    console.log(`   Old: #8b5cf6 (bright purple)`)
    console.log(`   New: #A78295 (muted mauve)`)
    console.log('\n🎨 This color is warm, earthy, and matches the sage aesthetic!')
    console.log('\nRefresh the Progress tab to see the updated color.')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

updateTestCategoryColor()
