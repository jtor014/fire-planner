// Test Monte Carlo simulation directly to debug withdrawals
const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function debugWithdrawals() {
  console.log('🔍 Debug: Testing Monte Carlo with withdrawals...');
  
  try {
    // Get scenario data
    const scenarios = await makeRequest('/api/super/scenarios');
    const earlyRetirement = scenarios.data.find(s => s.name === 'Early Retirement at 55');
    
    if (!earlyRetirement) {
      console.log('❌ Could not find Early Retirement scenario');
      return;
    }
    
    console.log(`📊 Testing scenario: ${earlyRetirement.name}`);
    console.log(`📅 Target date: ${earlyRetirement.target_retirement_date}`);
    console.log(`🎯 Mode: ${earlyRetirement.mode}`);
    
    // Test the projection
    const result = await makeRequest(`/api/super/projection?scenario_id=${earlyRetirement.id}`);
    
    console.log('\n📈 Simulation Results:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Cached: ${result.cached || false}`);
    console.log(`  Success Rate: ${result.data?.success_rate}`);
    console.log(`  Median Final Income: ${result.data?.median_final_income}`);
    
    if (result.data?.yearly_projections) {
      console.log('\n📊 Balance Progression (last 10 years):');
      const lastYears = result.data.yearly_projections.slice(-10);
      lastYears.forEach(proj => {
        console.log(`  ${proj.year}: $${proj.combined_balance_median.toLocaleString()} (income: $${proj.sustainable_income_median.toLocaleString()})`);
      });
      
      // Check if balances are decreasing (sign of withdrawals)
      const firstBalance = lastYears[0]?.combined_balance_median || 0;
      const lastBalance = lastYears[lastYears.length - 1]?.combined_balance_median || 0;
      
      if (lastBalance < firstBalance) {
        console.log('✅ Balances are decreasing - withdrawals are working!');
      } else {
        console.log('⚠️ Balances are still increasing - withdrawals may not be working');
      }
    } else {
      console.log('❌ No yearly projections data');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugWithdrawals().catch(console.error);