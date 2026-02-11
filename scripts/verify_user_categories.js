const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://exxnnlhxcjujxnnwwrxv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function verifyUserCategories() {
  try {
    const targetEmail = 'arfusop.dev@gmail.com'

    // Get user
    const { data: userData } = await supabase.auth.admin.listUsers()
    const targetUser = userData.users.find((u) => u.email === targetEmail)

    console.log('=== User Category Analysis ===\n')

    // Get tasks with user categories
    const { data: userCatTasks, error } = await supabase
      .from('tasks')
      .select(
        `
        id,
        title,
        completed_at,
        user_category_id,
        user_categories (name, color),
        plans (planned_for)
      `,
      )
      .eq('user_id', targetUser.id)
      .not('user_category_id', 'is', null)

    if (error) throw error

    console.log(`Found ${userCatTasks.length} task(s) with user categories:\n`)

    userCatTasks.forEach((task) => {
      const completed = task.completed_at ? '✅' : '⬜'
      const catName = task.user_categories?.name || 'Unknown'
      const planDate = task.plans?.planned_for || 'No plan'
      console.log(`${completed} ${task.title}`)
      console.log(`   Category: ${catName}`)
      console.log(`   Plan date: ${planDate}`)
      console.log(`   Completed: ${task.completed_at || 'Not completed'}`)
      console.log('')
    })

    // Check if any are in the last 7 days
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const startDate = sevenDaysAgo.toISOString().split('T')[0]

    const recentUserCatTasks = userCatTasks.filter((t) => {
      return t.plans?.planned_for && t.plans.planned_for >= startDate
    })

    console.log(`Tasks with user categories in last 7 days: ${recentUserCatTasks.length}`)

    if (recentUserCatTasks.length === 0) {
      console.log('\n⚠️  No user category tasks in the last 7 days!')
      console.log(
        "The analytics chart only shows the last 7 days, so user categories won't appear yet.",
      )
      console.log(
        '\nWould you like me to create some test tasks with user categories in the last 7 days?',
      )
    } else {
      console.log('\n✅ User category tasks should appear in analytics after restart!')
    }
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

verifyUserCategories()
