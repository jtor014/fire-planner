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
}

export interface LumpsumEvent {
  name: string
  amount: number
  event_date: string
  allocation_strategy: 'super' | 'mortgage_payoff' | 'taxable_investment'
  person1_split: number
  person2_split: number
}

export interface SuperScenario {
  mode: 'target_income' | 'target_date'
  target_annual_income?: number
  target_retirement_date?: string
  monte_carlo_runs: number
  lumpsum_events: LumpsumEvent[]
  retirement_strategy: 'wait_for_both' | 'early_retirement_first' | 'bridge_strategy' | 'inheritance_bridge'
  bridge_years_other_income: number
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
  
  switch (baseline.retirement_strategy) {
    case 'wait_for_both':
      // Only retire when both can access super and target income is met
      if (person1CanAccess && person2CanAccess) {
        const accessibleTotal = calculateAccessibleBalance(person1_balance, person1_age) + calculateAccessibleBalance(person2_balance, person2_age)
        const sustainableIncome = accessibleTotal * (baseline.safe_withdrawal_rate / 100)
        return sustainableIncome >= targetIncome
      }
      return false
      
    case 'early_retirement_first':
      // Retire when first person can access and target income is met with higher withdrawal
      if (person1CanAccess || person2CanAccess) {
        const accessibleTotal = calculateAccessibleBalance(person1_balance, person1_age) + calculateAccessibleBalance(person2_balance, person2_age)
        const withdrawalRate = (person1CanAccess && person2CanAccess) ? baseline.safe_withdrawal_rate : baseline.early_retirement_withdrawal_rate
        const sustainableIncome = accessibleTotal * (withdrawalRate / 100)
        return sustainableIncome >= targetIncome
      }
      return false
      
    case 'bridge_strategy':
      // Can retire earlier using bridge income
      const accessibleTotal = calculateAccessibleBalance(person1_balance, person1_age) + calculateAccessibleBalance(person2_balance, person2_age)
      const superIncome = accessibleTotal * (baseline.safe_withdrawal_rate / 100)
      const totalIncome = superIncome + baseline.bridge_years_other_income
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
  currentYear: number,
  inheritanceAvailable: number = 0 // Track remaining inheritance for living expenses
): number {
  const accessible1 = calculateAccessibleBalance(person1_balance, person1_age)
  const accessible2 = calculateAccessibleBalance(person2_balance, person2_age)
  
  const person1CanAccess = person1_age >= 60
  const person2CanAccess = person2_age >= 60
  
  switch (scenario.retirement_strategy) {
    case 'wait_for_both':
      // Traditional approach: wait until both can access super
      if (person1CanAccess && person2CanAccess) {
        return (accessible1 + accessible2) * (baseline.safe_withdrawal_rate / 100)
      }
      return 0
      
    case 'early_retirement_first':
      // Allow retirement when first person reaches 60 - simulation will determine if target income is achievable
      if (person1CanAccess || person2CanAccess) {
        const accessibleTotal = accessible1 + accessible2
        // Use the safe withdrawal rate - simulation will determine if this meets target income
        return accessibleTotal * (baseline.safe_withdrawal_rate / 100)
      }
      return 0
      
    case 'bridge_strategy':
      // Use bridge income until both can access, then normal withdrawal
      if (person1CanAccess && person2CanAccess) {
        // Both can access - normal withdrawal + any ongoing bridge income
        return (accessible1 + accessible2) * (baseline.safe_withdrawal_rate / 100) + scenario.bridge_years_other_income
      } else if (person1CanAccess || person2CanAccess) {
        // One can access - accessible super + bridge income
        const accessibleTotal = accessible1 + accessible2
        return accessibleTotal * (baseline.safe_withdrawal_rate / 100) + scenario.bridge_years_other_income
      } else {
        // Neither can access - only bridge income
        return scenario.bridge_years_other_income
      }
      
    case 'inheritance_bridge':
      // Use inheritance for living expenses plus any accessible super
      const superIncome = (accessible1 + accessible2) * (baseline.safe_withdrawal_rate / 100)
      // Assume inheritance provides annual income (inheritance / years to stretch it)
      const inheritanceIncome = inheritanceAvailable > 0 ? Math.min(inheritanceAvailable, 80000) : 0 // Cap at reasonable annual amount
      return superIncome + inheritanceIncome
      
    default:
      return 0
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

  // Process each year
  for (let year = currentYear; year <= currentYear + maxProjectionYears; year++) {
    // Apply annual contributions (stop at age 67 OR when retired)
    if (person1_age < 67 && !hasRetiredAlready) {
      person1_balance += baseline.person1_annual_contribution
    }
    if (person2_age < 67 && !hasRetiredAlready) {
      person2_balance += baseline.person2_annual_contribution
    }

    // Apply lump sum events
    scenario.lumpsum_events.forEach(event => {
      const eventYear = new Date(event.event_date).getFullYear()
      if (year === eventYear) {
        if (scenario.retirement_strategy === 'inheritance_bridge' && event.allocation_strategy === 'super') {
          // For inheritance bridge strategy, use super contributions as living expenses instead
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

    // Use inheritance for living expenses if using inheritance bridge strategy
    if (scenario.retirement_strategy === 'inheritance_bridge' && inheritanceRemaining > 0) {
      const annualLivingExpenses = Math.min(inheritanceRemaining, 80000) // Cap at reasonable amount
      inheritanceRemaining = Math.max(0, inheritanceRemaining - annualLivingExpenses)
    }
    
    // Calculate sustainable income using retirement strategy
    const sustainable_income = calculateSustainableIncome(
      person1_balance, 
      person1_age,
      person2_balance, 
      person2_age,
      baseline,
      scenario,
      year,
      inheritanceRemaining
    )

    yearly_data.push({
      year,
      person1_balance,
      person2_balance,
      combined_balance: person1_balance + person2_balance,
      sustainable_income
    })

    // Check retirement conditions
    if (scenario.mode === 'target_income' && scenario.target_annual_income) {
      // Adjust target for inflation
      const inflationAdjustment = Math.pow(1 + baseline.inflation_rate / 100, year - currentYear)
      const inflationAdjustedTarget = scenario.target_annual_income * inflationAdjustment
      
      if (sustainable_income >= inflationAdjustedTarget && !retirement_year) {
        retirement_year = year
        hasRetiredAlready = true // Stop super contributions from this point
      }
    } else if (scenario.mode === 'target_date') {
      if (year === targetDate) {
        final_income = sustainable_income
        hasRetiredAlready = true // Stop super contributions from this point
      }
    }

    // Increment ages
    person1_age++
    person2_age++
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
    if (result.final_income) {
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