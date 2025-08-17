// Debug the simulation logic manually

function debugSimulation() {
  console.log('🔍 Debugging simulation logic...');
  
  // Test case: 2051 when both should be 60
  const year = 2051;
  const person1_age = 35 + (year - 2024); // Should be 62
  const person2_age = 33 + (year - 2024); // Should be 60
  
  console.log(`Year: ${year}`);
  console.log(`Person1 age: ${person1_age} (started at 35)`);
  console.log(`Person2 age: ${person2_age} (started at 33)`);
  
  const person1CanAccess = person1_age >= 60;
  const person2CanAccess = person2_age >= 60;
  
  console.log(`Person1 can access: ${person1CanAccess}`);
  console.log(`Person2 can access: ${person2CanAccess}`);
  console.log(`Both can access: ${person1CanAccess && person2CanAccess}`);
  
  // Test balance calculation
  const person1_balance = 1000000; // $1M for easy calculation
  const person2_balance = 1000000; // $1M for easy calculation
  const totalBalance = person1_balance + person2_balance;
  
  console.log(`\nTotal balance: $${totalBalance.toLocaleString()}`);
  
  // Test spend-to-zero calculation
  const currentAge = Math.max(person1_age, person2_age); // 62
  const lifeExpectancy = 95;
  const expectedReturn = 7.5;
  const yearsRemaining = lifeExpectancy - currentAge; // 33 years
  
  console.log(`Current age (older): ${currentAge}`);
  console.log(`Life expectancy: ${lifeExpectancy}`);
  console.log(`Years remaining: ${yearsRemaining}`);
  
  // Simplified spend-to-zero calculation
  const r = expectedReturn / 100; // 0.075
  const n = yearsRemaining; // 33
  
  console.log(`Annual return rate: ${r}`);
  console.log(`Years to plan for: ${n}`);
  
  if (r === 0) {
    const simpleRate = 1 / n;
    console.log(`Simple withdrawal rate (no growth): ${(simpleRate * 100).toFixed(2)}%`);
  } else {
    // Present value of annuity formula
    const payment = totalBalance * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const withdrawalRate = payment / totalBalance;
    
    console.log(`Annual payment needed: $${payment.toLocaleString()}`);
    console.log(`Withdrawal rate: ${(withdrawalRate * 100).toFixed(2)}%`);
    console.log(`Should get income: $${payment.toLocaleString()}`);
  }
}

debugSimulation();