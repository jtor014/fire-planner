// Monte Carlo simulation engine adapter
// Wraps existing Monte Carlo engines for the unified interface

import type { RunRequest, YearRow } from './types'
import { runMonteCarloSimulation, createDefaultMonteCarloSettings, createDefaultMarketAssumptions } from '../monte-carlo-fire'

export interface MonteCarloResult {
  summary_statistics: {
    success_rate: number
    median_final_value: number
    risk_of_ruin: number
    safe_withdrawal_rate: number
  }
  stress_test_results: {
    sequence_risk_impact: number
    inflation_risk_impact: number
    volatility_drag_impact: number
    worst_case_scenario: string
    best_case_scenario: string
  }
  confidence_intervals: {
    portfolio_value_10_years: { p5: number; p50: number; p95: number }
    portfolio_value_20_years: { p5: number; p50: number; p95: number }
    portfolio_value_30_years: { p5: number; p50: number; p95: number }
  }
}

/**
 * Run Monte Carlo analysis using existing engine
 */
export async function runMonteCarloAnalysis(
  request: RunRequest,
  timeline: YearRow[]
): Promise<MonteCarloResult> {
  
  if (!request.options.include_monte_carlo || request.returns.type !== 'monte_carlo') {
    throw new Error('Monte Carlo analysis not requested or invalid return model type')
  }

  // Extract portfolio value and annual expenses from timeline
  const currentPortfolioValue = request.household.people.reduce(
    (sum, person) => sum + person.super_balance, 0
  ) + request.household.assets.non_super_investments

  const annualExpenses = request.household.annual_expenses.current

  // Create Monte Carlo settings from request
  const settings = createDefaultMonteCarloSettings(currentPortfolioValue, annualExpenses)
  
  // Override with request-specific settings
  if (request.returns.monte_carlo_settings) {
    const mcSettings = request.returns.monte_carlo_settings
    settings.simulation_runs = mcSettings.simulation_runs
    settings.asset_allocation = mcSettings.asset_allocation
    settings.withdrawal_strategy = mcSettings.withdrawal_strategy
  }

  // Create market assumptions from request
  const marketAssumptions = createDefaultMarketAssumptions()
  marketAssumptions.mean_return = request.returns.assumptions.super_return_rate
  marketAssumptions.inflation_mean = request.returns.assumptions.inflation_rate
  
  if (request.returns.assumptions.volatility) {
    marketAssumptions.volatility = request.returns.assumptions.volatility
  }

  // Run the simulation
  const result = runMonteCarloSimulation(settings, marketAssumptions)

  return {
    summary_statistics: {
      success_rate: result.summary_statistics.success_rate,
      median_final_value: result.summary_statistics.median_final_value,
      risk_of_ruin: result.summary_statistics.probability_of_ruin,
      safe_withdrawal_rate: result.summary_statistics.safe_withdrawal_rate
    },
    stress_test_results: {
      sequence_risk_impact: result.stress_test_results.sequence_risk_impact,
      inflation_risk_impact: result.stress_test_results.inflation_risk_impact,
      volatility_drag_impact: result.stress_test_results.volatility_drag_impact,
      worst_case_scenario: result.stress_test_results.worst_case_scenario,
      best_case_scenario: result.stress_test_results.best_case_scenario
    },
    confidence_intervals: {
      portfolio_value_10_years: result.confidence_intervals.portfolio_value_10_years,
      portfolio_value_20_years: result.confidence_intervals.portfolio_value_20_years,
      portfolio_value_30_years: result.confidence_intervals.portfolio_value_30_years
    }
  }
}