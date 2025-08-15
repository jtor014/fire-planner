import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function queryAI(prompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an experienced Australian financial advisor specializing in FIRE (Financial Independence, Retire Early) strategies. You provide practical, actionable advice considering Australian tax laws, superannuation rules, and investment options. Always structure your responses with clear pros and cons, and provide specific next steps.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })

    return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
  } catch (error) {
    console.error('OpenAI API error:', error)
    
    if (process.env.ANTHROPIC_API_KEY) {
      return queryClaudeAI(prompt)
    }
    
    throw new Error('Failed to get AI response')
  }
}

async function queryClaudeAI(prompt: string): Promise<string> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are an experienced Australian financial advisor specializing in FIRE strategies. ${prompt}`
        }]
      })
    })

    const data = await response.json()
    return data.content[0]?.text || 'Sorry, I could not generate a response.'
  } catch (error) {
    console.error('Claude API error:', error)
    throw new Error('Failed to get AI response from Claude')
  }
}