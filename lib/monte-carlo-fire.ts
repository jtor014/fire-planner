// Monte Carlo Simulation Engine for FIRE Planning
// Provides probabilistic analysis with market volatility stress testing

export interface MarketAssumptions {
  mean_return: number // Expected annual return (e.g., 0.07 = 7%)
  volatility: number // Annual volatility/standard deviation (e.g., 0.15 = 15%)
  inflation_mean: number // Expected inflation (e.g., 0.025 = 2.5%)
  inflation_volatility: number // Inflation volatility (e.g., 0.01 = 1%)
  correlation_coefficient: number // Correlation between returns and inflation (-1 to 1)
}

export interface MonteCarloSettings {
  simulation_runs: number // Number of Monte Carlo runs (e.g., 1000)
  retirement_years: number // Years to simulate (e.g., 30)
  initial_portfolio: number // Starting portfolio value
  initial_withdrawal_rate: number // Starting withdrawal rate (e.g., 0.04 = 4%)
  withdrawal_strategy: 'fixed_real' | 'fixed_nominal' | 'dynamic' | 'floor_ceiling'
  rebalancing_frequency: 'annual' | 'quarterly' | 'never'
  asset_allocation: {
    stocks: number // % in stocks (0-1)
    bonds: number // % in bonds (0-1)
    cash: number // % in cash (0-1)
  }
}

export interface SimulationRun {
  run_id: number
  success: boolean // Did portfolio last full retirement?
  years_lasted: number // How many years before depletion
  final_portfolio_value: number
  worst_year_loss: number // Largest single year loss
  best_year_gain: number // Largest single year gain
  total_withdrawals: number
  inflation_adjusted_withdrawals: number
  sequence_of_returns_risk: number // Impact of early poor returns
  annual_results: {
    year: number
    portfolio_value: number
    market_return: number
    inflation_rate: number
    withdrawal_amount: number
    real_withdrawal_value: number
  }[]
}

export interface MonteCarloResults {
  settings: MonteCarloSettings
  market_assumptions: MarketAssumptions
  simulation_runs: SimulationRun[]
  summary_statistics: {
    success_rate: number // % of runs that succeeded
    median_final_value: number
    percentile_5_final_value: number // 5th percentile (bad outcome)
    percentile_95_final_value: number // 95th percentile (good outcome)
    median_years_lasted: number
    probability_of_ruin: number // % chance of running out of money
    safe_withdrawal_rate: number // Rate with 90% success
    conservative_withdrawal_rate: number // Rate with 95% success
  }
  stress_test_results: {
    sequence_risk_impact: number // How much early losses hurt
    inflation_risk_impact: number // How much high inflation hurts
    volatility_drag_impact: number // Impact of volatility vs constant returns
    worst_case_scenario: string
    best_case_scenario: string
  }
  confidence_intervals: {
    portfolio_value_10_years: { p5: number; p50: number; p95: number }
    portfolio_value_20_years: { p5: number; p50: number; p95: number }
    portfolio_value_30_years: { p5: number; p50: number; p95: number }
    withdrawal_sustainability: { p5: number; p50: number; p95: number }
  }
}

export interface AssetClassReturns {
  stocks: { mean: number; volatility: number }
  bonds: { mean: number; volatility: number }
  cash: { mean: number; volatility: number }
  correlations: {
    stocks_bonds: number
    stocks_cash: number
    bonds_cash: number
  }
}

// Australian market-specific asset class assumptions
export const AUSTRALIAN_MARKET_ASSUMPTIONS: AssetClassReturns = {
  stocks: { mean: 0.08, volatility: 0.18 }, // ASX historical
  bonds: { mean: 0.045, volatility: 0.06 }, // Australian government bonds
  cash: { mean: 0.025, volatility: 0.005 }, // Cash/term deposits
  correlations: {
    stocks_bonds: -0.1,
    stocks_cash: 0.05,
    bonds_cash: 0.2
  }
}

export function generateCorrelatedReturns(
  mean1: number,
  vol1: number,
  mean2: number,
  vol2: number,
  correlation: number
): { return1: number; return2: number } {
  // Box-Muller transformation for normal random variables
  const u1 = Math.random()
  const u2 = Math.random()
  
  const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2)
  
  // Generate correlated returns
  const return1 = mean1 + vol1 * z1
  const return2 = mean2 + vol2 * (correlation * z1 + Math.sqrt(1 - correlation * correlation) * z2)
  
  return { return1, return2 }
}

export function generatePortfolioReturn(
  allocation: MonteCarloSettings['asset_allocation'],
  assetReturns: AssetClassReturns
): number {
  // Generate correlated returns for each asset class
  const stockReturn = assetReturns.stocks.mean + 
    assetReturns.stocks.volatility * (Math.random() * 2 - 1) * Math.sqrt(3) // Uniform to normal approximation
  
  const bondReturn = assetReturns.bonds.mean + 
    assetReturns.bonds.volatility * (Math.random() * 2 - 1) * Math.sqrt(3)
  
  const cashReturn = assetReturns.cash.mean + 
    assetReturns.cash.volatility * (Math.random() * 2 - 1) * Math.sqrt(3)
  
  // Weight by allocation
  return (
    allocation.stocks * stockReturn +
    allocation.bonds * bondReturn +
    allocation.cash * cashReturn
  )
}

export function runSingleSimulation(
  settings: MonteCarloSettings,
  marketAssumptions: MarketAssumptions,
  runId: number
): SimulationRun {
  const annual_results = []
  let portfolioValue = settings.initial_portfolio
  let annualWithdrawal = settings.initial_portfolio * settings.initial_withdrawal_rate
  let totalWithdrawals = 0
  let inflationAdjustedWithdrawals = 0
  let worstYearLoss = 0
  let bestYearGain = 0
  let cumulativeInflation = 1
  
  for (let year = 1; year <= settings.retirement_years; year++) {
    // Generate correlated market return and inflation
    const { return1: marketReturn, return2: inflationRate } = generateCorrelatedReturns(
      marketAssumptions.mean_return,
      marketAssumptions.volatility,
      marketAssumptions.inflation_mean,
      marketAssumptions.inflation_volatility,
      marketAssumptions.correlation_coefficient
    )
    
    // Track extreme years
    worstYearLoss = Math.min(worstYearLoss, marketReturn)
    bestYearGain = Math.max(bestYearGain, marketReturn)
    
    // Calculate withdrawal amount based on strategy
    let withdrawalAmount = calculateWithdrawalAmount(
      settings,
      annualWithdrawal,
      portfolioValue,
      year,
      inflationRate,
      marketReturn
    )
    
    // Apply market return and subtract withdrawal
    const portfolioBeforeWithdrawal = portfolioValue * (1 + marketReturn)
    portfolioValue = Math.max(0, portfolioBeforeWithdrawal - withdrawalAmount)
    
    // Track inflation-adjusted withdrawal value
    cumulativeInflation *= (1 + inflationRate)
    const realWithdrawalValue = withdrawalAmount / cumulativeInflation
    
    totalWithdrawals += withdrawalAmount
    inflationAdjustedWithdrawals += realWithdrawalValue
    
    annual_results.push({
      year,
      portfolio_value: portfolioValue,
      market_return: marketReturn,
      inflation_rate: inflationRate,
      withdrawal_amount: withdrawalAmount,
      real_withdrawal_value: realWithdrawalValue
    })
    
    // Check if portfolio is depleted
    if (portfolioValue <= 0) {
      break
    }
  }
  
  const yearsLasted = annual_results.length
  const success = yearsLasted >= settings.retirement_years && portfolioValue > 0
  
  // Calculate sequence of returns risk (impact of early poor returns)
  const firstThirdReturns = annual_results.slice(0, Math.floor(settings.retirement_years / 3))
    .reduce((sum, year) => sum + year.market_return, 0) / Math.floor(settings.retirement_years / 3)
  const sequenceRisk = firstThirdReturns < marketAssumptions.mean_return - marketAssumptions.volatility ? 1 : 0
  
  return {
    run_id: runId,
    success,
    years_lasted: yearsLasted,
    final_portfolio_value: portfolioValue,
    worst_year_loss: worstYearLoss,
    best_year_gain: bestYearGain,
    total_withdrawals: totalWithdrawals,
    inflation_adjusted_withdrawals: inflationAdjustedWithdrawals,
    sequence_of_returns_risk: sequenceRisk,
    annual_results
  }
}

function calculateWithdrawalAmount(
  settings: MonteCarloSettings,
  baseWithdrawal: number,
  currentPortfolio: number,
  year: number,
  inflationRate: number,
  marketReturn: number
): number {
  switch (settings.withdrawal_strategy) {
    case 'fixed_real':
      // Adjust for inflation each year
      return baseWithdrawal * Math.pow(1 + 0.025, year - 1) // Default 2.5% inflation
      
    case 'fixed_nominal':
      // Same dollar amount each year
      return baseWithdrawal
      
    case 'dynamic':
      // Adjust based on portfolio performance (simple dynamic rule)
      const targetPortfolio = settings.initial_portfolio * Math.pow(1.04, year - 1) // 4% growth target
      const portfolioRatio = currentPortfolio / targetPortfolio
      
      if (portfolioRatio > 1.2) {
        return baseWithdrawal * 1.1 // 10% bonus
      } else if (portfolioRatio < 0.8) {
        return baseWithdrawal * 0.9 // 10% reduction
      }
      return baseWithdrawal * (1 + inflationRate) // Inflation adjustment
      
    case 'floor_ceiling':
      // Guardrails approach
      const floorWithdrawal = baseWithdrawal * 0.8 // 80% floor
      const ceilingWithdrawal = baseWithdrawal * 1.2 // 120% ceiling
      const dynamicAmount = currentPortfolio * settings.initial_withdrawal_rate
      
      return Math.max(floorWithdrawal, Math.min(ceilingWithdrawal, dynamicAmount))
      
    default:
      return baseWithdrawal * (1 + inflationRate)
  }
}

export function runMonteCarloSimulation(
  settings: MonteCarloSettings,
  marketAssumptions: MarketAssumptions
): MonteCarloResults {
  const simulation_runs: SimulationRun[] = []
  
  // Run all simulations
  for (let i = 1; i <= settings.simulation_runs; i++) {
    const run = runSingleSimulation(settings, marketAssumptions, i)
    simulation_runs.push(run)
  }
  
  // Calculate summary statistics
  const successfulRuns = simulation_runs.filter(run => run.success)
  const successRate = (successfulRuns.length / settings.simulation_runs) * 100
  
  const finalValues = simulation_runs.map(run => run.final_portfolio_value).sort((a, b) => a - b)
  const yearsLasted = simulation_runs.map(run => run.years_lasted).sort((a, b) => a - b)
  
  const summary_statistics = {
    success_rate: successRate,
    median_final_value: getPercentile(finalValues, 50),
    percentile_5_final_value: getPercentile(finalValues, 5),
    percentile_95_final_value: getPercentile(finalValues, 95),
    median_years_lasted: getPercentile(yearsLasted, 50),
    probability_of_ruin: ((settings.simulation_runs - successfulRuns.length) / settings.simulation_runs) * 100,
    safe_withdrawal_rate: calculateSafeWithdrawalRate(simulation_runs, 0.9),
    conservative_withdrawal_rate: calculateSafeWithdrawalRate(simulation_runs, 0.95)
  }
  
  // Stress test analysis
  const stress_test_results = calculateStressTestResults(simulation_runs, marketAssumptions)
  
  // Confidence intervals
  const confidence_intervals = calculateConfidenceIntervals(simulation_runs, settings.retirement_years)
  
  return {
    settings,
    market_assumptions: marketAssumptions,
    simulation_runs,
    summary_statistics,
    stress_test_results,
    confidence_intervals
  }
}

function getPercentile(sortedArray: number[], percentile: number): number {
  const index = (percentile / 100) * (sortedArray.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower
  
  if (lower === upper) {
    return sortedArray[lower] || 0
  }
  
  return (sortedArray[lower] || 0) * (1 - weight) + (sortedArray[upper] || 0) * weight
}

function calculateSafeWithdrawalRate(runs: SimulationRun[], successTarget: number): number {
  // This is a simplified calculation - in practice, you'd run multiple simulations with different rates
  const successRate = runs.filter(run => run.success).length / runs.length
  
  if (successRate >= successTarget) {
    return 0.04 // Base 4% rate
  } else {
    // Reduce rate proportionally
    return 0.04 * (successRate / successTarget)
  }
}

function calculateStressTestResults(
  runs: SimulationRun[],
  marketAssumptions: MarketAssumptions
): MonteCarloResults['stress_test_results'] {
  // Sequence of returns risk
  const sequenceRiskRuns = runs.filter(run => run.sequence_of_returns_risk > 0)
  const sequenceRiskImpact = sequenceRiskRuns.length / runs.length
  
  // High inflation impact
  const highInflationRuns = runs.filter(run => {
    const avgInflation = run.annual_results.reduce((sum, year) => sum + year.inflation_rate, 0) / run.annual_results.length
    return avgInflation > marketAssumptions.inflation_mean + marketAssumptions.inflation_volatility
  })
  const inflationRiskImpact = (runs.length - highInflationRuns.filter(run => run.success).length) / runs.length
  
  // Volatility drag (difference between arithmetic and geometric mean)
  const avgArithmeticReturn = runs.reduce((sum, run) => 
    sum + run.annual_results.reduce((yearSum, year) => yearSum + year.market_return, 0) / run.annual_results.length
  , 0) / runs.length
  
  const avgGeometricReturn = Math.pow(
    runs.reduce((product, run) => 
      product * run.annual_results.reduce((yearProduct, year) => yearProduct * (1 + year.market_return), 1)
    , 1) / runs.length,
    1 / marketAssumptions.mean_return
  ) - 1
  
  const volatilityDragImpact = avgArithmeticReturn - avgGeometricReturn
  
  // Worst and best case scenarios
  const worstRun = runs.reduce((worst, run) => 
    run.final_portfolio_value < worst.final_portfolio_value ? run : worst
  )
  const bestRun = runs.reduce((best, run) => 
    run.final_portfolio_value > best.final_portfolio_value ? run : best
  )
  
  return {
    sequence_risk_impact: sequenceRiskImpact,
    inflation_risk_impact: inflationRiskImpact,
    volatility_drag_impact: volatilityDragImpact,
    worst_case_scenario: `Portfolio depleted after ${worstRun.years_lasted} years with worst year loss of ${(worstRun.worst_year_loss * 100).toFixed(1)}%`,
    best_case_scenario: `Portfolio grew to $${(bestRun.final_portfolio_value / 1000).toFixed(0)}k with best year gain of ${(bestRun.best_year_gain * 100).toFixed(1)}%`
  }
}

function calculateConfidenceIntervals(
  runs: SimulationRun[],
  retirementYears: number
): MonteCarloResults['confidence_intervals'] {
  const getPortfolioValuesAtYear = (year: number) => {
    return runs
      .filter(run => run.annual_results.length >= year)
      .map(run => run.annual_results[year - 1]?.portfolio_value || 0)
      .sort((a, b) => a - b)
  }
  
  const values10 = getPortfolioValuesAtYear(10)
  const values20 = getPortfolioValuesAtYear(20)
  const values30 = getPortfolioValuesAtYear(30)
  
  const withdrawalSustainability = runs.map(run => run.years_lasted / retirementYears).sort((a, b) => a - b)
  
  return {
    portfolio_value_10_years: {
      p5: getPercentile(values10, 5),
      p50: getPercentile(values10, 50),
      p95: getPercentile(values10, 95)
    },
    portfolio_value_20_years: {
      p5: getPercentile(values20, 5),
      p50: getPercentile(values20, 50),
      p95: getPercentile(values20, 95)
    },
    portfolio_value_30_years: {
      p5: getPercentile(values30, 5),
      p50: getPercentile(values30, 50),
      p95: getPercentile(values30, 95)
    },
    withdrawal_sustainability: {
      p5: getPercentile(withdrawalSustainability, 5),
      p50: getPercentile(withdrawalSustainability, 50),
      p95: getPercentile(withdrawalSustainability, 95)
    }
  }
}

export function createDefaultMonteCarloSettings(
  portfolioValue: number,
  annualExpenses: number
): MonteCarloSettings {
  return {
    simulation_runs: 1000,
    retirement_years: 30,
    initial_portfolio: portfolioValue,
    initial_withdrawal_rate: annualExpenses / portfolioValue,
    withdrawal_strategy: 'fixed_real',
    rebalancing_frequency: 'annual',
    asset_allocation: {
      stocks: 0.6, // 60% stocks
      bonds: 0.3, // 30% bonds
      cash: 0.1   // 10% cash
    }
  }
}

export function createDefaultMarketAssumptions(): MarketAssumptions {
  return {
    mean_return: 0.07, // 7% expected return
    volatility: 0.15,  // 15% volatility
    inflation_mean: 0.025, // 2.5% inflation
    inflation_volatility: 0.01, // 1% inflation volatility
    correlation_coefficient: -0.1 // Slight negative correlation
  }
}

export function getWithdrawalStrategyDescription(strategy: MonteCarloSettings['withdrawal_strategy']): string {
  switch (strategy) {
    case 'fixed_real':
      return 'Withdraw same purchasing power each year (adjusted for inflation)'
    case 'fixed_nominal':
      return 'Withdraw same dollar amount each year (no inflation adjustment)'
    case 'dynamic':
      return 'Adjust withdrawals based on portfolio performance (+/-10%)'
    case 'floor_ceiling':
      return 'Use guardrails approach with 80% floor and 120% ceiling'
    default:
      return 'Unknown withdrawal strategy'
  }
}

export function getSuccessRateColor(rate: number): string {
  if (rate >= 90) return 'text-green-600'
  if (rate >= 80) return 'text-yellow-600'
  if (rate >= 70) return 'text-orange-600'
  return 'text-red-600'
}