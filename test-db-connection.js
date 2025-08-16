#!/usr/bin/env node

// Test database connection to Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testConnection() {
  console.log('🔌 Testing Supabase connection...');
  
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
  
  console.log(`📍 Connecting to: ${supabaseUrl}`);
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Test basic connection by trying to fetch from a simple table
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      
      if (error.message.includes('relation "accounts" does not exist')) {
        console.log('\n💡 It looks like the database schema hasn\'t been set up yet.');
        console.log('   You need to run the schema.sql file in your Supabase SQL editor.');
        console.log('   Copy the contents of database/schema.sql and run it in:');
        console.log('   https://supabase.com/dashboard/project/jbxwxltzrpifwijvkfgi/sql');
      }
      
      process.exit(1);
    }
    
    console.log('✅ Database connection successful!');
    console.log(`📊 Accounts table accessible`);
    
    // Test if we can create a simple account
    const { data: testData, error: insertError } = await supabase
      .from('accounts')
      .insert({
        name: 'Test Connection Account',
        type: 'asset',
        category: 'bank',
        current_balance: 0,
        institution: 'Test Bank'
      })
      .select();
    
    if (insertError) {
      console.log('⚠️  Insert test failed:', insertError.message);
      console.log('   This might be expected if the table doesn\'t exist yet.');
    } else {
      console.log('✅ Test insert successful!');
      
      // Clean up test data
      await supabase
        .from('accounts')
        .delete()
        .eq('name', 'Test Connection Account');
      console.log('🧹 Test data cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection().catch(console.error);