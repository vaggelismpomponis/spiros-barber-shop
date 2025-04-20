import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing required environment variables')
  console.error('Please ensure you have set the following in .env.local:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration(filePath: string) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8')
    console.log(`Applying migration: ${path.basename(filePath)}`)
    console.log('SQL:', sql)
    
    // First try to execute directly
    try {
      const { error: directError } = await supabase.rpc('apply_migration', { migration_sql: sql })
      if (!directError) {
        console.log(`Successfully applied migration: ${path.basename(filePath)}`)
        return
      }
      // If direct execution fails, it might be because the function doesn't exist yet
      if (directError.message.includes('function "apply_migration" does not exist')) {
        // Try to execute the SQL directly if it's the migration function creation
        const { error } = await supabase.sql(sql)
        if (error) throw error
        console.log(`Successfully created migration function: ${path.basename(filePath)}`)
        return
      }
      throw directError
    } catch (error) {
      console.error(`Error applying migration ${path.basename(filePath)}:`, error)
      throw error
    }
  } catch (error) {
    console.error(`Error reading or applying migration ${path.basename(filePath)}:`, error)
    throw error
  }
}

async function main() {
  try {
    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort() // Apply in alphabetical order

    console.log('Found migration files:', files)

    // Apply each migration
    for (const file of files) {
      await applyMigration(path.join(migrationsDir, file))
    }

    console.log('All migrations applied successfully!')
  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  }
}

main() 