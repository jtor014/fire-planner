import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface LumpsumEvent {
  id?: string
  name: string
  amount: number
  event_date: string
  allocation_strategy: 'super' | 'mortgage_payoff' | 'taxable_investment'
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
}

export default function SuperScenarios() {
  const [scenarios, setScenarios] = useState<SuperScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingScenario, setEditingScenario] = useState<SuperScenario | null>(null)
  const [message, setMessage] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mode: 'target_income' as 'target_income' | 'target_date',
    target_annual_income: 80000,
    target_retirement_date: '2050-01-01',
    monte_carlo_runs: 1000,
    lumpsum_events: [] as LumpsumEvent[]
  })

  useEffect(() => {
    fetchScenarios()
  }, [])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const method = editingScenario ? 'PUT' : 'POST'
      const url = editingScenario 
        ? `/api/super/scenarios?id=${editingScenario.id}` 
        : '/api/super/scenarios'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage(`✅ Scenario ${editingScenario ? 'updated' : 'created'} successfully!`)
        resetForm()
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
    setEditingScenario(scenario)
    setFormData({
      name: scenario.name,
      description: scenario.description || '',
      mode: scenario.mode,
      target_annual_income: scenario.target_annual_income || 80000,
      target_retirement_date: scenario.target_retirement_date || '2050-01-01',
      monte_carlo_runs: scenario.monte_carlo_runs,
      lumpsum_events: scenario.lumpsum_events || []
    })
    setShowForm(true)
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
      lumpsum_events: []
    })
    setEditingScenario(null)
    setShowForm(false)
  }

  const addLumpsumEvent = () => {
    setFormData(prev => ({
      ...prev,
      lumpsum_events: [
        ...prev.lumpsum_events,
        {
          name: 'Inheritance Event',
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
              <p className="text-gray-600 mt-2">Model different retirement strategies and inheritance events</p>
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
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {showForm ? 'Cancel' : '+ New Scenario'}
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

        {showForm && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">
                {editingScenario ? 'Edit Scenario' : 'Create New Scenario'}
              </h2>
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

              {/* Lump Sum Events */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Inheritance Events</h3>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                        <input
                          type="number"
                          min="1000"
                          step="1"
                          value={event.amount}
                          onChange={(e) => updateLumpsumEvent(index, 'amount', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Allocation Strategy</label>
                        <select
                          value={event.allocation_strategy}
                          onChange={(e) => updateLumpsumEvent(index, 'allocation_strategy', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="super">Super Contribution</option>
                          <option value="mortgage_payoff">Mortgage Payoff</option>
                          <option value="taxable_investment">Taxable Investment</option>
                        </select>
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
                  {editingScenario ? 'Update Scenario' : 'Create Scenario'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Scenarios List */}
        <div className="space-y-6">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="bg-white rounded-lg shadow">
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
                    <h4 className="font-medium text-gray-900 mb-2">Inheritance Events</h4>
                    <p className="text-sm text-gray-600">
                      {scenario.lumpsum_events?.length || 0} events configured
                    </p>
                    {scenario.lumpsum_events?.map((event, i) => (
                      <p key={i} className="text-xs text-gray-500">
                        ${event.amount.toLocaleString()} in {new Date(event.event_date).getFullYear()}
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
            </div>
          ))}
          
          {scenarios.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Scenarios Yet</h3>
              <p className="text-gray-600 mb-4">Create your first scenario to start modeling retirement strategies</p>
              <button
                onClick={() => setShowForm(true)}
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