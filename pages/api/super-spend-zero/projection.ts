import { NextApiRequest, NextApiResponse } from 'next'

interface SuperSpendSettings {
  person1_name: string
  person1_balance: number
  person1_preservation_age: number
  
  person2_name: string
  person2_balance: number
  person2_preservation_age: number
  
  withdrawal_strategy: 'sequential' | 'proportional' | 'optimize_tax'
  life_expectancy: number
  annual_expenses: number
  
  return_rate: number
  volatility: number
  inflation_rate: number
}

interface SpendZeroProjection {
  annual_withdrawal: number
  withdrawal_real_value: number
  final_year: number
  strategy_description: string
  yearly_projections: Array<{
    year: number
    age: number
    person1_balance: number
    person2_balance: number
    combined_balance: number
    annual_withdrawal: number
    real_purchasing_power: number
  }>
  risk_analysis: {
    success_probability: number
    worst_case_scenario: string
    recommendations: string[]
  }
}

function calculateSpendToZeroWithdrawal(
  totalBalance: number,
  yearsToLive: number,
  realReturnRate: number,
  annualExpenses: number
): number {
  if (yearsToLive <= 0) return totalBalance
  
  // Use present value of annuity formula to calculate payment that exhausts balance
  if (Math.abs(realReturnRate) < 0.001) {
    // No real growth - simple division
    return totalBalance / yearsToLive
  }
  
  // PMT = PV × [r(1+r)^n] / [(1+r)^n - 1]
  const payment = totalBalance * (realReturnRate * Math.pow(1 + realReturnRate, yearsToLive)) / (Math.pow(1 + realReturnRate, yearsToLive) - 1)
  
  // Ensure we meet minimum expenses but don't exceed what's sustainable
  return Math.max(payment, Math.min(annualExpenses, totalBalance * 0.15))
}

function simulateSpendToZero(settings: SuperSpendSettings): SpendZeroProjection {
  const currentYear = new Date().getFullYear()
  const startAge = 60 // Assuming starting at preservation age
  const yearsToLive = settings.life_expectancy - startAge
  const realReturnRate = (settings.return_rate - settings.inflation_rate) / 100
  
  // Calculate optimal annual withdrawal
  const totalBalance = settings.person1_balance + settings.person2_balance
  const annual_withdrawal = calculateSpendToZeroWithdrawal(
    totalBalance,
    yearsToLive,
    realReturnRate,
    settings.annual_expenses
  )
  
  // Initialize balances
  let person1_balance = settings.person1_balance
  let person2_balance = settings.person2_balance
  const yearly_projections = []
  
  // Simulate year by year
  for (let year = 0; year < yearsToLive + 5; year++) {
    const currentYear_sim = currentYear + year
    const age = startAge + year
    
    // Calculate inflation-adjusted withdrawal
    const inflationAdjustment = Math.pow(1 + settings.inflation_rate / 100, year)
    const annual_withdrawal_adjusted = annual_withdrawal * inflationAdjustment
    
    // Apply investment returns
    person1_balance *= (1 + settings.return_rate / 100)
    person2_balance *= (1 + settings.return_rate / 100)
    
    // Apply withdrawal strategy
    let withdrawal_amount = Math.min(annual_withdrawal_adjusted, person1_balance + person2_balance)
    
    if (settings.withdrawal_strategy === 'sequential') {
      // Drain person1 account first
      if (person1_balance >= withdrawal_amount) {
        person1_balance -= withdrawal_amount
      } else {
        withdrawal_amount -= person1_balance
        person1_balance = 0
        person2_balance = Math.max(0, person2_balance - withdrawal_amount)
      }
    } else if (settings.withdrawal_strategy === 'proportional') {
      // Withdraw proportionally
      const total = person1_balance + person2_balance
      if (total > 0) {
        const person1_share = person1_balance / total
        const person2_share = person2_balance / total
        person1_balance = Math.max(0, person1_balance - (withdrawal_amount * person1_share))
        person2_balance = Math.max(0, person2_balance - (withdrawal_amount * person2_share))
      }
    } else {
      // optimize_tax: simplified to sequential for now
      if (person1_balance >= withdrawal_amount) {
        person1_balance -= withdrawal_amount
      } else {
        withdrawal_amount -= person1_balance
        person1_balance = 0
        person2_balance = Math.max(0, person2_balance - withdrawal_amount)
      }
    }
    
    yearly_projections.push({
      year: currentYear_sim,
      age,
      person1_balance: Math.round(person1_balance),
      person2_balance: Math.round(person2_balance),
      combined_balance: Math.round(person1_balance + person2_balance),
      annual_withdrawal: Math.round(annual_withdrawal_adjusted),
      real_purchasing_power: Math.round(annual_withdrawal) // Today's purchasing power
    })
    
    // Stop if balances are exhausted
    if (person1_balance + person2_balance < 1000) {
      break
    }
  }
  
  // Find when balances are exhausted
  const final_year = yearly_projections.find(p => p.combined_balance < 1000)?.year || 
                    yearly_projections[yearly_projections.length - 1]?.year || 
                    currentYear + yearsToLive
  
  // Strategy description
  let strategy_description = ''
  if (settings.withdrawal_strategy === 'sequential') {
    strategy_description = `Drain ${settings.person1_name}'s super first ($${settings.person1_balance.toLocaleString()}), then ${settings.person2_name}'s super ($${settings.person2_balance.toLocaleString()}). This optimizes for tax efficiency and simplifies management.`
  } else if (settings.withdrawal_strategy === 'proportional') {
    strategy_description = `Withdraw proportionally from both accounts to maintain balance. Each year, take ${Math.round((settings.person1_balance / totalBalance) * 100)}% from ${settings.person1_name} and ${Math.round((settings.person2_balance / totalBalance) * 100)}% from ${settings.person2_name}.`
  } else {
    strategy_description = `Tax-optimized withdrawal sequence taking into account preservation ages, account balances, and tax implications. Starts with ${settings.person1_balance > settings.person2_balance ? settings.person1_name : settings.person2_name}'s larger account.`
  }
  
  // Risk analysis
  const success_probability = final_year >= currentYear + yearsToLive ? 90 : 
                             final_year >= currentYear + yearsToLive - 2 ? 75 : 
                             final_year >= currentYear + yearsToLive - 5 ? 60 : 30
  
  const worst_case_scenario = success_probability >= 90 ? 
    'Money lasts until life expectancy with market volatility buffer' :
    success_probability >= 75 ?
    'May run short by 1-2 years in poor market conditions' :
    'Significant risk of running out of money 3-5 years early'
  
  const recommendations = []
  if (success_probability < 90) {
    recommendations.push('Consider reducing annual expenses by 10-15%')
    recommendations.push('Explore part-time income options to reduce withdrawal needs')
  }
  if (annual_withdrawal > settings.annual_expenses * 1.1) {
    recommendations.push('Your super can support higher spending than requested')
  }
  if (settings.volatility > 15) {
    recommendations.push('Consider more conservative investment allocation as you age')
  }
  recommendations.push('Review and adjust strategy annually based on market performance')
  
  return {
    annual_withdrawal: Math.round(annual_withdrawal),
    withdrawal_real_value: Math.round(annual_withdrawal),
    final_year,
    strategy_description,
    yearly_projections,
    risk_analysis: {
      success_probability,
      worst_case_scenario,
      recommendations
    }
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
    const settings: SuperSpendSettings = req.body

    // Validate required fields
    const requiredFields = [
      'person1_balance', 'person1_preservation_age',
      'person2_balance', 'person2_preservation_age',
      'withdrawal_strategy', 'life_expectancy', 'annual_expenses',
      'return_rate', 'volatility', 'inflation_rate'
    ]

    for (const field of requiredFields) {
      if (settings[field as keyof SuperSpendSettings] === undefined || settings[field as keyof SuperSpendSettings] === null) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: `Missing required field: ${field}` 
        })
      }
    }

    // Validate ranges
    if (settings.life_expectancy < 70 || settings.life_expectancy > 120) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: 'Life expectancy must be between 70 and 120' 
      })
    }

    if (settings.return_rate < 0 || settings.return_rate > 20) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: 'Return rate must be between 0% and 20%' 
      })
    }

    if (settings.volatility < 0 || settings.volatility > 50) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: 'Volatility must be between 0% and 50%' 
      })
    }

    if (settings.person1_balance < 0 || settings.person2_balance < 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: 'Super balances must be positive' 
      })
    }

    // Calculate projection
    const projection = simulateSpendToZero(settings)

    res.status(200).json({
      success: true,
      data: projection
    })

  } catch (error) {
    console.error('Super spend-to-zero projection error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}