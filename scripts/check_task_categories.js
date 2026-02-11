const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://exxnnlhxcjujxnnwwrxv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkTaskCategories() {
  try {
    const targetEmail = 'arfusop.dev@gmail.com'

    // Get user
    const { data: userData } = await supabase.auth.admin.listUsers()
    const targetUser = userData.users.find((u) => u.email === targetEmail)

    if (!targetUser) {
      console.error('User not found')
      process.exit(1)
    }

    console.log('Checking tasks for:', targetEmail)
    console.log('User ID:', targetUser.id)
    console.log('\n=== Task Categories ===\n')

    // Get all tasks with category info
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(
        `
        id,
        title,
        system_category_id,
        user_category_id,
        completed_at,
        system_categories (name),
        user_categories (name)
      `,
      )
      .eq('user_id', targetUser.id)
      .order('created_at', { ascending: false })
      .limit(25)

    if (error) throw error

    const withSystemCategory = tasks.filter((t) => t.system_category_id !== null)
    const withUserCategory = tasks.filter((t) => t.user_category_id !== null)
    const withoutCategory = tasks.filter((t) => !t.system_category_id && !t.user_category_id)

    console.log('Total tasks:', tasks.length)
    console.log('With system category:', withSystemCategory.length)
    console.log('With user category:', withUserCategory.length)
    console.log('Without category:', withoutCategory.length)

    console.log('\n=== Sample Tasks ===\n')
    tasks.slice(0, 10).forEach((task) => {
      const systemCat = task.system_categories?.name || 'none'
      const userCat = task.user_categories?.name || 'none'
      const completed = task.completed_at ? '✅' : '⬜'

      console.log(`${completed} ${task.title}`)
      console.log(`   System: ${systemCat} | User: ${userCat}`)
    })
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkTaskCategories()
