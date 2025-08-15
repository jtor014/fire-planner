import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')

    if (accountsError || !accounts) {
      return res.status(500).json({ error: 'Failed to fetch accounts' })
    }

    const totalAssets = accounts
      .filter(account => account.type === 'asset')
      .reduce((sum, account) => sum + account.current_balance, 0)

    const totalLiabilities = accounts
      .filter(account => account.type === 'liability')
      .reduce((sum, account) => sum + Math.abs(account.current_balance), 0)

    const netWorth = totalAssets - totalLiabilities

    const currentQuarter = format(new Date(), 'yyyy-QQQ')

    const { data: snapshot, error } = await supabase
      .from('networth_snapshots')
      .insert({
        quarter: currentQuarter,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        net_worth: netWorth,
        notes: req.body.notes || null
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to create snapshot' })
    }

    res.status(200).json({
      success: true,
      snapshot,
      summary: {
        totalAssets,
        totalLiabilities,
        netWorth,
        quarter: currentQuarter
      }
    })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}