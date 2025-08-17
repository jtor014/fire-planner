// Main FIRE planning engine - the single entry point for all calculations
// This orchestrates all the specialized engines we've built

import type { 
  RunRequest, 
  RunResult, 
  YearRow, 
  ChartData
} from './types'
import { ValidationError, ComputationError } from './types'
import { validateRunRequest } from './validation'
import { runAccumulationPhase } from './accumulate'
import { runBridgePhase } from './bridge'
import { runSpenddownPhase } from './spenddown'
import { calculateAgePension } from './age-pension'
import { calculateTaxPosition } from './tax'
import { runMonteCarloAnalysis } from './monte-carlo'
import { generateChartData } from './charts'
import { calculateMetrics } from './metrics'

// Engine version for cache invalidation and reproducibility
export const ENGINE_VERSION = '2.0.0'

/**
 * Main FIRE planning calculation engine
 * 
 * Takes a comprehensive request and returns year-by-year projections,
 * key metrics, and Monte Carlo analysis if requested.
 * 
 * This function orchestrates all the specialized engines:
 * - Accumulation phase (pre-FIRE super growth)
 * - Bridge phase (FIRE to preservation age)
 * - Spenddown phase (post-60 withdrawals)
 * - Age pension calculations
 * - Tax optimization
 * - Monte Carlo stress testing
 */
export async function runFirePlan(request: RunRequest): Promise<RunResult> {
  const startTime = Date.now()
  
  try {
    // 1. Validate inputs
    const validationResult = validateRunRequest(request)
    if (!validationResult.valid) {
      throw new ValidationError('Invalid request parameters', {
        errors: validationResult.errors
      })
    }

    // 2. Initialize result structure
    const timeline: YearRow[] = []
    const currentYear = new Date().getFullYear()
    const endYear = currentYear + (request.horizon.end_age - Math.min(...request.household.people.map(p => 
      currentYear - p.birth_year
    )))

    // 3. Run year-by-year simulation
    for (let year = currentYear; year <= endYear; year++) {
      const yearRow = await calculateYearRow(year, request, timeline)
      timeline.push(yearRow)
      
      // Early exit if both people have passed away or super is exhausted
      if (shouldTerminateSimulation(yearRow, request)) {
        break
      }
    }

    // 4. Generate chart data
    const charts = generateChartData(timeline, request)

    // 5. Calculate key metrics
    const metrics = calculateMetrics(timeline, request)

    // 6. Run Monte Carlo analysis if requested
    let monte_carlo = undefined
    if (request.options.include_monte_carlo) {
      monte_carlo = await runMonteCarloAnalysis(request, timeline)
    }

    // 7. Assemble final result
    const result: RunResult = {
      request_summary: {
        household_type: request.household.structure,
        fire_ages: request.household.people.map(p => p.fire_age || 65),
        total_current_super: request.household.people.reduce((sum, p) => sum + p.super_balance, 0),
        annual_expenses: request.household.annual_expenses.current,
        strategy_description: `${request.strategy.household.type} with ${request.strategy.spenddown.withdrawal_method} withdrawals`
      },
      timeline,
      charts,
      metrics,
      monte_carlo,
      computation_info: {
        engine_version: ENGINE_VERSION,
        assumptions_version: request.assumptions.id,
        computation_time_ms: Date.now() - startTime,
        deterministic_seed: request.options.include_monte_carlo ? 
          generateDeterministicSeed(request) : undefined,
        cache_hit: false // TODO: Implement caching
      }
    }

    return result

  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new ComputationError('Engine calculation failed', {
      originalError: error instanceof Error ? error.message : String(error),
      requestSummary: {
        household_type: request.household.structure,
        people_count: request.household.people.length,
        include_monte_carlo: request.options.include_monte_carlo
      }
    })
  }
}

/**
 * Calculate a single year's financial position
 */
async function calculateYearRow(
  year: number, 
  request: RunRequest, 
  priorYears: YearRow[]
): Promise<YearRow> {
  const currentYear = new Date().getFullYear()
  const yearIndex = year - currentYear
  const previousYear = priorYears[priorYears.length - 1]

  // Calculate ages for all people in this year
  const ages = request.household.people.reduce((acc, person) => {
    acc[person.id] = year - person.birth_year
    return acc
  }, {} as { [personId: string]: number })

  // Determine which people have stopped working (FIRE'd)
  const firedPeople = request.household.people.filter(person => 
    person.fire_age && ages[person.id] >= person.fire_age
  )
  
  // Determine which people can access super (preservation age)
  const superAccessiblePeople = request.household.people.filter(person =>
    ages[person.id] >= request.assumptions.superannuation.preservation_age
  )

  // 1. Calculate bridge income (pre-preservation age funding)
  const bridge_income = await runBridgePhase(year, request, ages, firedPeople, previousYear)

  // 2. Calculate super accumulation (contributions + returns)
  const super_results = await runAccumulationPhase(year, request, ages, previousYear)

  // 3. Calculate super withdrawals (post-preservation age)
  const withdrawal_results = await runSpenddownPhase(
    year, 
    request, 
    ages, 
    superAccessiblePeople,
    super_results.balances,
    previousYear
  )

  // 4. Calculate age pension eligibility and amounts
  const pension_results = await calculateAgePension(
    year,
    request,
    ages,
    { ...super_results.balances, ...withdrawal_results.remaining_balances },
    request.household.assets
  )

  // 5. Calculate tax position
  const tax_results = await calculateTaxPosition(
    year,
    request,
    ages,
    {
      salary_income: bridge_income.salary_income,
      super_withdrawals: withdrawal_results.withdrawals,
      pension_income: pension_results.amounts
    }
  )

  // 6. Calculate expenses based on household structure and strategy
  const bridge_expenses = calculateYearlyExpenses(
    year,
    request,
    ages,
    firedPeople,
    superAccessiblePeople
  )

  // 7. Determine sustainability and FIRE feasibility
  const total_income = 
    bridge_income.total_bridge_income + 
    Object.values(withdrawal_results.withdrawals).reduce((sum, amt) => sum + amt, 0) +
    Object.values(pension_results.amounts).reduce((sum, amt) => sum + amt, 0)

  const surplus_deficit = total_income - bridge_expenses
  const fire_feasible = surplus_deficit >= 0

  // 8. Assemble year row
  const yearRow: YearRow = {
    year,
    ages,
    bridge_income,
    bridge_expenses,
    bridge_net_position: surplus_deficit,
    super_balances: super_results.balances,
    super_contributions: super_results.contributions,
    super_returns: super_results.returns,
    super_accessible: superAccessiblePeople.reduce((acc, person) => {
      acc[person.id] = super_results.balances[person.id] || 0
      return acc
    }, {} as { [personId: string]: number }),
    super_withdrawals: withdrawal_results.withdrawals,
    minimum_drawdowns: withdrawal_results.minimum_drawdowns,
    age_pension_eligible: pension_results.eligible,
    age_pension_amount: pension_results.amounts,
    taxable_income: tax_results.taxable_income,
    tax_payable: tax_results.tax_payable,
    total_super: Object.values(super_results.balances).reduce((sum, bal) => sum + bal, 0),
    total_non_super: request.household.assets.non_super_investments, // TODO: Apply returns
    total_net_worth: 
      Object.values(super_results.balances).reduce((sum, bal) => sum + bal, 0) +
      request.household.assets.non_super_investments,
    sustainable_income: total_income,
    required_income: bridge_expenses,
    surplus_deficit,
    fire_feasible
  }

  return yearRow
}

/**
 * Calculate yearly expenses based on household structure and retirement status
 */
function calculateYearlyExpenses(
  year: number,
  request: RunRequest,
  ages: { [personId: string]: number },
  firedPeople: any[],
  superAccessiblePeople: any[]
): number {
  const { household } = request
  
  switch (household.strategy.expense_modeling) {
    case 'household_throughout':
      return household.annual_expenses.couple

    case 'single_then_household':
      // Single expenses until both are retired or one reaches preservation age
      if (firedPeople.length < 2 && superAccessiblePeople.length === 0) {
        return household.annual_expenses.single_person
      }
      return household.annual_expenses.couple

    case 'dynamic_optimization':
      // Optimize based on current situation
      const bothRetired = firedPeople.length === household.people.length
      if (bothRetired || superAccessiblePeople.length > 0) {
        return household.annual_expenses.couple
      }
      return household.annual_expenses.single_person

    default:
      return household.annual_expenses.current
  }
}

/**
 * Determine if simulation should terminate early
 */
function shouldTerminateSimulation(yearRow: YearRow, request: RunRequest): boolean {
  // Terminate if all people have passed their life expectancy
  const allPeopleDeceased = request.household.people.every(person => 
    yearRow.ages[person.id] > person.life_expectancy
  )

  // Terminate if super is exhausted and no other income sources
  const superExhausted = yearRow.total_super <= 1000 // Effectively zero
  const noOtherIncome = yearRow.bridge_income.total_bridge_income <= 0 &&
    Object.values(yearRow.age_pension_amount).reduce((sum, amt) => sum + amt, 0) <= 0

  return allPeopleDeceased || (superExhausted && noOtherIncome)
}

/**
 * Generate deterministic seed for Monte Carlo runs based on request parameters
 */
function generateDeterministicSeed(request: RunRequest): number {
  // Create a simple hash of key request parameters
  const hashString = JSON.stringify({
    people: request.household.people.map(p => ({ 
      birth_year: p.birth_year, 
      super_balance: p.super_balance,
      fire_age: p.fire_age 
    })),
    strategy: request.strategy.spenddown.type,
    returns: request.returns.scenario,
    assumptions: request.assumptions.id
  })
  
  let hash = 0
  for (let i = 0; i < hashString.length; i++) {
    const char = hashString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash)
}

// Re-export types for convenience
export type { RunRequest, RunResult, YearRow, ChartData } from './types'

// Re-export specialized engines for direct use if needed
export { runAccumulationPhase } from './accumulate'
export { runBridgePhase } from './bridge'
export { runSpenddownPhase } from './spenddown'
export { calculateAgePension } from './age-pension'
export { calculateTaxPosition } from './tax'
export { runMonteCarloAnalysis } from './monte-carlo'