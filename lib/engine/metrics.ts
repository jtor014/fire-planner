// Key metrics calculation from timeline results
// Extracts important insights and recommendations

import type { YearRow, RunRequest } from './types'

export interface MetricsResult {
  // Bridge Phase
  bridge_required_today: number
  bridge_years_needed: number
  bridge_feasible: boolean
  
  // Super Phase
  super_lasts_to_age: { [personId: string]: number | null }
  super_exhaustion_year: number | null
  
  // Age Pension
  pension_start_year: { [personId: string]: number | null }
  lifetime_pension_value: number
  
  // Overall Assessment
  fire_feasible: boolean
  fire_confidence_score: number // 0-100
  major_risks: string[]
  optimization_opportunities: string[]
}

/**
 * Calculate key metrics from simulation timeline
 */
export function calculateMetrics(timeline: YearRow[], request: RunRequest): MetricsResult {
  
  // Bridge phase analysis
  const bridgeAnalysis = analyzeBridgePhase(timeline, request)
  
  // Super phase analysis
  const superAnalysis = analyzeSuperPhase(timeline, request)
  
  // Age pension analysis
  const pensionAnalysis = analyzeAgePension(timeline, request)
  
  // Overall feasibility assessment
  const feasibilityAnalysis = analyzeFeasibility(timeline, request)

  return {
    // Bridge Phase
    bridge_required_today: bridgeAnalysis.required_today,
    bridge_years_needed: bridgeAnalysis.years_needed,
    bridge_feasible: bridgeAnalysis.feasible,
    
    // Super Phase
    super_lasts_to_age: superAnalysis.lasts_to_age,
    super_exhaustion_year: superAnalysis.exhaustion_year,
    
    // Age Pension
    pension_start_year: pensionAnalysis.start_year,
    lifetime_pension_value: pensionAnalysis.lifetime_value,
    
    // Overall Assessment
    fire_feasible: feasibilityAnalysis.feasible,
    fire_confidence_score: feasibilityAnalysis.confidence_score,
    major_risks: feasibilityAnalysis.major_risks,
    optimization_opportunities: feasibilityAnalysis.optimization_opportunities
  }
}

/**
 * Analyze bridge phase requirements and feasibility
 */
function analyzeBridgePhase(timeline: YearRow[], request: RunRequest) {
  const currentYear = new Date().getFullYear()
  const preservationAge = request.assumptions.superannuation.preservation_age
  
  // Find when first person reaches preservation age
  const youngestFireAge = Math.min(...request.household.people
    .filter(p => p.fire_age)
    .map(p => p.fire_age!))
  
  const oldestCurrentAge = Math.max(...request.household.people
    .map(p => currentYear - p.birth_year))
  
  // Bridge years needed
  const bridgeYearsNeeded = Math.max(0, preservationAge - youngestFireAge)
  
  // Calculate bridge funding requirement
  let totalBridgeShortfall = 0
  let bridgeYearsWithShortfall = 0
  
  for (const yearRow of timeline) {
    const yearsSinceStart = yearRow.year - currentYear
    
    // Only count bridge years (before preservation age access)
    if (yearsSinceStart < bridgeYearsNeeded) {
      if (yearRow.surplus_deficit < 0) {
        totalBridgeShortfall += Math.abs(yearRow.surplus_deficit)
        bridgeYearsWithShortfall++
      }
    }
  }
  
  const bridgeRequiredToday = totalBridgeShortfall
  const bridgeFeasible = totalBridgeShortfall <= (request.household.assets.non_super_investments * 0.8)
  
  return {
    required_today: bridgeRequiredToday,
    years_needed: bridgeYearsNeeded,
    feasible: bridgeFeasible
  }
}

/**
 * Analyze super phase sustainability
 */
function analyzeSuperPhase(timeline: YearRow[], request: RunRequest) {
  const lasts_to_age: { [personId: string]: number | null } = {}
  let super_exhaustion_year: number | null = null
  
  // Analyze each person's super sustainability
  for (const person of request.household.people) {
    let lastYearWithSuper: YearRow | null = null
    
    for (const yearRow of timeline) {
      if (yearRow.super_balances[person.id] > 1000) { // Effectively non-zero
        lastYearWithSuper = yearRow
      }
    }
    
    if (lastYearWithSuper) {
      lasts_to_age[person.id] = lastYearWithSuper.ages[person.id]
    } else {
      lasts_to_age[person.id] = null // Super already exhausted or never accessible
    }
  }
  
  // Find when total super is exhausted
  const totalSuperExhaustionRow = timeline.find(row => row.total_super <= 1000)
  if (totalSuperExhaustionRow) {
    super_exhaustion_year = totalSuperExhaustionRow.year
  }
  
  return {
    lasts_to_age,
    exhaustion_year: super_exhaustion_year
  }
}

/**
 * Analyze age pension timeline and value
 */
function analyzeAgePension(timeline: YearRow[], request: RunRequest) {
  const start_year: { [personId: string]: number | null } = {}
  let lifetime_pension_value = 0
  
  // Find when each person first becomes eligible for age pension
  for (const person of request.household.people) {
    const firstPensionYear = timeline.find(row => 
      row.age_pension_eligible[person.id] && row.age_pension_amount[person.id] > 0
    )
    
    start_year[person.id] = firstPensionYear ? firstPensionYear.year : null
  }
  
  // Calculate total lifetime pension value
  for (const yearRow of timeline) {
    const totalPensionThisYear = Object.values(yearRow.age_pension_amount)
      .reduce((sum, amount) => sum + amount, 0)
    lifetime_pension_value += totalPensionThisYear
  }
  
  return {
    start_year,
    lifetime_value: lifetime_pension_value
  }
}

/**
 * Analyze overall FIRE feasibility and provide insights
 */
function analyzeFeasibility(timeline: YearRow[], request: RunRequest) {
  const feasibleYears = timeline.filter(row => row.fire_feasible).length
  const totalYears = timeline.length
  const feasibilityRate = feasibleYears / totalYears
  
  // Basic feasibility (>80% of years feasible)
  const fire_feasible = feasibilityRate >= 0.8
  
  // Confidence score based on multiple factors
  let confidence_score = feasibilityRate * 60 // Base score from feasibility rate
  
  // Bonus points for strong financial position
  const finalYear = timeline[timeline.length - 1]
  if (finalYear && finalYear.total_net_worth > request.household.annual_expenses.current * 10) {
    confidence_score += 20 // Strong final position
  }
  
  // Bonus for age pension eligibility
  const hasPensionIncome = timeline.some(row => 
    Object.values(row.age_pension_amount).some(amount => amount > 0)
  )
  if (hasPensionIncome) {
    confidence_score += 10 // Pension provides safety net
  }
  
  // Penalty for high volatility
  const surplusValues = timeline.map(row => row.surplus_deficit)
  const volatility = calculateVolatility(surplusValues)
  if (volatility > request.household.annual_expenses.current * 0.5) {
    confidence_score -= 10 // High income volatility
  }
  
  confidence_score = Math.max(0, Math.min(100, confidence_score))
  
  // Identify major risks
  const major_risks: string[] = []
  
  if (!fire_feasible) {
    major_risks.push('FIRE plan not currently feasible - insufficient income to cover expenses')
  }
  
  const bridgeShortfallYears = timeline.filter(row => 
    row.year < new Date().getFullYear() + 10 && row.surplus_deficit < 0
  ).length
  if (bridgeShortfallYears > 3) {
    major_risks.push('Significant bridge funding shortfall in early FIRE years')
  }
  
  const superExhaustionAge = Math.min(...Object.values(
    analyzeSuperPhase(timeline, request).lasts_to_age
  ).filter(age => age !== null) as number[])
  if (superExhaustionAge < 80) {
    major_risks.push('Super may be exhausted before age 80 - longevity risk')
  }
  
  // Identify optimization opportunities
  const optimization_opportunities: string[] = []
  
  if (request.household.assets.non_super_investments < request.household.annual_expenses.current * 2) {
    optimization_opportunities.push('Increase non-super investments for bridge funding flexibility')
  }
  
  const hasRentalIncome = request.strategy.bridge.rental_income.use_portfolio
  if (!hasRentalIncome && fire_feasible) {
    optimization_opportunities.push('Consider rental property investment for additional FIRE income')
  }
  
  const usesMinDrawdownOnly = request.strategy.spenddown.type === 'min_drawdown_only'
  if (usesMinDrawdownOnly && confidence_score > 70) {
    optimization_opportunities.push('Consider dynamic withdrawal strategy to optimize super longevity')
  }
  
  return {
    feasible: fire_feasible,
    confidence_score: Math.round(confidence_score),
    major_risks,
    optimization_opportunities
  }
}

/**
 * Calculate volatility (standard deviation) of a series
 */
function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const squaredDifferences = values.map(val => Math.pow(val - mean, 2))
  const variance = squaredDifferences.reduce((sum, sq) => sum + sq, 0) / values.length
  
  return Math.sqrt(variance)
}