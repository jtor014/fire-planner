// Accumulation phase engine
// Calculates super and non-super accumulation during working years

import type { Person, Household, Assumptions } from './types'

export interface SuperAccumulationResult {
  mandatory_contribution: number
  voluntary_contribution: number
  employer_contribution: number
  total_contribution: number
  balance_after_growth: number
}

export interface NonSuperAccumulationResult {
  contributions: number
  balance_after_growth: number
}

/**
 * Calculate super accumulation for a person in a given year
 */
export function calculateSuperAccumulation(
  person: Person,
  household: Household,
  assumptions: Assumptions,
  year: number,
  returnRates: { super_return_rate: number; non_super_return_rate: number } = { super_return_rate: 0.07, non_super_return_rate: 0.065 }
): SuperAccumulationResult {
  const currentAge = year - person.birth_year
  const fireAge = person.fire_age || 67
  
  // Check if person is still working
  if (currentAge >= fireAge) {
    return {
      mandatory_contribution: 0,
      voluntary_contribution: 0,
      employer_contribution: 0,
      total_contribution: 0,
      balance_after_growth: person.super_balance * (1 + returnRates.super_return_rate)
    }
  }
  
  const annualSalary = person.annual_salary || 0
  const sgRate = assumptions.superannuation.superannuation_guarantee_rate
  
  // Mandatory super guarantee
  const mandatoryContribution = annualSalary * sgRate
  
  // Calculate voluntary contributions up to concessional cap
  const concessionalCap = assumptions.superannuation.concessional_cap
  const remainingCap = Math.max(0, concessionalCap - mandatoryContribution)
  
  // Use person's voluntary contribution strategy or default
  const voluntaryRate = person.super_contribution_rate || 0
  const voluntaryContribution = Math.min(
    annualSalary * voluntaryRate,
    remainingCap
  )
  
  // Employer contribution (if any additional) - simplified for now
  const employerContribution = 0 // Could be extended with employer contribution logic
  
  const totalContribution = mandatoryContribution + voluntaryContribution + employerContribution
  
  // Calculate balance after contributions and growth
  const returnRate = returnRates.super_return_rate
  const balanceAfterGrowth = (person.super_balance + totalContribution) * (1 + returnRate)
  
  return {
    mandatory_contribution: mandatoryContribution,
    voluntary_contribution: voluntaryContribution,
    employer_contribution: employerContribution,
    total_contribution: totalContribution,
    balance_after_growth: balanceAfterGrowth
  }
}

/**
 * Calculate non-super investment accumulation
 */
export function calculateNonSuperAccumulation(
  household: Household,
  assumptions: Assumptions,
  totalAfterTaxSavings: number,
  returnRates: { super_return_rate: number; non_super_return_rate: number } = { super_return_rate: 0.07, non_super_return_rate: 0.065 }
): NonSuperAccumulationResult {
  const returnRate = returnRates.non_super_return_rate
  const currentBalance = household.assets.non_super_investments
  
  // Add savings and apply growth
  const balanceAfterGrowth = (currentBalance + totalAfterTaxSavings) * (1 + returnRate)
  
  return {
    contributions: totalAfterTaxSavings,
    balance_after_growth: balanceAfterGrowth
  }
}

/**
 * Calculate total household accumulation for a year
 */
export function calculateHouseholdAccumulation(
  household: Household,
  assumptions: Assumptions,
  year: number,
  returnRates: { super_return_rate: number; non_super_return_rate: number } = { super_return_rate: 0.07, non_super_return_rate: 0.065 }
): {
  total_super_contributions: number
  total_non_super_contributions: number
  super_balances_after_growth: { [personId: string]: number }
  non_super_balance_after_growth: number
  net_savings_rate: number
} {
  const superAccumulation: { [personId: string]: SuperAccumulationResult } = {}
  
  // Calculate super for each person
  for (const person of household.people) {
    superAccumulation[person.id] = calculateSuperAccumulation(person, household, assumptions, year, returnRates)
  }
  
  // Calculate total household after-tax income
  const totalAfterTaxIncome = household.people.reduce((sum, person) => {
    const currentAge = year - person.birth_year
    const fireAge = person.fire_age || 67
    
    if (currentAge >= fireAge) return sum // Not working anymore
    
    const salary = person.annual_salary || 0
    const afterTaxIncome = calculateAfterTaxIncome(salary, assumptions)
    return sum + afterTaxIncome
  }, 0)
  
  // Calculate household savings after expenses
  const totalAfterTaxSavings = Math.max(0, totalAfterTaxIncome - household.annual_expenses.current)
  
  // Calculate non-super accumulation
  const nonSuperAccumulation = calculateNonSuperAccumulation(household, assumptions, totalAfterTaxSavings, returnRates)
  
  return {
    total_super_contributions: Object.values(superAccumulation).reduce(
      (sum, acc) => sum + acc.total_contribution, 0
    ),
    total_non_super_contributions: nonSuperAccumulation.contributions,
    super_balances_after_growth: Object.fromEntries(
      household.people.map(person => [person.id, superAccumulation[person.id].balance_after_growth])
    ),
    non_super_balance_after_growth: nonSuperAccumulation.balance_after_growth,
    net_savings_rate: totalAfterTaxSavings / Math.max(1, totalAfterTaxIncome)
  }
}

/**
 * Calculate after-tax income using assumptions
 */
function calculateAfterTaxIncome(grossIncome: number, assumptions: Assumptions): number {
  let tax = 0
  
  // Apply tax brackets
  for (const bracket of assumptions.tax_brackets) {
    if (grossIncome > bracket.min_income) {
      const taxableInThisBracket = Math.min(
        grossIncome, 
        bracket.max_income || Infinity
      ) - bracket.min_income
      
      tax += taxableInThisBracket * bracket.rate
      
      // Add Medicare levy if applicable
      if (bracket.medicare_levy && grossIncome > 29207) { // 2025-26 threshold
        tax += taxableInThisBracket * bracket.medicare_levy
      }
    }
  }
  
  return grossIncome - tax
}