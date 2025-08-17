// Assumptions registry for different financial years
// Manages versioning and provides default assumptions

import type { Assumptions } from '../engine/types'
import { ASSUMPTIONS_AUS_2025_26 } from './2025-26'

export interface AssumptionsMetadata {
  id: string
  display_name: string
  financial_year: string
  effective_from: Date
  effective_to: Date
  description: string
  data: Assumptions
  is_current: boolean
  is_projected: boolean
}

/**
 * Registry of all available assumptions
 */
export const ASSUMPTIONS_REGISTRY: AssumptionsMetadata[] = [
  {
    id: 'AUS_2025_26',
    display_name: 'Australia 2025-26',
    financial_year: '2025-26',
    effective_from: new Date('2025-07-01'),
    effective_to: new Date('2026-06-30'),
    description: 'Australian tax rates, super rules, and age pension thresholds for FY 2025-26. Includes Stage 3 tax cuts and 12% SG rate.',
    data: ASSUMPTIONS_AUS_2025_26,
    is_current: true,
    is_projected: false
  }
]

/**
 * Get assumptions by ID
 */
export function getAssumptions(id: string): Assumptions | null {
  const entry = ASSUMPTIONS_REGISTRY.find(reg => reg.id === id)
  return entry ? entry.data : null
}

/**
 * Get current assumptions (for the current financial year)
 */
export function getCurrentAssumptions(): Assumptions {
  const currentEntry = ASSUMPTIONS_REGISTRY.find(reg => reg.is_current)
  if (!currentEntry) {
    throw new Error('No current assumptions found in registry')
  }
  return currentEntry.data
}

/**
 * Get assumptions metadata by ID
 */
export function getAssumptionsMetadata(id: string): AssumptionsMetadata | null {
  return ASSUMPTIONS_REGISTRY.find(reg => reg.id === id) || null
}

/**
 * Get all available assumptions
 */
export function getAllAssumptions(): AssumptionsMetadata[] {
  return [...ASSUMPTIONS_REGISTRY]
}

/**
 * Check if assumptions are compatible with engine version
 */
export function isCompatibleVersion(assumptionsId: string, engineVersion: string): boolean {
  // For now, all assumptions in registry are compatible with engine 2.0.0+
  // In future, we might have version-specific compatibility rules
  const metadata = getAssumptionsMetadata(assumptionsId)
  if (!metadata) return false
  
  // Simple compatibility check - all current assumptions work with 2.x
  return engineVersion.startsWith('2.')
}

/**
 * Validate assumptions object structure
 */
export function validateAssumptions(assumptions: Assumptions): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check required fields
  if (!assumptions.id) {
    errors.push('Assumptions must have an ID')
  }

  if (!assumptions.financial_year) {
    errors.push('Assumptions must specify financial year')
  }

  if (!assumptions.tax_brackets || assumptions.tax_brackets.length === 0) {
    errors.push('Tax brackets are required')
  }

  // Validate tax brackets structure
  if (assumptions.tax_brackets) {
    assumptions.tax_brackets.forEach((bracket, index) => {
      if (typeof bracket.min_income !== 'number' || bracket.min_income < 0) {
        errors.push(`Tax bracket ${index + 1}: min_income must be a non-negative number`)
      }
      
      if (bracket.max_income !== null && (typeof bracket.max_income !== 'number' || bracket.max_income <= bracket.min_income)) {
        errors.push(`Tax bracket ${index + 1}: max_income must be null or greater than min_income`)
      }
      
      if (typeof bracket.rate !== 'number' || bracket.rate < 0 || bracket.rate > 1) {
        errors.push(`Tax bracket ${index + 1}: rate must be between 0 and 1`)
      }
    })
  }

  // Validate superannuation settings
  if (!assumptions.superannuation) {
    errors.push('Superannuation settings are required')
  } else {
    const super_settings = assumptions.superannuation
    
    if (typeof super_settings.superannuation_guarantee_rate !== 'number' || 
        super_settings.superannuation_guarantee_rate < 0 || 
        super_settings.superannuation_guarantee_rate > 0.2) {
      errors.push('Superannuation guarantee rate must be between 0% and 20%')
    }
    
    if (typeof super_settings.preservation_age !== 'number' || 
        super_settings.preservation_age < 55 || 
        super_settings.preservation_age > 67) {
      errors.push('Preservation age must be between 55 and 67')
    }
    
    if (typeof super_settings.concessional_cap !== 'number' || super_settings.concessional_cap <= 0) {
      errors.push('Concessional contribution cap must be positive')
    }
  }

  // Validate age pension settings
  if (!assumptions.age_pension) {
    errors.push('Age pension settings are required')
  } else {
    const pension = assumptions.age_pension
    
    if (typeof pension.maximum_payment_single !== 'number' || pension.maximum_payment_single <= 0) {
      errors.push('Maximum single age pension payment must be positive')
    }
    
    if (typeof pension.deeming_rate_lower !== 'number' || 
        pension.deeming_rate_lower < 0 || 
        pension.deeming_rate_lower > 0.1) {
      errors.push('Lower deeming rate must be between 0% and 10%')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Create default return model assumptions for a given assumptions set
 */
export function createDefaultReturnModel(assumptionsId: string = 'AUS_2025_26') {
  // These are reasonable defaults for Australian markets
  return {
    base: {
      super_return_rate: 0.07,      // 7% long-term super returns
      non_super_return_rate: 0.065, // 6.5% for non-super investments
      inflation_rate: 0.025,        // 2.5% inflation target
      volatility: 0.15              // 15% volatility for Monte Carlo
    },
    conservative: {
      super_return_rate: 0.055,     // 5.5% conservative returns
      non_super_return_rate: 0.05,  // 5% conservative non-super
      inflation_rate: 0.02,         // 2% lower inflation
      volatility: 0.12              // 12% lower volatility
    },
    optimistic: {
      super_return_rate: 0.085,     // 8.5% optimistic returns
      non_super_return_rate: 0.08,  // 8% optimistic non-super
      inflation_rate: 0.03,         // 3% higher inflation
      volatility: 0.18              // 18% higher volatility
    }
  }
}

/**
 * Get version information for the assumptions system
 */
export function getVersionInfo() {
  return {
    registry_version: '1.0.0',
    last_updated: new Date('2025-08-17'),
    total_assumptions: ASSUMPTIONS_REGISTRY.length,
    current_assumption: getCurrentAssumptions().id,
    available_years: ASSUMPTIONS_REGISTRY.map(reg => reg.financial_year)
  }
}

/**
 * Future financial years (placeholders for when data becomes available)
 */
export const FUTURE_FINANCIAL_YEARS = [
  {
    id: 'AUS_2026_27',
    financial_year: '2026-27',
    status: 'not_available',
    expected_release: new Date('2026-05-01'),
    description: 'Will be available closer to the financial year'
  },
  {
    id: 'AUS_2027_28',
    financial_year: '2027-28',
    status: 'not_available',
    expected_release: new Date('2027-05-01'),
    description: 'Will be available closer to the financial year'
  }
]