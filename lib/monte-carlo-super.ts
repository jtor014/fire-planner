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

  // Process each year
  for (let year = currentYear; year <= currentYear + maxProjectionYears; year++) {
    // Apply annual contributions (assuming they stop at age 67)
    if (person1_age < 67) {
      person1_balance += baseline.person1_annual_contribution
    }
    if (person2_age < 67) {
      person2_balance += baseline.person2_annual_contribution
    }

    // Apply lump sum events
    scenario.lumpsum_events.forEach(event => {
      const eventYear = new Date(event.event_date).getFullYear()
      if (year === eventYear && event.allocation_strategy === 'super') {
        const person1_amount = (event.amount * event.person1_split) / 100
        const person2_amount = (event.amount * event.person2_split) / 100
        person1_balance += person1_amount
        person2_balance += person2_amount
      }
    })

    // Generate random market returns
    const return1 = generateRandomReturn(baseline.expected_return_mean, baseline.expected_return_volatility)
    const return2 = generateRandomReturn(baseline.expected_return_mean, baseline.expected_return_volatility)
    
    // Apply returns
    person1_balance *= (1 + return1)
    person2_balance *= (1 + return2)

    // Calculate accessible balances
    const accessible1 = calculateAccessibleBalance(person1_balance, person1_age)
    const accessible2 = calculateAccessibleBalance(person2_balance, person2_age)
    const combined_accessible = accessible1 + accessible2
    
    // Calculate sustainable income
    const sustainable_income = combined_accessible * (baseline.safe_withdrawal_rate / 100)

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
      }
    } else if (scenario.mode === 'target_date') {
      if (year === targetDate) {
        final_income = sustainable_income
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