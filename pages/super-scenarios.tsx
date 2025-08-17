import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface LumpsumEvent {
  id?: string
  name: string
  amount: number
  event_date: string
  allocation_strategy: 'super' | 'mortgage_payoff' | 'taxable_investment' | 'gap_funding'
  person1_split: number
  person2_split: number
}

interface SuperScenario {
  id: string
  name: string
  description: string
  mode: 'target_income' | 'target_date'
  target_annual_income?: number
  target_retirement_date?: string
  monte_carlo_runs: number
  is_active: boolean
  created_at: string
  lumpsum_events: LumpsumEvent[]
  // Legacy retirement strategy (kept for backward compatibility)
  retirement_strategy: 'wait_for_both' | 'early_retirement_first' | 'bridge_strategy' | 'inheritance_bridge'
  bridge_years_other_income: number
  // New enhanced retirement planning
  person1_stop_work_year?: number
  person2_stop_work_year?: number
  gap_funding_strategy: 'none' | 'lump_sum' | 'part_time_income' | 'spousal_support' | 'taxable_investment'
  gap_funding_amount: number
  super_access_strategy: 'conservative' | 'aggressive' | 'custom'
}

function ScenarioEditForm({ 
  formData, 
  setFormData, 
  handleSubmit, 
  resetForm, 
  addLumpsumEvent, 
  removeLumpsumEvent, 
  updateLumpsumEvent,
  baselineSettings,
  generateYearOptions,
  calculateAgeInYear,
  checkGapFundingNeeded
}: {
  formData: any
  setFormData: any
  handleSubmit: any
  resetForm: any
  addLumpsumEvent: any
  removeLumpsumEvent: any
  updateLumpsumEvent: any
  baselineSettings: any
  generateYearOptions: () => number[]
  calculateAgeInYear: (personAge: number, targetYear: number) => number
  checkGapFundingNeeded: () => boolean
}) {
  return (
    <div className="bg-gray-50 rounded-lg mt-4">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Edit Scenario</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scenario Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Scenario Mode</label>
          <select
            value={formData.mode}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, mode: e.target.value as 'target_income' | 'target_date' }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="target_income">Target Income → Find Retirement Date</option>
            <option value="target_date">Target Date → Find Sustainable Income</option>
          </select>
        </div>

        {formData.mode === 'target_income' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Annual Income</label>
            <input
              type="number"
              min="10000"
              step="1"
              value={formData.target_annual_income}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, target_annual_income: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        )}

        {formData.mode === 'target_date' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Retirement Date</label>
            <input
              type="date"
              value={formData.target_retirement_date}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, target_retirement_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        )}

        {/* Enhanced Retirement Planning */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-md font-medium mb-3 text-blue-900">🎯 Retirement Planning</h4>
          
          {/* Work Cessation Planning */}
          <div className="mb-4">
            <h5 className="font-medium text-gray-900 mb-2">👥 When Each Person Stops Working</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {baselineSettings?.person1_name || 'Person 1'} Stops Working
                </label>
                <select
                  value={formData.person1_stop_work_year}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, person1_stop_work_year: Number(e.target.value) }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  {generateYearOptions().map(year => (
                    <option key={year} value={year}>
                      {year} (age {baselineSettings ? calculateAgeInYear(baselineSettings.person1_age, year) : '?'})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {baselineSettings?.person2_name || 'Person 2'} Stops Working
                </label>
                <select
                  value={formData.person2_stop_work_year}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, person2_stop_work_year: Number(e.target.value) }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  {generateYearOptions().map(year => (
                    <option key={year} value={year}>
                      {year} (age {baselineSettings ? calculateAgeInYear(baselineSettings.person2_age, year) : '?'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Gap Funding (only show if needed) */}
          {checkGapFundingNeeded() && (
            <div className="mb-4 bg-yellow-50 p-3 rounded border border-yellow-200">
              <h5 className="font-medium text-yellow-800 mb-2">🌉 Gap Funding Required</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gap Funding Strategy</label>
                  <select
                    value={formData.gap_funding_strategy}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, gap_funding_strategy: e.target.value as any }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="none">No specific strategy</option>
                    <option value="lump_sum">Use lump sum events</option>
                    <option value="part_time_income">Part-time work income</option>
                    <option value="spousal_support">Spousal super support</option>
                    <option value="taxable_investment">Taxable investments</option>
                  </select>
                </div>
                
                {(formData.gap_funding_strategy === 'part_time_income' || formData.gap_funding_strategy === 'taxable_investment') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Annual Gap Funding Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.gap_funding_amount}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, gap_funding_amount: Number(e.target.value) }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="50000"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Super Access Strategy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🎯 Super Access Strategy (from age 60)</label>
            <select
              value={formData.super_access_strategy}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, super_access_strategy: e.target.value as any }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="conservative">Conservative - Wait for both partners to reach 60</option>
              <option value="aggressive">Aggressive - Start when first partner reaches 60</option>
              <option value="custom">Custom - Use simulation to optimize</option>
            </select>
          </div>
        </div>

        {/* Lump Sum Events */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium">Lump Sum Events</h4>
            <button
              type="button"
              onClick={addLumpsumEvent}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              + Add Event
            </button>
          </div>
          
          {formData.lumpsum_events.map((event: any, index: number) => (
            <div key={index} className="bg-white p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                  <input
                    type="text"
                    value={event.name}
                    onChange={(e) => updateLumpsumEvent(index, 'name', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (+income/-expense)</label>
                  <input
                    type="number"
                    step="1000"
                    value={event.amount}
                    onChange={(e) => updateLumpsumEvent(index, 'amount', Number(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="200000 or -50000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Positive = income/inheritance, Negative = expense</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                  <input
                    type="date"
                    value={event.event_date}
                    onChange={(e) => updateLumpsumEvent(index, 'event_date', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Impact Area</label>
                  <select
                    value={event.allocation_strategy}
                    onChange={(e) => updateLumpsumEvent(index, 'allocation_strategy', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="super">Super Account</option>
                    <option value="mortgage_payoff">Mortgage/Debt</option>
                    <option value="taxable_investment">Taxable Investment</option>
                    {checkGapFundingNeeded() && (
                      <option value="gap_funding">🌉 Gap Funding (Retirement Bridge)</option>
                    )}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {checkGapFundingNeeded() && event.allocation_strategy === 'gap_funding' 
                      ? '🌉 This lump sum will be used to fund living expenses during gap years (before super access)'
                      : 'Where this event impacts your finances'
                    }
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Person 1 Split (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={event.person1_split}
                    onChange={(e) => {
                      const person1 = Number(e.target.value)
                      updateLumpsumEvent(index, 'person1_split', person1)
                      updateLumpsumEvent(index, 'person2_split', 100 - person1)
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeLumpsumEvent(index)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Update Scenario
          </button>
        </div>
      </form>
    </div>
  )
}

export default function SuperScenarios() {
  const [scenarios, setScenarios] = useState<SuperScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [baselineSettings, setBaselineSettings] = useState<any>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mode: 'target_income' as 'target_income' | 'target_date',
    target_annual_income: 80000,
    target_retirement_date: '2050-01-01',
    monte_carlo_runs: 1000,
    lumpsum_events: [] as LumpsumEvent[],
    // Legacy fields (kept for backward compatibility)
    retirement_strategy: 'wait_for_both' as 'wait_for_both' | 'early_retirement_first' | 'bridge_strategy' | 'inheritance_bridge',
    bridge_years_other_income: 0,
    // New enhanced retirement planning
    person1_stop_work_year: new Date().getFullYear() + 10,
    person2_stop_work_year: new Date().getFullYear() + 10,
    gap_funding_strategy: 'none' as 'none' | 'lump_sum' | 'part_time_income' | 'spousal_support' | 'taxable_investment',
    gap_funding_amount: 0,
    super_access_strategy: 'conservative' as 'conservative' | 'aggressive' | 'custom'
  })

  useEffect(() => {
    fetchScenarios()
    fetchBaselineSettings()
  }, [])

  const fetchBaselineSettings = async () => {
    try {
      const response = await fetch('/api/super/baseline-settings')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setBaselineSettings(result.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch baseline settings:', error)
    }
  }

  const fetchScenarios = async () => {
    try {
      const response = await fetch('/api/super/scenarios')
      if (!response.ok) throw new Error('Failed to fetch scenarios')
      
      const result = await response.json()
      if (result.success) {
        setScenarios(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch scenarios:', error)
      setMessage('Failed to load scenarios')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to detect conflicts between target dates and work cessation
  const detectRetirementConflict = (data: any) => {
    if (data.mode === 'target_date' && data.target_retirement_date && 
        data.person1_stop_work_year && data.person2_stop_work_year) {
      const targetYear = new Date(data.target_retirement_date).getFullYear()
      const lastWorkYear = Math.max(data.person1_stop_work_year, data.person2_stop_work_year)
      
      if (targetYear !== lastWorkYear) {
        return {
          hasConflict: true,
          message: `⚠️ Target retirement (${targetYear}) differs from when work stops (${lastWorkYear}). Work cessation will take priority.`
        }
      }
    }
    return { hasConflict: false, message: '' }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check for retirement logic conflicts
    const conflict = detectRetirementConflict(formData)
    if (conflict.hasConflict) {
      setMessage(conflict.message)
      setTimeout(() => setMessage(''), 5000)
    }
    
    try {
      const method = editingScenarioId ? 'PUT' : 'POST'
      const url = editingScenarioId 
        ? `/api/super/scenarios?id=${editingScenarioId}` 
        : '/api/super/scenarios'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage(`✅ Scenario ${editingScenarioId ? 'updated' : 'created'} successfully!`)
        
        // Only reset form when creating new scenario, not when editing existing one
        if (!editingScenarioId) {
          resetForm()
        }
        
        fetchScenarios()
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage(`❌ ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to save scenario:', error)
      setMessage('❌ Failed to save scenario')
    }
  }

  const handleEdit = (scenario: SuperScenario) => {
    if (editingScenarioId === scenario.id) {
      // If already editing this scenario, close the form
      setEditingScenarioId(null)
      resetForm()
    } else {
      // Open edit form for this scenario
      setEditingScenarioId(scenario.id)
      setFormData({
        name: scenario.name,
        description: scenario.description || '',
        mode: scenario.mode,
        target_annual_income: scenario.target_annual_income || 80000,
        target_retirement_date: scenario.target_retirement_date || '2050-01-01',
        monte_carlo_runs: scenario.monte_carlo_runs,
        lumpsum_events: scenario.lumpsum_events || [],
        // Legacy fields
        retirement_strategy: scenario.retirement_strategy || 'wait_for_both',
        bridge_years_other_income: scenario.bridge_years_other_income || 0,
        // New enhanced retirement planning
        person1_stop_work_year: scenario.person1_stop_work_year || new Date().getFullYear() + 10,
        person2_stop_work_year: scenario.person2_stop_work_year || new Date().getFullYear() + 10,
        gap_funding_strategy: scenario.gap_funding_strategy || 'none',
        gap_funding_amount: scenario.gap_funding_amount || 0,
        super_access_strategy: scenario.super_access_strategy || 'conservative'
      })
      setShowNewForm(false) // Close new form if open
      
      // Scroll to the edit form after it renders
      setTimeout(() => {
        const editFormElement = document.getElementById(`scenario-${scenario.id}`)
        if (editFormElement) {
          editFormElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
          })
        }
      }, 100)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scenario?')) return

    try {
      const response = await fetch(`/api/super/scenarios?id=${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage('✅ Scenario deleted successfully!')
        fetchScenarios()
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage(`❌ ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to delete scenario:', error)
      setMessage('❌ Failed to delete scenario')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      mode: 'target_income',
      target_annual_income: 80000,
      target_retirement_date: '2050-01-01',
      monte_carlo_runs: 1000,
      lumpsum_events: [],
      // Legacy fields
      retirement_strategy: 'wait_for_both',
      bridge_years_other_income: 0,
      // New enhanced retirement planning
      person1_stop_work_year: new Date().getFullYear() + 10,
      person2_stop_work_year: new Date().getFullYear() + 10,
      gap_funding_strategy: 'none',
      gap_funding_amount: 0,
      super_access_strategy: 'conservative'
    })
    setEditingScenarioId(null)
    setShowNewForm(false)
  }

  // Helper functions for retirement planning
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let year = currentYear; year <= currentYear + 50; year++) {
      years.push(year)
    }
    return years
  }

  const calculateAgeInYear = (personAge: number, targetYear: number) => {
    const currentYear = new Date().getFullYear()
    return personAge + (targetYear - currentYear)
  }

  const checkGapFundingNeeded = () => {
    if (!baselineSettings) return false
    
    const person1Age60Year = new Date().getFullYear() + (60 - baselineSettings.person1_age)
    const person2Age60Year = new Date().getFullYear() + (60 - baselineSettings.person2_age)
    
    return formData.person1_stop_work_year < person1Age60Year || 
           formData.person2_stop_work_year < person2Age60Year
  }

  const addLumpsumEvent = () => {
    setFormData(prev => ({
      ...prev,
      lumpsum_events: [
        ...prev.lumpsum_events,
        {
          name: 'Lump Sum Event',
          amount: 200000,
          event_date: '2030-01-01',
          allocation_strategy: 'super',
          person1_split: 50,
          person2_split: 50
        }
      ]
    }))
  }

  const removeLumpsumEvent = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lumpsum_events: prev.lumpsum_events.filter((_, i) => i !== index)
    }))
  }

  const updateLumpsumEvent = (index: number, field: keyof LumpsumEvent, value: any) => {
    setFormData(prev => ({
      ...prev,
      lumpsum_events: prev.lumpsum_events.map((event, i) => 
        i === index ? { ...event, [field]: value } : event
      )
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scenarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Home
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Super Scenarios</h1>
              <p className="text-gray-600 mt-2">Model different retirement strategies and lump sum events</p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/super-baseline"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Edit Baseline
              </Link>
              <Link
                href="/super-ai-compare"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                AI Strategy Compare
              </Link>
              <button
                onClick={() => {
                  setShowNewForm(!showNewForm)
                  setEditingScenarioId(null)
                  if (!showNewForm) resetForm()
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {showNewForm ? 'Cancel' : '+ New Scenario'}
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {showNewForm && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Create New Scenario</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scenario Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scenario Mode</label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value as 'target_income' | 'target_date' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="target_income">Target Income → Find Retirement Date</option>
                  <option value="target_date">Target Date → Find Sustainable Income</option>
                </select>
              </div>

              {formData.mode === 'target_income' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Annual Income</label>
                  <input
                    type="number"
                    min="10000"
                    step="1"
                    value={formData.target_annual_income}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_annual_income: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              {formData.mode === 'target_date' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Retirement Date</label>
                  <input
                    type="date"
                    value={formData.target_retirement_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_retirement_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              {/* Enhanced Retirement Planning */}
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium mb-4 text-blue-900">🎯 Retirement Planning</h3>
                
                {/* Work Cessation Planning */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">👥 When Each Person Stops Working</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {baselineSettings?.person1_name || 'Person 1'} Stops Working
                      </label>
                      <select
                        value={formData.person1_stop_work_year}
                        onChange={(e) => setFormData(prev => ({ ...prev, person1_stop_work_year: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {generateYearOptions().map(year => (
                          <option key={year} value={year}>
                            {year} (age {baselineSettings ? calculateAgeInYear(baselineSettings.person1_age, year) : '?'})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {baselineSettings?.person2_name || 'Person 2'} Stops Working
                      </label>
                      <select
                        value={formData.person2_stop_work_year}
                        onChange={(e) => setFormData(prev => ({ ...prev, person2_stop_work_year: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {generateYearOptions().map(year => (
                          <option key={year} value={year}>
                            {year} (age {baselineSettings ? calculateAgeInYear(baselineSettings.person2_age, year) : '?'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">📋 Super contributions automatically stop when each person stops working</p>
                </div>

                {/* Gap Funding (only show if needed) */}
                {checkGapFundingNeeded() && (
                  <div className="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h4 className="font-medium text-yellow-800 mb-3">🌉 Gap Funding Required</h4>
                    <p className="text-sm text-yellow-700 mb-3">
                      One or both people will retire before age 60 (super preservation age). You need funding for the gap years.
                    </p>
                    <p className="text-xs text-blue-600 mb-3">
                      💡 Tip: Set lump sum events (inheritance, asset sales, etc.) to "Gap Funding" allocation to automatically fund these years.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gap Funding Strategy</label>
                        <select
                          value={formData.gap_funding_strategy}
                          onChange={(e) => setFormData(prev => ({ ...prev, gap_funding_strategy: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="none">No specific strategy</option>
                          <option value="lump_sum">Use lump sum events</option>
                          <option value="part_time_income">Part-time work income</option>
                          <option value="spousal_support">Spousal super support</option>
                          <option value="taxable_investment">Taxable investments</option>
                        </select>
                      </div>
                      
                      {(formData.gap_funding_strategy === 'part_time_income' || formData.gap_funding_strategy === 'taxable_investment') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Annual Gap Funding Amount</label>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={formData.gap_funding_amount}
                            onChange={(e) => setFormData(prev => ({ ...prev, gap_funding_amount: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="50000"
                          />
                          <p className="text-xs text-gray-500 mt-1">Annual income during gap years</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Super Access Strategy */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">🎯 Super Access Strategy (from age 60)</h4>
                  <select
                    value={formData.super_access_strategy}
                    onChange={(e) => setFormData(prev => ({ ...prev, super_access_strategy: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="conservative">Conservative - Wait for both partners to reach 60</option>
                    <option value="aggressive">Aggressive - Start when first partner reaches 60</option>
                    <option value="custom">Custom - Use simulation to optimize</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">🔒 Super can only be accessed from preservation age (60) regardless of work cessation</p>
                </div>
              </div>

              {/* Lump Sum Events */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Lump Sum Events</h3>
                  <button
                    type="button"
                    onClick={addLumpsumEvent}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    + Add Event
                  </button>
                </div>
                
                {formData.lumpsum_events.map((event, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                        <input
                          type="text"
                          value={event.name}
                          onChange={(e) => updateLumpsumEvent(index, 'name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (+income/-expense)</label>
                        <input
                          type="number"
                          step="1000"
                          value={event.amount}
                          onChange={(e) => updateLumpsumEvent(index, 'amount', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="200000 or -50000"
                        />
                        <p className="text-xs text-gray-500 mt-1">Positive = income/inheritance, Negative = expense</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                        <input
                          type="date"
                          value={event.event_date}
                          onChange={(e) => updateLumpsumEvent(index, 'event_date', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Impact Area</label>
                        <select
                          value={event.allocation_strategy}
                          onChange={(e) => updateLumpsumEvent(index, 'allocation_strategy', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="super">Super Account</option>
                          <option value="mortgage_payoff">Mortgage/Debt</option>
                          <option value="taxable_investment">Taxable Investment</option>
                          {checkGapFundingNeeded() && (
                            <option value="gap_funding">🌉 Gap Funding (Retirement Bridge)</option>
                          )}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          {checkGapFundingNeeded() && event.allocation_strategy === 'gap_funding' 
                            ? '🌉 This lump sum will be used to fund living expenses during gap years (before super access)'
                            : 'Where this event impacts your finances'
                          }
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Person 1 Split (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={event.person1_split}
                          onChange={(e) => {
                            const person1 = Number(e.target.value)
                            updateLumpsumEvent(index, 'person1_split', person1)
                            updateLumpsumEvent(index, 'person2_split', 100 - person1)
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeLumpsumEvent(index)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Scenario
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Scenarios List */}
        <div className="space-y-6">
          {scenarios.map((scenario) => (
            <div key={scenario.id} id={`scenario-${scenario.id}`} className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{scenario.name}</h3>
                    {scenario.description && (
                      <p className="text-gray-600 mt-1">{scenario.description}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(scenario)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(scenario.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Mode</h4>
                    <p className="text-sm text-gray-600">
                      {scenario.mode === 'target_income' ? 'Target Income' : 'Target Date'}
                    </p>
                    {scenario.mode === 'target_income' && scenario.target_annual_income && (
                      <p className="font-semibold">${scenario.target_annual_income.toLocaleString()}/year</p>
                    )}
                    {scenario.mode === 'target_date' && scenario.target_retirement_date && (
                      <p className="font-semibold">{new Date(scenario.target_retirement_date).getFullYear()}</p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Lump Sum Events</h4>
                    <p className="text-sm text-gray-600">
                      {scenario.lumpsum_events?.length || 0} events configured
                    </p>
                    {scenario.lumpsum_events?.map((event, i) => (
                      <p key={i} className="text-xs text-gray-500">
                        {event.amount >= 0 ? '+' : ''}${event.amount.toLocaleString()} in {new Date(event.event_date).getFullYear()}
                      </p>
                    ))}
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Simulation</h4>
                    <p className="text-sm text-gray-600">
                      {scenario.monte_carlo_runs.toLocaleString()} runs
                    </p>
                    <Link
                      href={`/super-projection?scenario=${scenario.id}`}
                      className="inline-block mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Projection →
                    </Link>
                  </div>
                </div>
              </div>
              
              {/* Edit Form - appears underneath when editing this scenario */}
              {editingScenarioId === scenario.id && (
                <ScenarioEditForm
                  formData={formData}
                  setFormData={setFormData}
                  handleSubmit={handleSubmit}
                  resetForm={resetForm}
                  addLumpsumEvent={addLumpsumEvent}
                  removeLumpsumEvent={removeLumpsumEvent}
                  updateLumpsumEvent={updateLumpsumEvent}
                  baselineSettings={baselineSettings}
                  generateYearOptions={generateYearOptions}
                  calculateAgeInYear={calculateAgeInYear}
                  checkGapFundingNeeded={checkGapFundingNeeded}
                />
              )}
            </div>
          ))}
          
          {scenarios.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Scenarios Yet</h3>
              <p className="text-gray-600 mb-4">Create your first scenario to start modeling retirement strategies and lump sum events</p>
              <button
                onClick={() => setShowNewForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create First Scenario
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}