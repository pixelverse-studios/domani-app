const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://exxnnlhxcjujxnnwwrxv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function backfillTasks() {
  try {
    // Get user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers()

    if (userError) throw userError

    const targetUser = userData.users.find((u) => u.email === 'arfusop.dev@gmail.com')

    if (!targetUser) {
      console.error('User not found: arfusop.dev@gmail.com')
      process.exit(1)
    }

    console.log('Found user:', targetUser.id)

    // Get user's categories
    const { data: categories, error: catError } = await supabase
      .from('user_categories')
      .select('id, name')
      .eq('user_id', targetUser.id)
      .limit(5)

    if (catError) throw catError

    let userCategories = categories || []

    // If no categories, create some default ones
    if (userCategories.length === 0) {
      const defaultCategories = ['Work', 'Personal', 'Health', 'Learning']

      for (const catName of defaultCategories) {
        const { data: newCat, error: createError } = await supabase
          .from('user_categories')
          .insert({
            user_id: targetUser.id,
            name: catName,
          })
          .select()
          .single()

        if (createError) throw createError
        userCategories.push(newCat)
      }
    }

    console.log(
      'Using categories:',
      userCategories.map((c) => c.name),
    )

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

      // Create tasks
      const tasks = []
      const priorities = ['high', 'medium', 'low']

      for (let i = 0; i < tasksForDay; i++) {
        const priority = priorities[Math.floor(Math.random() * priorities.length)]
        const category = userCategories[i % userCategories.length]
        const isCompleted = Math.random() < 0.8 // 80% completion rate

        tasks.push({
          user_id: targetUser.id,
          plan_id: planId,
          title: `Task ${i + 1} - ${category.name}`,
          priority: priority,
          user_category_id: category.id,
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

    console.log('\n✅ Backfill complete!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

backfillTasks()
