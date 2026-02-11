const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://exxnnlhxcjujxnnwwrxv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkCategories() {
  // Check system categories
  const { data: systemCats, error: sysError } = await supabase.from('system_categories').select('*')

  if (sysError) {
    console.error('Error fetching system categories:', sysError)
  } else {
    console.log('\nSystem Categories:')
    console.log(systemCats)
  }

  // Check what the backfilled tasks have
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, system_category_id, user_category_id, completed_at')
    .eq('user_id', '163472c4-59a0-4fcc-8b8f-2a23e2cb86bc')
    .limit(5)

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError)
  } else {
    console.log('\nSample tasks for user:')
    console.log(tasks)
  }
}

checkCategories()
