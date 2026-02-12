const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://exxnnlhxcjujxnnwwrxv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function verifyAnalytics() {
  try {
    const targetEmail = 'arfusop.dev@gmail.com'

    // Get user
    const { data: userData } = await supabase.auth.admin.listUsers()
    const targetUser = userData.users.find((u) => u.email === targetEmail)

    console.log('\n=== Analytics Verification ===\n')

    // Check total tasks
    const { data: allTasks, error: allError } = await supabase
      .from('tasks')
      .select('id, completed_at, system_category_id')
      .eq('user_id', targetUser.id)

    if (allError) throw allError

    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter((t) => t.completed_at !== null).length
    const withCategory = allTasks.filter((t) => t.system_category_id !== null).length

    console.log('Total tasks:', totalTasks)
    console.log('Completed tasks:', completedTasks)
    console.log('Tasks with system_category_id:', withCategory)
    console.log('Completion rate:', Math.round((completedTasks / totalTasks) * 100) + '%')

    // Check last 7 days
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 6)
    const startDateStr = startDate.toISOString().split('T')[0]

    const { data: recentTasks, error: recentError } = await supabase
      .from('tasks')
      .select(
        `
        id,
        completed_at,
        system_category_id,
        system_categories (name, color),
        plans!inner (planned_for)
      `,
      )
      .eq('user_id', targetUser.id)
      .gte('plans.planned_for', startDateStr)

    if (recentError) throw recentError

    console.log('\nLast 7 days tasks:', recentTasks.length)

    // Group by date
    const byDate = {}
    for (const task of recentTasks) {
      const date = task.plans.planned_for
      if (!byDate[date]) {
        byDate[date] = { total: 0, completed: 0 }
      }
      byDate[date].total++
      if (task.completed_at) byDate[date].completed++
    }

    console.log('\nDaily breakdown:')
    Object.keys(byDate)
      .sort()
      .forEach((date) => {
        const { total, completed } = byDate[date]
        console.log(
          `  ${date}: ${completed}/${total} tasks (${Math.round((completed / total) * 100)}%)`,
        )
      })

    console.log('\n✅ Analytics data should now be visible!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

verifyAnalytics()
