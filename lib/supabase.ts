import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface NetWorthSnapshot {
  id: string
  created_at: string
  quarter: string
  total_assets: number
  total_liabilities: number
  net_worth: number
  notes?: string
}

export interface Scenario {
  id: string
  created_at: string
  name: string
  description?: string
  employment_status: 'full_time' | 'part_time' | 'retired'
  income_reduction?: number
  lump_sum_amount?: number
  lump_sum_allocation?: 'mortgage' | 'super' | 'investment' | 'mixed'
  property_action?: 'keep' | 'sell'
  target_fire_amount?: number
}

export interface Transaction {
  id: string
  created_at: string
  date: string
  description: string
  amount: number
  category?: string
  account: string
  source: 'up_bank' | 'manual'
  up_transaction_id?: string
}

export interface Account {
  id: string
  created_at: string
  name: string
  type: 'asset' | 'liability'
  category: 'bank' | 'super' | 'investment' | 'property' | 'loan'
  current_balance: number
  institution: string
}