-- FIRE Planner Database Schema
-- Create this schema in your Supabase project

-- Enable RLS (Row Level Security) - recommended for production
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create the accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability')),
  category TEXT NOT NULL CHECK (category IN ('bank', 'super', 'investment', 'property', 'loan')),
  current_balance DECIMAL NOT NULL,
  institution TEXT NOT NULL,
  account_number TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create the transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  category TEXT,
  account TEXT NOT NULL, -- Could be foreign key to accounts.id in future
  source TEXT NOT NULL CHECK (source IN ('up_bank', 'manual')),
  up_transaction_id TEXT UNIQUE,
  tags TEXT[],
  notes TEXT
);

-- Create the scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  employment_status TEXT NOT NULL CHECK (employment_status IN ('full_time', 'part_time', 'retired')),
  income_reduction INTEGER DEFAULT 0 CHECK (income_reduction >= 0 AND income_reduction <= 100),
  lump_sum_amount DECIMAL DEFAULT 0 CHECK (lump_sum_amount >= 0),
  lump_sum_allocation TEXT CHECK (lump_sum_allocation IN ('mortgage', 'super', 'investment', 'mixed')),
  property_action TEXT CHECK (property_action IN ('keep', 'sell')),
  target_fire_amount DECIMAL DEFAULT 1250000 CHECK (target_fire_amount > 0),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create the net worth snapshots table
CREATE TABLE IF NOT EXISTS networth_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  quarter TEXT NOT NULL,
  total_assets DECIMAL NOT NULL CHECK (total_assets >= 0),
  total_liabilities DECIMAL NOT NULL CHECK (total_liabilities >= 0),
  net_worth DECIMAL NOT NULL,
  notes TEXT,
  accounts_snapshot JSONB, -- Store snapshot of account balances
  UNIQUE(quarter) -- Only one snapshot per quarter
);

-- Create the projections table (for caching projection results)
CREATE TABLE IF NOT EXISTS projections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
  projection_data JSONB NOT NULL,
  projection_years INTEGER NOT NULL,
  base_net_worth DECIMAL NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours')
);

-- Create the chat_history table (for AI conversations)
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  context JSONB,
  model_used TEXT DEFAULT 'gpt-4'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_category ON accounts(category);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_up_id ON transactions(up_transaction_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_active ON scenarios(is_active);
CREATE INDEX IF NOT EXISTS idx_projections_scenario ON projections(scenario_id);
CREATE INDEX IF NOT EXISTS idx_projections_expires ON projections(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_scenario ON chat_history(scenario_id);
CREATE INDEX IF NOT EXISTS idx_networth_quarter ON networth_snapshots(quarter);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create helpful views
CREATE OR REPLACE VIEW account_summary AS
SELECT 
  type,
  category,
  COUNT(*) as account_count,
  SUM(current_balance) as total_balance,
  AVG(current_balance) as average_balance
FROM accounts 
WHERE is_active = true
GROUP BY type, category
ORDER BY type, category;

CREATE OR REPLACE VIEW current_net_worth AS
SELECT 
  COALESCE(SUM(CASE WHEN type = 'asset' THEN current_balance ELSE 0 END), 0) as total_assets,
  COALESCE(SUM(CASE WHEN type = 'liability' THEN ABS(current_balance) ELSE 0 END), 0) as total_liabilities,
  COALESCE(SUM(CASE WHEN type = 'asset' THEN current_balance ELSE -ABS(current_balance) END), 0) as net_worth
FROM accounts 
WHERE is_active = true;

CREATE OR REPLACE VIEW monthly_cash_flow AS
SELECT 
  DATE_TRUNC('month', date) as month,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
  SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses,
  SUM(amount) as net_cash_flow
FROM transactions
WHERE date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', date)
ORDER BY month DESC;

-- Create function for automatic net worth snapshot
CREATE OR REPLACE FUNCTION create_networth_snapshot()
RETURNS TABLE(
  snapshot_id UUID,
  quarter TEXT,
  total_assets DECIMAL,
  total_liabilities DECIMAL,
  net_worth DECIMAL
) AS $$
DECLARE
  current_quarter TEXT;
  assets_total DECIMAL;
  liabilities_total DECIMAL;
  net_worth_total DECIMAL;
  snapshot_record RECORD;
  accounts_data JSONB;
BEGIN
  -- Generate current quarter string
  current_quarter := TO_CHAR(NOW(), 'YYYY-"Q"Q');
  
  -- Get current account balances
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'asset' THEN current_balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'liability' THEN ABS(current_balance) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'asset' THEN current_balance ELSE -ABS(current_balance) END), 0)
  INTO assets_total, liabilities_total, net_worth_total
  FROM accounts 
  WHERE is_active = true;
  
  -- Create accounts snapshot
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'type', type,
      'category', category,
      'balance', current_balance,
      'institution', institution
    )
  ) INTO accounts_data
  FROM accounts 
  WHERE is_active = true;
  
  -- Insert or update snapshot
  INSERT INTO networth_snapshots (quarter, total_assets, total_liabilities, net_worth, accounts_snapshot)
  VALUES (current_quarter, assets_total, liabilities_total, net_worth_total, accounts_data)
  ON CONFLICT (quarter) 
  DO UPDATE SET 
    total_assets = EXCLUDED.total_assets,
    total_liabilities = EXCLUDED.total_liabilities,
    net_worth = EXCLUDED.net_worth,
    accounts_snapshot = EXCLUDED.accounts_snapshot,
    created_at = timezone('utc'::text, now())
  RETURNING * INTO snapshot_record;
  
  RETURN QUERY SELECT 
    snapshot_record.id,
    snapshot_record.quarter,
    snapshot_record.total_assets,
    snapshot_record.total_liabilities,
    snapshot_record.net_worth;
END;
$$ LANGUAGE plpgsql;