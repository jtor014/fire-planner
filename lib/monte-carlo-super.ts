// Monte Carlo simulation engine for Australian superannuation projections

export interface BaselineSettings {
  person1_current_balance: number
  person1_annual_contribution: number
  person1_age: number
  person2_current_balance: number
  person2_annual_contribution: number
  person2_age: number
  expected_return_mean: number
  expected_return_volatility: number
  safe_withdrawal_rate: number
  inflation_rate: number
  longevity_risk_tolerance: 'conservative' | 'moderate' | 'aggressive' | 'spend_to_zero'
  planning_age: number
}

export interface LumpsumEvent {
  name: string
  amount: number
  event_date: string
  allocation_strategy: 'super' | 'mortgage_payoff' | 'taxable_investment' | 'gap_funding'
  person1_split: number
  person2_split: number
}

export interface SuperScenario {
  mode: 'target_income' | 'target_date'
  target_annual_income?: number
  target_retirement_date?: string
  monte_carlo_runs: number
  lumpsum_events: LumpsumEvent[]
  // Legacy retirement strategy (kept for backward compatibility)
  retirement_strategy: 'wait_for_both' | 'early_retirement_first' | 'bridge_strategy' | 'inheritance_bridge'
  bridge_years_other_income: number
  // New enhanced retirement planning
  person1_stop_work_year?: number
  person2_stop_work_year?: number
  gap_funding_strategy: 'none' | 'lump_sum' | 'part_time_income' | 'spousal_support' | 'taxable_investment'
  gap_funding_amount: number
  super_access_strategy: 'conservative' | 'aggressive' | 'custom'
}

export interface SimulationResult {
  median_retirement_year?: number
  percentile_10_retirement_year?: number
  percentile_90_retirement_year?: number
  median_final_income?: number
  percentile_10_final_income?: number
  percentile_90_final_income?: number
  yearly_projections: YearlyProjection[]
  distribution_data: DistributionData
  success_rate: number
}

export interface YearlyProjection {
  year: number
  person1_balance_median: number
  person1_balance_p10: number
  person1_balance_p90: number
  person2_balance_median: number
  person2_balance_p10: number
  person2_balance_p90: number
  combined_balance_median: number
  combined_balance_p10: number
  combined_balance_p90: number
  sustainable_income_median: number
  sustainable_income_p10: number
  sustainable_income_p90: number
}

export interface DistributionData {
  retirement_years: number[]
  sustainable_incomes: number[]
  final_balances: number[]
}

// Generate random returns using Box-Muller transform for normal distribution
function generateRandomReturn(mean: number, volatility: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return (mean + volatility * z) / 100 // Convert percentage to decimal
}

// Calculate spend-to-zero annual payment amount (fixed, inflation-adjusted)
function calculateSpendToZeroPayment(
  currentBalance: number, 
  currentAge: number, 
  lifeExpectancy: number, 
  expectedReturn: number,
  inflationRate: number,
  annualContributions: number = 0
): number {
  if (currentAge >= lifeExpectancy) return currentBalance * 0.1 // Use 10% if already at life expectancy
  
  const yearsRemaining = lifeExpectancy - currentAge
  if (yearsRemaining <= 0) return currentBalance * 0.1
  
  // Real return rate (adjusted for inflation)
  const realReturn = (expectedReturn - inflationRate) / 100
  const n = yearsRemaining
  
  if (Math.abs(realReturn) < 0.001) {
    // No real growth scenario - simple division plus contributions
    const totalFuture = currentBalance + (annualContributions * n)
    return Math.max(totalFuture / n, currentBalance * 0.02)
  }
  
  // Factor in ongoing contributions as a present value
  const contributionPV = annualContributions * ((1 - Math.pow(1 + realReturn, -n)) / realReturn)
  const totalPV = currentBalance + contributionPV
  
  // Calculate fixed annual payment (in today's purchasing power) that exhausts the balance
  const payment = totalPV * (realReturn * Math.pow(1 + realReturn, n)) / (Math.pow(1 + realReturn, n) - 1)
  
  // Cap between reasonable bounds
  return Math.max(Math.min(payment, currentBalance * 0.15), currentBalance * 0.02)
}

// Calculate risk-adjusted withdrawal rate based on longevity risk tolerance
function calculateRiskAdjustedWithdrawalRate(baseline: BaselineSettings, currentBalance?: number, currentAge?: number): number {
  const baseRate = baseline.safe_withdrawal_rate / 100
  
  // Adjust based on longevity risk tolerance
  switch (baseline.longevity_risk_tolerance) {
    case 'conservative':
      // Plan to age 100+: Reduce withdrawal rate by 0.5-1%
      return Math.max(baseRate - 0.007, 0.025) // Min 2.5%
    case 'moderate':
      // Plan to age 95: Use base rate (standard approach)
      return baseRate
    case 'aggressive':
      // Plan to age 90: Increase withdrawal rate by 0.5%
      return Math.min(baseRate + 0.005, 0.06) // Max 6%
    case 'spend_to_zero':
      // Calculate dynamic rate to exhaust super by planning age
      if (currentBalance && currentAge) {
        return calculateSpendToZeroPayment(
          currentBalance, 
          currentAge, 
          baseline.planning_age,
          baseline.expected_return_mean,
          0.025
        )
      }
      return baseRate // Fallback if parameters missing
    default:
      return baseRate
  }
}

// Calculate planning horizon adjustment factor
function getPlanningHorizonMultiplier(baseline: BaselineSettings, currentAge: number): number {
  const yearsToPlanning = baseline.planning_age - currentAge
  const standardHorizon = 95 - currentAge // Standard planning to 95
  
  // Longer planning horizon = more conservative (lower multiplier)
  // Shorter planning horizon = more aggressive (higher multiplier)
  if (yearsToPlanning > standardHorizon) {
    return 0.9 // 10% more conservative for longer horizon
  } else if (yearsToPlanning < standardHorizon) {
    return 1.1 // 10% more aggressive for shorter horizon
  }
  return 1.0 // Standard
}

// Calculate superannuation balance at a given age, considering preservation rules
function calculateAccessibleBalance(balance: number, age: number): number {
  // Australian super preservation age (currently 60)
  const preservationAge = 60
  
  if (age < preservationAge) {
    return 0 // Cannot access super before preservation age
  }
  
  return balance
}

// Determine if someone has retired (stopped working) based on strategy and sustainable income
function hasRetired(
  person1_balance: number, 
  person1_age: number,
  person2_balance: number, 
  person2_age: number,
  baseline: BaselineSettings,
  scenario: SuperScenario,
  currentYear: number,
  targetIncome: number
): boolean {
  const person1CanAccess = person1_age >= 60
  const person2CanAccess = person2_age >= 60
  
  switch (scenario.retirement_strategy) {
    case 'wait_for_both':
      // Only retire when both can access super and target income is met
      if (person1CanAccess && person2CanAccess) {
        const accessibleTotal = calculateAccessibleBalance(person1_balance, person1_age) + calculateAccessibleBalance(person2_balance, person2_age)
        const sustainableIncome = accessibleTotal * (baseline.safe_withdrawal_rate / 100)
        return sustainableIncome >= targetIncome
      }
      return false
      
    case 'early_retirement_first':
      // Retire when first person can access and target income is met
      if (person1CanAccess || person2CanAccess) {
        const accessibleTotal = calculateAccessibleBalance(person1_balance, person1_age) + calculateAccessibleBalance(person2_balance, person2_age)
        const sustainableIncome = accessibleTotal * (baseline.safe_withdrawal_rate / 100)
        return sustainableIncome >= targetIncome
      }
      return false
      
    case 'bridge_strategy':
      // Can retire earlier using bridge income
      const accessibleTotal = calculateAccessibleBalance(person1_balance, person1_age) + calculateAccessibleBalance(person2_balance, person2_age)
      const superIncome = accessibleTotal * (baseline.safe_withdrawal_rate / 100)
      const totalIncome = superIncome + scenario.bridge_years_other_income
      return totalIncome >= targetIncome
      
    case 'inheritance_bridge':
      // Can retire using inheritance as living expenses (determined by scenario events)
      // This will be handled separately in the simulation loop
      return false
      
    default:
      return false
  }
}

// Calculate sustainable income based on retirement strategy
function calculateSustainableIncome(
  person1_balance: number, 
  person1_age: number,
  person2_balance: number, 
  person2_age: number,
  baseline: BaselineSettings,
  scenario: SuperScenario,
  currentSimulationYear: number,
  inheritanceAvailable: number = 0, // Track remaining inheritance for living expenses
  spendToZeroPayment: number | null = null, // Fixed annual payment for spend-to-zero
  spendToZeroStartYear: number | null = null,
  currentYear: number = 0
): number {
  const accessible1 = calculateAccessibleBalance(person1_balance, person1_age)
  const accessible2 = calculateAccessibleBalance(person2_balance, person2_age)
  
  const person1CanAccess = person1_age >= 60
  const person2CanAccess = person2_age >= 60
  
  // Use enhanced retirement planning if available, otherwise fall back to legacy strategy
  if (scenario.person1_stop_work_year && scenario.person2_stop_work_year) {
    // Enhanced retirement planning logic
    let gapFundingIncome = 0
    
    // Calculate gap funding income if in gap period
    const person1InGap = currentSimulationYear >= scenario.person1_stop_work_year && person1_age < 60
    const person2InGap = currentSimulationYear >= scenario.person2_stop_work_year && person2_age < 60
    
    if (person1InGap || person2InGap) {
      switch (scenario.gap_funding_strategy) {
        case 'part_time_income':
        case 'taxable_investment':
          gapFundingIncome = scenario.gap_funding_amount
          break
        case 'lump_sum':
          // Lump sum usage is handled through lumpsum_events with 'gap_funding' allocation
          // inheritanceAvailable includes both legacy inheritance events and new gap_funding events
          gapFundingIncome = inheritanceAvailable > 0 ? Math.min(inheritanceAvailable, 80000) : 0
          break
        case 'spousal_support':
          // Spousal support allows accessing working partner's super early (complex, simplified here)
          gapFundingIncome = scenario.gap_funding_amount || 30000 // Estimate
          break
        default:
          gapFundingIncome = 0
      }
    }
    
    // Calculate super income based on access strategy
    const superIncome = (() => {
      switch (scenario.super_access_strategy) {
        case 'conservative':
          // Wait for both to reach 60
          if (person1CanAccess && person2CanAccess) {
            const totalBalance = accessible1 + accessible2
            const olderAge = Math.max(person1_age, person2_age)
            
            if (baseline.longevity_risk_tolerance === 'spend_to_zero') {
              // For spend-to-zero, use fixed annual payment (inflation-adjusted)
              if (spendToZeroPayment && spendToZeroStartYear) {
                const yearsFromStart = currentYear - spendToZeroStartYear
                const inflationAdjustment = Math.pow(1 + baseline.inflation_rate / 100, yearsFromStart)
                return spendToZeroPayment * inflationAdjustment
              }
              // Fallback to percentage-based if no fixed payment set
              const adjustedRate = calculateRiskAdjustedWithdrawalRate(baseline, totalBalance, olderAge)
              return totalBalance * adjustedRate
            } else {
              const adjustedRate = calculateRiskAdjustedWithdrawalRate(baseline, totalBalance, olderAge)
              const horizonMultiplier = getPlanningHorizonMultiplier(baseline, olderAge)
              return totalBalance * adjustedRate * horizonMultiplier
            }
          }
          return 0
        case 'aggressive':
          // Start when first reaches 60
          if (person1CanAccess || person2CanAccess) {
            const totalBalance = accessible1 + accessible2
            const olderAge = Math.max(person1_age, person2_age)
            
            if (baseline.longevity_risk_tolerance === 'spend_to_zero') {
              // For spend-to-zero, use fixed annual payment (inflation-adjusted)
              if (spendToZeroPayment && spendToZeroStartYear) {
                const yearsFromStart = currentYear - spendToZeroStartYear
                const inflationAdjustment = Math.pow(1 + baseline.inflation_rate / 100, yearsFromStart)
                return spendToZeroPayment * inflationAdjustment
              }
              // Fallback to percentage-based if no fixed payment set
              const adjustedRate = calculateRiskAdjustedWithdrawalRate(baseline, totalBalance, olderAge)
              return totalBalance * adjustedRate
            } else {
              const adjustedRate = calculateRiskAdjustedWithdrawalRate(baseline, totalBalance, olderAge)
              const horizonMultiplier = getPlanningHorizonMultiplier(baseline, olderAge)
              return totalBalance * adjustedRate * horizonMultiplier
            }
          }
          return 0
        case 'custom':
          // Use simulation to optimize (simplified to aggressive for now)
          if (person1CanAccess || person2CanAccess) {
            const totalBalance = accessible1 + accessible2
            const olderAge = Math.max(person1_age, person2_age)
            
            if (baseline.longevity_risk_tolerance === 'spend_to_zero') {
              // For spend-to-zero, use fixed annual payment (inflation-adjusted)
              if (spendToZeroPayment && spendToZeroStartYear) {
                const yearsFromStart = currentYear - spendToZeroStartYear
                const inflationAdjustment = Math.pow(1 + baseline.inflation_rate / 100, yearsFromStart)
                return spendToZeroPayment * inflationAdjustment
              }
              // Fallback to percentage-based if no fixed payment set
              const adjustedRate = calculateRiskAdjustedWithdrawalRate(baseline, totalBalance, olderAge)
              return totalBalance * adjustedRate
            } else {
              const adjustedRate = calculateRiskAdjustedWithdrawalRate(baseline, totalBalance, olderAge)
              const horizonMultiplier = getPlanningHorizonMultiplier(baseline, olderAge)
              return totalBalance * adjustedRate * horizonMultiplier
            }
          }
          return 0
        default:
          return 0
      }
    })()
    
    return superIncome + gapFundingIncome
    
  } else {
    // Legacy retirement strategy logic for backward compatibility
    switch (scenario.retirement_strategy) {
      case 'wait_for_both':
        if (person1CanAccess && person2CanAccess) {
          const totalBalance = accessible1 + accessible2
          const olderAge = Math.max(person1_age, person2_age)
          const adjustedRate = calculateRiskAdjustedWithdrawalRate(baseline, totalBalance, olderAge)
          const horizonMultiplier = baseline.longevity_risk_tolerance === 'spend_to_zero' ? 1.0 : getPlanningHorizonMultiplier(baseline, olderAge)
          return totalBalance * adjustedRate * horizonMultiplier
        }
        return 0
        
      case 'early_retirement_first':
        if (person1CanAccess || person2CanAccess) {
          const totalBalance = accessible1 + accessible2
          const olderAge = Math.max(person1_age, person2_age)
          const adjustedRate = calculateRiskAdjustedWithdrawalRate(baseline, totalBalance, olderAge)
          const horizonMultiplier = baseline.longevity_risk_tolerance === 'spend_to_zero' ? 1.0 : getPlanningHorizonMultiplier(baseline, olderAge)
          return totalBalance * adjustedRate * horizonMultiplier
        }
        return 0
        
      case 'bridge_strategy':
        const totalBalance = accessible1 + accessible2
        const olderAge = Math.max(person1_age, person2_age)
        const adjustedRate = calculateRiskAdjustedWithdrawalRate(baseline, totalBalance, olderAge)
        const horizonMultiplier = baseline.longevity_risk_tolerance === 'spend_to_zero' ? 1.0 : getPlanningHorizonMultiplier(baseline, olderAge)
        
        if (person1CanAccess && person2CanAccess) {
          return totalBalance * adjustedRate * horizonMultiplier + scenario.bridge_years_other_income
        } else if (person1CanAccess || person2CanAccess) {
          return totalBalance * adjustedRate * horizonMultiplier + scenario.bridge_years_other_income
        } else {
          return scenario.bridge_years_other_income
        }
        
      case 'inheritance_bridge':
        const totalBalanceInheritance = accessible1 + accessible2
        const olderAgeInheritance = Math.max(person1_age, person2_age)
        const adjustedRateInheritance = calculateRiskAdjustedWithdrawalRate(baseline, totalBalanceInheritance, olderAgeInheritance)
        const horizonMultiplierInheritance = baseline.longevity_risk_tolerance === 'spend_to_zero' ? 1.0 : getPlanningHorizonMultiplier(baseline, olderAgeInheritance)
        const superIncome = totalBalanceInheritance * adjustedRateInheritance * horizonMultiplierInheritance
        const inheritanceIncome = inheritanceAvailable > 0 ? Math.min(inheritanceAvailable, 80000) : 0
        return superIncome + inheritanceIncome
        
      default:
        return 0
    }
  }
}

// Run a single Monte Carlo simulation path
function runSingleSimulation(
  baseline: BaselineSettings,
  scenario: SuperScenario,
  currentYear: number
): {
  retirement_year?: number
  final_income?: number
  yearly_data: Array<{
    year: number
    person1_balance: number
    person2_balance: number
    combined_balance: number
    sustainable_income: number
  }>
} {
  const maxProjectionYears = 50
  const targetDate = scenario.target_retirement_date ? 
    new Date(scenario.target_retirement_date).getFullYear() : 
    currentYear + maxProjectionYears

  // Initialize balances and ages
  let person1_balance = baseline.person1_current_balance
  let person2_balance = baseline.person2_current_balance
  let person1_age = baseline.person1_age
  let person2_age = baseline.person2_age
  
  const yearly_data = []
  let retirement_year: number | undefined
  let final_income: number | undefined
  let hasRetiredAlready = false
  let inheritanceRemaining = 0
  
  // Spend-to-zero tracking
  let spendToZeroAnnualPayment: number | null = null
  let spendToZeroStartYear: number | null = null
  let spendToZeroFailed = false

  // Process each year
  for (let year = currentYear; year <= currentYear + maxProjectionYears; year++) {
    // Increment ages at the beginning of each year (represents age during the year)
    person1_age++
    person2_age++
    
    // Apply annual contributions (stop when person stops working OR at age 67)
    const person1StillWorking = scenario.person1_stop_work_year ? year < scenario.person1_stop_work_year : !hasRetiredAlready
    const person2StillWorking = scenario.person2_stop_work_year ? year < scenario.person2_stop_work_year : !hasRetiredAlready
    
    if (person1_age < 67 && person1StillWorking) {
      person1_balance += baseline.person1_annual_contribution
    }
    if (person2_age < 67 && person2StillWorking) {
      person2_balance += baseline.person2_annual_contribution
    }

    // Apply lump sum events
    scenario.lumpsum_events.forEach(event => {
      const eventYear = new Date(event.event_date).getFullYear()
      if (year === eventYear) {
        if (event.allocation_strategy === 'gap_funding') {
          // Add to inheritance pool for gap funding (living expenses)
          inheritanceRemaining += event.amount
        } else if (scenario.retirement_strategy === 'inheritance_bridge' && event.allocation_strategy === 'super') {
          // For legacy inheritance bridge strategy, use super contributions as living expenses instead
          inheritanceRemaining += event.amount
        } else if (event.allocation_strategy === 'super') {
          // Normal super contribution
          const person1_amount = (event.amount * event.person1_split) / 100
          const person2_amount = (event.amount * event.person2_split) / 100
          person1_balance += person1_amount
          person2_balance += person2_amount
        }
        // Note: other allocation strategies (mortgage_payoff, taxable_investment) would be handled here
      }
    })

    // Generate random market returns
    const return1 = generateRandomReturn(baseline.expected_return_mean, baseline.expected_return_volatility)
    const return2 = generateRandomReturn(baseline.expected_return_mean, baseline.expected_return_volatility)
    
    // Apply returns
    person1_balance *= (1 + return1)
    person2_balance *= (1 + return2)

    // Use inheritance/gap funding for living expenses during gap years or inheritance bridge strategy
    const shouldUseGapFunding = (scenario.person1_stop_work_year && scenario.person2_stop_work_year && 
      ((year >= scenario.person1_stop_work_year && person1_age < 60) || 
       (year >= scenario.person2_stop_work_year && person2_age < 60)) &&
       scenario.gap_funding_strategy === 'lump_sum') ||
      (scenario.retirement_strategy === 'inheritance_bridge')
    
    if (shouldUseGapFunding && inheritanceRemaining > 0) {
      const annualLivingExpenses = Math.min(inheritanceRemaining, 80000) // Cap at reasonable amount
      inheritanceRemaining = Math.max(0, inheritanceRemaining - annualLivingExpenses)
    }
    
    // Initialize spend-to-zero payment when first eligible and using spend-to-zero strategy
    if (baseline.longevity_risk_tolerance === 'spend_to_zero' && 
        spendToZeroAnnualPayment === null && 
        (person1_age >= 60 || person2_age >= 60)) {
      const totalBalance = person1_balance + person2_balance
      const olderAge = Math.max(person1_age, person2_age)
      spendToZeroAnnualPayment = calculateSpendToZeroPayment(
        totalBalance,
        olderAge,
        baseline.planning_age,
        baseline.expected_return_mean,
        baseline.inflation_rate
      )
      spendToZeroStartYear = year
    }

    // Calculate sustainable income using retirement strategy
    const sustainable_income = calculateSustainableIncome(
      person1_balance, 
      person1_age,
      person2_balance, 
      person2_age,
      baseline,
      scenario,
      year, // Pass current simulation year, not starting year
      inheritanceRemaining,
      spendToZeroAnnualPayment,
      spendToZeroStartYear,
      year
    )

    // Apply withdrawals from super balances if people can access their super
    if (sustainable_income > 0 && (person1_age >= 60 || person2_age >= 60)) {
      const accessible1 = calculateAccessibleBalance(person1_balance, person1_age)
      const accessible2 = calculateAccessibleBalance(person2_balance, person2_age)
      const totalAccessible = accessible1 + accessible2
      
      if (totalAccessible > 0) {
        // Withdraw proportionally from accessible balances
        const withdrawal1 = accessible1 > 0 ? (sustainable_income * accessible1 / totalAccessible) : 0
        const withdrawal2 = accessible2 > 0 ? (sustainable_income * accessible2 / totalAccessible) : 0
        
        person1_balance = Math.max(0, person1_balance - withdrawal1)
        person2_balance = Math.max(0, person2_balance - withdrawal2)
        
        // Check for spend-to-zero failure (ran out of money before life expectancy)
        if (baseline.longevity_risk_tolerance === 'spend_to_zero' && 
            (person1_balance + person2_balance) === 0 && 
            Math.max(person1_age, person2_age) < baseline.planning_age) {
          spendToZeroFailed = true
        }
      }
    }

    // If spend-to-zero failed, set sustainable income to zero for remaining years
    const final_sustainable_income = spendToZeroFailed ? 0 : sustainable_income
    
    yearly_data.push({
      year,
      person1_balance,
      person2_balance,
      combined_balance: person1_balance + person2_balance,
      sustainable_income: final_sustainable_income
    })

    // Check retirement conditions
    // Enhanced logic: If work cessation years are specified, they take priority over target date/income
    if (scenario.person1_stop_work_year && scenario.person2_stop_work_year) {
      // Work cessation mode: retirement happens when both stop working AND have adequate super access
      const bothStoppedWorking = year >= Math.max(scenario.person1_stop_work_year, scenario.person2_stop_work_year)
      
      if (bothStoppedWorking && final_sustainable_income > 0 && !retirement_year) {
        // They've stopped working and have some sustainable income from super
        retirement_year = year
        hasRetiredAlready = true
      }
      
      // For target_date scenarios with work cessation, record income at target date
      if (scenario.mode === 'target_date' && year === targetDate) {
        final_income = final_sustainable_income
      }
      
    } else if (scenario.mode === 'target_income' && scenario.target_annual_income) {
      // Traditional target income mode
      const inflationAdjustment = Math.pow(1 + baseline.inflation_rate / 100, year - currentYear)
      const inflationAdjustedTarget = scenario.target_annual_income * inflationAdjustment
      
      if (final_sustainable_income >= inflationAdjustedTarget && !retirement_year) {
        retirement_year = year
        hasRetiredAlready = true
      }
    } else if (scenario.mode === 'target_date') {
      // Traditional target date mode (without work cessation years)
      if (year === targetDate) {
        final_income = final_sustainable_income
        hasRetiredAlready = true
      }
    }
  }

  return { retirement_year, final_income, yearly_data }
}

// Main Monte Carlo simulation function
export function runMonteCarloSimulation(
  baseline: BaselineSettings,
  scenario: SuperScenario
): SimulationResult {
  const currentYear = new Date().getFullYear()
  const runs = scenario.monte_carlo_runs || 1000
  
  const retirement_years: number[] = []
  const final_incomes: number[] = []
  const all_yearly_data: Array<Array<{
    year: number
    person1_balance: number
    person2_balance: number
    combined_balance: number
    sustainable_income: number
  }>> = []

  // Run all simulations
  for (let i = 0; i < runs; i++) {
    const result = runSingleSimulation(baseline, scenario, currentYear)
    
    if (result.retirement_year) {
      retirement_years.push(result.retirement_year)
    }
    
    // For target_date scenarios, always include final_income (even if 0)
    // For target_income scenarios, only include if retirement was achieved
    if (scenario.mode === 'target_date' && result.final_income !== undefined) {
      final_incomes.push(result.final_income)
    } else if (scenario.mode === 'target_income' && result.final_income) {
      final_incomes.push(result.final_income)
    }
    
    all_yearly_data.push(result.yearly_data)
  }

  // Calculate percentiles
  const sortedRetirementYears = retirement_years.sort((a, b) => a - b)
  const sortedFinalIncomes = final_incomes.sort((a, b) => a - b)

  const getPercentile = (arr: number[], percentile: number): number => {
    const index = Math.floor((percentile / 100) * arr.length)
    return arr[Math.min(index, arr.length - 1)] || 0
  }

  // Calculate yearly projections (aggregate across all simulations)
  const yearly_projections: YearlyProjection[] = []
  const maxYears = Math.max(...all_yearly_data.map(data => data.length))

  for (let yearIndex = 0; yearIndex < maxYears; yearIndex++) {
    const yearData = all_yearly_data
      .map(data => data[yearIndex])
      .filter(Boolean)
    
    if (yearData.length === 0) continue

    const year = yearData[0].year
    
    const person1_balances = yearData.map(d => d.person1_balance).sort((a, b) => a - b)
    const person2_balances = yearData.map(d => d.person2_balance).sort((a, b) => a - b)
    const combined_balances = yearData.map(d => d.combined_balance).sort((a, b) => a - b)
    const sustainable_incomes = yearData.map(d => d.sustainable_income).sort((a, b) => a - b)

    yearly_projections.push({
      year,
      person1_balance_median: getPercentile(person1_balances, 50),
      person1_balance_p10: getPercentile(person1_balances, 10),
      person1_balance_p90: getPercentile(person1_balances, 90),
      person2_balance_median: getPercentile(person2_balances, 50),
      person2_balance_p10: getPercentile(person2_balances, 10),
      person2_balance_p90: getPercentile(person2_balances, 90),
      combined_balance_median: getPercentile(combined_balances, 50),
      combined_balance_p10: getPercentile(combined_balances, 10),
      combined_balance_p90: getPercentile(combined_balances, 90),
      sustainable_income_median: getPercentile(sustainable_incomes, 50),
      sustainable_income_p10: getPercentile(sustainable_incomes, 10),
      sustainable_income_p90: getPercentile(sustainable_incomes, 90)
    })
  }

  // Calculate success rate
  const success_rate = scenario.mode === 'target_income' 
    ? (retirement_years.length / runs) * 100
    : (final_incomes.filter(income => income > 0).length / runs) * 100

  return {
    median_retirement_year: sortedRetirementYears.length > 0 ? getPercentile(sortedRetirementYears, 50) : undefined,
    percentile_10_retirement_year: sortedRetirementYears.length > 0 ? getPercentile(sortedRetirementYears, 10) : undefined,
    percentile_90_retirement_year: sortedRetirementYears.length > 0 ? getPercentile(sortedRetirementYears, 90) : undefined,
    median_final_income: sortedFinalIncomes.length > 0 ? getPercentile(sortedFinalIncomes, 50) : undefined,
    percentile_10_final_income: sortedFinalIncomes.length > 0 ? getPercentile(sortedFinalIncomes, 10) : undefined,
    percentile_90_final_income: sortedFinalIncomes.length > 0 ? getPercentile(sortedFinalIncomes, 90) : undefined,
    yearly_projections,
    distribution_data: {
      retirement_years: sortedRetirementYears,
      sustainable_incomes: sortedFinalIncomes,
      final_balances: all_yearly_data.map(data => data[data.length - 1]?.combined_balance || 0).sort((a, b) => a - b)
    },
    success_rate
  }
}

// Generate hash for baseline settings to enable caching
export function generateBaselineHash(baseline: BaselineSettings): string {
  const hashString = JSON.stringify(baseline)
  let hash = 0
  for (let i = 0; i < hashString.length; i++) {
    const char = hashString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString()
}