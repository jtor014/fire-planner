// Analyze if the balance growth is reasonable

function analyzeGrowth() {
  console.log('📊 Analyzing Super Balance Growth Rates');
  
  const startingBalance = 116289 + 96000; // $212,289
  const annualContributions = 25000 + 25000; // $50,000 per year
  const years = 2051 - 2024; // 27 years
  const expectedReturn = 7.5; // 7.5% per year
  const endingBalance = 5130652.41; // From simulation median
  
  console.log(`\n🏁 Starting Conditions:`);
  console.log(`  Combined balance: $${startingBalance.toLocaleString()}`);
  console.log(`  Annual contributions: $${annualContributions.toLocaleString()}`);
  console.log(`  Investment period: ${years} years`);
  console.log(`  Expected return: ${expectedReturn}% per year`);
  
  console.log(`\n🎯 Simulation Result:`);
  console.log(`  Ending balance: $${endingBalance.toLocaleString()}`);
  
  // Calculate theoretical growth with compound interest + contributions
  let balance = startingBalance;
  const monthlyReturn = expectedReturn / 100 / 12;
  const monthlyContribution = annualContributions / 12;
  
  console.log(`\n🧮 Theoretical Calculation (monthly compounding):`);
  for (let year = 1; year <= years; year++) {
    for (let month = 1; month <= 12; month++) {
      balance = balance * (1 + monthlyReturn) + monthlyContribution;
    }
    if (year % 5 === 0 || year === years) {
      console.log(`  Year ${2024 + year}: $${balance.toLocaleString()}`);
    }
  }
  
  console.log(`\n💰 Final Comparison:`);
  console.log(`  Theoretical: $${balance.toLocaleString()}`);
  console.log(`  Simulation:  $${endingBalance.toLocaleString()}`);
  console.log(`  Difference:  $${(endingBalance - balance).toLocaleString()}`);
  console.log(`  % Difference: ${((endingBalance / balance - 1) * 100).toFixed(1)}%`);
  
  // Calculate what return rate would give the simulation result
  let testRate = 0.05;
  let testBalance = startingBalance;
  
  for (let rate = 0.05; rate <= 0.15; rate += 0.001) {
    testBalance = startingBalance;
    for (let year = 1; year <= years; year++) {
      for (let month = 1; month <= 12; month++) {
        testBalance = testBalance * (1 + rate / 12) + monthlyContribution;
      }
    }
    if (Math.abs(testBalance - endingBalance) < 10000) {
      console.log(`\n🎯 Implied return rate: ${(rate * 100).toFixed(2)}% per year`);
      break;
    }
  }
  
  // Check if the growth is reasonable
  const totalContributions = annualContributions * years;
  const investmentGains = endingBalance - startingBalance - totalContributions;
  
  console.log(`\n📈 Growth Breakdown:`);
  console.log(`  Starting balance: $${startingBalance.toLocaleString()}`);
  console.log(`  Total contributions: $${totalContributions.toLocaleString()}`);
  console.log(`  Investment gains: $${investmentGains.toLocaleString()}`);
  console.log(`  Final balance: $${endingBalance.toLocaleString()}`);
  
  if (Math.abs((endingBalance / balance - 1) * 100) < 5) {
    console.log('\n✅ Balance growth appears reasonable (within 5% of theoretical)');
  } else {
    console.log('\n⚠️ Balance growth may be unrealistic');
  }
}

analyzeGrowth();