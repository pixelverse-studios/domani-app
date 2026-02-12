const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://exxnnlhxcjujxnnwwrxv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function applyColorMigration() {
  try {
    console.log('Applying color migration...\n')

    // Update category colors
    const { data, error } = await supabase
      .from('system_categories')
      .update({
        color: null,
        updated_at: new Date().toISOString(),
      })
      .eq('name', 'Work')
      .select()

    // Do individual updates for each category
    const updates = [
      { name: 'Work', color: '#8B9DAF' },
      { name: 'Wellness', color: '#D77A61' },
      { name: 'Personal', color: '#7D9B8A' },
      { name: 'Education', color: '#E8B86D' },
    ]

    for (const update of updates) {
      const { data, error } = await supabase
        .from('system_categories')
        .update({
          color: update.color,
        })
        .eq('name', update.name)
        .select()

      if (error) {
        console.error(`Error updating ${update.name}:`, error)
      } else {
        console.log(`✓ Updated ${update.name} to ${update.color}`)
      }
    }

    // Verify the changes
    const { data: categories, error: verifyError } = await supabase
      .from('system_categories')
      .select('name, color')
      .order('position')

    if (verifyError) throw verifyError

    console.log('\n✅ Migration complete! Current colors:')
    categories.forEach((cat) => {
      console.log(`  ${cat.name}: ${cat.color}`)
    })
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

applyColorMigration()
