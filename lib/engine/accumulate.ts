// Super accumulation phase calculations
// Handles contributions, returns, and balance growth before preservation age

import type { RunRequest, YearRow } from './types'

export interface AccumulationResult {
  balances: { [personId: string]: number }
  contributions: { [personId: string]: number }
  returns: { [personId: string]: number }
}

/**
 * Calculate super accumulation for a specific year
 * Handles contributions (SG + voluntary) and investment returns
 */
export async function runAccumulationPhase(
  year: number,
  request: RunRequest,
  ages: { [personId: string]: number },
  previousYear?: YearRow
): Promise<AccumulationResult> {
  
  const balances: { [personId: string]: number } = {}
  const contributions: { [personId: string]: number } = {}
  const returns: { [personId: string]: number } = {}

  // Calculate for each person
  for (const person of request.household.people) {
    const currentAge = ages[person.id]
    const isWorking = !person.fire_age || currentAge < person.fire_age
    const isUnder67 = currentAge < 67 // Contribution age limit

    // Starting balance (from previous year or initial)
    const startingBalance = previousYear 
      ? previousYear.super_balances[person.id] || 0
      : person.super_balance

    // Calculate contributions if still working and under 67
    let yearlyContributions = 0
    if (isWorking && isUnder67) {
      // Superannuation Guarantee
      const sgRate = request.assumptions.superannuation.superannuation_guarantee_rate
      const sgContribution = person.annual_salary * sgRate

      // Additional voluntary contributions (if specified)
      const voluntaryRate = person.super_contribution_rate || 0
      const voluntaryContribution = person.annual_salary * voluntaryRate

      yearlyContributions = sgContribution + voluntaryContribution

      // Apply contribution caps (simplified - should check financial year rules)
      const concessionalCap = request.assumptions.superannuation.concessional_cap
      yearlyContributions = Math.min(yearlyContributions, concessionalCap)
    }

    // Calculate investment returns
    const returnRate = request.returns.assumptions.super_return_rate
    const investmentReturns = (startingBalance + yearlyContributions * 0.5) * returnRate

    // Calculate ending balance
    const endingBalance = startingBalance + yearlyContributions + investmentReturns

    balances[person.id] = Math.max(0, endingBalance)
    contributions[person.id] = yearlyContributions
    returns[person.id] = investmentReturns
  }

  return {
    balances,
    contributions,
    returns
  }
}