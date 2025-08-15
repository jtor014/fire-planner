import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { runProjection } from '@/lib/simulation'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query

  try {
    const { data: scenario, error: scenarioError } = await supabase
      .from('scenarios')
      .select('*')
      .eq('id', id)
      .single()

    if (scenarioError || !scenario) {
      return res.status(404).json({ error: 'Scenario not found' })
    }

    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')

    if (accountsError || !accounts) {
      return res.status(500).json({ error: 'Failed to fetch accounts' })
    }

    const { data: latestSnapshot, error: snapshotError } = await supabase
      .from('networth_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (snapshotError || !latestSnapshot) {
      return res.status(500).json({ error: 'No net worth snapshots found' })
    }

    const projectionData = {
      scenario,
      accounts,
      currentNetWorth: latestSnapshot.net_worth,
      projectionYears: req.body.years || 30
    }

    const projection = await runProjection(projectionData)

    res.status(200).json({
      success: true,
      scenario,
      projection,
      metadata: {
        startingNetWorth: latestSnapshot.net_worth,
        projectionYears: projectionData.projectionYears,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}