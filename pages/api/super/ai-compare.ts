import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { runMonteCarloSimulation, generateBaselineHash } from '@/lib/monte-carlo-super'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { 
      inheritance_amount, 
      inheritance_date, 
      target_mode = 'target_income',
      target_value = 80000 
    } = req.body

    if (!inheritance_amount || !inheritance_date) {
      return res.status(400).json({ error: 'Inheritance amount and date required' })
    }

    // Get baseline settings
    const { data: baseline, error: baselineError } = await supabase
      .from('baseline_settings')
      .select('*')
      .single()

    if (baselineError) {
      return res.status(500).json({ 
        error: 'Failed to fetch baseline settings',
        details: baselineError.message 
      })
    }

    // Define three allocation strategies to compare
    const strategies = [
      {
        name: 'Super Contribution Strategy',
        description: 'Contribute entire inheritance to superannuation (50/50 split)',
        allocation: 'super',
        person1_split: 50,
        person2_split: 50
      },
      {
        name: 'Mortgage Payoff Strategy', 
        description: 'Use inheritance to pay down mortgage debt',
        allocation: 'mortgage_payoff',
        person1_split: 100,
        person2_split: 0
      },
      {
        name: 'Taxable Investment Strategy',
        description: 'Invest inheritance in taxable investment account',
        allocation: 'taxable_investment',
        person1_split: 100,
        person2_split: 0
      }
    ]

    // Run Monte Carlo simulations for each strategy
    const results = []
    
    for (const strategy of strategies) {
      const scenario = {
        mode: target_mode as 'target_income' | 'target_date',
        target_annual_income: target_mode === 'target_income' ? target_value : undefined,
        target_retirement_date: target_mode === 'target_date' ? new Date(target_value).toISOString().split('T')[0] : undefined,
        monte_carlo_runs: 1000,
        lumpsum_events: [{
          name: 'Inheritance Event',
          amount: Number(inheritance_amount),
          event_date: inheritance_date,
          allocation_strategy: strategy.allocation as 'super' | 'mortgage_payoff' | 'taxable_investment',
          person1_split: strategy.person1_split,
          person2_split: strategy.person2_split
        }]
      }

      const simulationResult = runMonteCarloSimulation(baseline, scenario)
      
      results.push({
        strategy: strategy.name,
        description: strategy.description,
        allocation: strategy.allocation,
        success_rate: simulationResult.success_rate,
        median_retirement_year: simulationResult.median_retirement_year,
        median_final_income: simulationResult.median_final_income,
        percentile_10_retirement_year: simulationResult.percentile_10_retirement_year,
        percentile_90_retirement_year: simulationResult.percentile_90_retirement_year,
        percentile_10_final_income: simulationResult.percentile_10_final_income,
        percentile_90_final_income: simulationResult.percentile_90_final_income
      })
    }

    // Generate AI-style analysis
    const bestStrategy = results.reduce((best, current) => 
      current.success_rate > best.success_rate ? current : best
    )

    const analysis = {
      recommended_strategy: bestStrategy.strategy,
      key_insights: [
        `The ${bestStrategy.strategy} provides the highest success rate at ${bestStrategy.success_rate.toFixed(1)}%`,
        target_mode === 'target_income' 
          ? `This strategy achieves the target income with retirement possible by ${bestStrategy.median_retirement_year}`
          : `This strategy provides a median sustainable income of $${bestStrategy.median_final_income?.toLocaleString()}`,
        `Confidence interval shows retirement possible between ${bestStrategy.percentile_10_retirement_year}-${bestStrategy.percentile_90_retirement_year}`
      ],
      risk_considerations: [
        'Super contributions are locked until preservation age (60)',
        'Mortgage payoff provides guaranteed return equal to interest rate',
        'Taxable investments offer liquidity but may have different tax treatment',
        'Market volatility affects all growth-based strategies'
      ],
      next_steps: [
        'Consider your liquidity needs before retirement',
        'Review tax implications of each strategy',
        'Evaluate your risk tolerance for market volatility',
        'Consult with a financial advisor for personalized advice'
      ]
    }

    res.status(200).json({
      success: true,
      data: {
        inheritance_amount: Number(inheritance_amount),
        inheritance_date,
        comparison_results: results,
        ai_analysis: analysis,
        baseline_info: {
          combined_balance: baseline.person1_current_balance + baseline.person2_current_balance,
          combined_contributions: baseline.person1_annual_contribution + baseline.person2_annual_contribution,
          expected_return: baseline.expected_return_mean,
          volatility: baseline.expected_return_volatility
        }
      }
    })

  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}