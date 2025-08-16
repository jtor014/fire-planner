#!/usr/bin/env node

// Refresh dashboard data after household income imports
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

async function refreshDashboard() {
  console.log('🔄 Refreshing dashboard data...');
  
  try {
    // Get current account totals
    const accountsQuery = `
      SELECT 
        SUM(CASE WHEN type = 'asset' THEN current_balance ELSE 0 END) as total_assets,
        SUM(CASE WHEN type = 'liability' THEN ABS(current_balance) ELSE 0 END) as total_liabilities,
        SUM(CASE WHEN type = 'asset' THEN current_balance ELSE -ABS(current_balance) END) as net_worth
      FROM accounts 
      WHERE is_active = true;
    `;
    
    const accountTotals = await executeSQL(accountsQuery);
    console.log('💰 Current account totals:', accountTotals[0]);
    
    // Update the current quarter snapshot
    const currentQuarter = new Date().getFullYear() + '-Q' + Math.ceil((new Date().getMonth() + 1) / 3);
    
    const updateSnapshot = `
      UPDATE networth_snapshots 
      SET 
        total_assets = ${accountTotals[0].total_assets},
        total_liabilities = ${accountTotals[0].total_liabilities},
        net_worth = ${accountTotals[0].net_worth},
        created_at = timezone('utc'::text, now()),
        notes = 'Updated with household income data'
      WHERE quarter = '${currentQuarter}';
    `;
    
    await executeSQL(updateSnapshot);
    console.log('✅ Net worth snapshot updated for', currentQuarter);
    
    // Get updated snapshot data
    const snapshotQuery = `
      SELECT * FROM networth_snapshots 
      WHERE quarter = '${currentQuarter}'
      LIMIT 1;
    `;
    
    const updatedSnapshot = await executeSQL(snapshotQuery);
    console.log('📊 Updated snapshot:', updatedSnapshot[0]);
    
    // Show household income summary
    const householdQuery = `
      SELECT * FROM household_income_summary
      ORDER BY financial_year DESC
      LIMIT 1;
    `;
    
    const householdSummary = await executeSQL(householdQuery);
    if (householdSummary.length > 0) {
      console.log('🏠 Current household income:', householdSummary[0]);
    }
    
    console.log('\n🎉 Dashboard refresh complete!');
    console.log('🌐 Visit http://localhost:3001/dashboard to see updated data');
    console.log('🏠 Visit http://localhost:3001/household-income for household summary');
    
  } catch (error) {
    console.error('❌ Error refreshing dashboard:', error.message);
  }
}

refreshDashboard().catch(console.error);