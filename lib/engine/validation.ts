// Input validation for the FIRE planning engine
// Ensures all inputs are valid before expensive calculations begin

import type { RunRequest, Person, Household, ReturnModel, Strategy } from './types'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateRunRequest(request: RunRequest): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate household structure
  const householdValidation = validateHousehold(request.household)
  errors.push(...householdValidation.errors)
  warnings.push(...householdValidation.warnings)

  // Validate return model
  const returnValidation = validateReturnModel(request.returns)
  errors.push(...returnValidation.errors)
  warnings.push(...returnValidation.warnings)

  // Validate strategy
  const strategyValidation = validateStrategy(request.strategy, request.household)
  errors.push(...strategyValidation.errors)
  warnings.push(...strategyValidation.warnings)

  // Validate horizon
  const horizonValidation = validateHorizon(request.horizon, request.household)
  errors.push(...horizonValidation.errors)
  warnings.push(...horizonValidation.warnings)

  // Validate assumptions
  const assumptionsValidation = validateAssumptions(request.assumptions)
  errors.push(...assumptionsValidation.errors)
  warnings.push(...assumptionsValidation.warnings)

  // Cross-validation checks
  const crossValidation = validateCrossConstraints(request)
  errors.push(...crossValidation.errors)
  warnings.push(...crossValidation.warnings)

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

function validateHousehold(household: Household): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check people array
  if (!household.people || household.people.length === 0) {
    errors.push('Household must have at least one person')
  }

  if (household.people.length > 2) {
    errors.push('Household cannot have more than 2 people')
  }

  // Validate structure consistency
  if (household.structure === 'couple' && household.people.length !== 2) {
    errors.push('Couple household must have exactly 2 people')
  }

  if (household.structure === 'single' && household.people.length !== 1) {
    errors.push('Single household must have exactly 1 person')
  }

  // Validate each person
  household.people.forEach((person, index) => {
    const personValidation = validatePerson(person, index)
    errors.push(...personValidation.errors)
    warnings.push(...personValidation.warnings)
  })

  // Validate expenses
  if (household.annual_expenses.single_person <= 0) {
    errors.push('Single person expenses must be positive')
  }

  if (household.annual_expenses.couple <= 0) {
    errors.push('Couple expenses must be positive')
  }

  if (household.annual_expenses.couple < household.annual_expenses.single_person) {
    warnings.push('Couple expenses are less than single person expenses - this may be unrealistic')
  }

  if (household.annual_expenses.current <= 0) {
    errors.push('Current expenses must be positive')
  }

  // Validate assets
  if (household.assets.non_super_investments < 0) {
    errors.push('Non-super investments cannot be negative')
  }

  if (household.assets.mortgage_balance && household.assets.mortgage_balance < 0) {
    errors.push('Mortgage balance cannot be negative')
  }

  if (household.assets.home_value && household.assets.mortgage_balance && 
      household.assets.mortgage_balance > household.assets.home_value) {
    warnings.push('Mortgage balance exceeds home value - negative equity situation')
  }

  return { valid: errors.length === 0, errors, warnings }
}

function validatePerson(person: Person, index: number): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const currentYear = new Date().getFullYear()

  // Validate ID
  if (!person.id || person.id.trim() === '') {
    errors.push(`Person ${index + 1}: ID is required`)
  }

  // Validate name
  if (!person.name || person.name.trim() === '') {
    errors.push(`Person ${index + 1}: Name is required`)
  }

  // Validate birth year
  if (!person.birth_year) {
    errors.push(`Person ${index + 1}: Birth year is required`)
  } else {
    const age = currentYear - person.birth_year
    if (age < 18) {
      errors.push(`Person ${index + 1}: Must be at least 18 years old`)
    }
    if (age > 100) {
      warnings.push(`Person ${index + 1}: Age over 100 - please verify birth year`)
    }
    if (person.birth_year < 1900 || person.birth_year > currentYear) {
      errors.push(`Person ${index + 1}: Birth year must be between 1900 and ${currentYear}`)
    }
  }

  // Validate super balance
  if (person.super_balance < 0) {
    errors.push(`Person ${index + 1}: Super balance cannot be negative`)
  }

  if (person.super_balance > 10000000) {
    warnings.push(`Person ${index + 1}: Super balance over $10M - may trigger additional tax considerations`)
  }

  // Validate salary
  if (person.annual_salary < 0) {
    errors.push(`Person ${index + 1}: Annual salary cannot be negative`)
  }

  if (person.annual_salary > 1000000) {
    warnings.push(`Person ${index + 1}: Annual salary over $1M - may trigger additional tax considerations`)
  }

  // Validate super contribution rate
  if (person.super_contribution_rate !== undefined) {
    if (person.super_contribution_rate < 0 || person.super_contribution_rate > 1) {
      errors.push(`Person ${index + 1}: Super contribution rate must be between 0 and 100%`)
    }
  }

  // Validate FIRE age
  if (person.fire_age !== undefined) {
    const currentAge = currentYear - person.birth_year
    if (person.fire_age <= currentAge) {
      errors.push(`Person ${index + 1}: FIRE age must be in the future`)
    }
    if (person.fire_age > 67) {
      warnings.push(`Person ${index + 1}: FIRE age after 67 - consider normal retirement instead`)
    }
    if (person.fire_age < 35) {
      warnings.push(`Person ${index + 1}: FIRE age before 35 - very aggressive timeline`)
    }
  }

  // Validate life expectancy
  if (person.life_expectancy < 70) {
    warnings.push(`Person ${index + 1}: Life expectancy below 70 - may want to consider longevity risk`)
  }
  if (person.life_expectancy > 110) {
    warnings.push(`Person ${index + 1}: Life expectancy above 110 - please verify`)
  }

  const currentAge = currentYear - person.birth_year
  if (person.life_expectancy <= currentAge) {
    errors.push(`Person ${index + 1}: Life expectancy must be greater than current age`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

function validateReturnModel(returns: ReturnModel): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate return rates
  if (returns.assumptions.super_return_rate < 0 || returns.assumptions.super_return_rate > 0.20) {
    errors.push('Super return rate must be between 0% and 20%')
  }

  if (returns.assumptions.non_super_return_rate < 0 || returns.assumptions.non_super_return_rate > 0.20) {
    errors.push('Non-super return rate must be between 0% and 20%')
  }

  if (returns.assumptions.inflation_rate < 0 || returns.assumptions.inflation_rate > 0.15) {
    errors.push('Inflation rate must be between 0% and 15%')
  }

  // Real return validation
  const realSuperReturn = returns.assumptions.super_return_rate - returns.assumptions.inflation_rate
  const realNonSuperReturn = returns.assumptions.non_super_return_rate - returns.assumptions.inflation_rate

  if (realSuperReturn < -0.05) {
    warnings.push('Super real return is significantly negative - consider adjusting assumptions')
  }

  if (realNonSuperReturn < -0.05) {
    warnings.push('Non-super real return is significantly negative - consider adjusting assumptions')
  }

  // Monte Carlo specific validation
  if (returns.type === 'monte_carlo' && returns.monte_carlo_settings) {
    const mc = returns.monte_carlo_settings

    if (mc.simulation_runs < 100) {
      warnings.push('Monte Carlo runs below 100 - results may be unreliable')
    }

    if (mc.simulation_runs > 10000) {
      warnings.push('Monte Carlo runs above 10,000 - computation may be slow')
    }

    // Asset allocation validation
    const totalAllocation = mc.asset_allocation.stocks + mc.asset_allocation.bonds + mc.asset_allocation.cash
    if (Math.abs(totalAllocation - 1.0) > 0.01) {
      errors.push('Asset allocation must sum to 100%')
    }

    if (mc.asset_allocation.stocks < 0 || mc.asset_allocation.stocks > 1) {
      errors.push('Stock allocation must be between 0% and 100%')
    }

    if (mc.asset_allocation.bonds < 0 || mc.asset_allocation.bonds > 1) {
      errors.push('Bond allocation must be between 0% and 100%')
    }

    if (mc.asset_allocation.cash < 0 || mc.asset_allocation.cash > 1) {
      errors.push('Cash allocation must be between 0% and 100%')
    }

    if (returns.assumptions.volatility !== undefined) {
      if (returns.assumptions.volatility < 0 || returns.assumptions.volatility > 0.50) {
        errors.push('Volatility must be between 0% and 50%')
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

function validateStrategy(strategy: Strategy, household: Household): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate household strategy consistency
  if (household.structure === 'single' && 
      ['person1_fire_first', 'person2_fire_first', 'staggered_retirement'].includes(strategy.household.type)) {
    errors.push('Single person household cannot use couple-specific strategies')
  }

  // Validate spenddown strategy
  if (strategy.spenddown.longevity_planning_age < 70) {
    warnings.push('Longevity planning age below 70 - consider longevity risk')
  }

  if (strategy.spenddown.longevity_planning_age > 110) {
    warnings.push('Longevity planning age above 110 - may be overly conservative')
  }

  // Validate bridge income strategy
  if (strategy.bridge.lump_sum_events) {
    strategy.bridge.lump_sum_events.forEach((event, index) => {
      if (event.amount <= 0) {
        errors.push(`Lump sum event ${index + 1}: Amount must be positive`)
      }

      if (event.probability < 0 || event.probability > 100) {
        errors.push(`Lump sum event ${index + 1}: Probability must be between 0% and 100%`)
      }

      if (event.date < new Date()) {
        warnings.push(`Lump sum event ${index + 1}: Date is in the past`)
      }
    })
  }

  return { valid: errors.length === 0, errors, warnings }
}

function validateHorizon(horizon: { start_year: number; end_age: number }, household: Household): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const currentYear = new Date().getFullYear()

  if (horizon.start_year < currentYear - 1) {
    errors.push('Start year cannot be more than 1 year in the past')
  }

  if (horizon.start_year > currentYear + 5) {
    warnings.push('Start year more than 5 years in the future - results may be speculative')
  }

  if (horizon.end_age < 70) {
    warnings.push('Planning horizon ends before age 70 - consider longevity risk')
  }

  if (horizon.end_age > 110) {
    warnings.push('Planning horizon extends beyond age 110 - may be overly conservative')
  }

  // Check that horizon is reasonable for all people
  const minCurrentAge = Math.min(...household.people.map(p => currentYear - p.birth_year))
  const planningYears = horizon.end_age - minCurrentAge

  if (planningYears > 80) {
    warnings.push('Planning horizon exceeds 80 years - computation may be slow')
  }

  if (planningYears < 10) {
    warnings.push('Planning horizon less than 10 years - may be too short for FIRE planning')
  }

  return { valid: errors.length === 0, errors, warnings }
}

function validateAssumptions(assumptions: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!assumptions.id) {
    errors.push('Assumptions must have an ID')
  }

  if (!assumptions.financial_year) {
    errors.push('Assumptions must specify financial year')
  }

  // Add more assumptions validation as needed
  // This is where we'd validate tax brackets, super rules, etc.

  return { valid: errors.length === 0, errors, warnings }
}

function validateCrossConstraints(request: RunRequest): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Cross-validate FIRE ages with expenses
  const totalCurrentSuper = request.household.people.reduce((sum, p) => sum + p.super_balance, 0)
  const annualExpenses = request.household.annual_expenses.current

  if (totalCurrentSuper < annualExpenses * 5) {
    warnings.push('Current super balance is less than 5x annual expenses - FIRE may require significant bridge funding')
  }

  // Validate reasonable FIRE timeline
  const youngestFireAge = Math.min(...request.household.people
    .filter(p => p.fire_age !== undefined)
    .map(p => p.fire_age!))

  if (youngestFireAge && totalCurrentSuper < annualExpenses * (youngestFireAge - 40) * 0.25) {
    warnings.push('Current super balance may be insufficient for target FIRE age - consider more aggressive savings or later FIRE date')
  }

  return { valid: errors.length === 0, errors, warnings }
}