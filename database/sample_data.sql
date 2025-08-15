-- FIRE Planner Sample Data
-- Run this after creating the schema to populate with realistic test data

-- Insert sample accounts
INSERT INTO accounts (name, type, category, current_balance, institution, account_number) VALUES
-- Assets
('Up Everyday Account', 'asset', 'bank', 15000.00, 'Up Bank', 'up-12345678'),
('Up Savings Account', 'asset', 'bank', 85000.00, 'Up Bank', 'up-87654321'),
('Bendigo Term Deposit', 'asset', 'bank', 50000.00, 'Bendigo Bank', 'bd-11111111'),
('Hostplus Super', 'asset', 'super', 180000.00, 'Hostplus', 'hp-12345'),
('Partner Hostplus Super', 'asset', 'super', 95000.00, 'Hostplus', 'hp-67890'),
('Stake Portfolio', 'asset', 'investment', 45000.00, 'Stake', 'stk-001'),
('Pearler Portfolio', 'asset', 'investment', 32000.00, 'Pearler', 'prl-001'),
('Investment Property', 'asset', 'property', 650000.00, 'N/A', 'prop-001'),
('PPOR (Principal Residence)', 'asset', 'property', 850000.00, 'N/A', 'prop-002'),

-- Liabilities
('Home Loan - PPOR', 'liability', 'loan', -420000.00, 'Bendigo Bank', 'bd-loan-001'),
('Investment Property Loan', 'liability', 'loan', -520000.00, 'Bendigo Bank', 'bd-loan-002'),
('Credit Card', 'liability', 'loan', -2500.00, 'Up Bank', 'up-cc-001');

-- Insert sample transactions (last 30 days)
INSERT INTO transactions (date, description, amount, category, account, source, up_transaction_id) VALUES
-- Recent Up Bank transactions
(CURRENT_DATE - 1, 'Salary Credit', 4500.00, 'salary', 'up-12345678', 'up_bank', 'up-tx-001'),
(CURRENT_DATE - 1, 'Rent Payment', -650.00, 'housing', 'up-12345678', 'up_bank', 'up-tx-002'),
(CURRENT_DATE - 2, 'Grocery Shopping - Coles', -120.50, 'groceries', 'up-12345678', 'up_bank', 'up-tx-003'),
(CURRENT_DATE - 3, 'Fuel - Shell', -85.00, 'transport', 'up-12345678', 'up_bank', 'up-tx-004'),
(CURRENT_DATE - 5, 'Coffee - Local Cafe', -4.50, 'dining', 'up-12345678', 'up_bank', 'up-tx-005'),
(CURRENT_DATE - 7, 'Netflix Subscription', -19.99, 'entertainment', 'up-12345678', 'up_bank', 'up-tx-006'),
(CURRENT_DATE - 10, 'Pharmacy', -35.80, 'health', 'up-12345678', 'up_bank', 'up-tx-007'),
(CURRENT_DATE - 12, 'Transfer to Savings', -2000.00, 'transfer', 'up-12345678', 'up_bank', 'up-tx-008'),
(CURRENT_DATE - 15, 'Partner Salary Credit', 3800.00, 'salary', 'up-12345678', 'up_bank', 'up-tx-009'),
(CURRENT_DATE - 18, 'Electricity Bill', -180.00, 'utilities', 'up-12345678', 'up_bank', 'up-tx-010'),
(CURRENT_DATE - 20, 'Internet Bill', -89.00, 'utilities', 'up-12345678', 'up_bank', 'up-tx-011'),
(CURRENT_DATE - 22, 'Dinner Out', -95.00, 'dining', 'up-12345678', 'up_bank', 'up-tx-012'),
(CURRENT_DATE - 25, 'Grocery Shopping - Woolworths', -145.30, 'groceries', 'up-12345678', 'up_bank', 'up-tx-013'),
(CURRENT_DATE - 28, 'Gym Membership', -49.90, 'health', 'up-12345678', 'up_bank', 'up-tx-014'),

-- Manual transactions for other accounts
(CURRENT_DATE - 1, 'Rental Income', 580.00, 'rental', 'up-12345678', 'manual', NULL),
(CURRENT_DATE - 1, 'Home Loan Payment', -2100.00, 'mortgage', 'bd-loan-001', 'manual', NULL),
(CURRENT_DATE - 1, 'Investment Loan Payment', -2650.00, 'mortgage', 'bd-loan-002', 'manual', NULL),
(CURRENT_DATE - 15, 'Super Contribution', 450.00, 'super', 'hp-12345', 'manual', NULL),
(CURRENT_DATE - 15, 'Partner Super Contribution', 380.00, 'super', 'hp-67890', 'manual', NULL),
(CURRENT_DATE - 10, 'Share Portfolio Dividend', 280.00, 'dividends', 'stk-001', 'manual', NULL),
(CURRENT_DATE - 5, 'ETF Distribution', 120.00, 'dividends', 'prl-001', 'manual', NULL);

-- Insert sample scenarios
INSERT INTO scenarios (name, description, employment_status, income_reduction, lump_sum_amount, lump_sum_allocation, property_action, target_fire_amount) VALUES
('Current Path', 'Continue with current employment and savings rate', 'full_time', 0, 0, NULL, 'keep', 1250000),
('Semi-Retirement at 50', 'Reduce to part-time work at age 50, maintain property', 'part_time', 40, 0, NULL, 'keep', 1000000),
('Sell & Simplify', 'Sell investment property and focus on shares + super', 'full_time', 0, 130000, 'mixed', 'sell', 1250000),
('Early Retirement Boost', 'Inheritance lump sum invested in super for early retirement', 'full_time', 0, 200000, 'super', 'keep', 1500000),
('Aggressive FIRE', 'Maximize mortgage payments then aggressive investing', 'full_time', 0, 50000, 'mortgage', 'keep', 1000000);

-- Create initial net worth snapshot for current quarter
SELECT create_networth_snapshot();

-- Insert some sample chat history
INSERT INTO chat_history (scenario_id, question, answer, context, model_used) 
SELECT 
  s.id,
  'Should I pay extra on my mortgage or invest in the share market?',
  'Given your current situation with investment property loans at ~6% interest rates and the potential for share market returns of 7-10% over the long term, here''s my analysis:

**Pros of Extra Mortgage Payments:**
- Guaranteed 6% "return" by reducing interest
- Reduces financial stress and improves cash flow
- Tax benefits are limited for PPOR mortgage

**Pros of Share Market Investing:**
- Historically higher returns (7-10% long term)
- Greater liquidity and flexibility  
- Compound growth potential
- Franking credits provide tax benefits

**My Recommendation:**
Consider a balanced approach: pay some extra on your PPOR mortgage for peace of mind, but prioritize investing surplus funds in a diversified ETF portfolio. Your investment property loan interest remains tax-deductible, so focus extra payments on the non-deductible PPOR loan first.

**Next Steps:**
1. Build emergency fund (3-6 months expenses)
2. Extra $500/month on PPOR mortgage
3. Remaining surplus into low-cost ETFs (VAS/VGS mix)
4. Review annually and adjust based on interest rates',
  jsonb_build_object(
    'net_worth', 1000000,
    'mortgage_balance', 420000,
    'investment_balance', 77000
  ),
  'gpt-4'
FROM scenarios s WHERE s.name = 'Current Path'
LIMIT 1;

-- Insert projection cache for the current path scenario
INSERT INTO projections (scenario_id, projection_data, projection_years, base_net_worth)
SELECT 
  s.id,
  jsonb_build_array(
    jsonb_build_object('year', 0, 'age', 35, 'netWorth', 1062000, 'superBalance', 275000, 'fireProgress', 85.0),
    jsonb_build_object('year', 1, 'age', 36, 'netWorth', 1145000, 'superBalance', 295000, 'fireProgress', 91.6),
    jsonb_build_object('year', 5, 'age', 40, 'netWorth', 1580000, 'superBalance', 385000, 'fireProgress', 126.4),
    jsonb_build_object('year', 10, 'age', 45, 'netWorth', 2280000, 'superBalance', 520000, 'fireProgress', 182.4),
    jsonb_build_object('year', 15, 'age', 50, 'netWorth', 3200000, 'superBalance', 720000, 'fireProgress', 256.0)
  ),
  30,
  1062000
FROM scenarios s WHERE s.name = 'Current Path'
LIMIT 1;

-- Update account balances to reflect current market conditions
UPDATE accounts SET current_balance = current_balance * 1.02 WHERE category = 'investment';
UPDATE accounts SET current_balance = current_balance * 1.05 WHERE category = 'super';
UPDATE accounts SET current_balance = current_balance * 1.03 WHERE category = 'property';