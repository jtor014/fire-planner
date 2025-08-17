// Bridge phase income calculations (FIRE to preservation age)
// Orchestrates all income sources during the gap years

import type { RunRequest, YearRow, BridgeIncome } from './types'

// Self-contained bridge income calculations

export interface BridgePhaseResult {
  salary_income: number
  part_time_income: number
  rental_income: number
  lump_sum_received: number
  total_bridge_income: number
}

/**
 * Calculate bridge income for a specific year
 * 
 * This orchestrates all income sources during the FIRE-to-preservation-age gap:
 * - Working partner salary (if staggered retirement)
 * - Part-time/consulting income
 * - Rental property income
 * - Lump sum events (inheritance, property sales, etc.)
 */
export async function runBridgePhase(
  year: number,
  request: RunRequest,
  ages: { [personId: string]: number },
  firedPeople: any[],
  previousYear?: YearRow
): Promise<BridgePhaseResult> {
  
  const { household, strategy } = request
  const currentYear = new Date().getFullYear()
  const yearsSinceStart = year - currentYear

  // 1. Calculate working partner salary income (staggered retirement)
  const salary_income = calculateWorkingPartnerIncome(
    year,
    request,
    ages,
    firedPeople
  )

  // 2. Calculate part-time/consulting income  
  const part_time_income = calculatePartTimeIncomeForYear(
    year,
    request,
    yearsSinceStart
  )

  // 3. Calculate rental property income
  const rental_income = calculateRentalIncomeForYear(
    year,
    request,
    yearsSinceStart
  )

  // 4. Process lump sum events for this year
  const lump_sum_received = calculateLumpSumForYear(
    year,
    request
  )

  const total_bridge_income = salary_income + part_time_income + rental_income + lump_sum_received

  return {
    salary_income,
    part_time_income,
    rental_income,
    lump_sum_received,
    total_bridge_income
  }
}

/**
 * Calculate working partner salary income for staggered retirement strategies
 */
function calculateWorkingPartnerIncome(
  year: number,
  request: RunRequest,
  ages: { [personId: string]: number },
  firedPeople: any[]
): number {
  const { household, strategy } = request

  // Only applies to couple households with staggered retirement
  if (household.structure !== 'couple') {
    return 0
  }

  // Check if we're in a staggered retirement scenario
  const isStaggeredStrategy = [
    'person1_fire_first',
    'person2_fire_first', 
    'staggered_retirement'
  ].includes(strategy.household.type)

  if (!isStaggeredStrategy) {
    return 0
  }

  // Find the working partner
  const workingPartner = household.people.find(person => {
    const hasFired = firedPeople.some(fired => fired.id === person.id)
    const hasReachedPreservationAge = ages[person.id] >= 60 // TODO: Use assumptions.superannuation.preservation_age
    return !hasFired && !hasReachedPreservationAge
  })

  if (!workingPartner) {
    return 0
  }

  // Get salary bridge configuration for this person
  const salaryConfig = strategy.bridge.salary_income[workingPartner.id]
  if (!salaryConfig) {
    return workingPartner.annual_salary // Full salary if no decline specified
  }

  // Apply salary decline over time
  const yearsWorking = Math.min(
    salaryConfig.years_working_post_fire,
    60 - ages[workingPartner.id] // Can't work past preservation age in this model
  )

  if (yearsWorking <= 0) {
    return 0
  }

  // Calculate declined salary using decline rate
  const declinedSalary = workingPartner.annual_salary * 
    Math.pow(1 - (salaryConfig.salary_decline_rate / 100), yearsWorking)

  return declinedSalary
}

/**
 * Calculate part-time income using existing enhanced bridge income logic
 */
function calculatePartTimeIncomeForYear(
  year: number,
  request: RunRequest,
  yearsSinceStart: number
): number {
  const { strategy } = request
  const partTimeConfig = strategy.bridge.part_time_income

  if (!partTimeConfig || partTimeConfig.annual_amount <= 0) {
    return 0
  }

  // Check if we're still within the duration
  if (yearsSinceStart >= partTimeConfig.years_duration) {
    return 0
  }

  // Apply decline over time
  const declinedIncome = partTimeConfig.annual_amount * 
    Math.pow(1 - (partTimeConfig.decline_rate / 100), yearsSinceStart)

  return Math.max(0, declinedIncome)
}

/**
 * Calculate rental income using existing rental modeling engine
 */
function calculateRentalIncomeForYear(
  year: number,
  request: RunRequest,
  yearsSinceStart: number
): number {
  const { strategy } = request
  const rentalConfig = strategy.bridge.rental_income

  if (!rentalConfig.use_portfolio || !rentalConfig.properties.length) {
    return 0
  }

  let totalRentalIncome = 0

  // Calculate income from each property
  rentalConfig.properties.forEach(property => {
    // Use existing rental projection logic
    const annualRent = property.weekly_rent * 52
    const grownRent = annualRent * Math.pow(1 + (property.rental_growth_rate / 100), yearsSinceStart)
    const vacancyLoss = grownRent * (property.vacancy_rate / 100)
    const netRent = grownRent - vacancyLoss - property.annual_expenses

    totalRentalIncome += Math.max(0, netRent)
  })

  return totalRentalIncome
}

/**
 * Calculate lump sum events for this specific year
 */
function calculateLumpSumForYear(
  year: number,
  request: RunRequest
): number {
  const { strategy } = request
  const lumpSumEvents = strategy.bridge.lump_sum_events

  if (!lumpSumEvents || !lumpSumEvents.length) {
    return 0
  }

  let totalLumpSum = 0

  // Process events that occur in this year
  lumpSumEvents.forEach(event => {
    const eventYear = event.date.getFullYear()
    
    if (eventYear === year) {
      // Apply probability and tax treatment
      const expectedValue = event.amount * (event.probability / 100)
      
      // Apply tax treatment (simplified for now)
      let netAmount = expectedValue
      switch (event.tax_treatment) {
        case 'capital_gains':
          netAmount = expectedValue * 0.875 // Assume 12.5% effective CGT rate
          break
        case 'income':
          netAmount = expectedValue * 0.675 // Assume 32.5% marginal tax rate
          break
        case 'super_contribution':
          netAmount = expectedValue * 0.85 // 15% super contributions tax
          break
        case 'tax_free':
        default:
          netAmount = expectedValue
          break
      }

      // Only count events allocated to bridge funding
      if (event.allocation_strategy === 'bridge_funding') {
        totalLumpSum += netAmount
      }
    }
  })

  return totalLumpSum
}

/**
 * Calculate total bridge funding requirement for planning purposes
 */
export function calculateBridgeRequirement(
  request: RunRequest,
  yearsUntilPreservationAge: number
): number {
  const annualExpenses = request.household.annual_expenses.current
  const currentYear = new Date().getFullYear()
  
  let totalRequirement = 0
  let totalBridgeIncome = 0

  // Project forward to estimate requirement
  for (let year = 0; year < yearsUntilPreservationAge; year++) {
    const projectedYear = currentYear + year
    
    // Estimate expenses (with inflation)
    const inflatedExpenses = annualExpenses * Math.pow(
      1 + request.returns.assumptions.inflation_rate, 
      year
    )

    // Estimate bridge income (simplified projection)
    const estimatedBridgeIncome = estimateBridgeIncomeForYear(request, year)

    totalRequirement += inflatedExpenses
    totalBridgeIncome += estimatedBridgeIncome
  }

  return Math.max(0, totalRequirement - totalBridgeIncome)
}

/**
 * Simplified bridge income estimation for planning purposes
 */
function estimateBridgeIncomeForYear(request: RunRequest, yearOffset: number): number {
  const partTimeConfig = request.strategy.bridge.part_time_income
  const rentalConfig = request.strategy.bridge.rental_income
  
  let estimated = 0

  // Part-time income estimate
  if (partTimeConfig && yearOffset < partTimeConfig.years_duration) {
    estimated += partTimeConfig.annual_amount * 
      Math.pow(1 - (partTimeConfig.decline_rate / 100), yearOffset)
  }

  // Rental income estimate (simplified)
  if (rentalConfig.use_portfolio) {
    const totalWeeklyRent = rentalConfig.properties.reduce(
      (sum, prop) => sum + prop.weekly_rent, 0
    )
    const avgGrowthRate = rentalConfig.properties.reduce(
      (sum, prop) => sum + prop.rental_growth_rate, 0
    ) / rentalConfig.properties.length / 100

    estimated += totalWeeklyRent * 52 * Math.pow(1 + avgGrowthRate, yearOffset) * 0.9 // 90% after expenses/vacancy
  }

  // Lump sum events (expected value)
  request.strategy.bridge.lump_sum_events.forEach(event => {
    const eventYear = event.date.getFullYear() - new Date().getFullYear()
    if (eventYear === yearOffset && event.allocation_strategy === 'bridge_funding') {
      estimated += event.amount * (event.probability / 100) * 0.8 // Conservative tax adjustment
    }
  })

  return estimated
}