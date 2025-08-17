import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      // Get all scenarios with their lump sum events
      const { data: scenarios, error } = await supabase
        .from('super_scenarios')
        .select(`
          *,
          lumpsum_events (*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Database error:', error)
        return res.status(500).json({ 
          error: 'Failed to fetch scenarios',
          details: error.message 
        })
      }

      res.status(200).json({
        success: true,
        data: scenarios || []
      })

    } else if (req.method === 'POST') {
      const {
        name,
        description,
        mode,
        target_annual_income,
        target_retirement_date,
        monte_carlo_runs = 1000,
        lumpsum_events = [],
        retirement_strategy = 'wait_for_both',
        bridge_years_other_income = 0,
        // New enhanced retirement planning
        person1_stop_work_year,
        person2_stop_work_year,
        gap_funding_strategy = 'none',
        gap_funding_amount = 0,
        super_access_strategy = 'conservative'
      } = req.body

      // Validate required fields
      if (!name || !mode) {
        return res.status(400).json({ error: 'Name and mode are required' })
      }

      if (!['target_income', 'target_date'].includes(mode)) {
        return res.status(400).json({ error: 'Mode must be target_income or target_date' })
      }

      if (mode === 'target_income' && (!target_annual_income || target_annual_income <= 0)) {
        return res.status(400).json({ error: 'Target annual income required for target_income mode' })
      }

      if (mode === 'target_date' && !target_retirement_date) {
        return res.status(400).json({ error: 'Target retirement date required for target_date mode' })
      }

      // Validate retirement strategy
      if (!['wait_for_both', 'early_retirement_first', 'bridge_strategy', 'inheritance_bridge'].includes(retirement_strategy)) {
        return res.status(400).json({ error: 'Invalid retirement strategy' })
      }

      // Create scenario
      const { data: scenario, error: scenarioError } = await supabase
        .from('super_scenarios')
        .insert({
          name: name.trim(),
          description: description?.trim() || null,
          mode,
          target_annual_income: mode === 'target_income' ? Number(target_annual_income) : null,
          target_retirement_date: mode === 'target_date' ? target_retirement_date : null,
          monte_carlo_runs: Number(monte_carlo_runs) || 1000,
          retirement_strategy,
          bridge_years_other_income: Number(bridge_years_other_income) || 0,
          // New enhanced retirement planning
          person1_stop_work_year: Number(person1_stop_work_year) || null,
          person2_stop_work_year: Number(person2_stop_work_year) || null,
          gap_funding_strategy,
          gap_funding_amount: Number(gap_funding_amount) || 0,
          super_access_strategy
        })
        .select()
        .single()

      if (scenarioError) {
        console.error('Database error:', scenarioError)
        return res.status(500).json({ 
          error: 'Failed to create scenario',
          details: scenarioError.message 
        })
      }

      // Add lump sum events if provided
      if (lumpsum_events.length > 0) {
        const eventsToInsert = lumpsum_events.map((event: any) => ({
          scenario_id: scenario.id,
          name: event.name.trim(),
          amount: Number(event.amount),
          event_date: event.event_date,
          allocation_strategy: event.allocation_strategy,
          person1_split: Number(event.person1_split) || 50,
          person2_split: Number(event.person2_split) || 50
        }))

        const { error: eventsError } = await supabase
          .from('lumpsum_events')
          .insert(eventsToInsert)

        if (eventsError) {
          console.error('Events error:', eventsError)
          // Don't fail the whole request, just log the error
        }
      }

      res.status(201).json({
        success: true,
        data: scenario,
        message: 'Scenario created successfully'
      })

    } else if (req.method === 'PUT') {
      const { id } = req.query
      if (!id) {
        return res.status(400).json({ error: 'Scenario ID required' })
      }

      const {
        name,
        description,
        mode,
        target_annual_income,
        target_retirement_date,
        monte_carlo_runs,
        is_active = true,
        lumpsum_events = [],
        retirement_strategy = 'wait_for_both',
        bridge_years_other_income = 0,
        // New enhanced retirement planning
        person1_stop_work_year,
        person2_stop_work_year,
        gap_funding_strategy = 'none',
        gap_funding_amount = 0,
        super_access_strategy = 'conservative'
      } = req.body

      // Validate mode constraints
      if (mode === 'target_income' && (!target_annual_income || target_annual_income <= 0)) {
        return res.status(400).json({ error: 'Target annual income required for target_income mode' })
      }

      if (mode === 'target_date' && !target_retirement_date) {
        return res.status(400).json({ error: 'Target retirement date required for target_date mode' })
      }

      // Validate retirement strategy
      if (retirement_strategy && !['wait_for_both', 'early_retirement_first', 'bridge_strategy', 'inheritance_bridge'].includes(retirement_strategy)) {
        return res.status(400).json({ error: 'Invalid retirement strategy' })
      }

      const { data: scenario, error } = await supabase
        .from('super_scenarios')
        .update({
          name: name?.trim(),
          description: description?.trim() || null,
          mode,
          target_annual_income: mode === 'target_income' ? Number(target_annual_income) : null,
          target_retirement_date: mode === 'target_date' ? target_retirement_date : null,
          monte_carlo_runs: Number(monte_carlo_runs) || 1000,
          is_active,
          retirement_strategy,
          bridge_years_other_income: Number(bridge_years_other_income) || 0,
          // New enhanced retirement planning
          person1_stop_work_year: Number(person1_stop_work_year) || null,
          person2_stop_work_year: Number(person2_stop_work_year) || null,
          gap_funding_strategy,
          gap_funding_amount: Number(gap_funding_amount) || 0,
          super_access_strategy,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        return res.status(500).json({ 
          error: 'Failed to update scenario',
          details: error.message 
        })
      }

      // Update lumpsum events (delete existing and insert new ones)
      if (lumpsum_events !== undefined) {
        // Delete existing events
        await supabase
          .from('lumpsum_events')
          .delete()
          .eq('scenario_id', id)

        // Insert new events if provided
        if (lumpsum_events.length > 0) {
          const eventsToInsert = lumpsum_events.map((event: any) => ({
            scenario_id: id,
            name: event.name.trim(),
            amount: Number(event.amount),
            event_date: event.event_date,
            allocation_strategy: event.allocation_strategy,
            person1_split: Number(event.person1_split) || 50,
            person2_split: Number(event.person2_split) || 50
          }))

          const { error: eventsError } = await supabase
            .from('lumpsum_events')
            .insert(eventsToInsert)

          if (eventsError) {
            console.error('Events update error:', eventsError)
            // Don't fail the whole request, just log the error
          }
        }
      }

      // Invalidate cached simulation results for this scenario
      await supabase
        .from('simulation_results')
        .delete()
        .eq('scenario_id', id)

      res.status(200).json({
        success: true,
        data: scenario,
        message: 'Scenario updated successfully'
      })

    } else if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) {
        return res.status(400).json({ error: 'Scenario ID required' })
      }

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('super_scenarios')
        .update({ is_active: false })
        .eq('id', id)

      if (error) {
        console.error('Database error:', error)
        return res.status(500).json({ 
          error: 'Failed to delete scenario',
          details: error.message 
        })
      }

      res.status(200).json({
        success: true,
        message: 'Scenario deleted successfully'
      })

    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}