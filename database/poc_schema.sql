-- FIRE Planner POC Schema
-- Simplified version for testing with You + Partner + Super

-- Household setup
CREATE TABLE IF NOT EXISTS households_poc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  household_name TEXT NOT NULL DEFAULT 'Our FIRE Journey',
  fire_target_amount DECIMAL DEFAULT 1250000,
  target_retirement_age INTEGER DEFAULT 60
);

-- Household members (You + Partner)
CREATE TABLE IF NOT EXISTS household_members_poc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households_poc(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,  -- 'Me', 'Partner'
  member_role TEXT CHECK (member_role IN ('primary', 'partner')),
  current_age INTEGER CHECK (current_age BETWEEN 18 AND 100),
  target_retirement_age INTEGER DEFAULT 60,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PayCalculator imports (simplified)
CREATE TABLE IF NOT EXISTS paycalc_imports_poc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_member_id UUID REFERENCES household_members_poc(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Import details
  import_name TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  
  -- Key financial data from PayCalculator
  gross_annual_income DECIMAL NOT NULL,
  taxable_income_annual DECIMAL NOT NULL,
  total_tax_annual DECIMAL NOT NULL,
  take_home_annually DECIMAL NOT NULL,
  
  -- Super data from PayCalculator
  super_guarantee_annual DECIMAL NOT NULL,
  salary_sacrifice_super_annual DECIMAL DEFAULT 0,
  total_super_contributions_annual DECIMAL NOT NULL,
  
  -- Investment property (if applicable)
  investment_property_net_result DECIMAL DEFAULT 0,
  
  is_current BOOLEAN DEFAULT TRUE,
  
  -- Only one current per member
  EXCLUDE (household_member_id WITH =) WHERE (is_current = true)
);

-- Super fund balances
CREATE TABLE IF NOT EXISTS super_balances_poc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_member_id UUID REFERENCES household_members_poc(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Super fund details
  fund_name TEXT NOT NULL DEFAULT 'Main Super Fund',
  current_balance DECIMAL NOT NULL DEFAULT 0,
  balance_date DATE DEFAULT CURRENT_DATE,
  
  -- Growth assumptions
  assumed_annual_return DECIMAL DEFAULT 0.07, -- 7%
  annual_fees DECIMAL DEFAULT 0.007, -- 0.7%
  
  -- Preservation details
  preservation_age INTEGER DEFAULT 60,
  
  is_current BOOLEAN DEFAULT TRUE,
  
  -- Only one current balance per member
  EXCLUDE (household_member_id WITH =) WHERE (is_current = true)
);

-- Mortgage data (simplified)
CREATE TABLE IF NOT EXISTS mortgage_imports_poc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households_poc(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Import details
  loan_name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  
  -- Key mortgage data from Mortgage Monster
  current_property_value DECIMAL NOT NULL,
  current_loan_balance DECIMAL NOT NULL,
  current_equity DECIMAL NOT NULL,
  current_lvr DECIMAL NOT NULL,
  
  -- Payoff projections
  loan_payoff_date DATE,
  loan_payoff_year INTEGER,
  break_even_date DATE,
  break_even_year INTEGER,
  
  -- Estimated monthly mortgage payment
  estimated_monthly_payment DECIMAL DEFAULT 0,
  
  is_current BOOLEAN DEFAULT TRUE,
  
  -- Only one current mortgage
  EXCLUDE (household_id WITH =) WHERE (is_current = true)
);

-- Simple FIRE projections combining all data
CREATE TABLE IF NOT EXISTS fire_projections_poc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households_poc(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Projection metadata
  scenario_name TEXT DEFAULT 'Base Case',
  projection_years INTEGER DEFAULT 35,
  
  -- Current position
  current_combined_income DECIMAL NOT NULL,
  current_combined_take_home DECIMAL NOT NULL,
  current_combined_super_balance DECIMAL NOT NULL,
  current_property_equity DECIMAL NOT NULL,
  current_net_worth DECIMAL NOT NULL,
  
  -- Key milestones
  super_preservation_year INTEGER, -- When super becomes accessible
  loan_payoff_year INTEGER,        -- When mortgage is paid off
  fire_achievement_year INTEGER,   -- When FIRE target reached
  
  -- Super projections
  super_balance_at_preservation DECIMAL, -- Super balance at age 60
  super_balance_at_fire DECIMAL,         -- Super balance when FIRE achieved
  
  -- Year-by-year projections (simplified)
  yearly_projections JSONB NOT NULL,
  /* Structure:
  [
    {
      "year": 0,
      "primary_age": 35,
      "partner_age": 33,
      "combined_income": 180000,
      "combined_take_home": 140000,
      "combined_super_contributions": 45000,
      "combined_super_balance": 350000,
      "property_equity": 200000,
      "mortgage_payment": 36000,
      "net_worth": 550000,
      "fire_progress": 44.0
    }
  ]
  */
  
  expires_at TIMESTAMP DEFAULT (NOW() + interval '7 days')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_paycalc_poc_member ON paycalc_imports_poc(household_member_id);
CREATE INDEX IF NOT EXISTS idx_super_poc_member ON super_balances_poc(household_member_id);
CREATE INDEX IF NOT EXISTS idx_fire_poc_household ON fire_projections_poc(household_id);