#!/usr/bin/env node

const https = require('https');

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
      res.on('data', (chunk) => data += chunk);
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

async function addAssetClass() {
  console.log('➕ Adding asset_class column to accounts table...');
  
  try {
    const sql = `
      ALTER TABLE accounts 
      ADD COLUMN IF NOT EXISTS asset_class TEXT;
      
      -- Add constraint for valid asset classes
      ALTER TABLE accounts 
      DROP CONSTRAINT IF EXISTS valid_asset_class;
      
      ALTER TABLE accounts 
      ADD CONSTRAINT valid_asset_class 
      CHECK (asset_class IS NULL OR asset_class IN (
        'cash',
        'global_etf_market_cap',
        'global_etf_balanced', 
        'australian_shares',
        'international_shares',
        'bonds',
        'property',
        'mixed_conservative',
        'mixed_balanced',
        'mixed_growth'
      ));
    `;
    
    await executeSQL(sql);
    console.log('✅ Asset class column added successfully!');
    
    // Check the table structure
    const columns = await executeSQL(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'accounts' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Updated accounts table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addAssetClass().catch(console.error);