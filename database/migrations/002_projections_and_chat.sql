-- Migration 002: Add Projections and Chat History
-- Created: 2024-01-02
-- Description: Adds projection caching and chat history tables

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

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_projections_scenario ON projections(scenario_id);
CREATE INDEX IF NOT EXISTS idx_projections_expires ON projections(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_scenario ON chat_history(scenario_id);

-- Create additional helpful views
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