// Australian Age Pension calculations
// Handles means testing, deeming rates, and pension amounts

import type { RunRequest } from './types'

export interface AgePensionResult {
  eligible: { [personId: string]: boolean }
  amounts: { [personId: string]: number }
}

/**
 * Calculate Age Pension eligibility and amounts
 */
export async function calculateAgePension(
  year: number,
  request: RunRequest,
  ages: { [personId: string]: number },
  superBalances: { [personId: string]: number },
  assets: any
): Promise<AgePensionResult> {
  
  const eligible: { [personId: string]: boolean } = {}
  const amounts: { [personId: string]: number } = {}

  // Age Pension eligibility age (gradually increasing to 67)
  const pensionAge = 67 // Simplified - should use actual pension age rules

  for (const person of request.household.people) {
    const currentAge = ages[person.id]
    
    // Must be at pension age
    if (currentAge < pensionAge) {
      eligible[person.id] = false
      amounts[person.id] = 0
      continue
    }

    // Calculate assessable assets
    const assessableAssets = calculateAssessableAssets(
      person.id,
      superBalances,
      assets,
      request
    )

    // Calculate deemed income
    const deemedIncome = calculateDeemedIncome(assessableAssets, request)

    // Apply means tests
    const meansTestResult = applyMeansTests(
      person.id,
      assessableAssets,
      deemedIncome,
      request
    )

    eligible[person.id] = meansTestResult.eligible
    amounts[person.id] = meansTestResult.amount
  }

  return { eligible, amounts }
}

/**
 * Calculate assessable assets for Age Pension means test
 */
function calculateAssessableAssets(
  personId: string,
  superBalances: { [personId: string]: number },
  assets: any,
  request: RunRequest
): number {
  let assessableAssets = 0

  // Super balances (in pension phase are assessable)
  assessableAssets += superBalances[personId] || 0

  // Non-super investments (fully assessable)
  assessableAssets += assets.non_super_investments || 0

  // Home is generally not assessable (if principal residence)
  // Only include if not homeowner
  if (!request.assumptions.policy_settings.homeowner_status) {
    assessableAssets += assets.home_value || 0
  }

  // Other assets
  assessableAssets += assets.other_assets || 0

  // Subtract mortgage (debt reduces assessable assets)
  assessableAssets -= assets.mortgage_balance || 0

  return Math.max(0, assessableAssets)
}

/**
 * Calculate deemed income from financial assets
 */
function calculateDeemedIncome(assessableAssets: number, request: RunRequest): number {
  const assumptions = request.assumptions.age_pension
  
  const deeming_threshold = assumptions.deeming_threshold
  const lower_rate = assumptions.deeming_rate_lower
  const upper_rate = assumptions.deeming_rate_upper

  let deemedIncome = 0

  if (assessableAssets <= deeming_threshold) {
    // All assets deemed at lower rate
    deemedIncome = assessableAssets * lower_rate
  } else {
    // First portion at lower rate, remainder at upper rate
    deemedIncome = deeming_threshold * lower_rate + 
                   (assessableAssets - deeming_threshold) * upper_rate
  }

  return deemedIncome
}

/**
 * Apply Age Pension means tests (assets and income)
 */
function applyMeansTests(
  personId: string,
  assessableAssets: number,
  deemedIncome: number,
  request: RunRequest
): { eligible: boolean; amount: number } {
  
  const assumptions = request.assumptions.age_pension
  const isCouple = request.household.structure === 'couple'

  // Maximum pension amounts
  const maxPension = isCouple 
    ? assumptions.maximum_payment_couple / 2 // Per person for couples
    : assumptions.maximum_payment_single

  // Assets test thresholds
  const assetsThreshold = isCouple
    ? assumptions.assets_test_threshold_couple
    : assumptions.assets_test_threshold_single

  // Income test thresholds
  const incomeThreshold = isCouple
    ? assumptions.income_test_threshold_couple / 2 // Per person for couples
    : assumptions.income_test_threshold_single

  // Assets test reduction
  let assetsPension = maxPension
  if (assessableAssets > assetsThreshold) {
    const excessAssets = assessableAssets - assetsThreshold
    const assetsReduction = excessAssets * (isCouple ? 0.00375 : 0.0075) // Taper rates
    assetsPension = Math.max(0, maxPension - assetsReduction)
  }

  // Income test reduction
  let incomePension = maxPension
  if (deemedIncome > incomeThreshold) {
    const excessIncome = deemedIncome - incomeThreshold
    const incomeReduction = excessIncome * 0.5 // 50 cents per dollar taper
    incomePension = Math.max(0, maxPension - incomeReduction)
  }

  // Pension is the lower of the two tests
  const finalPension = Math.min(assetsPension, incomePension)

  return {
    eligible: finalPension > 0,
    amount: finalPension
  }
}