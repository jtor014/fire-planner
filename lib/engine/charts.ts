// Chart data generation for visualization
// Converts timeline data into Chart.js compatible formats

import type { YearRow, ChartData, RunRequest } from './types'

/**
 * Generate chart data from timeline for visualization
 */
export function generateChartData(timeline: YearRow[], request: RunRequest): ChartData {
  
  const years = timeline.map(row => row.year)
  
  // Assets over time
  const super_balances = timeline.map(row => row.total_super)
  const non_super_balances = timeline.map(row => row.total_non_super)
  const total_net_worth = timeline.map(row => row.total_net_worth)

  // Income vs expenses
  const income = timeline.map(row => row.sustainable_income)
  const expenses = timeline.map(row => row.required_income)
  const surplus = timeline.map(row => row.surplus_deficit)

  // FIRE timeline metrics
  const feasibility_score = timeline.map(row => row.fire_feasible ? 100 : 0)
  const bridge_requirement = timeline.map(row => 
    row.bridge_income.total_bridge_income > 0 ? Math.max(0, row.bridge_expenses - row.bridge_income.total_bridge_income) : 0
  )
  const super_sustainability = timeline.map(row => {
    const totalSuper = row.total_super
    const annualWithdrawals = Object.values(row.super_withdrawals).reduce((sum, w) => sum + w, 0)
    return annualWithdrawals > 0 ? (totalSuper / annualWithdrawals) : 0 // Years remaining
  })

  const charts: ChartData = {
    assets_over_time: {
      years,
      super_balances,
      non_super_balances,
      total_net_worth
    },
    income_vs_expenses: {
      years,
      income,
      expenses,
      surplus
    },
    fire_timeline: {
      years,
      feasibility_score,
      bridge_requirement,
      super_sustainability
    }
  }

  return charts
}