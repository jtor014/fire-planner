#!/usr/bin/env node

// CLI wrapper for Supabase operations using Management API
const https = require('https');
const fs = require('fs');
const path = require('path');

const accessToken = 'sbp_0dde77f2bbc31364373ab85df510b282b9a7ce75';
const projectRef = 'jbxwxltzrpifwijvkfgi';

async function executeSQL(sql) {
  const postData = JSON.stringify({ query: sql });
  
  const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: `/v1/projects/${projectRef}/database/query`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runMigrations() {
  console.log('🔄 Running migrations...');
  
  const migrationsDir = './supabase/migrations';
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found');
    return;
  }
  
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  for (const file of files) {
    console.log(`📝 Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    try {
      await executeSQL(sql);
      console.log(`✅ Migration ${file} completed`);
    } catch (error) {
      console.error(`❌ Migration ${file} failed:`, error.message);
    }
  }
}

async function dbPush() {
  console.log('🚀 Pushing database changes...');
  await runMigrations();
  console.log('✅ Database push completed');
}

async function dbReset() {
  console.log('🔄 Resetting database...');
  
  // First, drop all tables
  const dropTablesSQL = `
    DROP TABLE IF EXISTS chat_history CASCADE;
    DROP TABLE IF EXISTS projections CASCADE;
    DROP TABLE IF EXISTS networth_snapshots CASCADE;
    DROP TABLE IF EXISTS scenarios CASCADE;
    DROP TABLE IF EXISTS transactions CASCADE;
    DROP TABLE IF EXISTS accounts CASCADE;
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    DROP FUNCTION IF EXISTS create_networth_snapshot() CASCADE;
    DROP VIEW IF EXISTS account_summary CASCADE;
    DROP VIEW IF EXISTS current_net_worth CASCADE;
    DROP VIEW IF EXISTS monthly_cash_flow CASCADE;
  `;
  
  try {
    await executeSQL(dropTablesSQL);
    console.log('🗑️  Dropped existing tables');
  } catch (error) {
    console.log('⚠️  Warning dropping tables:', error.message);
  }
  
  // Then run migrations
  await runMigrations();
  console.log('✅ Database reset completed');
}

async function dbStatus() {
  console.log('📊 Database status:');
  
  try {
    const tables = await executeSQL(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tables:');
    tables.forEach(row => console.log(`  - ${row.table_name}`));
    
    const functions = await executeSQL(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION'
      ORDER BY routine_name;
    `);
    
    console.log('⚙️  Functions:');
    functions.forEach(row => console.log(`  - ${row.routine_name}`));
    
  } catch (error) {
    console.error('❌ Failed to get status:', error.message);
  }
}

// Parse command line arguments
const command = process.argv[2];
const subcommand = process.argv[3];

async function main() {
  if (command === 'db') {
    switch (subcommand) {
      case 'push':
        await dbPush();
        break;
      case 'reset':
        await dbReset();
        break;
      case 'status':
        await dbStatus();
        break;
      default:
        console.log('Available commands:');
        console.log('  node supabase-cli-wrapper.js db push   - Push migrations');
        console.log('  node supabase-cli-wrapper.js db reset  - Reset database');
        console.log('  node supabase-cli-wrapper.js db status - Show database status');
    }
  } else {
    console.log('FIRE Planner Supabase CLI Wrapper');
    console.log('Available commands:');
    console.log('  node supabase-cli-wrapper.js db push   - Push migrations');
    console.log('  node supabase-cli-wrapper.js db reset  - Reset database');
    console.log('  node supabase-cli-wrapper.js db status - Show database status');
  }
}

main().catch(console.error);