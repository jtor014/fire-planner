import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { runMonteCarloSimulation, generateBaselineHash } from '@/lib/monte-carlo-super'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { scenario_id } = req.query

    if (!scenario_id) {
      return res.status(400).json({ error: 'Scenario ID required' })
    }

    // Get baseline settings
    const { data: baseline, error: baselineError } = await supabase
      .from('baseline_settings')
      .select('*')
      .single()

    if (baselineError) {
      console.error('Baseline error:', baselineError)
      return res.status(500).json({ 
        error: 'Failed to fetch baseline settings',
        details: baselineError.message 
      })
    }

    // Get scenario with lump sum events
    const { data: scenario, error: scenarioError } = await supabase
      .from('super_scenarios')
      .select(`
        *,
        lumpsum_events (*)
      `)
      .eq('id', scenario_id)
      .eq('is_active', true)
      .single()

    if (scenarioError) {
      console.error('Scenario error:', scenarioError)
      return res.status(500).json({ 
        error: 'Failed to fetch scenario',
        details: scenarioError.message 
      })
    }

    // Generate baseline hash for caching
    const baselineHash = generateBaselineHash(baseline)

    // Check for cached results
    const { data: cachedResult, error: cacheError } = await supabase
      .from('simulation_results')
      .select('*')
      .eq('scenario_id', scenario_id)
      .eq('baseline_hash', baselineHash)
      .single()

    // Return cached result if available and not expired (cache for 1 hour)
    if (!cacheError && cachedResult) {
      const cacheAge = new Date().getTime() - new Date(cachedResult.created_at).getTime()
      const oneHour = 60 * 60 * 1000

      if (cacheAge < oneHour) {
        return res.status(200).json({
          success: true,
          data: {
            median_retirement_year: cachedResult.median_retirement_year,
            percentile_10_retirement_year: cachedResult.percentile_10_retirement_year,
            percentile_90_retirement_year: cachedResult.percentile_90_retirement_year,
            median_final_income: cachedResult.median_final_income,
            percentile_10_final_income: cachedResult.percentile_10_final_income,
            percentile_90_final_income: cachedResult.percentile_90_final_income,
            yearly_projections: cachedResult.yearly_projections,
            distribution_data: cachedResult.distribution_data
          },
          cached: true,
          cache_age_minutes: Math.round(cacheAge / (1000 * 60))
        })
      }
    }

    // Run Monte Carlo simulation
    const simulationResult = runMonteCarloSimulation(baseline, {
      mode: scenario.mode,
      target_annual_income: scenario.target_annual_income,
      target_retirement_date: scenario.target_retirement_date,
      monte_carlo_runs: scenario.monte_carlo_runs,
      lumpsum_events: scenario.lumpsum_events || []
    })

    // Cache the results
    const { error: cacheInsertError } = await supabase
      .from('simulation_results')
      .upsert({
        scenario_id: scenario_id,
        baseline_hash: baselineHash,
        median_retirement_year: simulationResult.median_retirement_year,
        percentile_10_retirement_year: simulationResult.percentile_10_retirement_year,
        percentile_90_retirement_year: simulationResult.percentile_90_retirement_year,
        median_final_income: simulationResult.median_final_income,
        percentile_10_final_income: simulationResult.percentile_10_final_income,
        percentile_90_final_income: simulationResult.percentile_90_final_income,
        yearly_projections: simulationResult.yearly_projections,
        distribution_data: simulationResult.distribution_data
      }, {
        onConflict: 'scenario_id,baseline_hash'
      })

    if (cacheInsertError) {
      console.error('Cache insert error:', cacheInsertError)
      // Don't fail the request, just log the error
    }

    res.status(200).json({
      success: true,
      data: simulationResult,
      cached: false,
      scenario: {
        name: scenario.name,
        mode: scenario.mode,
        target_annual_income: scenario.target_annual_income,
        target_retirement_date: scenario.target_retirement_date,
        monte_carlo_runs: scenario.monte_carlo_runs
      },
      baseline: {
        person1_name: baseline.person1_name,
        person2_name: baseline.person2_name,
        combined_balance: baseline.person1_current_balance + baseline.person2_current_balance,
        combined_contributions: baseline.person1_annual_contribution + baseline.person2_annual_contribution
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