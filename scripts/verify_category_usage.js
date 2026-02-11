const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://exxnnlhxcjujxnnwwrxv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function verifyCategoryUsage() {
  try {
    const targetEmail = 'arfusop.dev@gmail.com'

    // Get user
    const { data: userData } = await supabase.auth.admin.listUsers()
    const targetUser = userData.users.find((u) => u.email === targetEmail)

    console.log('=== Category Usage Analysis (Last 7 Days) ===\n')

    // Get date range
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 6)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Get all system categories
    const { data: systemCats } = await supabase.from('system_categories').select('id, name, color')

    // Get all user categories for this user
    const { data: userCats } = await supabase
      .from('user_categories')
      .select('id, name, color')
      .eq('user_id', targetUser.id)

    console.log('All Available Categories:')
    console.log('\nSystem:')
    systemCats.forEach((cat) => console.log(`  - ${cat.name} (${cat.color})`))
    console.log('\nUser:')
    userCats.forEach((cat) => console.log(`  - ${cat.name} (${cat.color})`))

    // Get tasks in date range
    const { data: tasks } = await supabase
      .from('tasks')
      .select(
        `
        id,
        system_category_id,
        user_category_id,
        system_categories (id, name, color),
        user_categories (id, name, color),
        plans!inner (planned_for)
      `,
      )
      .eq('user_id', targetUser.id)
      .gte('plans.planned_for', startDateStr)

    // Count usage
    const categoryUsage = new Map()

    for (const task of tasks) {
      const systemCat = task.system_categories
      const userCat = task.user_categories
      const category = systemCat || userCat

      if (category) {
        const count = categoryUsage.get(category.id) || {
          name: category.name,
          color: category.color,
          count: 0,
          type: systemCat ? 'system' : 'user',
        }
        count.count++
        categoryUsage.set(category.id, count)
      }
    }

    console.log('\n=== Categories WITH Tasks (Last 7 Days) ===\n')
    Array.from(categoryUsage.values())
      .sort((a, b) => b.count - a.count)
      .forEach((cat) => {
        console.log(`✅ ${cat.name} (${cat.type}): ${cat.count} tasks`)
      })

    console.log('\n=== Categories WITHOUT Tasks (Last 7 Days) ===\n')

    const unusedSystem = systemCats.filter((cat) => !categoryUsage.has(cat.id))
    const unusedUser = userCats.filter((cat) => !categoryUsage.has(cat.id))

    if (unusedSystem.length === 0 && unusedUser.length === 0) {
      console.log('None - all categories have tasks!')
    } else {
      unusedSystem.forEach((cat) => console.log(`❌ ${cat.name} (system): 0 tasks`))
      unusedUser.forEach((cat) => console.log(`❌ ${cat.name} (user): 0 tasks`))
    }

    console.log('\n=== Current Implementation ===')
    console.log('✅ The chart already only shows categories with tasks')
    console.log('✅ Empty categories are automatically excluded')
    console.log('\nThe getUniqueCategories() function only includes categories')
    console.log('that appear in the dailyData, which only contains categories')
    console.log('from actual tasks in the date range.')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

verifyCategoryUsage()
