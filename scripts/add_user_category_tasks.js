const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://exxnnlhxcjujxnnwwrxv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function addUserCategoryTasks() {
  try {
    const targetEmail = 'arfusop.dev@gmail.com'

    // Get user
    const { data: userData } = await supabase.auth.admin.listUsers()
    const targetUser = userData.users.find((u) => u.email === targetEmail)

    if (!targetUser) {
      console.error('User not found')
      process.exit(1)
    }

    console.log('Found user:', targetUser.id)

    // Get user's custom categories
    const { data: userCategories, error: catError } = await supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', targetUser.id)

    if (catError) throw catError

    console.log(`\nUser has ${userCategories.length} custom category/categories:`)
    userCategories.forEach((cat) => {
      console.log(`  - ${cat.name} (${cat.color})`)
    })

    if (userCategories.length === 0) {
      // Create some custom categories if they don't have any
      console.log('\nCreating some custom categories...')

      const newCategories = [
        { name: 'Side Projects', color: '#A78295', icon: 'code' },
        { name: 'Reading', color: '#E8B86D', icon: 'book' },
        { name: 'Hobbies', color: '#95B8A3', icon: 'palette' },
      ]

      for (const cat of newCategories) {
        const { data: newCat, error: createError } = await supabase
          .from('user_categories')
          .insert({
            user_id: targetUser.id,
            name: cat.name,
            color: cat.color,
            icon: cat.icon,
          })
          .select()
          .single()

        if (createError) throw createError
        userCategories.push(newCat)
        console.log(`  ✓ Created: ${cat.name}`)
      }
    }

    console.log('\n=== Creating Tasks ===\n')

    // Create tasks across the last 7 days
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Days to add tasks: 0, 2, 3, 5, 6 (spread out)
    const daysToAddTasks = [0, 2, 3, 5, 6]
    let tasksCreated = 0

    for (const dayOffset of daysToAddTasks) {
      const planDate = new Date(today)
      planDate.setDate(planDate.getDate() - dayOffset)
      const dateString = planDate.toISOString().split('T')[0]

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

      // Create 1-2 tasks with user categories for this day
      const numTasks = 1 + Math.floor(Math.random() * 2) // 1-2 tasks

      for (let i = 0; i < numTasks; i++) {
        const category = userCategories[tasksCreated % userCategories.length]
        const priority = ['high', 'medium', 'low'][Math.floor(Math.random() * 3)]
        const isCompleted = Math.random() < 0.7 // 70% completion rate

        const { error: taskError } = await supabase.from('tasks').insert({
          user_id: targetUser.id,
          plan_id: planId,
          title: `${category.name} task - Day ${dayOffset}`,
          priority: priority,
          user_category_id: category.id, // Using user category, not system
          completed_at: isCompleted ? planDate.toISOString() : null,
          is_mit: false,
          position: 100 + tasksCreated,
          created_at: planDate.toISOString(),
        })

        if (taskError) throw taskError

        const completedIcon = isCompleted ? '✅' : '⬜'
        console.log(
          `${completedIcon} ${dateString}: "${category.name} task - Day ${dayOffset}" (${priority})`,
        )
        tasksCreated++
      }
    }

    console.log(`\n✅ Created ${tasksCreated} tasks with user categories!`)
    console.log('\nNow restart your dev server and refresh the Progress tab.')
    console.log('You should see these custom categories in the chart! 🎨')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

addUserCategoryTasks()
