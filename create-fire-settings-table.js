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

async function createFIRESettingsTable() {
  console.log('🔧 Creating FIRE settings table...');
  
  try {
    const sql = `
      -- Create FIRE settings table
      CREATE TABLE IF NOT EXISTS fire_settings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        -- FIRE Target Settings
        target_annual_income DECIMAL NOT NULL,
        withdrawal_rate DECIMAL NOT NULL DEFAULT 4.0,
        fire_number DECIMAL NOT NULL,
        
        -- Timeline Settings
        current_age INTEGER NOT NULL,
        target_retirement_age INTEGER NOT NULL,
        inflation_rate DECIMAL DEFAULT 2.5,
        
        -- Return Assumptions (JSON)
        return_assumptions JSONB DEFAULT '{
          "cash": 2.5,
          "global_etf_market_cap": 7.5,
          "global_etf_balanced": 6.5,
          "australian_shares": 7.0,
          "international_shares": 8.0,
          "bonds": 3.5,
          "property": 5.5,
          "mixed_conservative": 4.5,
          "mixed_balanced": 6.5,
          "mixed_growth": 7.5
        }'::jsonb,
        
        -- Constraints
        CONSTRAINT valid_withdrawal_rate CHECK (withdrawal_rate > 0 AND withdrawal_rate <= 10),
        CONSTRAINT valid_ages CHECK (current_age > 0 AND target_retirement_age > current_age),
        CONSTRAINT valid_income CHECK (target_annual_income > 0),
        CONSTRAINT valid_fire_number CHECK (fire_number > 0)
      );

      -- Create trigger to update updated_at
      CREATE OR REPLACE FUNCTION update_fire_settings_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS fire_settings_updated_at ON fire_settings;
      CREATE TRIGGER fire_settings_updated_at
        BEFORE UPDATE ON fire_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_fire_settings_updated_at();

      -- Ensure only one settings row (singleton pattern)
      CREATE UNIQUE INDEX IF NOT EXISTS fire_settings_singleton ON fire_settings ((1));
    `;
    
    await executeSQL(sql);
    console.log('✅ FIRE settings table created successfully!');
    
    // Show table structure
    const columns = await executeSQL(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'fire_settings' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 FIRE Settings table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
    });
    
    console.log('\n💡 Features:');
    console.log('  - Single settings row (singleton pattern)');
    console.log('  - Automatic FIRE number calculation');
    console.log('  - JSON return assumptions for each asset class');
    console.log('  - Input validation constraints');
    console.log('  - Auto-updated timestamps');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createFIRESettingsTable().catch(console.error);