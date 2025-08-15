import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { fetchRecentTransactions } from '@/lib/up-client'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['POST']
    })
  }

  // Check if Up Bank API token is configured
  if (!process.env.UP_API_TOKEN) {
    return res.status(503).json({ 
      error: 'Service unavailable',
      details: 'Up Bank API not configured. Please add UP_API_TOKEN to environment variables.'
    })
  }

  try {
    const { days = 30 } = req.body

    // Validate days parameter
    if (typeof days !== 'number' || days < 1 || days > 365) {
      return res.status(400).json({
        error: 'Validation failed',
        details: 'Days must be a number between 1 and 365'
      })
    }

    const transactions = await fetchRecentTransactions(days)

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No new transactions found',
        imported: 0
      })
    }

    const existingTransactions = await supabase
      .from('transactions')
      .select('up_transaction_id')
      .not('up_transaction_id', 'is', null)

    const existingIds = new Set(
      existingTransactions.data?.map(t => t.up_transaction_id) || []
    )

    const newTransactions = transactions
      .filter(t => !existingIds.has(t.id))
      .map(t => ({
        date: t.attributes.createdAt.split('T')[0],
        description: t.attributes.description,
        amount: parseFloat(t.attributes.amount.value),
        category: t.relationships?.category?.data?.id || null,
        account: t.relationships.account.data.id,
        source: 'up_bank' as const,
        up_transaction_id: t.id
      }))

    if (newTransactions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All transactions already imported',
        imported: 0
      })
    }

    const { data: insertedTransactions, error } = await supabase
      .from('transactions')
      .insert(newTransactions)
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to import transactions' })
    }

    res.status(200).json({
      success: true,
      message: `Imported ${newTransactions.length} new transactions`,
      imported: newTransactions.length,
      transactions: insertedTransactions
    })
  } catch (error) {
    console.error('Import error:', error)
    
    // Provide specific error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes('Invalid Up Bank API token')) {
        return res.status(401).json({
          error: 'Authentication failed',
          details: 'Invalid Up Bank API token. Please check your UP_API_TOKEN environment variable.'
        })
      }
      
      if (error.message.includes('rate limit')) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          details: 'Up Bank API rate limit exceeded. Please try again later.'
        })
      }
      
      if (error.message.includes('network') || error.message.includes('timeout')) {
        return res.status(502).json({
          error: 'Service unavailable',
          details: 'Unable to connect to Up Bank API. Please try again later.'
        })
      }
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: 'Failed to import transactions from Up Bank. Please try again.'
    })
  }
}