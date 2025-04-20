import fs from 'fs'
import path from 'path'

function main() {
  try {
    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort() // Apply in alphabetical order

    console.log('Found migration files:', files)
    console.log('\nCombined SQL to run in Supabase dashboard:\n')

    // Combine all migrations
    const combinedSQL = files
      .map(file => {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
        return `-- Running migration: ${file}\n${sql}\n`
      })
      .join('\n')

    console.log(combinedSQL)
    
    // Also save to a file
    const outputPath = path.join(__dirname, 'combined-migrations.sql')
    fs.writeFileSync(outputPath, combinedSQL)
    console.log(`\nSQL has been saved to: ${outputPath}`)
    console.log('\nPlease run this SQL in the Supabase dashboard SQL editor.')
  } catch (error) {
    console.error('Error generating migrations:', error)
    process.exit(1)
  }
}

main() 