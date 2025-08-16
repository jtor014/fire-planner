// POC Super Balance Update API
import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { 
      household_member_id, 
      fund_name,
      current_balance,
      balance_date,
      assumed_annual_return,
      annual_fees
    } = req.body

    if (!household_member_id || current_balance === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Insert/update super balance
    const { data, error } = await supabase
      .from('super_balances_poc')
      .upsert({
        household_member_id,
        fund_name: fund_name || 'Main Super Fund',
        current_balance: parseFloat(current_balance),
        balance_date: balance_date || new Date().toISOString().split('T')[0],
        assumed_annual_return: assumed_annual_return || 0.07,
        annual_fees: annual_fees || 0.007,
        is_current: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'household_member_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Database error', details: error.message })
    }

    return res.status(200).json({
      success: true,
      data,
      message: 'Super balance updated successfully'
    })

  } catch (error) {
    console.error('Update error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}