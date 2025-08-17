// Australian financial year 2025-26 constants
// Official rates and thresholds for tax, super, and age pension

import type { Assumptions, TaxBracket } from '../engine/types'

/**
 * Australian tax brackets for 2025-26 financial year
 * Includes Stage 3 tax cuts effective from 1 July 2024
 */
export const TAX_BRACKETS_2025_26: TaxBracket[] = [
  {
    min_income: 0,
    max_income: 18200,
    rate: 0.00,
    medicare_levy: 0.00
  },
  {
    min_income: 18201,
    max_income: 45000,
    rate: 0.16, // 16% (reduced from 19% under Stage 3)
    medicare_levy: 0.02
  },
  {
    min_income: 45001,
    max_income: 135000,
    rate: 0.30, // 30% (reduced from 32.5% under Stage 3)
    medicare_levy: 0.02
  },
  {
    min_income: 135001,
    max_income: 190000,
    rate: 0.37,
    medicare_levy: 0.02
  },
  {
    min_income: 190001,
    max_income: null,
    rate: 0.45,
    medicare_levy: 0.02
  }
]

/**
 * Age Pension rates and thresholds for 2025-26
 * Updated twice yearly (March and September)
 */
export const AGE_PENSION_2025_26 = {
  // Maximum fortnightly payments (as at September 2024, projected for 2025-26)
  maximum_payment_single: 1144.40 * 26, // Annual amount
  maximum_payment_couple: 1725.20 * 26, // Annual combined (each gets $862.60)
  
  // Assets test thresholds (annual review)
  assets_test_threshold_single: 301750, // Homeowner
  assets_test_threshold_couple: 451500, // Homeowner combined
  assets_test_threshold_single_non_homeowner: 543750,
  assets_test_threshold_couple_non_homeowner: 693500,
  
  // Income test thresholds
  income_test_threshold_single: 2385.60 * 26, // Annual amount
  income_test_threshold_couple: 3544.40 * 26, // Annual combined
  
  // Deeming rates (set by RBA, last updated September 2024)
  deeming_rate_lower: 0.025, // 2.5% for first $62,600 (single) / $103,800 (couple)
  deeming_rate_upper: 0.0425, // 4.25% for amounts above threshold
  deeming_threshold: 62600, // Single person threshold
  deeming_threshold_couple: 103800,
  
  // Pension age (fully implemented to 67 from July 2023)
  pension_age: 67,
  
  // Assets test taper rates
  assets_taper_single: 0.0075, // $7.50 per $1,000 over threshold
  assets_taper_couple: 0.00375, // $3.75 per $1,000 over threshold (per person)
  
  // Income test taper rate
  income_taper: 0.50 // 50 cents per dollar over threshold
}

/**
 * Superannuation rates and caps for 2025-26
 */
export const SUPERANNUATION_2025_26 = {
  // Superannuation Guarantee rate
  superannuation_guarantee_rate: 0.115, // 11.5% for 2024-25, 12.0% from 1 July 2025
  
  // Key ages
  preservation_age: 60, // For people born after 1 July 1964
  pension_age: 67,
  contribution_age_limit: 75, // No age limit from 1 July 2022, but practical limit
  
  // Contribution caps (2024-25, expected to increase with indexation)
  concessional_cap: 30000, // Annual concessional contributions cap
  non_concessional_cap: 120000, // Annual non-concessional cap
  bring_forward_cap: 360000, // 3-year bring-forward cap (3 x non-concessional)
  
  // Transfer Balance Cap
  transfer_balance_cap: 1900000, // Increased from $1.7m to $1.9m (1 July 2023)
  
  // Division 296 tax (on super balances > $3m)
  div296_threshold: 3000000,
  div296_tax_rate: 0.15, // Additional 15% tax (30% total on earnings)
  
  // Minimum drawdown rates by age
  minimum_drawdown_rates: {
    '55-64': 0.04,   // 4%
    '65-74': 0.05,   // 5%
    '75-79': 0.06,   // 6%
    '80-84': 0.07,   // 7%
    '85-89': 0.09,   // 9%
    '90-94': 0.11,   // 11%
    '95+': 0.14      // 14%
  },
  
  // Super tax rates
  contributions_tax: 0.15, // 15% on concessional contributions
  earnings_tax: 0.15,      // 15% on fund earnings
  pension_phase_tax: 0.00, // 0% tax in pension phase
  
  // Contribution thresholds for higher tax
  higher_contributions_threshold: 250000, // Additional 15% tax above this income
  
  // Work test (removed for those under 75 from 1 July 2022)
  work_test_age: 75,
  work_test_hours: 40 // Hours per month if applicable
}

/**
 * Medicare and health insurance thresholds for 2025-26
 */
export const MEDICARE_2025_26 = {
  // Medicare Levy
  medicare_levy_rate: 0.02, // 2%
  medicare_levy_threshold_single: 29207,
  medicare_levy_threshold_couple: 49304,
  medicare_levy_threshold_family: 49304, // Plus $4,530 per child
  
  // Medicare Levy Surcharge (for those without private health insurance)
  medicare_levy_surcharge_threshold_single: 97000,
  medicare_levy_surcharge_threshold_couple: 194000,
  medicare_levy_surcharge_rates: {
    tier1: 0.01,   // 1% for income $97,001-$113,000 (single)
    tier2: 0.0125, // 1.25% for income $113,001-$151,000 (single)
    tier3: 0.015   // 1.5% for income above $151,000 (single)
  }
}

/**
 * Other relevant thresholds and rates
 */
export const OTHER_THRESHOLDS_2025_26 = {
  // Tax offsets
  low_income_tax_offset: {
    maximum: 700,
    threshold_start: 37500,
    threshold_end: 45000,
    taper_rate: 0.05
  },
  
  // Senior and Pensioner Tax Offset (SAPTO)
  sapto_single: {
    maximum: 2230,
    threshold: 32279,
    taper_rate: 0.125
  },
  sapto_couple: {
    maximum: 1602, // Each
    threshold: 28974, // Each
    taper_rate: 0.125
  },
  
  // First Home Super Saver Scheme
  fhsss_maximum_release: 50000,
  fhsss_annual_limit: 15000,
  
  // Capital Gains Tax
  cgt_discount_rate: 0.50, // 50% discount for assets held > 12 months
  
  // Fringe Benefits Tax
  fbt_rate: 0.47, // 47% for 2024-25
  
  // Small business CGT concessions
  small_business_threshold: 6000000, // Active asset threshold
  
  // PAYG withholding thresholds
  payg_threshold: 18200 // Tax-free threshold
}

/**
 * Complete assumptions object for 2025-26 financial year
 */
export const ASSUMPTIONS_AUS_2025_26: Assumptions = {
  id: 'AUS_2025_26',
  financial_year: '2025-26',
  tax_brackets: TAX_BRACKETS_2025_26,
  superannuation: {
    superannuation_guarantee_rate: SUPERANNUATION_2025_26.superannuation_guarantee_rate,
    preservation_age: SUPERANNUATION_2025_26.preservation_age,
    concessional_cap: SUPERANNUATION_2025_26.concessional_cap,
    non_concessional_cap: SUPERANNUATION_2025_26.non_concessional_cap,
    bring_forward_cap: SUPERANNUATION_2025_26.bring_forward_cap,
    transfer_balance_cap: SUPERANNUATION_2025_26.transfer_balance_cap,
    minimum_drawdown_rates: SUPERANNUATION_2025_26.minimum_drawdown_rates
  },
  age_pension: {
    maximum_payment_single: AGE_PENSION_2025_26.maximum_payment_single,
    maximum_payment_couple: AGE_PENSION_2025_26.maximum_payment_couple,
    assets_test_threshold_single: AGE_PENSION_2025_26.assets_test_threshold_single,
    assets_test_threshold_couple: AGE_PENSION_2025_26.assets_test_threshold_couple,
    income_test_threshold_single: AGE_PENSION_2025_26.income_test_threshold_single,
    income_test_threshold_couple: AGE_PENSION_2025_26.income_test_threshold_couple,
    deeming_rate_lower: AGE_PENSION_2025_26.deeming_rate_lower,
    deeming_rate_upper: AGE_PENSION_2025_26.deeming_rate_upper,
    deeming_threshold: AGE_PENSION_2025_26.deeming_threshold
  },
  policy_settings: {
    homeowner_status: true, // Default assumption
    div296_applies: true,   // Division 296 is in effect
    apply_stage3_tax_cuts: true // Stage 3 tax cuts in effect
  }
}

/**
 * Helper functions for financial year specific calculations
 */
export const FY_2025_26_HELPERS = {
  /**
   * Get SG rate for a specific date in FY 2025-26
   */
  getSGRate: (date: Date): number => {
    // 11.5% until 30 June 2025, then 12.0%
    if (date >= new Date('2025-07-01')) {
      return 0.12
    }
    return 0.115
  },

  /**
   * Get minimum drawdown rate for a given age
   */
  getMinDrawdownRate: (age: number): number => {
    if (age < 55) return 0
    if (age < 65) return 0.04
    if (age < 75) return 0.05
    if (age < 80) return 0.06
    if (age < 85) return 0.07
    if (age < 90) return 0.09
    if (age < 95) return 0.11
    return 0.14
  },

  /**
   * Check if someone is eligible for SAPTO
   */
  isEligibleForSAPTO: (age: number): boolean => {
    return age >= AGE_PENSION_2025_26.pension_age
  },

  /**
   * Get age pension asset threshold based on homeowner status and relationship
   */
  getAssetThreshold: (isHomeowner: boolean, isCouple: boolean): number => {
    if (isCouple) {
      return isHomeowner 
        ? AGE_PENSION_2025_26.assets_test_threshold_couple
        : AGE_PENSION_2025_26.assets_test_threshold_couple_non_homeowner
    } else {
      return isHomeowner
        ? AGE_PENSION_2025_26.assets_test_threshold_single
        : AGE_PENSION_2025_26.assets_test_threshold_single_non_homeowner
    }
  }
}