import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface BaselineSettings {
  person1_name: string
  person1_current_balance: number
  person1_annual_contribution: number
  person1_age: number
  person2_name: string
  person2_current_balance: number
  person2_annual_contribution: number
  person2_age: number
  expected_return_mean: number
  expected_return_volatility: number
  safe_withdrawal_rate: number
  inflation_rate: number
}

export default function SuperBaseline() {
  const router = useRouter()
  const [settings, setSettings] = useState<BaselineSettings>({
    person1_name: 'Josh',
    person1_current_balance: 116289,
    person1_annual_contribution: 25000,
    person1_age: 35,
    person2_name: 'Nancy',
    person2_current_balance: 96000,
    person2_annual_contribution: 25000,
    person2_age: 33,
    expected_return_mean: 7.5,
    expected_return_volatility: 15.0,
    safe_withdrawal_rate: 3.5,
    inflation_rate: 2.5
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/super/baseline-settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      
      const result = await response.json()
      if (result.success && result.data) {
        setSettings(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch baseline settings:', error)
      setMessage('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/super/baseline-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage('✅ Baseline settings saved successfully!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage(`❌ ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage('❌ Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof BaselineSettings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? value : Number(value)
    }))
  }

  const totalCurrentBalance = Number(settings.person1_current_balance) + Number(settings.person2_current_balance)
  const totalAnnualContributions = Number(settings.person1_annual_contribution) + Number(settings.person2_annual_contribution)
  const retirementYearPerson1 = new Date().getFullYear() + (67 - settings.person1_age)
  const retirementYearPerson2 = new Date().getFullYear() + (67 - settings.person2_age)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading baseline settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Home
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Super Planner Baseline</h1>
              <p className="text-gray-600 mt-2">Configure your couple's superannuation foundation</p>
            </div>
            <Link
              href="/super-scenarios"
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              View Scenarios →
            </Link>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Combined Super Balance</h3>
              <div className="text-2xl font-bold text-gray-900">${totalCurrentBalance.toLocaleString()}</div>
              <div className="text-sm text-gray-500">
                {settings.person1_name}: ${settings.person1_current_balance.toLocaleString()}<br/>
                {settings.person2_name}: ${settings.person2_current_balance.toLocaleString()}
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Annual Contributions</h3>
              <div className="text-2xl font-bold text-gray-900">${totalAnnualContributions.toLocaleString()}</div>
              <div className="text-sm text-gray-500">
                Combined household contributions
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Super Access Ages</h3>
              <div className="text-lg font-bold text-gray-900">
                {new Date().getFullYear() + (60 - settings.person1_age)} / {new Date().getFullYear() + (60 - settings.person2_age)}
              </div>
              <div className="text-sm text-gray-500">
                {settings.person1_name}: age 60 in {new Date().getFullYear() + (60 - settings.person1_age)}<br/>
                {settings.person2_name}: age 60 in {new Date().getFullYear() + (60 - settings.person2_age)}
              </div>
            </div>
          </div>

          {/* Person 1 Details */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Person 1 Details</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={settings.person1_name}
                  onChange={(e) => handleInputChange('person1_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Age</label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={settings.person1_age}
                  onChange={(e) => handleInputChange('person1_age', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Super Balance</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.person1_current_balance}
                  onChange={(e) => handleInputChange('person1_current_balance', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Annual Contribution</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.person1_annual_contribution}
                  onChange={(e) => handleInputChange('person1_annual_contribution', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Person 2 Details */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Person 2 Details</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={settings.person2_name}
                  onChange={(e) => handleInputChange('person2_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Age</label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={settings.person2_age}
                  onChange={(e) => handleInputChange('person2_age', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Super Balance</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.person2_current_balance}
                  onChange={(e) => handleInputChange('person2_current_balance', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Annual Contribution</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.person2_annual_contribution}
                  onChange={(e) => handleInputChange('person2_annual_contribution', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Investment Assumptions */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Investment Assumptions</h2>
              <p className="text-sm text-gray-600 mt-1">These drive Monte Carlo simulations</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Return (% per year)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={settings.expected_return_mean}
                  onChange={(e) => handleInputChange('expected_return_mean', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Typical: 7-8% for global equity ETFs</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Return Volatility (% per year)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={settings.expected_return_volatility}
                  onChange={(e) => handleInputChange('expected_return_volatility', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Typical: 15-20% for equity portfolios</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Safe Withdrawal Rate (%)</label>
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={settings.safe_withdrawal_rate}
                  onChange={(e) => handleInputChange('safe_withdrawal_rate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Typical: 3.5-4% for sustainable income</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Inflation Rate (% per year)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={settings.inflation_rate}
                  onChange={(e) => handleInputChange('inflation_rate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">RBA target: 2-3% long term</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              All scenarios will use this baseline for projections
            </div>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => router.push('/super-scenarios')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                View Scenarios
              </button>
              
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Baseline'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}