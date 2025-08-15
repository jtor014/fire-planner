import axios from 'axios'

const UP_API_BASE = 'https://api.up.com.au/api/v1'

interface UpTransaction {
  id: string
  type: string
  attributes: {
    status: string
    rawText: string
    description: string
    message: string
    amount: {
      currencyCode: string
      value: string
      valueInBaseUnits: number
    }
    createdAt: string
    settledAt: string
  }
  relationships: {
    account: {
      data: {
        type: string
        id: string
      }
    }
    category?: {
      data: {
        type: string
        id: string
      }
    }
  }
}

export async function fetchRecentTransactions(days: number = 30): Promise<UpTransaction[]> {
  const token = process.env.UP_API_TOKEN
  
  if (!token) {
    throw new Error('UP_API_TOKEN not configured')
  }

  try {
    const since = new Date()
    since.setDate(since.getDate() - days)
    
    const response = await axios.get(`${UP_API_BASE}/transactions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        'filter[since]': since.toISOString(),
        'page[size]': 100
      }
    })

    return response.data.data || []
  } catch (error) {
    console.error('Up Bank API error:', error)
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Invalid Up Bank API token')
      }
      if (error.response?.status === 429) {
        throw new Error('Up Bank API rate limit exceeded')
      }
    }
    
    throw new Error('Failed to fetch transactions from Up Bank')
  }
}

export async function fetchAccounts() {
  const token = process.env.UP_API_TOKEN
  
  if (!token) {
    throw new Error('UP_API_TOKEN not configured')
  }

  try {
    const response = await axios.get(`${UP_API_BASE}/accounts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    return response.data.data || []
  } catch (error) {
    console.error('Up Bank API error:', error)
    throw new Error('Failed to fetch accounts from Up Bank')
  }
}

export async function testConnection(): Promise<boolean> {
  const token = process.env.UP_API_TOKEN
  
  if (!token) {
    return false
  }

  try {
    const response = await axios.get(`${UP_API_BASE}/util/ping`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    return response.status === 200
  } catch (error) {
    return false
  }
}