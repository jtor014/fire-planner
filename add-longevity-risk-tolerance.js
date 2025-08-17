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

async function addLongevityRiskTolerance() {
  console.log('🎯 Adding longevity risk tolerance setting to baseline...');
  
  try {
    const sql = `
      -- Add longevity risk tolerance to baseline_settings
      ALTER TABLE baseline_settings 
      ADD COLUMN IF NOT EXISTS longevity_risk_tolerance TEXT DEFAULT 'moderate' 
        CHECK (longevity_risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
      ADD COLUMN IF NOT EXISTS planning_age INTEGER DEFAULT 95
        CHECK (planning_age BETWEEN 80 AND 110);
      
      -- Update existing records with defaults
      UPDATE baseline_settings 
      SET 
        longevity_risk_tolerance = 'moderate',
        planning_age = 95
      WHERE longevity_risk_tolerance IS NULL OR planning_age IS NULL;
      
      -- Add comments for clarity
      COMMENT ON COLUMN baseline_settings.longevity_risk_tolerance IS 'How prepared are you to run out of money if you live beyond life expectancy: conservative (plan to 100+), moderate (plan to 95), aggressive (plan to 90)';
      COMMENT ON COLUMN baseline_settings.planning_age IS 'Age to plan retirement funding until (affects withdrawal rates and portfolio allocation)';
    `;
    
    await executeSQL(sql);
    console.log('✅ Added longevity risk tolerance to baseline settings!');
    
    // Verify the new columns
    const columns = await executeSQL(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        col_description(pgc.oid, a.attnum) as description
      FROM information_schema.columns a
      LEFT JOIN pg_class pgc ON pgc.relname = a.table_name
      WHERE a.table_name = 'baseline_settings' 
      AND a.column_name IN ('longevity_risk_tolerance', 'planning_age')
      ORDER BY a.column_name;
    `);
    
    console.log('\n📊 New longevity risk columns:');
    columns.forEach(col => {
      console.log(`  📋 ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
      if (col.description) {
        console.log(`      💡 ${col.description}`);
      }
    });
    
    console.log('\n⚖️ Longevity Risk Tolerance Options:');
    console.log('  🛡️ Conservative: Plan to age 100+ (lower withdrawal rates, higher safety margin)');
    console.log('  ⚖️ Moderate: Plan to age 95 (balanced approach, Australian life expectancy + buffer)');
    console.log('  🎯 Aggressive: Plan to age 90 (higher withdrawal rates, accepts some longevity risk)');
    
    console.log('\n📈 Impact on Planning:');
    console.log('  • Withdrawal Rates: Conservative uses lower rates, aggressive uses higher rates');
    console.log('  • Portfolio Allocation: Affects stock/bond mix recommendations');
    console.log('  • Safety Margins: Conservative plans for longer lifespan scenarios');
    console.log('  • Monte Carlo: Risk tolerance affects success rate thresholds');
    
    console.log('\n🎉 Longevity risk tolerance enhancement complete!');
    
  } catch (error) {
    console.error('❌ Error adding longevity risk tolerance:', error.message);
  }
}

addLongevityRiskTolerance().catch(console.error);