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

async function fixViews() {
  console.log('🔧 Fixing FIRE views...');
  
  try {
    // First, check if scenarios table has the right columns
    const checkColumns = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'scenarios' 
      AND table_schema = 'public'
      AND column_name IN ('inheritance_amount', 'inheritance_year', 'emergency_fund_target');
    `;
    
    const columns = await executeSQL(checkColumns);
    console.log('📋 Scenario columns found:', columns.map(c => c.column_name));
    
    // Add missing columns if needed
    if (columns.length < 3) {
      console.log('➕ Adding missing scenario columns...');
      const addColumns = `
        ALTER TABLE scenarios 
        ADD COLUMN IF NOT EXISTS inheritance_amount DECIMAL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS inheritance_year INTEGER DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS emergency_fund_target DECIMAL DEFAULT 50000,
        ADD COLUMN IF NOT EXISTS super_contribution_strategy TEXT DEFAULT 'max_concessional';
      `;
      await executeSQL(addColumns);
      console.log('✅ Columns added');
    }
    
    // Drop and recreate views
    const dropViews = `
      DROP VIEW IF EXISTS fire_scenario_summary CASCADE;
      DROP VIEW IF EXISTS emergency_fund_status CASCADE;
    `;
    await executeSQL(dropViews);
    console.log('🗑️ Old views dropped');
    
    // Create emergency fund view
    const emergencyView = `
      CREATE VIEW emergency_fund_status AS
      SELECT 
        COALESCE(SUM(current_balance), 0) as total_emergency_funds,
        COUNT(*) as emergency_account_count,
        CASE 
          WHEN COALESCE(SUM(current_balance), 0) >= 50000 THEN 'Adequate'
          WHEN COALESCE(SUM(current_balance), 0) >= 25000 THEN 'Moderate'
          ELSE 'Low'
        END as emergency_fund_status_text,
        50000 as recommended_minimum
      FROM accounts 
      WHERE category = 'emergency' AND is_active = true;
    `;
    await executeSQL(emergencyView);
    console.log('✅ Emergency fund view created');
    
    // Create FIRE scenario view
    const fireView = `
      CREATE VIEW fire_scenario_summary AS
      SELECT 
        s.*,
        COALESCE(hh.total_gross_income, 0) as current_household_income,
        COALESCE(hh.total_super_contributions, 0) as current_super_contributions,
        COALESCE(nw.net_worth, 0) as current_net_worth,
        COALESCE(nw.total_assets, 0) as current_total_assets,
        CASE 
          WHEN COALESCE(s.target_fire_amount, 0) > 0 AND COALESCE(nw.net_worth, 0) > 0 
          THEN ROUND((COALESCE(nw.net_worth, 0) / COALESCE(s.target_fire_amount, 1)) * 100, 1)
          ELSE 0 
        END as fire_progress_percentage,
        CASE 
          WHEN COALESCE(s.target_fire_amount, 0) > COALESCE(nw.net_worth, 0) 
          THEN COALESCE(s.target_fire_amount, 0) - COALESCE(nw.net_worth, 0)
          ELSE 0 
        END as fire_gap_amount
      FROM scenarios s
      LEFT JOIN (
        SELECT * FROM household_income_summary 
        ORDER BY financial_year DESC LIMIT 1
      ) hh ON true
      LEFT JOIN (
        SELECT * FROM networth_snapshots 
        ORDER BY created_at DESC LIMIT 1
      ) nw ON true
      WHERE COALESCE(s.is_active, true) = true
      ORDER BY s.created_at DESC;
    `;
    await executeSQL(fireView);
    console.log('✅ FIRE scenario view created');
    
    // Insert sample scenarios if table is empty
    const countScenarios = await executeSQL('SELECT COUNT(*) as count FROM scenarios;');
    if (countScenarios[0].count === '0') {
      console.log('📝 Adding sample FIRE scenarios...');
      const insertScenarios = `
        INSERT INTO scenarios (
          name, description, employment_status, target_fire_amount,
          inheritance_amount, inheritance_year, emergency_fund_target,
          super_contribution_strategy
        ) VALUES 
        ('Max Super + Inheritance Strategy', 'Maximize super contributions, plan for inheritance, maintain emergency fund', 'full_time', 1500000, 300000, 2030, 60000, 'max_concessional'),
        ('Conservative Super Strategy', 'Standard super contributions with inheritance safety net', 'full_time', 1200000, 200000, 2032, 50000, 'salary_sacrifice_only'),
        ('Early Inheritance Scenario', 'Large inheritance received early, optimize allocation', 'full_time', 1800000, 500000, 2027, 75000, 'max_total');
      `;
      await executeSQL(insertScenarios);
      console.log('✅ Sample scenarios added');
    }
    
    // Test the views
    const testScenarios = await executeSQL('SELECT name, fire_progress_percentage, fire_gap_amount FROM fire_scenario_summary LIMIT 3;');
    console.log('🎯 FIRE scenarios loaded:');
    testScenarios.forEach(s => {
      console.log(`  📊 ${s.name}: ${s.fire_progress_percentage}% complete, $${Number(s.fire_gap_amount).toLocaleString()} gap`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixViews().catch(console.error);