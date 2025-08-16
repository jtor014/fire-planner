import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      // Get baseline settings (singleton record)
      const { data, error } = await supabase
        .from('baseline_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') { // Not found is ok
        console.error('Database error:', error)
        return res.status(500).json({ 
          error: 'Failed to fetch baseline settings',
          details: error.message 
        })
      }

      // If no settings exist, return defaults
      const defaultSettings = {
        person1_name: 'Person 1',
        person1_current_balance: 0,
        person1_annual_contribution: 0,
        person1_age: 35,
        person2_name: 'Person 2', 
        person2_current_balance: 0,
        person2_annual_contribution: 0,
        person2_age: 35,
        expected_return_mean: 7.0,
        expected_return_volatility: 15.0,
        safe_withdrawal_rate: 4.0,
        inflation_rate: 2.5
      }

      res.status(200).json({
        success: true,
        data: data || defaultSettings
      })

    } else if (req.method === 'POST' || req.method === 'PUT') {
      const {
        person1_name,
        person1_current_balance,
        person1_annual_contribution,
        person1_age,
        person2_name,
        person2_current_balance,
        person2_annual_contribution,
        person2_age,
        expected_return_mean,
        expected_return_volatility,
        safe_withdrawal_rate,
        inflation_rate
      } = req.body

      // Validate required fields
      if (!person1_name || !person2_name) {
        return res.status(400).json({ error: 'Person names are required' })
      }

      if (person1_age < 18 || person2_age < 18 || person1_age > 100 || person2_age > 100) {
        return res.status(400).json({ error: 'Ages must be between 18 and 100' })
      }

      if (expected_return_mean < 0 || expected_return_mean > 20) {
        return res.status(400).json({ error: 'Expected return must be between 0% and 20%' })
      }

      if (expected_return_volatility < 0 || expected_return_volatility > 50) {
        return res.status(400).json({ error: 'Volatility must be between 0% and 50%' })
      }

      if (safe_withdrawal_rate <= 0 || safe_withdrawal_rate > 10) {
        return res.status(400).json({ error: 'Withdrawal rate must be between 0% and 10%' })
      }


      // Check if baseline settings already exist
      const { data: existingSettings } = await supabase
        .from('baseline_settings')
        .select('id')
        .single()

      const settingsData = {
        person1_name: person1_name.trim(),
        person1_current_balance: Number(person1_current_balance) || 0,
        person1_annual_contribution: Number(person1_annual_contribution) || 0,
        person1_age: Number(person1_age),
        person2_name: person2_name.trim(),
        person2_current_balance: Number(person2_current_balance) || 0,
        person2_annual_contribution: Number(person2_annual_contribution) || 0,
        person2_age: Number(person2_age),
        expected_return_mean: Number(expected_return_mean),
        expected_return_volatility: Number(expected_return_volatility),
        safe_withdrawal_rate: Number(safe_withdrawal_rate),
        inflation_rate: Number(inflation_rate) || 2.5,
        updated_at: new Date().toISOString()
      }

      let data, error

      if (existingSettings) {
        // Update existing record
        const result = await supabase
          .from('baseline_settings')
          .update(settingsData)
          .eq('id', existingSettings.id)
          .select()
          .single()
        data = result.data
        error = result.error
      } else {
        // Insert new record
        const result = await supabase
          .from('baseline_settings')
          .insert(settingsData)
          .select()
          .single()
        data = result.data
        error = result.error
      }

      if (error) {
        console.error('Database error:', error)
        return res.status(500).json({ 
          error: 'Failed to save baseline settings',
          details: error.message 
        })
      }

      // Invalidate any cached simulation results since baseline changed
      await supabase
        .from('simulation_results')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      res.status(200).json({
        success: true,
        data: data,
        message: 'Baseline settings updated successfully'
      })

    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}