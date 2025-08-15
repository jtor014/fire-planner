import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { queryAI } from '@/lib/ai'

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

  const { question, scenarioId } = req.body

  // Validate request body
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: 'Question is required and must be a string'
    })
  }

  if (question.length > 1000) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: 'Question must be less than 1000 characters'
    })
  }

  // Check if AI API key is configured
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ 
      error: 'Service unavailable',
      details: 'AI service not configured. Please add OPENAI_API_KEY or ANTHROPIC_API_KEY to environment variables.'
    })
  }

  try {
    const { data: latestSnapshot } = await supabase
      .from('networth_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: accounts } = await supabase
      .from('accounts')
      .select('*')

    let scenario = null
    if (scenarioId) {
      const { data: scenarioData } = await supabase
        .from('scenarios')
        .select('*')
        .eq('id', scenarioId)
        .single()
      scenario = scenarioData
    }

    const context = {
      currentNetWorth: latestSnapshot?.net_worth || 0,
      totalAssets: latestSnapshot?.total_assets || 0,
      totalLiabilities: latestSnapshot?.total_liabilities || 0,
      accounts: accounts || [],
      scenario,
      quarter: latestSnapshot?.quarter || 'Unknown'
    }

    const prompt = buildFinancialPrompt(question, context)
    const aiResponse = await queryAI(prompt)

    res.status(200).json({
      success: true,
      question,
      answer: aiResponse,
      context: {
        netWorth: context.currentNetWorth,
        quarter: context.quarter,
        scenarioIncluded: !!scenario
      }
    })
  } catch (error) {
    console.error('AI API error:', error)
    
    // Provide specific error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return res.status(401).json({ 
          error: 'Authentication failed',
          details: 'Invalid or missing AI API key'
        })
      }
      
      if (error.message.includes('rate limit')) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          details: 'Too many AI requests. Please try again later.'
        })
      }
      
      if (error.message.includes('timeout')) {
        return res.status(408).json({ 
          error: 'Request timeout',
          details: 'AI service took too long to respond'
        })
      }
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: 'Failed to process AI query. Please try again.'
    })
  }
}

function buildFinancialPrompt(question: string, context: any): string {
  return `You are a financial advisor helping with FIRE (Financial Independence, Retire Early) planning for a couple. 

Current Financial Situation:
- Net Worth: $${context.currentNetWorth.toLocaleString()}
- Total Assets: $${context.totalAssets.toLocaleString()}
- Total Liabilities: $${context.totalLiabilities.toLocaleString()}
- Quarter: ${context.quarter}

Account Breakdown:
${context.accounts.map((acc: any) => 
  `- ${acc.name} (${acc.type}): $${acc.current_balance.toLocaleString()}`
).join('\n')}

${context.scenario ? `
Current Scenario Being Considered:
- Name: ${context.scenario.name}
- Employment: ${context.scenario.employment_status}
- Income Reduction: ${context.scenario.income_reduction || 0}%
- Lump Sum: $${context.scenario.lump_sum_amount?.toLocaleString() || 0}
- Property Action: ${context.scenario.property_action || 'keep'}
` : ''}

User Question: ${question}

Please provide specific, actionable advice considering their FIRE goals. Include pros and cons where applicable, and suggest concrete next steps. Focus on practical Australian financial strategies including superannuation, property investment, and tax optimization.`
}