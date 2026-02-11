const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://exxnnlhxcjujxnnwwrxv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function fixBackfill() {
  try {
    const targetEmail = 'arfusop.dev@gmail.com'

    // Get user
    const { data: userData } = await supabase.auth.admin.listUsers()
    const targetUser = userData.users.find((u) => u.email === targetEmail)

    if (!targetUser) {
      console.error('User not found:', targetEmail)
      process.exit(1)
    }

    console.log('Found user:', targetUser.id)

    // Get system categories
    const { data: systemCategories, error: catError } = await supabase
      .from('system_categories')
      .select('*')
      .eq('is_active', true)
      .order('position')

    if (catError) throw catError

    console.log(
      'System categories:',
      systemCategories.map((c) => c.name),
    )

    // Delete existing backfilled tasks (those with "Task X -" pattern)
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', targetUser.id)
      .like('title', 'Task %')

    if (deleteError) throw deleteError

    console.log('Deleted old backfilled tasks')

    // Backfill for past 7 days
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const planDate = new Date(today)
      planDate.setDate(planDate.getDate() - dayOffset)
      const dateString = planDate.toISOString().split('T')[0]

      const tasksForDay = 2 + Math.floor(Math.random() * 3) // 2-4 tasks

      console.log(`Creating ${tasksForDay} tasks for ${dateString}`)

      // Get or create plan
      let { data: existingPlan } = await supabase
        .from('plans')
        .select('id')
        .eq('user_id', targetUser.id)
        .eq('planned_for', dateString)
        .single()

      let planId

      if (!existingPlan) {
        const { data: newPlan, error: planError } = await supabase
          .from('plans')
          .insert({
            user_id: targetUser.id,
            planned_for: dateString,
            status: 'completed',
          })
          .select()
          .single()

        if (planError) throw planError
        planId = newPlan.id
      } else {
        planId = existingPlan.id
      }

      // Create tasks with system categories
      const tasks = []
      const priorities = ['high', 'medium', 'low']

      for (let i = 0; i < tasksForDay; i++) {
        const priority = priorities[Math.floor(Math.random() * priorities.length)]
        const category = systemCategories[i % systemCategories.length]
        const isCompleted = Math.random() < 0.8 // 80% completion rate

        tasks.push({
          user_id: targetUser.id,
          plan_id: planId,
          title: `${category.name} task ${i + 1}`,
          priority: priority,
          system_category_id: category.id, // Use system_category_id instead
          completed_at: isCompleted ? planDate.toISOString() : null,
          is_mit: i === 0, // First task is MIT
          position: i,
          created_at: planDate.toISOString(),
        })
      }

      const { error: tasksError } = await supabase.from('tasks').insert(tasks)

      if (tasksError) throw tasksError

      console.log(`✓ Created ${tasksForDay} tasks for ${dateString}`)
    }

    console.log('\n✅ Backfill fixed and complete!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

fixBackfill()
