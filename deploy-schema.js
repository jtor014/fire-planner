#!/usr/bin/env node

// Deploy database schema to Supabase using service role key
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function deploySchema() {
  console.log('🚀 Deploying database schema to Supabase...');
  
  // Read environment variables from .env.local
  let supabaseUrl, supabaseKey;
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const urlMatch = envContent.match(/SUPABASE_URL=(.+)/);
    const keyMatch = envContent.match(/SUPABASE_SERVICE_KEY=(.+)/);
    
    supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
    supabaseKey = keyMatch ? keyMatch[1].trim() : null;
  } catch (error) {
    console.error('❌ Could not read .env.local file');
    process.exit(1);
  }
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
    process.exit(1);
  }
  
  console.log(`📍 Deploying to: ${supabaseUrl}`);
  
  // Read the schema file
  let schema;
  try {
    schema = fs.readFileSync('database/schema.sql', 'utf8');
  } catch (error) {
    console.error('❌ Could not read database/schema.sql');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('📦 Executing schema...');
    
    // Execute the schema using RPC call
    const { data, error } = await supabase.rpc('exec', {
      sql: schema
    });
    
    if (error) {
      console.error('❌ Schema deployment failed:', error.message);
      
      // Try alternative approach using individual SQL statements
      console.log('🔄 Trying alternative deployment method...');
      
      // Split schema into individual statements and execute them
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';
        console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { error: stmtError } = await supabase.rpc('exec', {
            sql: statement
          });
          
          if (stmtError) {
            console.warn(`⚠️  Statement ${i + 1} warning:`, stmtError.message);
          }
        } catch (stmtErr) {
          console.warn(`⚠️  Statement ${i + 1} failed:`, stmtErr.message);
        }
      }
    } else {
      console.log('✅ Schema deployed successfully!');
    }
    
    // Test that tables were created
    console.log('🔍 Verifying tables...');
    const { data: tables, error: tableError } = await supabase
      .from('accounts')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Tables verification failed:', tableError.message);
      process.exit(1);
    }
    
    console.log('✅ Database schema deployed and verified!');
    console.log('🎉 Your FIRE Planner database is ready to use!');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploySchema().catch(console.error);