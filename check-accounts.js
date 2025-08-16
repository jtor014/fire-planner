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

async function checkAccounts() {
  console.log('🔍 Checking what accounts are in the database...');
  
  try {
    const accounts = await executeSQL(`
      SELECT name, category, current_balance, type, institution, is_active 
      FROM accounts 
      ORDER BY current_balance DESC;
    `);
    
    console.log('📊 Current accounts in database:');
    accounts.forEach((acc, i) => {
      const balance = Number(acc.current_balance);
      const sign = acc.type === 'liability' ? '-' : '';
      console.log(`${i + 1}. ${acc.name} (${acc.category}): ${sign}$${Math.abs(balance).toLocaleString()} - ${acc.institution} - ${acc.is_active ? 'Active' : 'Inactive'}`);
    });
    
    const activeAccounts = accounts.filter(a => a.is_active);
    const totalAssets = activeAccounts.filter(a => a.type === 'asset').reduce((sum, a) => sum + Number(a.current_balance), 0);
    const totalLiabilities = activeAccounts.filter(a => a.type === 'liability').reduce((sum, a) => sum + Math.abs(Number(a.current_balance)), 0);
    
    console.log('\n💰 Summary:');
    console.log(`Total Assets: $${totalAssets.toLocaleString()}`);
    console.log(`Total Liabilities: $${totalLiabilities.toLocaleString()}`);
    console.log(`Net Worth: $${(totalAssets - totalLiabilities).toLocaleString()}`);
    console.log(`Active Accounts: ${activeAccounts.length}/${accounts.length}`);
    
    console.log('\n❗ Note: These appear to be sample/test accounts, not real account balances.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAccounts().catch(console.error);