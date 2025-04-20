import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Function to read SQL file content
const readSqlFile = (filePath: string): string => {
  return fs.readFileSync(filePath, 'utf8')
}

// Function to apply a single migration
const applyMigration = async (filePath: string) => {
  console.log(`Applying migration: ${path.basename(filePath)}`)
  const sql = readSqlFile(filePath)

  try {
    // Create migrations table if it doesn't exist
    await supabase.rpc('create_migrations_table')

    // Check if migration was already applied
    const { data: existingMigration } = await supabase
      .from('migrations')
      .select('id')
      .eq('name', path.basename(filePath))
      .single()

    if (existingMigration) {
      console.log(`Migration ${path.basename(filePath)} was already applied, skipping...`)
      return
    }

    // Apply the migration
    const { error: migrationError } = await supabase.rpc('execute_sql', { sql_string: sql })

    if (migrationError) {
      console.error(`Error applying migration: ${migrationError.message}`)
      throw migrationError
    }

    // Record the migration
    const { error: recordError } = await supabase
      .from('migrations')
      .insert({ name: path.basename(filePath) })

    if (recordError) {
      console.error(`Error recording migration: ${recordError.message}`)
      throw recordError
    }

    console.log(`Successfully applied migration: ${path.basename(filePath)}`)
  } catch (error: any) {
    if (error.message.includes('function "create_migrations_table" does not exist')) {
      // Create the necessary functions
      const setupSql = `
        -- Function to create migrations table
        CREATE OR REPLACE FUNCTION create_migrations_table()
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
          );
        END;
        $$;

        -- Function to execute SQL
        CREATE OR REPLACE FUNCTION execute_sql(sql_string text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE sql_string;
        END;
        $$;
      `

      const { error: setupError } = await supabase.rpc('execute_sql', { sql_string: setupSql })

      if (setupError && !setupError.message.includes('function "execute_sql" does not exist')) {
        console.error(`Error creating migration functions: ${setupError.message}`)
        throw setupError
      }

      // Try applying the migration again
      return applyMigration(filePath)
    }

    throw error
  }
}

// Function to apply all migrations
export const applyMigrations = async () => {
  const migrationsDir = path.join(process.cwd(), 'src', 'db', 'migrations')
  
  try {
    // Get all SQL files in the migrations directory
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort() // Apply migrations in alphabetical order

    // Apply each migration
    for (const file of files) {
      await applyMigration(path.join(migrationsDir, file))
    }

    console.log('All migrations applied successfully')
  } catch (error) {
    console.error('Error applying migrations:', error)
    throw error
  }
}

// Export the function for use in other files
export default applyMigrations 