// Bridge Income Modeling for FIRE Planning
// Supports declining part-time work and rental income

export interface IncomeSource {
  id: string
  name: string
  type: 'part_time_work' | 'consulting' | 'rental_property' | 'dividends' | 'side_business' | 'other'
  initial_annual_amount: number
  start_year: number
  end_year: number
  decline_pattern: 'constant' | 'linear_decline' | 'step_decline' | 'exponential_decline'
  decline_rate: number // % per year for linear/exponential, or specific year for step
  tax_treatment: 'income' | 'capital_gains' | 'tax_free'
  reliability: number // 0-100% how reliable this income is
  notes?: string
}

export interface IncomeProjection {
  year: number
  sources: {
    [sourceId: string]: {
      amount: number
      tax: number
      net_amount: number
    }
  }
  total_gross: number
  total_tax: number
  total_net: number
}

export interface BridgeIncomeStrategy {
  total_years: number
  income_sources: IncomeSource[]
  yearly_projections: IncomeProjection[]
  total_bridge_income: number
  total_tax_burden: number
  net_bridge_income: number
  sustainability_score: number // 0-100
  recommendations: string[]
}

export function calculateIncomeDecline(
  source: IncomeSource,
  year: number
): number {
  const yearsFromStart = year - source.start_year
  
  if (year < source.start_year || year > source.end_year) {
    return 0
  }
  
  if (yearsFromStart === 0) {
    return source.initial_annual_amount
  }
  
  switch (source.decline_pattern) {
    case 'constant':
      return source.initial_annual_amount
      
    case 'linear_decline':
      // Decline by fixed percentage each year
      const linearDeclineMultiplier = Math.pow(1 - (source.decline_rate / 100), yearsFromStart)
      return source.initial_annual_amount * linearDeclineMultiplier
      
    case 'step_decline':
      // Drop by fixed amount at specific year (decline_rate = year)
      if (yearsFromStart >= source.decline_rate) {
        return source.initial_annual_amount * 0.5 // 50% reduction after step
      }
      return source.initial_annual_amount
      
    case 'exponential_decline':
      // Faster decline over time
      const expDeclineMultiplier = Math.pow(0.85, yearsFromStart) // 15% decline per year
      return source.initial_annual_amount * expDeclineMultiplier
      
    default:
      return source.initial_annual_amount
  }
}

export function calculateIncomeTax(income: number, type: 'income' | 'capital_gains' | 'tax_free'): number {
  if (type === 'tax_free') return 0
  
  // Simplified Australian tax calculation
  if (type === 'capital_gains') {
    // 50% discount then marginal rate
    const discountedIncome = income * 0.5
    return calculateMarginalTax(discountedIncome)
  }
  
  return calculateMarginalTax(income)
}

function calculateMarginalTax(income: number): number {
  // Australian tax brackets 2024-25
  if (income <= 18200) return 0
  if (income <= 45000) return (income - 18200) * 0.19
  if (income <= 120000) return 5092 + (income - 45000) * 0.325
  if (income <= 180000) return 29467 + (income - 120000) * 0.37
  return 51667 + (income - 180000) * 0.45
}

export function generateBridgeIncomeStrategy(
  sources: IncomeSource[],
  bridgeStartYear: number,
  bridgeEndYear: number
): BridgeIncomeStrategy {
  const yearly_projections: IncomeProjection[] = []
  let total_bridge_income = 0
  let total_tax_burden = 0
  
  for (let year = bridgeStartYear; year <= bridgeEndYear; year++) {
    const projection: IncomeProjection = {
      year,
      sources: {},
      total_gross: 0,
      total_tax: 0,
      total_net: 0
    }
    
    sources.forEach(source => {
      const amount = calculateIncomeDecline(source, year)
      const tax = calculateIncomeTax(amount, source.tax_treatment)
      const netAmount = amount - tax
      
      projection.sources[source.id] = {
        amount,
        tax,
        net_amount: netAmount
      }
      
      projection.total_gross += amount
      projection.total_tax += tax
      projection.total_net += netAmount
    })
    
    yearly_projections.push(projection)
    total_bridge_income += projection.total_gross
    total_tax_burden += projection.total_tax
  }
  
  const net_bridge_income = total_bridge_income - total_tax_burden
  const sustainability_score = calculateSustainabilityScore(sources, yearly_projections)
  const recommendations = generateRecommendations(sources, yearly_projections)
  
  return {
    total_years: bridgeEndYear - bridgeStartYear + 1,
    income_sources: sources,
    yearly_projections,
    total_bridge_income,
    total_tax_burden,
    net_bridge_income,
    sustainability_score,
    recommendations
  }
}

function calculateSustainabilityScore(sources: IncomeSource[], projections: IncomeProjection[]): number {
  let score = 100
  
  // Penalize for high decline rates
  sources.forEach(source => {
    if (source.decline_pattern === 'linear_decline' && source.decline_rate > 10) {
      score -= 15 // High decline rate penalty
    }
    
    if (source.decline_pattern === 'exponential_decline') {
      score -= 20 // Exponential decline is risky
    }
    
    // Reward reliability
    score += (source.reliability - 80) * 0.5 // Bonus for high reliability
  })
  
  // Check income consistency
  const firstYearIncome = projections[0]?.total_net || 0
  const lastYearIncome = projections[projections.length - 1]?.total_net || 0
  
  if (lastYearIncome < firstYearIncome * 0.3) {
    score -= 25 // Major decline penalty
  } else if (lastYearIncome < firstYearIncome * 0.6) {
    score -= 15 // Moderate decline penalty
  }
  
  return Math.max(0, Math.min(100, score))
}

function generateRecommendations(sources: IncomeSource[], projections: IncomeProjection[]): string[] {
  const recommendations: string[] = []
  
  // Check for declining income
  const firstYear = projections[0]?.total_net || 0
  const lastYear = projections[projections.length - 1]?.total_net || 0
  
  if (lastYear < firstYear * 0.5) {
    recommendations.push('Consider developing additional income streams to offset declining work income')
  }
  
  // Check for rental income opportunities
  const hasRental = sources.some(s => s.type === 'rental_property')
  if (!hasRental && sources.length < 3) {
    recommendations.push('Consider investment property for stable rental income during FIRE')
  }
  
  // Check for consulting opportunities
  const hasConsulting = sources.some(s => s.type === 'consulting')
  const hasPartTime = sources.some(s => s.type === 'part_time_work')
  
  if (hasPartTime && !hasConsulting) {
    recommendations.push('Transition from part-time work to higher-rate consulting as skills become more specialized')
  }
  
  // Tax optimization
  const totalTax = projections.reduce((sum, p) => sum + p.total_tax, 0)
  const totalIncome = projections.reduce((sum, p) => sum + p.total_gross, 0)
  
  if (totalTax / totalIncome > 0.25) {
    recommendations.push('Consider tax optimization strategies - high effective tax rate on bridge income')
  }
  
  // Reliability concerns
  const lowReliabilitySources = sources.filter(s => s.reliability < 70)
  if (lowReliabilitySources.length > 0) {
    recommendations.push(`Improve reliability of ${lowReliabilitySources.map(s => s.name).join(', ')} or develop backup options`)
  }
  
  return recommendations
}

export function createDefaultBridgeSources(currentYear: number): IncomeSource[] {
  return [
    {
      id: 'part-time-1',
      name: 'Part-time Consulting',
      type: 'consulting',
      initial_annual_amount: 60000,
      start_year: currentYear,
      end_year: currentYear + 5,
      decline_pattern: 'linear_decline',
      decline_rate: 10, // 10% decline per year
      tax_treatment: 'income',
      reliability: 80,
      notes: 'Freelance consulting in previous field'
    },
    {
      id: 'rental-1',
      name: 'Investment Property Rent',
      type: 'rental_property',
      initial_annual_amount: 25000,
      start_year: currentYear,
      end_year: currentYear + 15,
      decline_pattern: 'constant',
      decline_rate: 0,
      tax_treatment: 'income',
      reliability: 90,
      notes: 'Net rental income after expenses'
    }
  ]
}

export function getIncomeTypeDescription(type: IncomeSource['type']): string {
  switch (type) {
    case 'part_time_work':
      return 'Part-time employment with regular hours'
    case 'consulting':
      return 'Freelance consulting or contract work'
    case 'rental_property':
      return 'Rental income from investment properties'
    case 'dividends':
      return 'Dividend income from share portfolio'
    case 'side_business':
      return 'Income from side business or entrepreneurship'
    case 'other':
      return 'Other income source'
    default:
      return 'Unknown income type'
  }
}

export function getDeclinePatternDescription(pattern: IncomeSource['decline_pattern']): string {
  switch (pattern) {
    case 'constant':
      return 'Income remains constant throughout period'
    case 'linear_decline':
      return 'Income decreases by fixed percentage each year'
    case 'step_decline':
      return 'Income drops significantly at specific point'
    case 'exponential_decline':
      return 'Income decreases rapidly over time'
    default:
      return 'Unknown decline pattern'
  }
}