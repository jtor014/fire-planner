import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import ScenarioForm from '@/components/ScenarioForm'
import StrategyChat from '@/components/StrategyChat'

interface Scenario {
  id: string
  name: string
  description: string
  employment_status: string
  income_reduction: number
  lump_sum_amount: number
  lump_sum_allocation: string
  property_action: string
  target_fire_amount: number
  created_at: string
}

export default function Scenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchScenarios()
  }, [])

  const fetchScenarios = async () => {
    try {
      // In a real app, you'd fetch scenarios from your API
      // For now, we'll use an empty array
      setScenarios([])
    } catch (error) {
      console.error('Error fetching scenarios:', error)
    }
  }

  const handleCreateScenario = async (scenarioData: any) => {
    setIsLoading(true)
    try {
      // In a real app, you'd save to your API
      const newScenario = {
        id: Date.now().toString(),
        ...scenarioData,
        created_at: new Date().toISOString()
      }
      
      setScenarios(prev => [newScenario, ...prev])
      setShowForm(false)
      setSelectedScenario(newScenario.id)
      
    } catch (error) {
      console.error('Error creating scenario:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteScenario = async (scenarioId: string) => {
    if (!confirm('Are you sure you want to delete this scenario?')) return
    
    try {
      setScenarios(prev => prev.filter(s => s.id !== scenarioId))
      if (selectedScenario === scenarioId) {
        setSelectedScenario(null)
      }
    } catch (error) {
      console.error('Error deleting scenario:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      full_time: 'bg-green-100 text-green-800',
      part_time: 'bg-yellow-100 text-yellow-800',
      retired: 'bg-blue-100 text-blue-800'
    }
    
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const labels = {
      full_time: 'Full Time',
      part_time: 'Part Time',
      retired: 'Retired'
    }
    
    return labels[status as keyof typeof labels] || status
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">FIRE Scenarios</h1>
              <p className="text-gray-600">Model different retirement strategies and their outcomes</p>
            </div>
            <div className="space-x-4">
              <Link 
                href="/dashboard"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 inline-block"
              >
                Back to Dashboard
              </Link>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {showForm ? 'Cancel' : 'New Scenario'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Scenario</h2>
            <ScenarioForm 
              onSubmit={handleCreateScenario}
              isLoading={isLoading}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Your Scenarios</h2>
              </div>
              
              {scenarios.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No scenarios yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first scenario to start modeling different retirement strategies.
                  </p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Create Scenario
                  </button>
                </div>
              ) : (
                <div className="divide-y">
                  {scenarios.map((scenario) => (
                    <div 
                      key={scenario.id} 
                      className={`p-6 hover:bg-gray-50 cursor-pointer ${
                        selectedScenario === scenario.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => setSelectedScenario(scenario.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{scenario.name}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(scenario.employment_status)}`}>
                              {getStatusText(scenario.employment_status)}
                            </span>
                          </div>
                          
                          {scenario.description && (
                            <p className="text-gray-600 mb-3">{scenario.description}</p>
                          )}
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Income Reduction:</span>
                              <p className="font-medium">{scenario.income_reduction}%</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Lump Sum:</span>
                              <p className="font-medium">${scenario.lump_sum_amount.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Property:</span>
                              <p className="font-medium capitalize">{scenario.property_action}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">FIRE Target:</span>
                              <p className="font-medium">${scenario.target_fire_amount.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Run projection logic would go here
                            }}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Run Projection
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteScenario(scenario.id)
                            }}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Strategy Advisor</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedScenario ? 'Get advice for your selected scenario' : 'Select a scenario for contextual advice'}
                </p>
              </div>
              <div className="p-6">
                <StrategyChat currentScenarioId={selectedScenario || undefined} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}