// Dynamic Withdrawal Rate Engine
// Adjusts withdrawal rates based on market performance and portfolio health

export interface MarketCondition {
  year: number
  portfolio_return: number // Actual return this year
  portfolio_value: number // Current portfolio value
  market_volatility: number // Recent volatility measure
  inflation_rate: number
  withdrawal_amount: number // Amount withdrawn this year
}

export interface WithdrawalRule {
  name: string
  description: string
  min_rate: number // Minimum withdrawal rate (e.g., 0.03 = 3%)
  max_rate: number // Maximum withdrawal rate (e.g., 0.06 = 6%)
  base_rate: number // Starting withdrawal rate (e.g., 0.04 = 4%)
  adjustment_factor: number // How aggressively to adjust (0.1 = 10% of recommended change)
  safety_buffer: number // Portfolio value buffer before adjustments (e.g., 1.2 = 20% buffer)
  lookback_years: number // Years to consider for performance evaluation
}

export interface DynamicWithdrawalStrategy {
  rule: WithdrawalRule
  annual_adjustments: {
    year: number
    previous_rate: number
    market_performance: number // 3-year rolling average
    portfolio_health: number // Current value vs initial target
    recommended_rate: number
    actual_rate: number // After min/max constraints
    adjustment_reason: string
    confidence_level: number // 0-100
  }[]
  success_probability: number
  total_withdrawals: number
  final_portfolio_value: number
  sustainability_score: number
}

export interface GuardrailsStrategy {
  upper_guardrail: number // e.g., 1.2 = 20% above initial value
  lower_guardrail: number // e.g., 0.8 = 20% below initial value
  prosperity_bonus: number // Extra withdrawal when above upper guardrail
  austerity_reduction: number // Withdrawal reduction when below lower guardrail
  guardrail_period: number // Years to wait before major adjustments
  current_guardrail_status: 'prosperity' | 'normal' | 'austerity'
}

// Predefined withdrawal rules
export const WITHDRAWAL_RULES: WithdrawalRule[] = [
  {
    name: 'Conservative Fixed (4% Rule)',
    description: 'Traditional 4% rule with minimal adjustments',
    min_rate: 0.035,
    max_rate: 0.045,
    base_rate: 0.04,
    adjustment_factor: 0.05, // Very small adjustments
    safety_buffer: 1.1,
    lookback_years: 1
  },
  {
    name: 'Moderate Dynamic',
    description: 'Balanced approach with moderate market-based adjustments',
    min_rate: 0.03,
    max_rate: 0.055,
    base_rate: 0.04,
    adjustment_factor: 0.15,
    safety_buffer: 1.15,
    lookback_years: 3
  },
  {
    name: 'Aggressive Adaptive',
    description: 'Responsive to market conditions with larger adjustments',
    min_rate: 0.025,
    max_rate: 0.07,
    base_rate: 0.04,
    adjustment_factor: 0.25,
    safety_buffer: 1.2,
    lookback_years: 3
  },
  {
    name: 'Guardrails Strategy',
    description: 'Use portfolio value guardrails to trigger adjustments',
    min_rate: 0.03,
    max_rate: 0.06,
    base_rate: 0.04,
    adjustment_factor: 0.2,
    safety_buffer: 1.15,
    lookback_years: 2
  },
  {
    name: 'Volatility Adjusted',
    description: 'Adjust based on market volatility and recent performance',
    min_rate: 0.025,
    max_rate: 0.065,
    base_rate: 0.04,
    adjustment_factor: 0.3,
    safety_buffer: 1.25,
    lookback_years: 5
  }
]

export function calculateDynamicWithdrawalRate(
  currentRate: number,
  marketConditions: MarketCondition[],
  rule: WithdrawalRule,
  initialPortfolioValue: number,
  targetAnnualIncome: number
): { newRate: number; reason: string; confidence: number } {
  
  const recentConditions = marketConditions.slice(-rule.lookback_years)
  if (recentConditions.length === 0) {
    return { 
      newRate: currentRate, 
      reason: 'Insufficient data for adjustment', 
      confidence: 50 
    }
  }
  
  // Calculate market performance metrics
  const avgReturn = recentConditions.reduce((sum, c) => sum + c.portfolio_return, 0) / recentConditions.length
  const avgVolatility = recentConditions.reduce((sum, c) => sum + c.market_volatility, 0) / recentConditions.length
  const currentPortfolioValue = marketConditions[marketConditions.length - 1]?.portfolio_value || initialPortfolioValue
  
  // Portfolio health relative to initial value (adjusted for withdrawals)
  const portfolioHealthRatio = currentPortfolioValue / initialPortfolioValue
  
  // Base adjustment calculation
  let adjustmentRecommendation = 0
  let reason = ''
  let confidence = 70
  
  // 1. Market performance adjustment
  if (avgReturn > 0.08) { // Strong performance
    adjustmentRecommendation += 0.005 // +0.5%
    reason += 'Strong market performance (+0.5%). '
    confidence += 10
  } else if (avgReturn < 0.02) { // Poor performance
    adjustmentRecommendation -= 0.01 // -1%
    reason += 'Below-target returns (-1%). '
    confidence += 15
  }
  
  // 2. Portfolio health adjustment
  if (portfolioHealthRatio > rule.safety_buffer) {
    adjustmentRecommendation += 0.003 // +0.3%
    reason += 'Portfolio above safety buffer (+0.3%). '
    confidence += 10
  } else if (portfolioHealthRatio < 0.9) {
    adjustmentRecommendation -= 0.008 // -0.8%
    reason += 'Portfolio health concern (-0.8%). '
    confidence += 20
  }
  
  // 3. Volatility adjustment
  if (avgVolatility > 0.25) { // High volatility
    adjustmentRecommendation -= 0.003 // -0.3%
    reason += 'High market volatility (-0.3%). '
    confidence += 5
  } else if (avgVolatility < 0.12) { // Low volatility
    adjustmentRecommendation += 0.002 // +0.2%
    reason += 'Low volatility environment (+0.2%). '
  }
  
  // 4. Inflation protection
  const recentInflation = recentConditions[recentConditions.length - 1]?.inflation_rate || 0.025
  if (recentInflation > 0.04) { // High inflation
    adjustmentRecommendation += Math.min(0.005, recentInflation - 0.025)
    reason += `High inflation adjustment (+${(Math.min(0.005, recentInflation - 0.025) * 100).toFixed(1)}%). `
    confidence -= 5
  }
  
  // Apply adjustment factor (how aggressively to adjust)
  const scaledAdjustment = adjustmentRecommendation * rule.adjustment_factor
  let newRate = currentRate + scaledAdjustment
  
  // Apply min/max constraints
  newRate = Math.max(rule.min_rate, Math.min(rule.max_rate, newRate))
  
  // Round to reasonable precision
  newRate = Math.round(newRate * 1000) / 1000
  
  if (Math.abs(newRate - currentRate) < 0.001) {
    reason = 'No significant adjustment needed'
    confidence = 80
  }
  
  return { 
    newRate, 
    reason: reason.trim() || 'Standard rule-based adjustment', 
    confidence: Math.min(95, confidence) 
  }
}

export function calculateGuardrailsAdjustment(
  currentPortfolioValue: number,
  initialPortfolioValue: number,
  currentWithdrawalRate: number,
  guardrails: GuardrailsStrategy,
  yearsInRetirement: number
): { newRate: number; status: GuardrailsStrategy['current_guardrail_status']; reason: string } {
  
  const portfolioRatio = currentPortfolioValue / initialPortfolioValue
  
  let newRate = currentWithdrawalRate
  let status: GuardrailsStrategy['current_guardrail_status'] = 'normal'
  let reason = 'Portfolio within normal guardrails'
  
  if (portfolioRatio >= guardrails.upper_guardrail) {
    // Prosperity - can increase withdrawals
    status = 'prosperity'
    newRate = currentWithdrawalRate * (1 + guardrails.prosperity_bonus)
    reason = `Portfolio ${((portfolioRatio - 1) * 100).toFixed(1)}% above initial value - prosperity bonus applied`
    
  } else if (portfolioRatio <= guardrails.lower_guardrail) {
    // Austerity - reduce withdrawals
    status = 'austerity'
    newRate = currentWithdrawalRate * (1 - guardrails.austerity_reduction)
    reason = `Portfolio ${((1 - portfolioRatio) * 100).toFixed(1)}% below initial value - austerity measures applied`
  }
  
  // Don't adjust too frequently
  if (yearsInRetirement < guardrails.guardrail_period && status !== 'austerity') {
    newRate = currentWithdrawalRate
    reason += ' (adjustment delayed for stability)'
  }
  
  return { newRate, status, reason }
}

export function runDynamicWithdrawalSimulation(
  initialPortfolioValue: number,
  targetAnnualIncome: number,
  rule: WithdrawalRule,
  marketReturns: number[], // Projected annual returns
  inflationRates: number[], // Projected inflation rates
  volatilityEstimates: number[] // Projected volatility
): DynamicWithdrawalStrategy {
  
  const annual_adjustments = []
  let currentPortfolioValue = initialPortfolioValue
  let currentRate = rule.base_rate
  let totalWithdrawals = 0
  const marketConditions: MarketCondition[] = []
  
  const simulationYears = Math.min(marketReturns.length, 30) // Max 30 years
  
  for (let year = 0; year < simulationYears; year++) {
    const marketReturn = marketReturns[year] || 0.07 // Default 7%
    const inflationRate = inflationRates[year] || 0.025 // Default 2.5%
    const volatility = volatilityEstimates[year] || 0.15 // Default 15%
    
    // Calculate withdrawal amount
    const withdrawalAmount = currentPortfolioValue * currentRate
    totalWithdrawals += withdrawalAmount
    
    // Apply market returns and withdrawals
    const portfolioBeforeWithdrawal = currentPortfolioValue * (1 + marketReturn)
    currentPortfolioValue = portfolioBeforeWithdrawal - withdrawalAmount
    
    // Record market conditions
    marketConditions.push({
      year: year + 1,
      portfolio_return: marketReturn,
      portfolio_value: currentPortfolioValue,
      market_volatility: volatility,
      inflation_rate: inflationRate,
      withdrawal_amount: withdrawalAmount
    })
    
    // Calculate new withdrawal rate for next year
    const { newRate, reason, confidence } = calculateDynamicWithdrawalRate(
      currentRate,
      marketConditions,
      rule,
      initialPortfolioValue,
      targetAnnualIncome
    )
    
    // Calculate market performance metric
    const recentConditions = marketConditions.slice(-rule.lookback_years)
    const marketPerformance = recentConditions.reduce((sum, c) => sum + c.portfolio_return, 0) / recentConditions.length
    const portfolioHealth = currentPortfolioValue / initialPortfolioValue
    
    annual_adjustments.push({
      year: year + 1,
      previous_rate: currentRate,
      market_performance: marketPerformance,
      portfolio_health: portfolioHealth,
      recommended_rate: newRate,
      actual_rate: newRate,
      adjustment_reason: reason,
      confidence_level: confidence
    })
    
    currentRate = newRate
    
    // Early exit if portfolio depleted
    if (currentPortfolioValue <= 0) {
      break
    }
  }
  
  // Calculate success metrics
  const successProbability = currentPortfolioValue > 0 ? 
    Math.min(95, 60 + (currentPortfolioValue / initialPortfolioValue) * 30) : 0
  
  const sustainabilityScore = calculateSustainabilityScore(
    annual_adjustments,
    currentPortfolioValue,
    initialPortfolioValue
  )
  
  return {
    rule,
    annual_adjustments,
    success_probability: Math.round(successProbability),
    total_withdrawals: totalWithdrawals,
    final_portfolio_value: Math.max(0, currentPortfolioValue),
    sustainability_score: sustainabilityScore
  }
}

function calculateSustainabilityScore(
  adjustments: DynamicWithdrawalStrategy['annual_adjustments'],
  finalValue: number,
  initialValue: number
): number {
  let score = 50 // Base score
  
  // Portfolio preservation
  const portfolioPreservation = finalValue / initialValue
  if (portfolioPreservation > 0.8) score += 30
  else if (portfolioPreservation > 0.5) score += 15
  else if (portfolioPreservation > 0.2) score += 5
  else score -= 20
  
  // Withdrawal rate stability
  const rates = adjustments.map(a => a.actual_rate)
  const rateVariance = calculateVariance(rates)
  if (rateVariance < 0.0001) score += 15 // Very stable
  else if (rateVariance < 0.0004) score += 10 // Moderately stable
  else if (rateVariance > 0.001) score -= 10 // High volatility
  
  // Confidence in adjustments
  const avgConfidence = adjustments.reduce((sum, a) => sum + a.confidence_level, 0) / adjustments.length
  score += (avgConfidence - 70) * 0.3
  
  // Market adaptation
  const marketAdaptations = adjustments.filter(a => Math.abs(a.actual_rate - a.previous_rate) > 0.002).length
  const adaptationRate = marketAdaptations / adjustments.length
  if (adaptationRate > 0.1 && adaptationRate < 0.4) score += 10 // Good adaptation
  else if (adaptationRate > 0.5) score -= 5 // Too volatile
  
  return Math.max(0, Math.min(100, Math.round(score)))
}

function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length
  const squaredDifferences = numbers.map(n => Math.pow(n - mean, 2))
  return squaredDifferences.reduce((sum, sq) => sum + sq, 0) / numbers.length
}

export function generateMarketScenarios(
  years: number,
  baseReturn: number = 0.07,
  baseInflation: number = 0.025,
  baseVolatility: number = 0.15
): {
  optimistic: { returns: number[]; inflation: number[]; volatility: number[] },
  expected: { returns: number[]; inflation: number[]; volatility: number[] },
  pessimistic: { returns: number[]; inflation: number[]; volatility: number[] }
} {
  
  const scenarios = {
    optimistic: { returns: [] as number[], inflation: [] as number[], volatility: [] as number[] },
    expected: { returns: [] as number[], inflation: [] as number[], volatility: [] as number[] },
    pessimistic: { returns: [] as number[], inflation: [] as number[], volatility: [] as number[] }
  }
  
  for (let year = 0; year < years; year++) {
    // Add some variability to make it realistic
    const returnVariation = (Math.random() - 0.5) * 0.1 // ±5% variation
    const inflationVariation = (Math.random() - 0.5) * 0.02 // ±1% variation
    const volatilityVariation = (Math.random() - 0.5) * 0.05 // ±2.5% variation
    
    // Optimistic scenario
    scenarios.optimistic.returns.push(baseReturn + 0.02 + returnVariation)
    scenarios.optimistic.inflation.push(Math.max(0.01, baseInflation - 0.005 + inflationVariation))
    scenarios.optimistic.volatility.push(Math.max(0.08, baseVolatility - 0.03 + volatilityVariation))
    
    // Expected scenario
    scenarios.expected.returns.push(baseReturn + returnVariation)
    scenarios.expected.inflation.push(Math.max(0.01, baseInflation + inflationVariation))
    scenarios.expected.volatility.push(Math.max(0.08, baseVolatility + volatilityVariation))
    
    // Pessimistic scenario
    scenarios.pessimistic.returns.push(baseReturn - 0.02 + returnVariation)
    scenarios.pessimistic.inflation.push(Math.max(0.01, baseInflation + 0.01 + inflationVariation))
    scenarios.pessimistic.volatility.push(Math.max(0.08, baseVolatility + 0.05 + volatilityVariation))
  }
  
  return scenarios
}

export function compareWithdrawalStrategies(
  initialPortfolioValue: number,
  targetAnnualIncome: number,
  marketScenario: { returns: number[]; inflation: number[]; volatility: number[] }
): DynamicWithdrawalStrategy[] {
  
  return WITHDRAWAL_RULES.map(rule => 
    runDynamicWithdrawalSimulation(
      initialPortfolioValue,
      targetAnnualIncome,
      rule,
      marketScenario.returns,
      marketScenario.inflation,
      marketScenario.volatility
    )
  ).sort((a, b) => b.sustainability_score - a.sustainability_score)
}

export function getWithdrawalRuleDescription(ruleName: string): string {
  const rule = WITHDRAWAL_RULES.find(r => r.name === ruleName)
  return rule?.description || 'Unknown withdrawal rule'
}

export function formatWithdrawalRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

export function getAdjustmentSeverity(rateChange: number): 'minor' | 'moderate' | 'major' {
  const absChange = Math.abs(rateChange)
  if (absChange < 0.002) return 'minor' // <0.2%
  if (absChange < 0.005) return 'moderate' // <0.5%
  return 'major' // >=0.5%
}