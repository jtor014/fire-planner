import { NextApiRequest, NextApiResponse } from 'next'
import { calculatePreservationAge } from '@/lib/preservation-age'
import { LumpSumEvent, calculateExpectedValue, getEventsForTimeframe, calculateTaxImpact } from '@/lib/lump-sum-events'

interface Person {
  name: string
  birth_year: number
  current_age: number
  target_fire_age: number
  preservation_age: number
  current_super: number
  annual_contributions: number
  will_keep_working: boolean
  ongoing_salary?: number
}

interface Pre60FireSettings {
  person1: Person
  person2: Person
  household_type: 'both_fire' | 'staggered' | 'single_fire' | 'lump_sum_bridge'
  household_expenses: number
  single_person_expenses: number
  lump_sum_available: number
  lump_sum_events: LumpSumEvent[]
  use_advanced_lump_sum: boolean
  part_time_income: number
  investment_income: number
  super_return_rate: number
  inflation_rate: number
}

interface FireProjection {
  is_feasible: boolean
  household_strategy: 'both_fire' | 'staggered' | 'single_fire' | 'lump_sum_bridge'
  
  first_to_fire: {
    person: string
    age: number
    year: number
    years_until_preservation: number
  }
  second_to_fire?: {
    person: string
    age: number
    year: number
    years_until_preservation: number
  }
  
  total_bridge_years: number
  lump_sum_required: number
  lump_sum_shortfall: number
  annual_household_gap: number
  working_partner_contribution: number
  
  super_at_preservation: {
    person1_balance: number
    person1_preservation_year: number
    person2_balance: number
    person2_preservation_year: number
    combined_balance: number
  }
  
  strategy_description: string
  recommendations: string[]
}

function calculateEffectiveLumpSum(settings: Pre60FireSettings, bridgeStartYear: number, bridgeEndYear: number): number {
  if (!settings.use_advanced_lump_sum) {
    return settings.lump_sum_available
  }
  
  // Get events during bridge period
  const bridgeEvents = getEventsForTimeframe(settings.lump_sum_events, bridgeStartYear, bridgeEndYear)
  
  // Calculate total expected value considering tax impact
  let totalValue = 0
  bridgeEvents.forEach(event => {
    const { netAmount } = calculateTaxImpact(event)
    const expectedValue = netAmount * (event.probability / 100)
    totalValue += expectedValue
  })
  
  return totalValue
}

function calculatePre60Fire(settings: Pre60FireSettings): FireProjection {
  const currentYear = new Date().getFullYear()
  
  // Determine timeline for each person
  const person1_fire_year = currentYear + (settings.person1.target_fire_age - settings.person1.current_age)
  const person2_fire_year = currentYear + (settings.person2.target_fire_age - settings.person2.current_age)
  const person1_preservation_year = currentYear + (settings.person1.preservation_age - settings.person1.current_age)
  const person2_preservation_year = currentYear + (settings.person2.preservation_age - settings.person2.current_age)
  
  // Determine who fires first and household strategy
  const first_to_fire = person1_fire_year <= person2_fire_year ? {
    person: settings.person1.name,
    age: settings.person1.target_fire_age,
    year: person1_fire_year,
    years_until_preservation: Math.max(0, settings.person1.preservation_age - settings.person1.target_fire_age)
  } : {
    person: settings.person2.name,
    age: settings.person2.target_fire_age,
    year: person2_fire_year,
    years_until_preservation: Math.max(0, settings.person2.preservation_age - settings.person2.target_fire_age)
  }
  
  const second_to_fire = person1_fire_year !== person2_fire_year ? (person1_fire_year > person2_fire_year ? {
    person: settings.person1.name,
    age: settings.person1.target_fire_age,
    year: person1_fire_year,
    years_until_preservation: Math.max(0, settings.person1.preservation_age - settings.person1.target_fire_age)
  } : {
    person: settings.person2.name,
    age: settings.person2.target_fire_age,
    year: person2_fire_year,
    years_until_preservation: Math.max(0, settings.person2.preservation_age - settings.person2.target_fire_age)
  }) : undefined
  
  // Calculate household strategy specific metrics
  let lump_sum_required = 0
  let working_partner_contribution = 0
  let annual_household_gap = 0
  let total_bridge_years = 0
  let strategy_description = ''
  let recommendations: string[] = []
  
  switch (settings.household_type) {
    case 'both_fire':
      // Both retire simultaneously
      const both_fire_year = Math.max(person1_fire_year, person2_fire_year)
      const earliest_preservation = Math.min(person1_preservation_year, person2_preservation_year)
      total_bridge_years = Math.max(0, earliest_preservation - both_fire_year)
      
      const annual_income_both = settings.part_time_income + settings.investment_income
      annual_household_gap = Math.max(0, settings.household_expenses - annual_income_both)
      
      // Calculate lump sum requirement with inflation
      for (let year = 0; year < total_bridge_years; year++) {
        const inflation_factor = Math.pow(1 + settings.inflation_rate / 100, year)
        lump_sum_required += annual_household_gap * inflation_factor
      }
      
      strategy_description = `Both retire in ${both_fire_year}, bridge ${total_bridge_years} years until super access`
      recommendations.push('Both stop working simultaneously')
      recommendations.push('Live off lump sum until preservation age')
      break
      
    case 'staggered':
      // One fires first, other keeps working
      const working_partner = first_to_fire.person === settings.person1.name ? settings.person2 : settings.person1
      const working_salary = working_partner.ongoing_salary || 0
      
      total_bridge_years = first_to_fire.years_until_preservation
      working_partner_contribution = working_salary
      
      // Calculate net household income requirement
      const total_household_income = settings.part_time_income + settings.investment_income + working_salary
      annual_household_gap = Math.max(0, settings.household_expenses - total_household_income)
      
      // Calculate lump sum needed with working partner income
      for (let year = 0; year < total_bridge_years; year++) {
        const inflation_factor = Math.pow(1 + settings.inflation_rate / 100, year)
        lump_sum_required += annual_household_gap * inflation_factor
      }
      
      // Enhanced description with income breakdown
      const salary_coverage = working_salary > 0 ? (working_salary / settings.household_expenses * 100).toFixed(0) : 0
      strategy_description = `${first_to_fire.person} retires first in ${first_to_fire.year}, ${working_partner.name} continues working. Working salary covers ${salary_coverage}% of household expenses ($${working_salary.toLocaleString()}/year vs $${settings.household_expenses.toLocaleString()}/year needed).`
      
      if (working_salary >= settings.household_expenses) {
        recommendations.push(`${working_partner.name}'s salary fully covers household expenses - no lump sum needed!`)
        recommendations.push('Consider increasing super contributions with surplus income')
      } else if (working_salary > 0) {
        const gap_coverage = ((settings.household_expenses - working_salary) / settings.household_expenses * 100).toFixed(0)
        recommendations.push(`${working_partner.name} provides significant income bridge - only ${gap_coverage}% gap to cover`)
        recommendations.push('Dramatically reduced lump sum requirement due to ongoing income')
      } else {
        recommendations.push(`Warning: ${working_partner.name} not set to keep working - consider enabling ongoing salary`)
      }
      break
      
    case 'lump_sum_bridge':
      // Both stop working, live entirely on lump sum, then sequential super access
      const both_stop_year = Math.min(person1_fire_year, person2_fire_year)
      const first_preservation = Math.min(person1_preservation_year, person2_preservation_year)
      total_bridge_years = Math.max(0, first_preservation - both_stop_year)
      
      annual_household_gap = Math.max(0, settings.household_expenses - settings.part_time_income - settings.investment_income)
      
      for (let year = 0; year < total_bridge_years; year++) {
        const inflation_factor = Math.pow(1 + settings.inflation_rate / 100, year)
        lump_sum_required += annual_household_gap * inflation_factor
      }
      
      strategy_description = `Both stop working in ${both_stop_year}, live on lump sum for ${total_bridge_years} years, then sequential super access`
      recommendations.push('Drain first person\'s super completely before touching second')
      recommendations.push('Optimize for tax brackets and longevity')
      recommendations.push('Consider pension phase transition timing')
      break
      
    case 'single_fire':
      // Only one person retires
      total_bridge_years = first_to_fire.years_until_preservation
      annual_household_gap = Math.max(0, settings.single_person_expenses - settings.part_time_income - settings.investment_income)
      
      for (let year = 0; year < total_bridge_years; year++) {
        const inflation_factor = Math.pow(1 + settings.inflation_rate / 100, year)
        lump_sum_required += annual_household_gap * inflation_factor
      }
      
      strategy_description = `Only ${first_to_fire.person} retires in ${first_to_fire.year}, reduced expenses for single-person FIRE`
      recommendations.push('Lower expenses during solo FIRE period')
      recommendations.push('Partner continues building super')
      break
  }
  
  // Calculate effective lump sum for the bridge period
  const bridge_start = Math.min(person1_fire_year, person2_fire_year)
  const bridge_end = Math.min(person1_preservation_year, person2_preservation_year)
  const effective_lump_sum = calculateEffectiveLumpSum(settings, bridge_start, bridge_end)
  
  const lump_sum_shortfall = Math.max(0, lump_sum_required - effective_lump_sum)
  const is_feasible = lump_sum_shortfall === 0
  
  // Calculate super balances at preservation age (accounting for different preservation ages)
  function calculateSuperAtPreservation(person: Person, settings: Pre60FireSettings) {
    const working_years = Math.max(0, person.target_fire_age - person.current_age)
    const years_to_preservation = person.preservation_age - person.current_age
    let balance = person.current_super
    
    // Apply contributions until FIRE age (or preservation age if earlier)
    const contribution_years = Math.min(working_years, years_to_preservation)
    for (let year = 0; year < contribution_years; year++) {
      balance = balance * (1 + settings.super_return_rate / 100) + person.annual_contributions
    }
    
    // Apply growth only from FIRE age to preservation age
    const growth_only_years = years_to_preservation - contribution_years
    for (let year = 0; year < growth_only_years; year++) {
      balance = balance * (1 + settings.super_return_rate / 100)
    }
    
    return Math.round(balance)
  }
  
  const person1_balance_at_preservation = calculateSuperAtPreservation(settings.person1, settings)
  const person2_balance_at_preservation = calculateSuperAtPreservation(settings.person2, settings)
  
  return {
    is_feasible,
    household_strategy: settings.household_type,
    first_to_fire,
    second_to_fire,
    total_bridge_years,
    lump_sum_required,
    lump_sum_shortfall,
    annual_household_gap,
    working_partner_contribution,
    super_at_preservation: {
      person1_balance: person1_balance_at_preservation,
      person1_preservation_year,
      person2_balance: person2_balance_at_preservation,
      person2_preservation_year,
      combined_balance: person1_balance_at_preservation + person2_balance_at_preservation
    },
    strategy_description,
    recommendations
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const settings: Pre60FireSettings = req.body

    // Validate required fields
    if (!settings.person1 || !settings.person2) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: 'Missing person1 or person2 data' 
      })
    }

    const personFields = ['name', 'birth_year', 'current_age', 'target_fire_age', 'current_super', 'annual_contributions']
    
    for (const field of personFields) {
      if (settings.person1[field as keyof Person] === undefined || settings.person1[field as keyof Person] === null) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: `Missing required field for person1: ${field}` 
        })
      }
      if (settings.person2[field as keyof Person] === undefined || settings.person2[field as keyof Person] === null) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: `Missing required field for person2: ${field}` 
        })
      }
    }

    const householdFields = ['household_expenses', 'super_return_rate', 'inflation_rate']
    for (const field of householdFields) {
      if (settings[field as keyof Pre60FireSettings] === undefined || settings[field as keyof Pre60FireSettings] === null) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: `Missing required field: ${field}` 
        })
      }
    }

    // Validate lump sum funding - either simple or advanced mode
    if (!settings.use_advanced_lump_sum) {
      if (settings.lump_sum_available === undefined || settings.lump_sum_available === null) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: 'Lump sum available is required in simple mode' 
        })
      }
    } else {
      if (!settings.lump_sum_events || !Array.isArray(settings.lump_sum_events)) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: 'Lump sum events array is required in advanced mode' 
        })
      }
    }

    // Validate ranges
    if (settings.person1.target_fire_age < settings.person1.current_age) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: 'Person 1 target FIRE age must be greater than current age' 
      })
    }

    if (settings.person2.target_fire_age < settings.person2.current_age) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: 'Person 2 target FIRE age must be greater than current age' 
      })
    }

    if (settings.super_return_rate < 0 || settings.super_return_rate > 20) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: 'Super return rate must be between 0% and 20%' 
      })
    }

    if (settings.inflation_rate < 0 || settings.inflation_rate > 10) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: 'Inflation rate must be between 0% and 10%' 
      })
    }

    // Calculate projection
    const projection = calculatePre60Fire(settings)

    res.status(200).json({
      success: true,
      data: projection
    })

  } catch (error) {
    console.error('Pre-60 FIRE projection error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}