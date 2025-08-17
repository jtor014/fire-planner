// Strategic Allocation Engine for Lump Sum Events
// Provides smart recommendations for optimal usage

import { LumpSumEvent, calculateTaxImpact } from './lump-sum-events'

export interface AllocationStrategy {
  name: string
  description: string
  priority: number // 1 = highest priority
  rationale: string
  tax_efficiency: number // 1-10 rating
  risk_level: 'low' | 'medium' | 'high'
  suitability_score: number // 0-100
}

export interface AllocationRecommendation {
  event: LumpSumEvent
  strategies: AllocationStrategy[]
  recommended_strategy: AllocationStrategy
  allocation_breakdown: {
    bridge_funding: number
    super_contributions: number
    debt_reduction: number
    investment_account: number
    emergency_buffer: number
  }
  tax_implications: {
    current_year_tax: number
    future_tax_savings: number
    net_position: number
  }
  reasoning: string[]
}

export interface StrategicAllocationPlan {
  total_allocation: number
  timeline_recommendations: AllocationRecommendation[]
  overall_strategy: string
  key_benefits: string[]
  potential_risks: string[]
  optimization_score: number // 0-100
}

export function generateAllocationStrategies(
  event: LumpSumEvent,
  bridgeYearsRemaining: number,
  currentSuperBalance: number,
  existingDebt: number = 0,
  bridgeFundingGap: number = 0
): AllocationStrategy[] {
  const { netAmount } = calculateTaxImpact(event)
  const strategies: AllocationStrategy[] = []

  // Bridge Funding First Strategy
  if (bridgeYearsRemaining > 0 && bridgeFundingGap > 0) {
    strategies.push({
      name: 'Bridge Funding Priority',
      description: 'Allocate primarily to cover FIRE bridge funding gap',
      priority: 1,
      rationale: `Cover ${bridgeYearsRemaining} years of bridge funding shortfall`,
      tax_efficiency: 8,
      risk_level: 'low',
      suitability_score: Math.min(100, (bridgeFundingGap / netAmount) * 100)
    })
  }

  // Super Contribution Strategy
  const superContribCap = 27500 // Annual concessional contribution cap
  const availableSuperContrib = Math.min(netAmount, superContribCap * 3) // 3 years worth
  
  strategies.push({
    name: 'Super Contribution Maximization',
    description: 'Maximize concessional super contributions for tax benefits',
    priority: 2,
    rationale: `Utilize ${availableSuperContrib.toLocaleString()} in super contribution caps`,
    tax_efficiency: 9,
    risk_level: 'low',
    suitability_score: Math.min(90, (availableSuperContrib / netAmount) * 100)
  })

  // Debt Reduction Strategy
  if (existingDebt > 0) {
    strategies.push({
      name: 'Debt Elimination',
      description: 'Pay down high-interest debt to reduce ongoing expenses',
      priority: existingDebt > 200000 ? 1 : 3,
      rationale: `Eliminate ${Math.min(existingDebt, netAmount).toLocaleString()} in debt`,
      tax_efficiency: 7,
      risk_level: 'low',
      suitability_score: Math.min(95, (Math.min(existingDebt, netAmount) / netAmount) * 100)
    })
  }

  // Investment Account Strategy
  strategies.push({
    name: 'Taxable Investment Portfolio',
    description: 'Build flexible investment portfolio for additional income',
    priority: 4,
    rationale: 'Create ongoing investment income and maintain liquidity',
    tax_efficiency: 6,
    risk_level: 'medium',
    suitability_score: 70
  })

  // Emergency Buffer Strategy
  strategies.push({
    name: 'Emergency Buffer Enhancement',
    description: 'Boost emergency fund for financial security',
    priority: 5,
    rationale: 'Maintain 12+ months of expenses in liquid savings',
    tax_efficiency: 5,
    risk_level: 'low',
    suitability_score: 60
  })

  // Balanced Approach Strategy
  strategies.push({
    name: 'Balanced Allocation',
    description: 'Diversify across multiple financial goals',
    priority: 3,
    rationale: 'Optimize across bridge funding, super, and investments',
    tax_efficiency: 7,
    risk_level: 'medium',
    suitability_score: 85
  })

  return strategies.sort((a, b) => b.suitability_score - a.suitability_score)
}

export function calculateOptimalAllocation(
  event: LumpSumEvent,
  annualExpenses: number,
  bridgeYearsRemaining: number,
  currentSuperBalance: number,
  existingDebt: number = 0,
  bridgeFundingGap: number = 0,
  existingEmergencyFund: number = 0
): AllocationRecommendation {
  const { netAmount } = calculateTaxImpact(event)
  const strategies = generateAllocationStrategies(
    event, 
    bridgeYearsRemaining, 
    currentSuperBalance, 
    existingDebt, 
    bridgeFundingGap
  )
  
  const recommended_strategy = strategies[0] // Highest suitability score
  
  // Calculate optimal allocation breakdown
  let remaining = netAmount
  const allocation = {
    bridge_funding: 0,
    super_contributions: 0,
    debt_reduction: 0,
    investment_account: 0,
    emergency_buffer: 0
  }

  // 1. Bridge funding gap (highest priority)
  if (bridgeFundingGap > 0) {
    allocation.bridge_funding = Math.min(remaining, bridgeFundingGap)
    remaining -= allocation.bridge_funding
  }

  // 2. Emergency buffer (ensure 12 months expenses)
  const emergencyTarget = annualExpenses
  const emergencyNeeded = Math.max(0, emergencyTarget - existingEmergencyFund)
  if (emergencyNeeded > 0 && remaining > 0) {
    allocation.emergency_buffer = Math.min(remaining * 0.2, emergencyNeeded) // Max 20% to emergency
    remaining -= allocation.emergency_buffer
  }

  // 3. Debt reduction (if high interest debt exists)
  if (existingDebt > 0 && remaining > 0) {
    allocation.debt_reduction = Math.min(remaining * 0.4, existingDebt) // Max 40% to debt
    remaining -= allocation.debt_reduction
  }

  // 4. Super contributions (tax efficient)
  if (remaining > 0) {
    const superContribCap = 27500 * 3 // 3 years of caps
    allocation.super_contributions = Math.min(remaining * 0.5, superContribCap)
    remaining -= allocation.super_contributions
  }

  // 5. Investment account (remainder)
  allocation.investment_account = remaining

  // Calculate tax implications
  const tax_implications = {
    current_year_tax: calculateTaxImpact(event).taxAmount,
    future_tax_savings: allocation.super_contributions * 0.15, // Super contribution tax vs marginal rate
    net_position: allocation.super_contributions * 0.15 - calculateTaxImpact(event).taxAmount
  }

  // Generate reasoning
  const reasoning: string[] = []
  
  if (allocation.bridge_funding > 0) {
    reasoning.push(`Prioritize ${allocation.bridge_funding.toLocaleString()} for bridge funding to ensure FIRE feasibility`)
  }
  
  if (allocation.emergency_buffer > 0) {
    reasoning.push(`Allocate ${allocation.emergency_buffer.toLocaleString()} to emergency fund for financial security`)
  }
  
  if (allocation.debt_reduction > 0) {
    reasoning.push(`Pay down ${allocation.debt_reduction.toLocaleString()} in debt to reduce ongoing expenses`)
  }
  
  if (allocation.super_contributions > 0) {
    reasoning.push(`Contribute ${allocation.super_contributions.toLocaleString()} to super for 15% tax rate vs higher marginal rate`)
  }
  
  if (allocation.investment_account > 0) {
    reasoning.push(`Invest ${allocation.investment_account.toLocaleString()} in taxable accounts for flexibility and additional income`)
  }

  return {
    event,
    strategies,
    recommended_strategy,
    allocation_breakdown: allocation,
    tax_implications,
    reasoning
  }
}

export function generateStrategicPlan(
  events: LumpSumEvent[],
  annualExpenses: number,
  bridgeYearsRemaining: number,
  currentSuperBalance: number,
  existingDebt: number = 0,
  bridgeFundingGap: number = 0
): StrategicAllocationPlan {
  const timeline_recommendations = events.map(event => 
    calculateOptimalAllocation(
      event,
      annualExpenses,
      bridgeYearsRemaining,
      currentSuperBalance,
      existingDebt,
      bridgeFundingGap
    )
  )

  const total_allocation = events.reduce((sum, event) => {
    return sum + calculateTaxImpact(event).netAmount * (event.probability / 100)
  }, 0)

  // Determine overall strategy
  let overall_strategy = 'Balanced Wealth Building'
  if (bridgeFundingGap > total_allocation * 0.7) {
    overall_strategy = 'Bridge Funding Focus'
  } else if (existingDebt > total_allocation * 0.5) {
    overall_strategy = 'Debt Elimination Priority'
  } else if (currentSuperBalance < annualExpenses * 15) {
    overall_strategy = 'Super Contribution Maximization'
  }

  const key_benefits = [
    'Tax-optimized allocation across multiple goals',
    'Prioritized bridge funding for FIRE feasibility',
    'Maximized use of super contribution caps',
    'Balanced approach to debt, emergency fund, and investments'
  ]

  const potential_risks = [
    'Market volatility may affect investment returns',
    'Policy changes could impact super contribution strategies',
    'Lump sum events may not materialize as expected',
    'Inflation may erode purchasing power over time'
  ]

  // Calculate optimization score based on multiple factors
  const bridgeCoverage = Math.min(100, (total_allocation / Math.max(bridgeFundingGap, 1)) * 100)
  const diversification = events.length > 1 ? 85 : 70
  const taxEfficiency = timeline_recommendations.reduce((avg, rec) => 
    avg + rec.recommended_strategy.tax_efficiency, 0) / timeline_recommendations.length * 10
  
  const optimization_score = Math.round((bridgeCoverage + diversification + taxEfficiency) / 3)

  return {
    total_allocation,
    timeline_recommendations,
    overall_strategy,
    key_benefits,
    potential_risks,
    optimization_score
  }
}