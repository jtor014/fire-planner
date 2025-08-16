#!/usr/bin/env node

// Add household income tracking tables
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

async function addHouseholdTables() {
  console.log('🏠 Adding household income tracking tables...');
  
  const sql = `
    -- Create household members table
    CREATE TABLE IF NOT EXISTS household_members (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK (role IN ('primary', 'partner', 'other')) DEFAULT 'primary',
      is_active BOOLEAN DEFAULT TRUE
    );

    -- Create household income imports table
    CREATE TABLE IF NOT EXISTS household_income_imports (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      household_member_id UUID REFERENCES household_members(id) ON DELETE CASCADE,
      financial_year TEXT NOT NULL,
      import_filename TEXT NOT NULL,
      
      -- Income data
      gross_annual_income DECIMAL NOT NULL,
      taxable_income_annual DECIMAL,
      total_tax_annual DECIMAL,
      take_home_annually DECIMAL,
      
      -- Super data
      super_guarantee_annual DECIMAL DEFAULT 0,
      salary_sacrifice_super_annual DECIMAL DEFAULT 0,
      total_super_contributions_annual DECIMAL DEFAULT 0,
      
      -- Other data
      investment_property_net_result DECIMAL DEFAULT 0,
      has_student_loan BOOLEAN DEFAULT FALSE,
      effective_tax_rate DECIMAL DEFAULT 0,
      
      -- Import metadata
      import_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      notes TEXT,
      
      UNIQUE(household_member_id, financial_year)
    );

    -- Create household income summary view
    CREATE OR REPLACE VIEW household_income_summary AS
    SELECT 
      financial_year,
      COUNT(*) as member_count,
      SUM(gross_annual_income) as total_gross_income,
      SUM(take_home_annually) as total_take_home,
      SUM(total_tax_annual) as total_tax_paid,
      SUM(total_super_contributions_annual) as total_super_contributions,
      SUM(investment_property_net_result) as total_investment_property,
      AVG(effective_tax_rate) as average_tax_rate,
      MAX(import_date) as last_updated
    FROM household_income_imports hii
    JOIN household_members hm ON hii.household_member_id = hm.id
    WHERE hm.is_active = true
    GROUP BY financial_year
    ORDER BY financial_year DESC;

    -- Create individual member income view
    CREATE OR REPLACE VIEW member_income_summary AS
    SELECT 
      hm.name as member_name,
      hm.role as member_role,
      hii.financial_year,
      hii.gross_annual_income,
      hii.take_home_annually,
      hii.total_tax_annual,
      hii.total_super_contributions_annual,
      hii.investment_property_net_result,
      hii.effective_tax_rate,
      hii.import_date
    FROM household_income_imports hii
    JOIN household_members hm ON hii.household_member_id = hm.id
    WHERE hm.is_active = true
    ORDER BY hii.financial_year DESC, hm.name;

    -- Add indexes
    CREATE INDEX IF NOT EXISTS idx_household_members_active ON household_members(is_active);
    CREATE INDEX IF NOT EXISTS idx_household_income_year ON household_income_imports(financial_year);
    CREATE INDEX IF NOT EXISTS idx_household_income_member ON household_income_imports(household_member_id);

    -- Add updated_at trigger for household_members
    CREATE TRIGGER update_household_members_updated_at BEFORE UPDATE ON household_members
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    await executeSQL(sql);
    console.log('✅ Household income tables created successfully!');
    
    // Add default household members
    const defaultMembers = `
      INSERT INTO household_members (name, role) VALUES 
      ('Primary Earner', 'primary'),
      ('Partner', 'partner')
      ON CONFLICT DO NOTHING;
    `;
    
    await executeSQL(defaultMembers);
    console.log('✅ Default household members added!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  }
}

addHouseholdTables().catch(console.error);