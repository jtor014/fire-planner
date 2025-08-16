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

async function createSuperPlannerSchema() {
  console.log('🚀 Creating Super Planner focused database schema...');
  
  try {
    const sql = `
      -- Drop legacy tables we don't need for Super Planner
      DROP TABLE IF EXISTS household_income_imports CASCADE;
      DROP TABLE IF EXISTS household_members CASCADE;
      DROP TABLE IF EXISTS property_equity CASCADE;
      DROP VIEW IF EXISTS household_income_summary CASCADE;
      DROP VIEW IF EXISTS emergency_fund_status CASCADE;
      
      -- Create baseline settings table for couple's super data
      CREATE TABLE IF NOT EXISTS baseline_settings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        -- Person 1 (Primary)
        person1_name TEXT NOT NULL DEFAULT 'Person 1',
        person1_current_balance DECIMAL NOT NULL DEFAULT 0,
        person1_annual_contribution DECIMAL NOT NULL DEFAULT 0,
        person1_age INTEGER NOT NULL DEFAULT 35,
        
        -- Person 2 (Partner)
        person2_name TEXT NOT NULL DEFAULT 'Person 2',
        person2_current_balance DECIMAL NOT NULL DEFAULT 0,
        person2_annual_contribution DECIMAL NOT NULL DEFAULT 0,
        person2_age INTEGER NOT NULL DEFAULT 35,
        
        -- Investment assumptions
        expected_return_mean DECIMAL NOT NULL DEFAULT 7.0,
        expected_return_volatility DECIMAL NOT NULL DEFAULT 15.0,
        safe_withdrawal_rate DECIMAL NOT NULL DEFAULT 4.0,
        inflation_rate DECIMAL NOT NULL DEFAULT 2.5,
        
        CONSTRAINT valid_return_mean CHECK (expected_return_mean >= 0 AND expected_return_mean <= 20),
        CONSTRAINT valid_volatility CHECK (expected_return_volatility >= 0 AND expected_return_volatility <= 50),
        CONSTRAINT valid_withdrawal_rate CHECK (safe_withdrawal_rate > 0 AND safe_withdrawal_rate <= 10),
        CONSTRAINT valid_ages CHECK (person1_age > 0 AND person2_age > 0)
      );

      -- Ensure only one baseline settings record (singleton)
      CREATE UNIQUE INDEX IF NOT EXISTS baseline_settings_singleton ON baseline_settings ((1));

      -- Create scenarios table for super planning
      CREATE TABLE IF NOT EXISTS super_scenarios (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        
        -- Scenario mode: 'target_income' or 'target_date'
        mode TEXT NOT NULL CHECK (mode IN ('target_income', 'target_date')),
        
        -- For target_income mode
        target_annual_income DECIMAL,
        
        -- For target_date mode
        target_retirement_date DATE,
        
        -- Simulation settings
        monte_carlo_runs INTEGER DEFAULT 1000,
        
        CONSTRAINT valid_mode_data CHECK (
          (mode = 'target_income' AND target_annual_income > 0) OR
          (mode = 'target_date' AND target_retirement_date IS NOT NULL)
        )
      );

      -- Create lump sum events table
      CREATE TABLE IF NOT EXISTS lumpsum_events (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        scenario_id UUID NOT NULL REFERENCES super_scenarios(id) ON DELETE CASCADE,
        
        name TEXT NOT NULL,
        amount DECIMAL NOT NULL CHECK (amount > 0),
        event_date DATE NOT NULL,
        
        -- Allocation strategy: 'super', 'mortgage_payoff', 'taxable_investment'
        allocation_strategy TEXT NOT NULL CHECK (allocation_strategy IN ('super', 'mortgage_payoff', 'taxable_investment')),
        
        -- Split between person1 and person2 for super contributions (percentages)
        person1_split DECIMAL DEFAULT 50 CHECK (person1_split >= 0 AND person1_split <= 100),
        person2_split DECIMAL DEFAULT 50 CHECK (person2_split >= 0 AND person2_split <= 100),
        
        CONSTRAINT valid_split CHECK (person1_split + person2_split = 100)
      );

      -- Create simulation results cache table
      CREATE TABLE IF NOT EXISTS simulation_results (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        scenario_id UUID NOT NULL REFERENCES super_scenarios(id) ON DELETE CASCADE,
        baseline_hash TEXT NOT NULL, -- Hash of baseline settings for cache invalidation
        
        -- Simulation outputs
        median_retirement_year INTEGER,
        percentile_10_retirement_year INTEGER,
        percentile_90_retirement_year INTEGER,
        median_final_income DECIMAL,
        percentile_10_final_income DECIMAL,
        percentile_90_final_income DECIMAL,
        
        -- Time series data (JSON)
        yearly_projections JSONB, -- Median, p10, p90 for each year
        distribution_data JSONB,  -- Histogram data for charts
        
        UNIQUE(scenario_id, baseline_hash)
      );

      -- Create updated triggers
      CREATE OR REPLACE FUNCTION update_baseline_settings_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION update_super_scenarios_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS baseline_settings_updated_at ON baseline_settings;
      CREATE TRIGGER baseline_settings_updated_at
        BEFORE UPDATE ON baseline_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_baseline_settings_updated_at();

      DROP TRIGGER IF EXISTS super_scenarios_updated_at ON super_scenarios;
      CREATE TRIGGER super_scenarios_updated_at
        BEFORE UPDATE ON super_scenarios
        FOR EACH ROW
        EXECUTE FUNCTION update_super_scenarios_updated_at();

      -- Insert default baseline settings
      INSERT INTO baseline_settings (
        person1_name, person1_current_balance, person1_annual_contribution, person1_age,
        person2_name, person2_current_balance, person2_annual_contribution, person2_age,
        expected_return_mean, expected_return_volatility, safe_withdrawal_rate
      ) VALUES (
        'Josh', 116289, 25000, 35,
        'Nancy', 96000, 25000, 33,
        7.5, 15.0, 3.5
      ) ON CONFLICT DO NOTHING;

      -- Insert sample scenarios
      INSERT INTO super_scenarios (name, description, mode, target_annual_income) VALUES
      ('Target $80k Income', 'Conservative retirement lifestyle', 'target_income', 80000),
      ('Target $120k Income', 'Comfortable retirement lifestyle', 'target_income', 120000)
      ON CONFLICT DO NOTHING;

      INSERT INTO super_scenarios (name, description, mode, target_retirement_date) VALUES
      ('Retire at 60', 'Traditional retirement age', 'target_date', '2050-01-01'),
      ('Early Retirement at 55', 'FIRE goal', 'target_date', '2045-01-01')
      ON CONFLICT DO NOTHING;
    `;
    
    await executeSQL(sql);
    console.log('✅ Super Planner schema created successfully!');
    
    // Show the new structure
    const tables = await executeSQL(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns 
              WHERE table_name = t.table_name AND table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('baseline_settings', 'super_scenarios', 'lumpsum_events', 'simulation_results')
      ORDER BY table_name;
    `);
    
    console.log('\n📊 New Super Planner tables:');
    tables.forEach(table => {
      console.log(`  📋 ${table.table_name}: ${table.column_count} columns`);
    });
    
    // Show sample data
    const baselineCount = await executeSQL('SELECT COUNT(*) as count FROM baseline_settings;');
    const scenarioCount = await executeSQL('SELECT COUNT(*) as count FROM super_scenarios;');
    
    console.log('\n📈 Sample data loaded:');
    console.log(`  👥 Baseline settings: ${baselineCount[0].count} record`);
    console.log(`  🎯 Scenarios: ${scenarioCount[0].count} scenarios`);
    console.log('\n🎉 Super Planner database ready!');
    
  } catch (error) {
    console.error('❌ Error creating schema:', error.message);
  }
}

createSuperPlannerSchema().catch(console.error);