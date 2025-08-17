// Multi-Event Lump Sum Timeline for FIRE Planning
// Supports inheritance, property sales, investment exits, and windfalls

export interface LumpSumEvent {
  id: string
  name: string
  amount: number
  date: Date
  probability: number // 0-100%
  source: 'inheritance' | 'property_sale' | 'investment_exit' | 'windfall' | 'bonus' | 'other'
  tax_treatment: 'tax_free' | 'capital_gains' | 'income' | 'super_contribution'
  notes?: string
}

export interface LumpSumTimeline {
  events: LumpSumEvent[]
  total_expected_value: number
  total_guaranteed_value: number
  first_event_year: number
  last_event_year: number
}

export function calculateExpectedValue(events: LumpSumEvent[]): number {
  return events.reduce((total, event) => {
    return total + (event.amount * (event.probability / 100))
  }, 0)
}

export function calculateGuaranteedValue(events: LumpSumEvent[]): number {
  return events.reduce((total, event) => {
    return total + (event.probability === 100 ? event.amount : 0)
  }, 0)
}

export function getEventsByYear(events: LumpSumEvent[]): { [year: number]: LumpSumEvent[] } {
  const eventsByYear: { [year: number]: LumpSumEvent[] } = {}
  
  events.forEach(event => {
    const year = event.date.getFullYear()
    if (!eventsByYear[year]) {
      eventsByYear[year] = []
    }
    eventsByYear[year].push(event)
  })
  
  return eventsByYear
}

export function getEventsForTimeframe(events: LumpSumEvent[], startYear: number, endYear: number): LumpSumEvent[] {
  return events.filter(event => {
    const eventYear = event.date.getFullYear()
    return eventYear >= startYear && eventYear <= endYear
  })
}

export function calculateTaxImpact(event: LumpSumEvent): { netAmount: number; taxAmount: number; taxRate: number } {
  let taxRate = 0
  
  switch (event.tax_treatment) {
    case 'tax_free':
      taxRate = 0
      break
    case 'capital_gains':
      // Simplified Australian CGT - 50% discount for assets held >12 months, then marginal rate
      // Assuming 30% marginal rate for FIRE planning
      taxRate = 0.15 // Effective rate after 50% discount
      break
    case 'income':
      // Marginal tax rate - assuming 30% for typical FIRE scenarios
      taxRate = 0.30
      break
    case 'super_contribution':
      // 15% contributions tax if within caps
      taxRate = 0.15
      break
  }
  
  const taxAmount = event.amount * taxRate
  const netAmount = event.amount - taxAmount
  
  return { netAmount, taxAmount, taxRate }
}

export function generateEventId(): string {
  return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function validateLumpSumEvent(event: Partial<LumpSumEvent>): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!event.name || event.name.trim().length === 0) {
    errors.push('Event name is required')
  }
  
  if (!event.amount || event.amount <= 0) {
    errors.push('Amount must be greater than 0')
  }
  
  if (event.amount && event.amount > 50000000) {
    errors.push('Amount seems unreasonably large (>$50M)')
  }
  
  if (!event.date) {
    errors.push('Date is required')
  }
  
  if (event.date && event.date < new Date()) {
    errors.push('Event date cannot be in the past')
  }
  
  if (event.probability === undefined || event.probability < 0 || event.probability > 100) {
    errors.push('Probability must be between 0% and 100%')
  }
  
  if (!event.source) {
    errors.push('Event source is required')
  }
  
  if (!event.tax_treatment) {
    errors.push('Tax treatment is required')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export function getEventSourceDescription(source: LumpSumEvent['source']): string {
  switch (source) {
    case 'inheritance':
      return 'Inheritance from family member or estate'
    case 'property_sale':
      return 'Sale of investment or primary residence'
    case 'investment_exit':
      return 'Sale of shares, business, or other investments'
    case 'windfall':
      return 'Lottery, gambling, or unexpected gain'
    case 'bonus':
      return 'Work bonus, performance payment, or severance'
    case 'other':
      return 'Other lump sum source'
    default:
      return 'Unknown source'
  }
}

export function getTaxTreatmentDescription(treatment: LumpSumEvent['tax_treatment']): string {
  switch (treatment) {
    case 'tax_free':
      return 'No tax payable (e.g., inheritance, some super withdrawals)'
    case 'capital_gains':
      return 'Capital gains tax (50% discount if held >12 months)'
    case 'income':
      return 'Taxed as income at marginal rate'
    case 'super_contribution':
      return '15% contributions tax if within super caps'
    default:
      return 'Unknown tax treatment'
  }
}