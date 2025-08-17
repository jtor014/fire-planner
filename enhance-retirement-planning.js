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

async function enhanceRetirementPlanning() {
  console.log('🚀 Enhancing retirement planning with person-specific work cessation...');
  
  try {
    const sql = `
      -- Add person-specific retirement planning fields to super_scenarios
      ALTER TABLE super_scenarios 
      ADD COLUMN IF NOT EXISTS person1_stop_work_year INTEGER,
      ADD COLUMN IF NOT EXISTS person2_stop_work_year INTEGER,
      ADD COLUMN IF NOT EXISTS gap_funding_strategy TEXT DEFAULT 'none' CHECK (gap_funding_strategy IN ('none', 'lump_sum', 'part_time_income', 'spousal_support', 'taxable_investment')),
      ADD COLUMN IF NOT EXISTS gap_funding_amount DECIMAL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS super_access_strategy TEXT DEFAULT 'conservative' CHECK (super_access_strategy IN ('conservative', 'aggressive', 'custom'));
      
      -- Update existing scenarios with calculated defaults based on current retirement strategy
      -- This is a data migration to maintain existing scenarios
      UPDATE super_scenarios 
      SET 
        person1_stop_work_year = EXTRACT(YEAR FROM NOW())::INTEGER + 10,
        person2_stop_work_year = EXTRACT(YEAR FROM NOW())::INTEGER + 10,
        gap_funding_strategy = CASE 
          WHEN retirement_strategy = 'bridge_strategy' THEN 'part_time_income'
          WHEN retirement_strategy = 'inheritance_bridge' THEN 'lump_sum'
          ELSE 'none'
        END,
        gap_funding_amount = CASE 
          WHEN retirement_strategy = 'bridge_strategy' THEN bridge_years_other_income
          ELSE 0
        END,
        super_access_strategy = CASE 
          WHEN retirement_strategy = 'wait_for_both' THEN 'conservative'
          WHEN retirement_strategy = 'early_retirement_first' THEN 'aggressive'
          ELSE 'conservative'
        END
      WHERE person1_stop_work_year IS NULL;
    `;
    
    await executeSQL(sql);
    console.log('✅ Enhanced retirement planning schema with person-specific work cessation!');
    
    // Verify the new columns
    const columns = await executeSQL(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'super_scenarios' 
      AND column_name IN ('person1_stop_work_year', 'person2_stop_work_year', 'gap_funding_strategy', 'gap_funding_amount', 'super_access_strategy')
      ORDER BY column_name;
    `);
    
    console.log('\n📊 New retirement planning columns:');
    columns.forEach(col => {
      console.log(`  📋 ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    
    console.log('\n💡 New retirement planning structure:');
    console.log('  👥 Person-specific work cessation years');
    console.log('  🌉 Gap funding between retirement and super access (60)');
    console.log('  🎯 Super access strategy from preservation age');
    console.log('  📈 Maintains backward compatibility with existing scenarios');
    
    console.log('\n🎉 Database enhancement complete!');
    
  } catch (error) {
    console.error('❌ Error enhancing retirement planning:', error.message);
  }
}

enhanceRetirementPlanning().catch(console.error);