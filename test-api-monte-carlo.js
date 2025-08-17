#!/usr/bin/env node

// Test Monte Carlo simulation via API
const http = require('http');

async function testMonteCarloAPI() {
  console.log('🧪 Testing Monte Carlo simulation via API...');
  
  // First save baseline settings
  const baseline = {
    person1_name: 'Josh',
    person1_current_balance: 116289,
    person1_annual_contribution: 25000,
    person1_age: 35,
    person2_name: 'Nancy',
    person2_current_balance: 96000,
    person2_annual_contribution: 25000,
    person2_age: 33,
    expected_return_mean: 7.5,
    expected_return_volatility: 15.0,
    safe_withdrawal_rate: 3.5,
    inflation_rate: 2.5,
    longevity_risk_tolerance: 'spend_to_zero',
    planning_age: 95
  };
  
  const scenario = {
    name: 'Test Scenario - Spend to Zero',
    mode: 'target_income',
    target_annual_income: 80000,
    monte_carlo_runs: 100,
    lumpsum_events: [],
    retirement_strategy: 'wait_for_both',
    bridge_years_other_income: 0,
    person1_stop_work_year: 2055,
    person2_stop_work_year: 2057,
    gap_funding_strategy: 'none',
    gap_funding_amount: 0,
    super_access_strategy: 'conservative'
  };
  
  try {
    // Save baseline settings
    console.log('📋 Saving baseline settings...');
    await makeRequest('POST', '/api/super/baseline-settings', baseline);
    console.log('✅ Baseline settings saved');
    
    // Create scenario
    console.log('🎯 Creating scenario...');
    const scenarioResult = await makeRequest('POST', '/api/super/scenarios', scenario);
    console.log('✅ Scenario created:', scenarioResult.data.id);
    
    // Run projection
    console.log('📊 Running Monte Carlo projection...');
    const startTime = Date.now();
    const result = await makeRequest('GET', `/api/super/projection?scenario_id=${scenarioResult.data.id}`);
    const endTime = Date.now();
    
    console.log(`⚡ Simulation completed in ${endTime - startTime}ms`);
    
    if (result.success && result.data) {
      const sim = result.data;
      console.log('\n📈 Results:');
      console.log(`  Success rate: ${sim.success_rate.toFixed(1)}%`);
      console.log(`  Median retirement year: ${sim.median_retirement_year || 'N/A'}`);
      console.log(`  10th percentile retirement: ${sim.percentile_10_retirement_year || 'N/A'}`);
      console.log(`  90th percentile retirement: ${sim.percentile_90_retirement_year || 'N/A'}`);
      
      if (sim.yearly_projections && sim.yearly_projections.length > 0) {
        console.log('\n💰 Sample yearly projections (first 5 years):');
        sim.yearly_projections.slice(0, 5).forEach(proj => {
          console.log(`  ${proj.year}: Combined $${proj.combined_balance_median.toLocaleString()}, Income $${proj.sustainable_income_median.toLocaleString()}`);
        });
        
        console.log('\n💰 Sample yearly projections (around super access age 60):');
        const accessYears = sim.yearly_projections.filter(p => p.year >= 2049 && p.year <= 2051);
        accessYears.forEach(proj => {
          console.log(`  ${proj.year}: Combined $${proj.combined_balance_median.toLocaleString()}, Income $${proj.sustainable_income_median.toLocaleString()}`);
        });
        
        // Check for accuracy issues
        const hasNegativeBalances = sim.yearly_projections.some(p => 
          p.combined_balance_median < 0 || p.person1_balance_median < 0 || p.person2_balance_median < 0
        );
        
        const hasZeroIncomeWhenShouldHaveIncome = sim.yearly_projections
          .filter(p => p.year >= 2051) // After both reach 60
          .some(p => p.sustainable_income_median === 0 && p.combined_balance_median > 0);
        
        // Check spend-to-zero withdrawal rates are reasonable (5-15%)
        const year2051 = sim.yearly_projections.find(p => p.year === 2051);
        const withdrawalRate = year2051 ? (year2051.sustainable_income_median / year2051.combined_balance_median) : 0;
        const hasReasonableWithdrawalRate = withdrawalRate >= 0.05 && withdrawalRate <= 0.15;
        
        console.log('\n🔍 Accuracy Checks:');
        console.log(`  ❌ Has negative balances: ${hasNegativeBalances}`);
        console.log(`  ❌ Zero income when should have income: ${hasZeroIncomeWhenShouldHaveIncome}`);
        console.log(`  ❌ Unreasonable withdrawal rate (${(withdrawalRate * 100).toFixed(1)}%): ${!hasReasonableWithdrawalRate}`);
        
        if (!hasNegativeBalances && !hasZeroIncomeWhenShouldHaveIncome && hasReasonableWithdrawalRate) {
          console.log('✅ Monte Carlo simulation appears to be working correctly!');
        } else {
          console.log('⚠️ Monte Carlo simulation may still have accuracy issues.');
        }
      } else {
        console.log('❌ No yearly projections data received');
      }
    } else {
      console.log('❌ API call failed:', result);
    }
    
  } catch (error) {
    console.error('❌ Error testing simulation:', error.message);
  }
}

function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve(responseData);
        }
      });
    });
    
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

testMonteCarloAPI().catch(console.error);