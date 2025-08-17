// Core engine types for the unified FIRE planning engine
// This defines the contract between UI and business logic

export interface Person {
  id: string
  name: string
  birth_year: number
  super_balance: number
  annual_salary: number
  super_contribution_rate?: number // Override SG rate if needed
  fire_age?: number // When they want to stop working
  life_expectancy: number
}

export interface Household {
  people: Person[]
  structure: 'single' | 'couple'
  annual_expenses: {
    single_person: number
    couple: number
    current: number // Calculated based on structure
  }
  assets: {
    non_super_investments: number
    home_value?: number
    mortgage_balance?: number
    other_assets: number
  }
  strategy: HouseholdStrategy
}

export interface HouseholdStrategy {
  type: 'both_stop_same_year' | 'person1_fire_first' | 'person2_fire_first' | 'staggered_retirement'
  expense_modeling: 'household_throughout' | 'single_then_household' | 'dynamic_optimization'
  withdrawal_sequencing: 'sequential' | 'proportional' | 'tax_optimized'
}

export interface BridgeIncome {
  salary_income: {
    [personId: string]: {
      years_working_post_fire: number
      salary_decline_rate: number // % per year
    }
  }
  part_time_income: {
    annual_amount: number
    years_duration: number
    decline_rate: number
  }
  rental_income: {
    properties: RentalProperty[]
    use_portfolio: boolean
  }
  lump_sum_events: LumpSumEvent[]
}

export interface RentalProperty {
  id: string
  name: string
  weekly_rent: number
  annual_expenses: number
  rental_growth_rate: number
  vacancy_rate: number
  fire_suitability_score: number
}

export interface LumpSumEvent {
  id: string
  name: string
  amount: number
  date: Date
  probability: number // 0-100%
  tax_treatment: 'tax_free' | 'capital_gains' | 'income' | 'super_contribution'
  allocation_strategy: 'bridge_funding' | 'investment' | 'debt_reduction' | 'super_contribution'
  source: 'inheritance' | 'property_sale' | 'investment_exit' | 'windfall' | 'bonus' | 'other'
}

export interface SpenddownStrategy {
  type: 'sequential' | 'proportional' | 'tax_optimized' | 'min_drawdown_only'
  withdrawal_method: 'fixed_real' | 'fixed_nominal' | 'dynamic' | 'guardrails' | 'spend_to_zero'
  longevity_planning_age: number
  use_transition_to_retirement: boolean
  age_pension_optimization: boolean
}

export interface ReturnModel {
  type: 'deterministic' | 'monte_carlo'
  scenario: 'base' | 'conservative' | 'optimistic' | 'custom'
  assumptions: {
    super_return_rate: number
    non_super_return_rate: number
    inflation_rate: number
    volatility?: number // For Monte Carlo
  }
  monte_carlo_settings?: {
    simulation_runs: number
    asset_allocation: {
      stocks: number
      bonds: number
      cash: number
    }
    withdrawal_strategy: 'fixed_real' | 'fixed_nominal' | 'dynamic' | 'floor_ceiling'
  }
}

export interface Assumptions {
  id: string // e.g., "AUS_2025_26"
  financial_year: string // e.g., "2025-26"
  tax_brackets: TaxBracket[]
  superannuation: {
    superannuation_guarantee_rate: number
    preservation_age: number
    concessional_cap: number
    non_concessional_cap: number
    bring_forward_cap: number
    transfer_balance_cap: number
    minimum_drawdown_rates: { [ageRange: string]: number }
  }
  age_pension: {
    maximum_payment_single: number
    maximum_payment_couple: number
    assets_test_threshold_single: number
    assets_test_threshold_couple: number
    income_test_threshold_single: number
    income_test_threshold_couple: number
    deeming_rate_lower: number
    deeming_rate_upper: number
    deeming_threshold: number
  }
  policy_settings: {
    homeowner_status: boolean
    div296_applies: boolean // Division 296 tax on super > $3m
    apply_stage3_tax_cuts: boolean
  }
}

export interface TaxBracket {
  min_income: number
  max_income: number | null
  rate: number
  medicare_levy: number
}

export interface Strategy {
  household: HouseholdStrategy
  bridge: BridgeIncome
  spenddown: SpenddownStrategy
  tax_optimization: {
    person1_drain_first: boolean
    minimize_total_tax: boolean
    preserve_tax_free_component: boolean
  }
}

export interface RunRequest {
  household: Household
  assumptions: Assumptions
  returns: ReturnModel
  strategy: Strategy
  horizon: {
    start_year: number
    end_age: number // Plan until this age for the older person
  }
  options: {
    include_monte_carlo: boolean
    monte_carlo_runs?: number
    include_stress_testing: boolean
    detailed_timeline: boolean
  }
}

export interface YearRow {
  year: number
  ages: { [personId: string]: number }
  
  // Pre-60 Bridge Phase
  bridge_income: {
    salary_income: number
    part_time_income: number
    rental_income: number
    lump_sum_received: number
    total_bridge_income: number
  }
  bridge_expenses: number
  bridge_net_position: number
  
  // Super Accumulation
  super_balances: { [personId: string]: number }
  super_contributions: { [personId: string]: number }
  super_returns: { [personId: string]: number }
  super_accessible: { [personId: string]: number }
  
  // Post-60 Withdrawal Phase
  super_withdrawals: { [personId: string]: number }
  minimum_drawdowns: { [personId: string]: number }
  
  // Age Pension
  age_pension_eligible: { [personId: string]: boolean }
  age_pension_amount: { [personId: string]: number }
  
  // Tax Position
  taxable_income: { [personId: string]: number }
  tax_payable: { [personId: string]: number }
  
  // Net Worth
  total_super: number
  total_non_super: number
  total_net_worth: number
  
  // Sustainability Metrics
  sustainable_income: number
  required_income: number
  surplus_deficit: number
  fire_feasible: boolean
}

export interface ChartData {
  assets_over_time: {
    years: number[]
    super_balances: number[]
    non_super_balances: number[]
    total_net_worth: number[]
  }
  income_vs_expenses: {
    years: number[]
    income: number[]
    expenses: number[]
    surplus: number[]
  }
  fire_timeline: {
    years: number[]
    feasibility_score: number[]
    bridge_requirement: number[]
    super_sustainability: number[]
  }
  monte_carlo_results?: {
    confidence_intervals: {
      p5: number[]
      p50: number[]
      p95: number[]
    }
    success_rate_by_year: number[]
    risk_metrics: {
      sequence_risk: number
      inflation_risk: number
      longevity_risk: number
    }
  }
}

export interface RunResult {
  // Input Summary
  request_summary: {
    household_type: string
    fire_ages: number[]
    total_current_super: number
    annual_expenses: number
    strategy_description: string
  }
  
  // Year-by-Year Timeline
  timeline: YearRow[]
  
  // Chart Data
  charts: ChartData
  
  // Key Metrics
  metrics: {
    // Bridge Phase
    bridge_required_today: number
    bridge_years_needed: number
    bridge_feasible: boolean
    
    // Super Phase
    super_lasts_to_age: { [personId: string]: number | null }
    super_exhaustion_year: number | null
    
    // Age Pension
    pension_start_year: { [personId: string]: number | null }
    lifetime_pension_value: number
    
    // Overall Assessment
    fire_feasible: boolean
    fire_confidence_score: number // 0-100
    major_risks: string[]
    optimization_opportunities: string[]
  }
  
  // Monte Carlo Results (if enabled)
  monte_carlo?: {
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
  
  // Computation Metadata
  computation_info: {
    engine_version: string
    assumptions_version: string
    computation_time_ms: number
    deterministic_seed?: number
    cache_hit: boolean
  }
}

// Error types for robust error handling
export class EngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'EngineError'
  }
}

export class ValidationError extends EngineError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class ComputationError extends EngineError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'COMPUTATION_ERROR', details)
    this.name = 'ComputationError'
  }
}