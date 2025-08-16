// Quick test script for Up Bank API
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const UP_API_BASE = 'https://api.up.com.au/api/v1';
const token = process.env.UP_API_TOKEN;

async function testUpBankAPI() {
  console.log('🏦 Testing Up Bank API Connection...');
  console.log('Token configured:', token ? 'Yes' : 'No');
  
  if (!token) {
    console.error('❌ No UP_API_TOKEN found in environment');
    return;
  }

  try {
    // Test ping endpoint
    console.log('\n1. Testing ping endpoint...');
    const pingResponse = await axios.get(`${UP_API_BASE}/util/ping`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Ping successful:', pingResponse.data);

    // Test accounts endpoint  
    console.log('\n2. Testing accounts endpoint...');
    const accountsResponse = await axios.get(`${UP_API_BASE}/accounts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Accounts found:', accountsResponse.data.data.length);
    
    accountsResponse.data.data.forEach((account, i) => {
      console.log(`   Account ${i + 1}:`, {
        id: account.id,
        type: account.attributes.accountType,
        balance: account.attributes.balance.value,
        displayName: account.attributes.displayName
      });
    });

    // Test recent transactions
    console.log('\n3. Testing recent transactions...');
    const since = new Date();
    since.setDate(since.getDate() - 7);
    
    const transactionsResponse = await axios.get(`${UP_API_BASE}/transactions`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: {
        'filter[since]': since.toISOString(),
        'page[size]': 5
      }
    });
    
    console.log('✅ Transactions found:', transactionsResponse.data.data.length);
    transactionsResponse.data.data.slice(0, 3).forEach((tx, i) => {
      console.log(`   Transaction ${i + 1}:`, {
        description: tx.attributes.description,
        amount: tx.attributes.amount.value,
        date: tx.attributes.createdAt.split('T')[0]
      });
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testUpBankAPI();