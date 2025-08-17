// Rental Income Modeling for Investment Properties during FIRE
// Supports multiple properties with different scenarios

export interface RentalProperty {
  id: string
  name: string
  address?: string
  property_type: 'apartment' | 'house' | 'townhouse' | 'commercial' | 'other'
  purchase_price: number
  current_value: number
  
  // Rental details
  weekly_rent: number
  vacancy_rate: number // % per year (e.g., 5 = 5% vacancy)
  rental_growth_rate: number // % per year
  
  // Expenses
  annual_expenses: {
    property_management: number // % of rent or fixed amount
    council_rates: number
    water_rates: number
    insurance: number
    maintenance_repairs: number
    strata_body_corp?: number
    land_tax?: number
    other_expenses: number
  }
  
  // Financing
  outstanding_mortgage: number
  interest_rate: number
  loan_type: 'interest_only' | 'principal_interest'
  remaining_loan_term: number // years
  
  // Tax considerations
  depreciation_schedule: number // Annual depreciation deduction
  acquisition_date: Date
  negative_gearing_eligible: boolean
  
  // Strategy
  hold_strategy: 'hold_indefinitely' | 'sell_at_fire' | 'sell_after_years'
  sell_after_years?: number
  expected_capital_growth: number // % per year
  
  notes?: string
}

export interface RentalCashFlow {
  year: number
  properties: {
    [propertyId: string]: {
      gross_rental_income: number
      vacancy_loss: number
      net_rental_income: number
      total_expenses: number
      interest_payments: number
      principal_payments: number
      depreciation: number
      net_cash_flow: number
      taxable_income: number // Can be negative (loss)
      capital_value: number
    }
  }
  total_net_cash_flow: number
  total_taxable_income: number
  total_capital_value: number
  tax_benefit_from_losses: number
}

export interface RentalProjection {
  property_id: string
  years_projected: number
  annual_cash_flows: RentalCashFlow[]
  cumulative_cash_flow: number
  cumulative_tax_benefits: number
  capital_gain_if_sold: number
  total_return: number
  annual_yield: number
  sustainability_rating: number // 1-10
  fire_suitability_score: number // 1-100
  recommendations: string[]
}

export interface PortfolioProjection {
  properties: RentalProperty[]
  annual_projections: RentalCashFlow[]
  total_portfolio_value: number
  total_annual_income: number
  total_tax_position: number
  diversification_score: number
  fire_readiness_assessment: {
    reliable_income_percentage: number
    stress_test_results: string[]
    optimization_opportunities: string[]
  }
}

export function calculateRentalCashFlow(
  property: RentalProperty,
  year: number,
  marginalTaxRate: number = 0.325
): RentalCashFlow['properties'][string] {
  const yearsFromStart = year
  
  // Calculate rental income with growth and vacancy
  const annualRent = property.weekly_rent * 52
  const grownRent = annualRent * Math.pow(1 + (property.rental_growth_rate / 100), yearsFromStart)
  const vacancyLoss = grownRent * (property.vacancy_rate / 100)
  const netRentalIncome = grownRent - vacancyLoss
  
  // Calculate expenses
  const expenses = property.annual_expenses
  const managementFee = typeof expenses.property_management === 'number' && expenses.property_management < 1 
    ? grownRent * expenses.property_management 
    : expenses.property_management
  
  const totalExpenses = 
    managementFee +
    expenses.council_rates +
    expenses.water_rates +
    expenses.insurance +
    expenses.maintenance_repairs +
    (expenses.strata_body_corp || 0) +
    (expenses.land_tax || 0) +
    expenses.other_expenses
  
  // Calculate loan payments
  const monthlyRate = property.interest_rate / 100 / 12
  const totalPayments = property.remaining_loan_term * 12
  const monthlyPayment = property.outstanding_mortgage > 0 
    ? calculateMonthlyPayment(property.outstanding_mortgage, monthlyRate, totalPayments)
    : 0
  
  const annualLoanPayment = monthlyPayment * 12
  const interestPortion = property.outstanding_mortgage * (property.interest_rate / 100)
  const principalPortion = property.loan_type === 'principal_interest' 
    ? annualLoanPayment - interestPortion 
    : 0
  
  // Calculate cash flow and taxable income
  const netCashFlow = netRentalIncome - totalExpenses - annualLoanPayment
  const taxableIncome = netRentalIncome - totalExpenses - interestPortion - property.depreciation_schedule
  
  // Calculate property value growth
  const capitalValue = property.current_value * Math.pow(1 + (property.expected_capital_growth / 100), yearsFromStart)
  
  return {
    gross_rental_income: grownRent,
    vacancy_loss: vacancyLoss,
    net_rental_income: netRentalIncome,
    total_expenses: totalExpenses,
    interest_payments: interestPortion,
    principal_payments: principalPortion,
    depreciation: property.depreciation_schedule,
    net_cash_flow: netCashFlow,
    taxable_income: taxableIncome,
    capital_value: capitalValue
  }
}

function calculateMonthlyPayment(principal: number, monthlyRate: number, numPayments: number): number {
  if (monthlyRate === 0) return principal / numPayments
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
         (Math.pow(1 + monthlyRate, numPayments) - 1)
}

export function projectRentalIncome(
  property: RentalProperty,
  projectionYears: number,
  marginalTaxRate: number = 0.325
): RentalProjection {
  const annual_cash_flows: RentalCashFlow[] = []
  let cumulativeCashFlow = 0
  let cumulativeTaxBenefits = 0
  
  for (let year = 1; year <= projectionYears; year++) {
    const propertyFlow = calculateRentalCashFlow(property, year, marginalTaxRate)
    
    const cashFlow: RentalCashFlow = {
      year,
      properties: { [property.id]: propertyFlow },
      total_net_cash_flow: propertyFlow.net_cash_flow,
      total_taxable_income: propertyFlow.taxable_income,
      total_capital_value: propertyFlow.capital_value,
      tax_benefit_from_losses: propertyFlow.taxable_income < 0 
        ? Math.abs(propertyFlow.taxable_income) * marginalTaxRate 
        : 0
    }
    
    annual_cash_flows.push(cashFlow)
    cumulativeCashFlow += propertyFlow.net_cash_flow
    if (propertyFlow.taxable_income < 0) {
      cumulativeTaxBenefits += Math.abs(propertyFlow.taxable_income) * marginalTaxRate
    }
  }
  
  // Calculate metrics
  const finalValue = annual_cash_flows[annual_cash_flows.length - 1]?.properties[property.id]?.capital_value || property.current_value
  const capitalGain = finalValue - property.current_value
  const totalReturn = cumulativeCashFlow + capitalGain
  const annualYield = (property.weekly_rent * 52) / property.current_value * 100
  
  // Calculate sustainability rating
  const sustainability_rating = calculateSustainabilityRating(property, annual_cash_flows)
  const fire_suitability_score = calculateFireSuitabilityScore(property, annual_cash_flows, annualYield)
  
  const recommendations = generateRentalRecommendations(property, annual_cash_flows, annualYield)
  
  return {
    property_id: property.id,
    years_projected: projectionYears,
    annual_cash_flows,
    cumulative_cash_flow: cumulativeCashFlow,
    cumulative_tax_benefits: cumulativeTaxBenefits,
    capital_gain_if_sold: capitalGain,
    total_return: totalReturn,
    annual_yield: annualYield,
    sustainability_rating,
    fire_suitability_score,
    recommendations
  }
}

function calculateSustainabilityRating(property: RentalProperty, cashFlows: RentalCashFlow[]): number {
  let score = 100
  
  // Penalize high vacancy rates
  if (property.vacancy_rate > 8) score -= 20
  else if (property.vacancy_rate > 5) score -= 10
  
  // Penalize high debt levels
  const lvr = property.outstanding_mortgage / property.current_value
  if (lvr > 0.8) score -= 25
  else if (lvr > 0.6) score -= 15
  
  // Check cash flow consistency
  const negativeCashFlowYears = cashFlows.filter(cf => cf.total_net_cash_flow < 0).length
  if (negativeCashFlowYears > cashFlows.length * 0.5) score -= 30
  
  // Reward low maintenance properties
  if (property.property_type === 'apartment') score += 10
  if (property.annual_expenses.maintenance_repairs < property.current_value * 0.01) score += 15
  
  // Consider location stability (simplified)
  if (property.rental_growth_rate > 3) score += 10
  
  return Math.max(0, Math.min(100, score))
}

function calculateFireSuitabilityScore(
  property: RentalProperty, 
  cashFlows: RentalCashFlow[], 
  rentalYield: number
): number {
  let score = 50 // Base score
  
  // Reward positive cash flow
  const positiveCashFlowYears = cashFlows.filter(cf => cf.total_net_cash_flow > 0).length
  score += (positiveCashFlowYears / cashFlows.length) * 40
  
  // Reward good yield
  if (rentalYield > 6) score += 20
  else if (rentalYield > 4) score += 10
  
  // Reward low maintenance
  if (property.property_type === 'apartment' || property.property_type === 'townhouse') score += 10
  
  // Consider management complexity
  if (property.annual_expenses.property_management > 0) score += 15 // Professional management
  
  // Penalize high debt
  const lvr = property.outstanding_mortgage / property.current_value
  if (lvr > 0.7) score -= 20
  
  // Reward capital growth potential
  if (property.expected_capital_growth > 4) score += 10
  
  return Math.max(0, Math.min(100, score))
}

function generateRentalRecommendations(
  property: RentalProperty, 
  cashFlows: RentalCashFlow[], 
  rentalYield: number
): string[] {
  const recommendations: string[] = []
  
  // Cash flow analysis
  const negativeCashFlowYears = cashFlows.filter(cf => cf.total_net_cash_flow < 0).length
  if (negativeCashFlowYears > 0) {
    recommendations.push(`Property has ${negativeCashFlowYears} years of negative cash flow - consider increasing rent or reducing expenses`)
  }
  
  // Yield optimization
  if (rentalYield < 4) {
    recommendations.push('Low rental yield - consider property improvements to justify higher rent or reassess holding strategy')
  }
  
  // Debt optimization
  const lvr = property.outstanding_mortgage / property.current_value
  if (lvr > 0.8) {
    recommendations.push('High loan-to-value ratio - consider paying down debt to reduce risk and improve cash flow')
  }
  
  // Vacancy rate
  if (property.vacancy_rate > 6) {
    recommendations.push('High vacancy rate - review location desirability and property condition')
  }
  
  // Tax optimization
  const hasNegativeGearing = cashFlows.some(cf => cf.total_taxable_income < 0)
  if (!hasNegativeGearing && property.negative_gearing_eligible) {
    recommendations.push('Consider maximizing tax deductions through depreciation schedule review')
  }
  
  // FIRE strategy
  if (property.hold_strategy === 'hold_indefinitely' && rentalYield < 5) {
    recommendations.push('Consider "sell at FIRE" strategy if capital growth is strong but yield is low')
  }
  
  // Portfolio diversification
  recommendations.push('Ensure this property fits within a diversified investment portfolio strategy')
  
  return recommendations
}

export function projectRentalPortfolio(
  properties: RentalProperty[],
  projectionYears: number,
  marginalTaxRate: number = 0.325
): PortfolioProjection {
  const annual_projections: RentalCashFlow[] = []
  
  for (let year = 1; year <= projectionYears; year++) {
    const yearlyFlow: RentalCashFlow = {
      year,
      properties: {},
      total_net_cash_flow: 0,
      total_taxable_income: 0,
      total_capital_value: 0,
      tax_benefit_from_losses: 0
    }
    
    properties.forEach(property => {
      const propertyFlow = calculateRentalCashFlow(property, year, marginalTaxRate)
      yearlyFlow.properties[property.id] = propertyFlow
      yearlyFlow.total_net_cash_flow += propertyFlow.net_cash_flow
      yearlyFlow.total_taxable_income += propertyFlow.taxable_income
      yearlyFlow.total_capital_value += propertyFlow.capital_value
      
      if (propertyFlow.taxable_income < 0) {
        yearlyFlow.tax_benefit_from_losses += Math.abs(propertyFlow.taxable_income) * marginalTaxRate
      }
    })
    
    annual_projections.push(yearlyFlow)
  }
  
  const totalPortfolioValue = properties.reduce((sum, p) => sum + p.current_value, 0)
  const totalAnnualIncome = annual_projections[0]?.total_net_cash_flow || 0
  const totalTaxPosition = annual_projections[0]?.total_taxable_income || 0
  
  // Calculate diversification score
  const propertyTypes = new Set(properties.map(p => p.property_type))
  const diversificationScore = Math.min(100, (propertyTypes.size / 4) * 50 + properties.length * 10)
  
  // FIRE readiness assessment
  const reliableIncomePercentage = (totalAnnualIncome / totalPortfolioValue) * 100
  const stressTestResults = generateStressTestResults(properties, annual_projections)
  const optimizationOpportunities = generateOptimizationOpportunities(properties, annual_projections)
  
  return {
    properties,
    annual_projections,
    total_portfolio_value: totalPortfolioValue,
    total_annual_income: totalAnnualIncome,
    total_tax_position: totalTaxPosition,
    diversification_score: diversificationScore,
    fire_readiness_assessment: {
      reliable_income_percentage: reliableIncomePercentage,
      stress_test_results: stressTestResults,
      optimization_opportunities: optimizationOpportunities
    }
  }
}

function generateStressTestResults(properties: RentalProperty[], projections: RentalCashFlow[]): string[] {
  const results: string[] = []
  
  // Interest rate stress test
  const avgInterestRate = properties.reduce((sum, p) => sum + p.interest_rate, 0) / properties.length
  if (avgInterestRate < 5) {
    results.push('Interest rate risk: Portfolio vulnerable to rate rises above 6-7%')
  }
  
  // Vacancy stress test
  const avgVacancy = properties.reduce((sum, p) => sum + p.vacancy_rate, 0) / properties.length
  if (avgVacancy < 5) {
    results.push('Vacancy risk: Portfolio assumes low vacancy - stress test at 8-10% vacancy')
  }
  
  // Market downturn
  const totalLoss = projections.reduce((sum, p) => sum + Math.min(0, p.total_net_cash_flow), 0)
  if (totalLoss < 0) {
    results.push(`Negative cash flow exposure: ${Math.abs(totalLoss).toLocaleString()} annual loss in current scenario`)
  }
  
  return results
}

function generateOptimizationOpportunities(properties: RentalProperty[], projections: RentalCashFlow[]): string[] {
  const opportunities: string[] = []
  
  // Debt consolidation
  const totalDebt = properties.reduce((sum, p) => sum + p.outstanding_mortgage, 0)
  if (totalDebt > 0 && properties.length > 1) {
    opportunities.push('Consider debt consolidation for better interest rates and simplified management')
  }
  
  // Property management
  const selfManagedProperties = properties.filter(p => p.annual_expenses.property_management === 0)
  if (selfManagedProperties.length > 0) {
    opportunities.push('Consider professional property management for FIRE lifestyle simplification')
  }
  
  // Tax optimization
  const negativelyGearedProperties = properties.filter(p => p.negative_gearing_eligible)
  if (negativelyGearedProperties.length > 0) {
    opportunities.push('Review depreciation schedules and tax deduction maximization strategies')
  }
  
  // Portfolio rebalancing
  const lowYieldProperties = properties.filter(p => (p.weekly_rent * 52 / p.current_value) < 0.04)
  if (lowYieldProperties.length > 0) {
    opportunities.push('Consider selling low-yield properties and reinvesting in higher-yield assets')
  }
  
  return opportunities
}

export function createSampleRentalProperty(id: string): RentalProperty {
  return {
    id,
    name: `Investment Property ${id}`,
    property_type: 'apartment',
    purchase_price: 650000,
    current_value: 750000,
    weekly_rent: 580,
    vacancy_rate: 4,
    rental_growth_rate: 3,
    annual_expenses: {
      property_management: 0.08, // 8% of rent
      council_rates: 2200,
      water_rates: 800,
      insurance: 1200,
      maintenance_repairs: 3000,
      strata_body_corp: 4800,
      land_tax: 0,
      other_expenses: 500
    },
    outstanding_mortgage: 450000,
    interest_rate: 5.5,
    loan_type: 'interest_only',
    remaining_loan_term: 25,
    depreciation_schedule: 8500,
    acquisition_date: new Date('2020-01-01'),
    negative_gearing_eligible: true,
    hold_strategy: 'hold_indefinitely',
    expected_capital_growth: 4,
    notes: 'Well-located apartment with strong rental demand'
  }
}

export function getPropertyTypeDescription(type: RentalProperty['property_type']): string {
  switch (type) {
    case 'apartment':
      return 'Apartment/Unit - Lower maintenance, strata fees'
    case 'house':
      return 'House - Full control, higher maintenance responsibility'
    case 'townhouse':
      return 'Townhouse - Balance of space and maintenance'
    case 'commercial':
      return 'Commercial property - Different tax and lease structures'
    case 'other':
      return 'Other property type'
    default:
      return 'Unknown property type'
  }
}

export function getHoldStrategyDescription(strategy: RentalProperty['hold_strategy']): string {
  switch (strategy) {
    case 'hold_indefinitely':
      return 'Hold indefinitely for ongoing rental income'
    case 'sell_at_fire':
      return 'Sell when reaching FIRE to boost retirement funds'
    case 'sell_after_years':
      return 'Sell after specified number of years'
    default:
      return 'Unknown hold strategy'
  }
}