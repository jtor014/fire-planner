// Australian tax calculations
// Handles resident tax brackets, Medicare levy, and super tax

import type { RunRequest } from './types'

export interface TaxResult {
  taxable_income: { [personId: string]: number }
  tax_payable: { [personId: string]: number }
}

/**
 * Calculate tax position for all household members
 */
export async function calculateTaxPosition(
  year: number,
  request: RunRequest,
  ages: { [personId: string]: number },
  incomeStreams: {
    salary_income: number
    super_withdrawals: { [personId: string]: number }
    pension_income: { [personId: string]: number }
  }
): Promise<TaxResult> {
  
  const taxable_income: { [personId: string]: number } = {}
  const tax_payable: { [personId: string]: number } = {}

  for (const person of request.household.people) {
    // Calculate taxable income components
    let personTaxableIncome = 0

    // Salary income (if still working)
    const currentAge = ages[person.id]
    const isWorking = !person.fire_age || currentAge < person.fire_age
    if (isWorking) {
      personTaxableIncome += person.annual_salary
    }

    // Super withdrawals (tax treatment depends on components and age)
    const superWithdrawal = incomeStreams.super_withdrawals[person.id] || 0
    const taxableSuper = calculateTaxableSuperWithdrawal(
      superWithdrawal,
      currentAge,
      request
    )
    personTaxableIncome += taxableSuper

    // Age Pension (generally not taxable, but may affect other thresholds)
    const pensionIncome = incomeStreams.pension_income[person.id] || 0
    // Age Pension is not taxable income in Australia
    // But we include it for means testing purposes

    taxable_income[person.id] = personTaxableIncome

    // Calculate tax payable
    tax_payable[person.id] = calculateIncomeTax(
      personTaxableIncome,
      request.assumptions.tax_brackets,
      request.assumptions.policy_settings.apply_stage3_tax_cuts
    )
  }

  return {
    taxable_income,
    tax_payable
  }
}

/**
 * Calculate taxable portion of super withdrawals
 */
function calculateTaxableSuperWithdrawal(
  withdrawal: number,
  age: number,
  request: RunRequest
): number {
  if (withdrawal <= 0) return 0

  // Over preservation age (60), super withdrawals are generally tax-free
  // This is a simplification - in reality depends on taxable/tax-free components
  
  if (age >= 60) {
    return 0 // Tax-free for over 60s
  }

  // Under preservation age - complex rules apply
  // For simplicity, assume all taxable at marginal rates
  return withdrawal
}

/**
 * Calculate income tax using Australian tax brackets
 */
function calculateIncomeTax(
  taxableIncome: number,
  taxBrackets: any[],
  applyStage3Cuts: boolean = true
): number {
  if (taxableIncome <= 0) return 0

  let tax = 0
  let previousMax = 0

  // Apply tax brackets
  for (const bracket of taxBrackets) {
    const bracketMin = bracket.min_income
    const bracketMax = bracket.max_income || taxableIncome
    const bracketRate = bracket.rate

    if (taxableIncome > bracketMin) {
      const taxableInThisBracket = Math.min(taxableIncome, bracketMax) - bracketMin
      tax += taxableInThisBracket * bracketRate
    }

    if (bracket.max_income && taxableIncome <= bracket.max_income) {
      break
    }
  }

  // Add Medicare Levy (2% for most taxpayers)
  const medicareLevy = calculateMedicareLevy(taxableIncome)
  tax += medicareLevy

  // Apply Low Income Tax Offset (LITO) and other offsets
  const offsets = calculateTaxOffsets(taxableIncome)
  tax = Math.max(0, tax - offsets)

  return tax
}

/**
 * Calculate Medicare Levy (2% of taxable income with low-income threshold)
 */
function calculateMedicareLevy(taxableIncome: number): number {
  // Medicare Levy threshold for 2024-25: $24,276 (single)
  const threshold = 24276
  const rate = 0.02

  if (taxableIncome <= threshold) {
    return 0
  }

  // Gradual taper between threshold and threshold + $3,040
  const taperEnd = threshold + 3040
  if (taxableIncome <= taperEnd) {
    const taperRate = (taxableIncome - threshold) / 3040
    return taxableIncome * rate * taperRate
  }

  return taxableIncome * rate
}

/**
 * Calculate tax offsets (LITO, SAPTO, etc.)
 */
function calculateTaxOffsets(taxableIncome: number): number {
  let offsets = 0

  // Low Income Tax Offset (LITO)
  if (taxableIncome <= 37500) {
    offsets += 700 // Maximum LITO
  } else if (taxableIncome <= 45000) {
    // Taper out LITO
    const taperAmount = (taxableIncome - 37500) * 0.05
    offsets += Math.max(0, 700 - taperAmount)
  }

  // Could add other offsets here (SAPTO, etc.)

  return offsets
}

/**
 * Default Australian tax brackets for 2024-25 (with Stage 3 tax cuts)
 */
export const DEFAULT_TAX_BRACKETS_2024_25 = [
  { min_income: 0, max_income: 18200, rate: 0.00, medicare_levy: 0.00 },
  { min_income: 18201, max_income: 45000, rate: 0.16, medicare_levy: 0.02 },
  { min_income: 45001, max_income: 135000, rate: 0.30, medicare_levy: 0.02 },
  { min_income: 135001, max_income: 190000, rate: 0.37, medicare_levy: 0.02 },
  { min_income: 190001, max_income: null, rate: 0.45, medicare_levy: 0.02 }
]