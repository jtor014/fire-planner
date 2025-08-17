// Super spenddown phase calculations (post-preservation age)
// Handles withdrawals, minimum drawdowns, and balance management

import type { RunRequest, YearRow } from './types'

export interface SpenddownResult {
  withdrawals: { [personId: string]: number }
  minimum_drawdowns: { [personId: string]: number }
  remaining_balances: { [personId: string]: number }
}

/**
 * Calculate super withdrawals for a specific year
 * Implements various withdrawal strategies and minimum drawdown requirements
 */
export async function runSpenddownPhase(
  year: number,
  request: RunRequest,
  ages: { [personId: string]: number },
  superAccessiblePeople: any[],
  currentBalances: { [personId: string]: number },
  previousYear?: YearRow
): Promise<SpenddownResult> {
  
  const withdrawals: { [personId: string]: number } = {}
  const minimum_drawdowns: { [personId: string]: number } = {}
  const remaining_balances: { [personId: string]: number } = {}

  // Initialize with current balances
  for (const person of request.household.people) {
    remaining_balances[person.id] = currentBalances[person.id] || 0
    withdrawals[person.id] = 0
    minimum_drawdowns[person.id] = 0
  }

  // Only process withdrawals for people who can access super
  for (const person of superAccessiblePeople) {
    const currentAge = ages[person.id]
    const balance = currentBalances[person.id] || 0

    if (balance <= 0) {
      continue
    }

    // Calculate minimum drawdown requirement
    const minDrawdownRate = getMinimumDrawdownRate(currentAge, request.assumptions)
    const minDrawdown = balance * minDrawdownRate
    minimum_drawdowns[person.id] = minDrawdown

    // Calculate actual withdrawal based on strategy
    const withdrawal = calculateWithdrawal(
      person,
      balance,
      minDrawdown,
      currentAge,
      request,
      previousYear
    )

    withdrawals[person.id] = withdrawal
    remaining_balances[person.id] = Math.max(0, balance - withdrawal)
  }

  return {
    withdrawals,
    minimum_drawdowns,
    remaining_balances
  }
}

/**
 * Calculate withdrawal amount based on the chosen strategy
 */
function calculateWithdrawal(
  person: any,
  balance: number,
  minDrawdown: number,
  currentAge: number,
  request: RunRequest,
  previousYear?: YearRow
): number {
  const { strategy } = request

  // Check if using minimum drawdown only strategy
  if (strategy.spenddown.type === 'min_drawdown_only') {
    return minDrawdown
  }

  // Otherwise apply withdrawal method logic
  switch (strategy.spenddown.withdrawal_method) {
    case 'fixed_real':
      // Withdraw same purchasing power each year (inflation adjusted)
      const baseWithdrawal = balance * 0.04 // 4% rule as starting point
      const inflationAdjustment = previousYear 
        ? Math.pow(1 + request.returns.assumptions.inflation_rate, 1)
        : 1
      return Math.max(minDrawdown, baseWithdrawal * inflationAdjustment)

    case 'fixed_nominal':
      // Same dollar amount each year
      const nominalWithdrawal = balance * 0.04
      return Math.max(minDrawdown, nominalWithdrawal)

    case 'spend_to_zero':
      // Calculate payment to exhaust super by planning age
      const yearsRemaining = strategy.spenddown.longevity_planning_age - currentAge
      if (yearsRemaining <= 0) {
        return balance // Exhaust remaining balance
      }
      
      const spendToZeroPayment = calculateSpendToZeroPayment(
        balance,
        yearsRemaining,
        request.returns.assumptions.super_return_rate,
        request.returns.assumptions.inflation_rate
      )
      return Math.max(minDrawdown, spendToZeroPayment)

    case 'dynamic':
      // Adjust based on balance performance vs target
      const targetBalance = person.super_balance * Math.pow(1.04, currentAge - (new Date().getFullYear() - person.birth_year))
      const balanceRatio = balance / targetBalance
      
      let dynamicRate = 0.04 // Base 4%
      if (balanceRatio > 1.2) {
        dynamicRate = 0.05 // 5% if well ahead
      } else if (balanceRatio < 0.8) {
        dynamicRate = 0.03 // 3% if behind
      }
      
      return Math.max(minDrawdown, balance * dynamicRate)

    case 'guardrails':
      // Guardrails approach with floor and ceiling
      const baseRate = 0.04
      const floorRate = 0.03
      const ceilingRate = 0.06
      
      const guardrailWithdrawal = balance * baseRate
      const floorWithdrawal = balance * floorRate
      const ceilingWithdrawal = balance * ceilingRate
      
      const boundedWithdrawal = Math.max(floorWithdrawal, Math.min(ceilingWithdrawal, guardrailWithdrawal))
      return Math.max(minDrawdown, boundedWithdrawal)

    default:
      // Default to 4% rule
      return Math.max(minDrawdown, balance * 0.04)
  }
}

/**
 * Get minimum drawdown rate based on age
 */
function getMinimumDrawdownRate(age: number, assumptions: any): number {
  // Australian minimum drawdown rates
  const rates = {
    60: 0.04,  // 4%
    65: 0.05,  // 5%
    70: 0.06,  // 6%
    75: 0.07,  // 7%
    80: 0.09,  // 9%
    85: 0.11,  // 11%
    90: 0.14,  // 14%
    95: 0.14   // 14%
  }

  // Find appropriate rate
  if (age < 60) return 0
  if (age >= 95) return 0.14

  // Find the bracket
  const ageKeys = Object.keys(rates).map(Number).sort((a, b) => a - b)
  for (let i = 0; i < ageKeys.length - 1; i++) {
    if (age >= ageKeys[i] && age < ageKeys[i + 1]) {
      return rates[ageKeys[i] as keyof typeof rates]
    }
  }

  return 0.14 // Default to highest rate
}

/**
 * Calculate spend-to-zero annual payment
 */
function calculateSpendToZeroPayment(
  currentBalance: number,
  yearsRemaining: number,
  expectedReturn: number,
  inflationRate: number
): number {
  if (yearsRemaining <= 0) return currentBalance

  // Real return rate
  const realReturn = expectedReturn - inflationRate
  
  if (Math.abs(realReturn) < 0.001) {
    // No real growth - simple division
    return currentBalance / yearsRemaining
  }

  // Annuity formula for exhausting balance
  const payment = currentBalance * (realReturn * Math.pow(1 + realReturn, yearsRemaining)) / 
                 (Math.pow(1 + realReturn, yearsRemaining) - 1)

  return Math.max(currentBalance * 0.02, Math.min(payment, currentBalance * 0.15))
}