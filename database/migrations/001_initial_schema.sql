-- Migration 001: Initial FIRE Planner Schema
-- Created: 2024-01-01
-- Description: Creates the initial database schema for FIRE Planner

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
  account TEXT NOT NULL,
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
  accounts_snapshot JSONB,
  UNIQUE(quarter)
);

-- Create initial indexes
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_category ON accounts(category);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_up_id ON transactions(up_transaction_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_active ON scenarios(is_active);
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

-- Create basic views
CREATE OR REPLACE VIEW current_net_worth AS
SELECT 
  COALESCE(SUM(CASE WHEN type = 'asset' THEN current_balance ELSE 0 END), 0) as total_assets,
  COALESCE(SUM(CASE WHEN type = 'liability' THEN ABS(current_balance) ELSE 0 END), 0) as total_liabilities,
  COALESCE(SUM(CASE WHEN type = 'asset' THEN current_balance ELSE -ABS(current_balance) END), 0) as net_worth
FROM accounts 
WHERE is_active = true;