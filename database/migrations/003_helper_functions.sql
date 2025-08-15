-- Migration 003: Helper Functions and Procedures
-- Created: 2024-01-03
-- Description: Adds utility functions for automated operations

-- Function for automatic net worth snapshot creation
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

-- Function to clean up old projections
CREATE OR REPLACE FUNCTION cleanup_expired_projections()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM projections 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get account balance history (for charts)
CREATE OR REPLACE FUNCTION get_net_worth_history(months_back INTEGER DEFAULT 12)
RETURNS TABLE(
  period TEXT,
  total_assets DECIMAL,
  total_liabilities DECIMAL,
  net_worth DECIMAL,
  growth_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH snapshot_data AS (
    SELECT 
      ns.quarter,
      ns.total_assets,
      ns.total_liabilities,
      ns.net_worth,
      ns.created_at,
      LAG(ns.net_worth) OVER (ORDER BY ns.created_at) as previous_net_worth
    FROM networth_snapshots ns
    WHERE ns.created_at >= (CURRENT_DATE - INTERVAL '1 month' * months_back)
    ORDER BY ns.created_at
  )
  SELECT 
    sd.quarter,
    sd.total_assets,
    sd.total_liabilities,
    sd.net_worth,
    CASE 
      WHEN sd.previous_net_worth IS NOT NULL AND sd.previous_net_worth > 0 
      THEN ROUND(((sd.net_worth - sd.previous_net_worth) / sd.previous_net_worth * 100)::NUMERIC, 2)
      ELSE 0::DECIMAL
    END as growth_rate
  FROM snapshot_data sd;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate FIRE progress for a given net worth
CREATE OR REPLACE FUNCTION calculate_fire_progress(
  current_net_worth DECIMAL,
  target_amount DECIMAL DEFAULT 1250000
)
RETURNS DECIMAL AS $$
BEGIN
  IF target_amount <= 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((current_net_worth / target_amount * 100)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql;