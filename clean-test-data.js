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

async function cleanTestData() {
  console.log('🧹 Cleaning test data to show only real imported data...');
  
  try {
    // First, let's see what household members we have
    const members = await executeSQL('SELECT * FROM household_members ORDER BY created_at;');
    console.log('👥 Current household members:');
    members.forEach(m => {
      console.log(`  - ${m.name} (${m.role}) - ${m.is_active ? 'Active' : 'Inactive'}`);
    });
    
    // Remove test household members (keep only Josh and identify spouse)
    console.log('\n🗑️ Removing test household members...');
    const removeTestMembers = `
      DELETE FROM household_income_imports 
      WHERE household_member_id IN (
        SELECT id FROM household_members 
        WHERE name IN ('John Smith', 'Sarah Smith', 'Nancy', 'Primary Earner', 'Partner')
      );
      
      DELETE FROM household_members 
      WHERE name IN ('John Smith', 'Sarah Smith', 'Nancy', 'Primary Earner', 'Partner');
    `;
    await executeSQL(removeTestMembers);
    console.log('✅ Test household members removed');
    
    // Remove all sample accounts (since you haven't added real ones yet)
    console.log('\n🗑️ Removing sample accounts...');
    const removeAccounts = `
      DELETE FROM networth_snapshots;
      DELETE FROM accounts;
    `;
    await executeSQL(removeAccounts);
    console.log('✅ Sample accounts removed');
    
    // Clear sample scenarios (we'll keep the structure but remove specific test scenarios)
    console.log('\n🗑️ Removing test scenarios...');
    const removeScenarios = `
      DELETE FROM scenarios 
      WHERE name IN ('Early Retirement at 50', 'Semi-Retirement at 55', 'Coast FIRE Strategy');
    `;
    await executeSQL(removeScenarios);
    console.log('✅ Test scenarios removed');
    
    // Create a fresh net worth snapshot with zero values
    console.log('\n📊 Creating clean net worth snapshot...');
    const currentQuarter = '2025-Q3';
    const createSnapshot = `
      INSERT INTO networth_snapshots (quarter, total_assets, total_liabilities, net_worth, notes)
      VALUES ('${currentQuarter}', 0, 0, 0, 'Clean slate - ready for real account data');
    `;
    await executeSQL(createSnapshot);
    console.log('✅ Clean net worth snapshot created');
    
    // Show remaining clean data
    console.log('\n✨ Remaining real data:');
    const remainingMembers = await executeSQL('SELECT * FROM household_members WHERE is_active = true;');
    console.log('👥 Real household members:');
    remainingMembers.forEach(m => {
      console.log(`  - ${m.name} (${m.role})`);
    });
    
    const remainingIncome = await executeSQL(`
      SELECT hm.name, hm.role, hi.financial_year, hi.gross_annual_income, hi.total_super_contributions_annual
      FROM household_income_imports hi
      JOIN household_members hm ON hi.household_member_id = hm.id
      ORDER BY hi.financial_year DESC, hm.name;
    `);
    
    console.log('\n💰 Real income data:');
    remainingIncome.forEach(r => {
      console.log(`  - ${r.name} (${r.role}): $${Number(r.gross_annual_income).toLocaleString()} income, $${Number(r.total_super_contributions_annual).toLocaleString()} super (${r.financial_year})`);
    });
    
    // Calculate clean totals
    const currentYearIncome = remainingIncome.filter(r => r.financial_year === '2025 - 2026');
    const totalHouseholdIncome = currentYearIncome.reduce((sum, r) => sum + Number(r.gross_annual_income), 0);
    const totalSuperContributions = currentYearIncome.reduce((sum, r) => sum + Number(r.total_super_contributions_annual), 0);
    
    console.log('\n📈 Clean 2025-2026 Household Summary:');
    console.log(`  Total Household Income: $${totalHouseholdIncome.toLocaleString()}`);
    console.log(`  Total Super Contributions: $${totalSuperContributions.toLocaleString()}`);
    console.log(`  Net Worth: $0 (ready for real account data)`);
    console.log(`  Accounts: 0 (ready to add real accounts)`);
    
    console.log('\n🎉 Data cleanup complete! FIRE dashboard now shows only real data.');
    console.log('💡 Next steps: Add your real account balances (super, cash, emergency funds, actual mortgage)');
    
  } catch (error) {
    console.error('❌ Error cleaning data:', error.message);
  }
}

cleanTestData().catch(console.error);