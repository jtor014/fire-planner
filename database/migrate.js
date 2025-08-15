#!/usr/bin/env node

/**
 * Database Migration Runner
 * 
 * Usage:
 *   node database/migrate.js
 * 
 * This script runs all pending migrations in the migrations/ directory
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Migration tracking table
const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT
);
`;

async function ensureMigrationTable() {
  console.log('📋 Ensuring migration tracking table exists...');
  const { error } = await supabase.rpc('exec_sql', { sql: MIGRATION_TABLE_SQL });
  
  if (error) {
    // Try alternative approach using raw query
    const { error: createError } = await supabase
      .from('migrations')
      .select('id')
      .limit(1);
    
    if (createError && createError.code === 'PGRST116') {
      // Table doesn't exist, create it manually
      console.log('⚠️  Creating migration table manually...');
      // This would require a direct SQL execution method
      // For now, assume the table needs to be created manually in Supabase dashboard
      console.log('⚠️  Please create the migration table manually using the SQL in schema.sql');
    }
  }
}

async function getExecutedMigrations() {
  try {
    const { data, error } = await supabase
      .from('migrations')
      .select('filename')
      .eq('success', true);
    
    if (error) {
      console.log('ℹ️  Migration table not found, assuming no migrations have been run');
      return [];
    }
    
    return data.map(row => row.filename);
  } catch (error) {
    console.log('ℹ️  Could not fetch executed migrations, assuming none have been run');
    return [];
  }
}

async function executeMigration(filename, sql) {
  console.log(`🔄 Executing migration: ${filename}`);
  
  try {
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        throw error;
      }
    }
    
    // Record successful migration
    await supabase
      .from('migrations')
      .insert({
        filename,
        success: true
      });
    
    console.log(`✅ Migration completed: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`);
    console.error(`   Error: ${error.message}`);
    
    // Record failed migration
    try {
      await supabase
        .from('migrations')
        .insert({
          filename,
          success: false,
          error_message: error.message
        });
    } catch (recordError) {
      console.error('⚠️  Could not record migration failure');
    }
    
    return false;
  }
}

async function runMigrations() {
  console.log('🚀 FIRE Planner Database Migration Runner');
  console.log('=' .repeat(50));
  
  // Get migration files
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found');
    process.exit(1);
  }
  
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  if (migrationFiles.length === 0) {
    console.log('ℹ️  No migration files found');
    return;
  }
  
  console.log(`📁 Found ${migrationFiles.length} migration files`);
  
  // Ensure migration tracking
  await ensureMigrationTable();
  
  // Get already executed migrations
  const executedMigrations = await getExecutedMigrations();
  console.log(`📋 ${executedMigrations.length} migrations already executed`);
  
  // Find pending migrations
  const pendingMigrations = migrationFiles.filter(
    file => !executedMigrations.includes(file)
  );
  
  if (pendingMigrations.length === 0) {
    console.log('✨ All migrations are up to date!');
    return;
  }
  
  console.log(`⏳ ${pendingMigrations.length} pending migrations found`);
  console.log('');
  
  // Execute pending migrations
  let successCount = 0;
  let failureCount = 0;
  
  for (const filename of pendingMigrations) {
    const filePath = path.join(migrationsDir, filename);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    const success = await executeMigration(filename, sql);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  // Summary
  console.log('');
  console.log('📊 Migration Summary');
  console.log('=' .repeat(30));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📝 Total: ${pendingMigrations.length}`);
  
  if (failureCount > 0) {
    console.log('');
    console.log('⚠️  Some migrations failed. Please check the errors above.');
    process.exit(1);
  } else {
    console.log('');
    console.log('🎉 All migrations completed successfully!');
  }
}

// Alternative simple migration approach for manual execution
function generateMigrationInstructions() {
  console.log('📋 Manual Migration Instructions');
  console.log('=' .repeat(50));
  console.log('');
  console.log('If the automated migration fails, you can run these SQL files manually');
  console.log('in your Supabase SQL Editor in the following order:');
  console.log('');
  
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  migrationFiles.forEach((file, index) => {
    console.log(`${index + 1}. database/migrations/${file}`);
  });
  
  console.log('');
  console.log('Then run: database/sample_data.sql (optional, for test data)');
}

// Run migrations or show manual instructions
if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('FIRE Planner Database Migration Runner');
    console.log('');
    console.log('Usage:');
    console.log('  node database/migrate.js           Run all pending migrations');
    console.log('  node database/migrate.js --manual  Show manual migration instructions');
    console.log('  node database/migrate.js --help    Show this help');
    console.log('');
    console.log('Environment variables required:');
    console.log('  SUPABASE_URL         Your Supabase project URL');
    console.log('  SUPABASE_SERVICE_KEY Your Supabase service role key');
    process.exit(0);
  }
  
  if (process.argv.includes('--manual')) {
    generateMigrationInstructions();
    process.exit(0);
  }
  
  runMigrations().catch(error => {
    console.error('💥 Migration runner failed:', error.message);
    console.log('');
    console.log('💡 Try running: node database/migrate.js --manual');
    process.exit(1);
  });
}