#!/usr/bin/env node

// Add sample data for testing the FIRE Planner
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function addSampleData() {
  console.log('🔄 Adding sample data to FIRE Planner...');
  
  // Read environment variables
  let supabaseUrl, supabaseKey;
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const urlMatch = envContent.match(/SUPABASE_URL=(.+)/);
    const keyMatch = envContent.match(/SUPABASE_SERVICE_KEY=(.+)/);
    
    supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
    supabaseKey = keyMatch ? keyMatch[1].trim() : null;
  } catch (error) {
    console.error('❌ Could not read .env.local file');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await supabase.from('accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('scenarios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Add sample accounts
    console.log('💰 Adding sample accounts...');
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .insert([
        {
          name: 'ANZ Savings Account',
          type: 'asset',
          category: 'bank',
          current_balance: 45000,
          institution: 'ANZ',
          account_number: '****1234'
        },
        {
          name: 'Commonwealth Super',
          type: 'asset',
          category: 'super',
          current_balance: 280000,
          institution: 'Commonwealth Super',
          account_number: '****5678'
        },
        {
          name: 'Vanguard ETFs',
          type: 'asset',
          category: 'investment',
          current_balance: 125000,
          institution: 'Vanguard',
          account_number: '****9012'
        },
        {
          name: 'Home Property',
          type: 'asset',
          category: 'property',
          current_balance: 850000,
          institution: 'Self-owned',
          account_number: '123 Fire Street'
        },
        {
          name: 'Home Mortgage',
          type: 'liability',
          category: 'loan',
          current_balance: -320000,
          institution: 'Westpac',
          account_number: '****3456'
        },
        {
          name: 'Credit Card',
          type: 'liability',
          category: 'loan',
          current_balance: -2500,
          institution: 'ANZ',
          account_number: '****7890'
        }
      ])
      .select();
    
    if (accountsError) {
      console.error('❌ Failed to add accounts:', accountsError);
      return;
    }
    
    console.log(`✅ Added ${accounts.length} accounts`);
    
    // Add sample transactions
    console.log('📝 Adding sample transactions...');
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .insert([
        {
          date: '2025-08-15',
          description: 'Salary Payment',
          amount: 5500,
          category: 'Income',
          account: 'ANZ Savings Account',
          source: 'manual'
        },
        {
          date: '2025-08-14',
          description: 'Grocery Shopping',
          amount: -180.50,
          category: 'Food',
          account: 'ANZ Savings Account',
          source: 'manual'
        },
        {
          date: '2025-08-13',
          description: 'Investment Purchase',
          amount: -2000,
          category: 'Investment',
          account: 'ANZ Savings Account',
          source: 'manual'
        },
        {
          date: '2025-08-12',
          description: 'Mortgage Payment',
          amount: -2400,
          category: 'Housing',
          account: 'ANZ Savings Account',
          source: 'manual'
        },
        {
          date: '2025-08-11',
          description: 'Electricity Bill',
          amount: -120,
          category: 'Utilities',
          account: 'ANZ Savings Account',
          source: 'manual'
        }
      ])
      .select();
    
    if (transError) {
      console.error('❌ Failed to add transactions:', transError);
      return;
    }
    
    console.log(`✅ Added ${transactions.length} transactions`);
    
    // Add sample scenarios
    console.log('🎯 Adding sample scenarios...');
    const { data: scenarios, error: scenarioError } = await supabase
      .from('scenarios')
      .insert([
        {
          name: 'Early Retirement at 50',
          description: 'Aggressive savings and investment strategy to retire by age 50',
          employment_status: 'full_time',
          income_reduction: 0,
          lump_sum_amount: 0,
          property_action: 'keep',
          target_fire_amount: 1500000
        },
        {
          name: 'Semi-Retirement at 55',
          description: 'Reduce to part-time work at 55 with investment income',
          employment_status: 'part_time',
          income_reduction: 50,
          lump_sum_amount: 50000,
          lump_sum_allocation: 'super',
          property_action: 'keep',
          target_fire_amount: 1000000
        },
        {
          name: 'Coast FIRE Strategy',
          description: 'Let compound interest do the work until 65',
          employment_status: 'full_time',
          income_reduction: 0,
          lump_sum_amount: 0,
          property_action: 'keep',
          target_fire_amount: 800000
        }
      ])
      .select();
    
    if (scenarioError) {
      console.error('❌ Failed to add scenarios:', scenarioError);
      return;
    }
    
    console.log(`✅ Added ${scenarios.length} scenarios`);
    
    // Calculate summary
    const totalAssets = accounts
      .filter(acc => acc.type === 'asset')
      .reduce((sum, acc) => sum + acc.current_balance, 0);
    
    const totalLiabilities = accounts
      .filter(acc => acc.type === 'liability')
      .reduce((sum, acc) => sum + Math.abs(acc.current_balance), 0);
    
    const netWorth = totalAssets - totalLiabilities;
    
    console.log('\n📊 Sample Data Summary:');
    console.log(`💰 Total Assets: $${totalAssets.toLocaleString()}`);
    console.log(`💳 Total Liabilities: $${totalLiabilities.toLocaleString()}`);
    console.log(`💎 Net Worth: $${netWorth.toLocaleString()}`);
    console.log(`📈 ${transactions.length} transactions added`);
    console.log(`🎯 ${scenarios.length} FIRE scenarios created`);
    
    console.log('\n🎉 Sample data successfully added!');
    console.log('🌐 Visit http://localhost:3001 to see your FIRE Planner dashboard');
    
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
    process.exit(1);
  }
}

addSampleData().catch(console.error);