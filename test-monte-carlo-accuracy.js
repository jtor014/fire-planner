#!/usr/bin/env node

// Test Monte Carlo simulation accuracy after bug fixes
const { runMonteCarloSimulation } = require('./lib/monte-carlo-super.ts');

const baseline = {
  person1_current_balance: 116289,
  person1_annual_contribution: 25000,
  person1_age: 35,
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

console.log('🧪 Testing Monte Carlo simulation accuracy...');
console.log('📊 Baseline settings:');
console.log(`  Combined balance: $${(baseline.person1_current_balance + baseline.person2_current_balance).toLocaleString()}`);
console.log(`  Combined contributions: $${(baseline.person1_annual_contribution + baseline.person2_annual_contribution).toLocaleString()}/year`);
console.log(`  Longevity strategy: ${baseline.longevity_risk_tolerance}`);
console.log(`  Planning age: ${baseline.planning_age}`);

console.log('\n🎯 Scenario settings:');
console.log(`  Target income: $${scenario.target_annual_income.toLocaleString()}/year`);
console.log(`  Super access: ${scenario.super_access_strategy}`);
console.log(`  Stop work: ${scenario.person1_stop_work_year}/${scenario.person2_stop_work_year}`);

try {
  const startTime = Date.now();
  const result = runMonteCarloSimulation(baseline, scenario);
  const endTime = Date.now();
  
  console.log(`\n⚡ Simulation completed in ${endTime - startTime}ms`);
  console.log('\n📈 Results:');
  console.log(`  Success rate: ${result.success_rate.toFixed(1)}%`);
  console.log(`  Median retirement year: ${result.median_retirement_year || 'N/A'}`);
  console.log(`  10th percentile retirement: ${result.percentile_10_retirement_year || 'N/A'}`);
  console.log(`  90th percentile retirement: ${result.percentile_90_retirement_year || 'N/A'}`);
  
  console.log('\n💰 Sample yearly projections (first 5 years):');
  result.yearly_projections.slice(0, 5).forEach(proj => {
    console.log(`  ${proj.year}: Combined balance $${proj.combined_balance_median.toLocaleString()}, Income $${proj.sustainable_income_median.toLocaleString()}`);
  });
  
  console.log('\n💰 Sample yearly projections (around super access age 60):');
  const accessYears = result.yearly_projections.filter(p => p.year >= 2049 && p.year <= 2051);
  accessYears.forEach(proj => {
    console.log(`  ${proj.year}: Combined balance $${proj.combined_balance_median.toLocaleString()}, Income $${proj.sustainable_income_median.toLocaleString()}`);
  });
  
  // Check for obviously wrong values
  const hasNegativeBalances = result.yearly_projections.some(p => 
    p.combined_balance_median < 0 || p.person1_balance_median < 0 || p.person2_balance_median < 0
  );
  
  const hasUnreasonableGrowth = result.yearly_projections.some(p => 
    p.combined_balance_median > 10000000 // $10M seems unreasonable for these inputs
  );
  
  const hasZeroIncomeWhenShouldHaveIncome = result.yearly_projections
    .filter(p => p.year >= 2049) // After both reach 60
    .some(p => p.sustainable_income_median === 0);
  
  console.log('\n🔍 Accuracy Checks:');
  console.log(`  ❌ Has negative balances: ${hasNegativeBalances}`);
  console.log(`  ❌ Has unreasonable growth: ${hasUnreasonableGrowth}`);
  console.log(`  ❌ Zero income when should have income: ${hasZeroIncomeWhenShouldHaveIncome}`);
  
  if (!hasNegativeBalances && !hasUnreasonableGrowth && !hasZeroIncomeWhenShouldHaveIncome) {
    console.log('✅ Monte Carlo simulation appears to be working correctly!');
  } else {
    console.log('⚠️ Monte Carlo simulation may still have accuracy issues.');
  }
  
} catch (error) {
  console.error('❌ Error running simulation:', error.message);
  console.error(error.stack);
}