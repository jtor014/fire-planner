#!/usr/bin/env node

// Enhance scenarios table for super-focused FIRE planning
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

async function enhanceFIREScenarios() {
  console.log('🚀 Enhancing FIRE scenarios for super + inheritance planning...');
  
  const sql = `
    -- Add new columns for super-focused FIRE planning
    ALTER TABLE scenarios 
    ADD COLUMN IF NOT EXISTS max_super_contributions BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS annual_super_extra DECIMAL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS inheritance_amount DECIMAL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS inheritance_year INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS inheritance_allocation TEXT CHECK (inheritance_allocation IN ('super', 'investment', 'property', 'debt_reduction', 'mixed')),
    ADD COLUMN IF NOT EXISTS emergency_fund_target DECIMAL DEFAULT 50000,
    ADD COLUMN IF NOT EXISTS super_contribution_strategy TEXT DEFAULT 'max_concessional' 
      CHECK (super_contribution_strategy IN ('max_concessional', 'max_total', 'salary_sacrifice_only', 'custom')),
    ADD COLUMN IF NOT EXISTS investment_return_assumption DECIMAL DEFAULT 7.0,
    ADD COLUMN IF NOT EXISTS super_return_assumption DECIMAL DEFAULT 8.0;

    -- Create enhanced FIRE scenarios with super focus
    INSERT INTO scenarios (
      name, 
      description, 
      employment_status, 
      target_fire_amount,
      max_super_contributions,
      annual_super_extra,
      inheritance_amount,
      inheritance_year,
      inheritance_allocation,
      emergency_fund_target,
      super_contribution_strategy,
      investment_return_assumption,
      super_return_assumption
    ) VALUES 
    (
      'Max Super + Inheritance Strategy',
      'Maximize super contributions, plan for inheritance, maintain emergency fund',
      'full_time',
      1500000,
      true,
      10000,
      300000,
      2030,
      'mixed',
      60000,
      'max_concessional',
      7.0,
      8.0
    ),
    (
      'Conservative Super Strategy',
      'Standard super contributions with inheritance safety net',
      'full_time',
      1200000,
      false,
      0,
      200000,
      2032,
      'super',
      50000,
      'salary_sacrifice_only',
      6.0,
      7.0
    ),
    (
      'Early Inheritance Scenario',
      'Large inheritance received early, optimize allocation',
      'full_time',
      1800000,
      true,
      15000,
      500000,
      2027,
      'investment',
      75000,
      'max_total',
      7.5,
      8.5
    )
;

    -- Create FIRE projection helper view
    CREATE OR REPLACE VIEW fire_scenario_summary AS
    SELECT 
      s.*,
      hh.total_gross_income as current_household_income,
      hh.total_super_contributions as current_super_contributions,
      nw.net_worth as current_net_worth,
      nw.total_assets as current_total_assets,
      CASE 
        WHEN s.target_fire_amount > 0 AND nw.net_worth > 0 
        THEN ROUND((s.target_fire_amount - nw.net_worth) / s.target_fire_amount * 100, 1)
        ELSE 0 
      END as fire_progress_percentage,
      CASE 
        WHEN s.target_fire_amount > nw.net_worth 
        THEN s.target_fire_amount - nw.net_worth 
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
    WHERE s.is_active = true
    ORDER BY s.created_at DESC;

    -- Create emergency fund view
    CREATE OR REPLACE VIEW emergency_fund_status AS
    SELECT 
      COALESCE(SUM(current_balance), 0) as total_emergency_funds,
      COUNT(*) as emergency_account_count,
      CASE 
        WHEN COALESCE(SUM(current_balance), 0) >= 50000 THEN 'Adequate'
        WHEN COALESCE(SUM(current_balance), 0) >= 25000 THEN 'Moderate'
        ELSE 'Low'
      END as emergency_fund_status,
      50000 as recommended_minimum
    FROM accounts 
    WHERE category = 'emergency' AND is_active = true;
  `;

  try {
    await executeSQL(sql);
    console.log('✅ FIRE scenarios enhanced with super + inheritance planning!');
    
    // Show the new scenario data
    const scenarioQuery = `SELECT name, target_fire_amount, inheritance_amount, inheritance_year, super_contribution_strategy FROM fire_scenario_summary;`;
    const scenarios = await executeSQL(scenarioQuery);
    
    console.log('\n🎯 Enhanced FIRE Scenarios:');
    scenarios.forEach(scenario => {
      console.log(`📊 ${scenario.name}`);
      console.log(`   Target: $${Number(scenario.target_fire_amount).toLocaleString()}`);
      console.log(`   Inheritance: $${Number(scenario.inheritance_amount).toLocaleString()} (${scenario.inheritance_year})`);
      console.log(`   Super Strategy: ${scenario.super_contribution_strategy}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error enhancing scenarios:', error.message);
  }
}

enhanceFIREScenarios().catch(console.error);