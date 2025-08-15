import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardChart from '@/components/DashboardChart'
import StrategyChat from '@/components/StrategyChat'

interface NetWorthSnapshot {
  id: string
  quarter: string
  net_worth: number
  total_assets: number
  total_liabilities: number
  created_at: string
}

interface Scenario {
  id: string
  name: string
  description: string
  created_at: string
  target_fire_amount: number
}

export default function Dashboard() {
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const [projectionData, setProjectionData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // In a real app, you'd fetch this data from your API
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setIsLoading(false)
    }
  }

  const createSnapshot = async () => {
    try {
      const response = await fetch('/api/networth/snapshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()
      
      if (data.success) {
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error creating snapshot:', error)
    }
  }

  const importUpTransactions = async () => {
    try {
      const response = await fetch('/api/import/up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days: 30 }),
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`Imported ${data.imported} new transactions`)
      }
    } catch (error) {
      console.error('Error importing transactions:', error)
    }
  }

  const runProjection = async (scenarioId: string) => {
    try {
      const response = await fetch(`/api/scenario/${scenarioId}/project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ years: 30 }),
      })

      const data = await response.json()
      
      if (data.success) {
        setProjectionData(data.projection)
        setSelectedScenario(scenarioId)
      }
    } catch (error) {
      console.error('Error running projection:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const latestSnapshot = snapshots[0]
  const targetFireAmount = selectedScenario 
    ? scenarios.find(s => s.id === selectedScenario)?.target_fire_amount || 1250000
    : 1250000

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">FIRE Dashboard</h1>
              <p className="text-gray-600">Track your progress towards financial independence</p>
            </div>
            <div className="space-x-4">
              <button
                onClick={importUpTransactions}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Import Up Transactions
              </button>
              <button
                onClick={createSnapshot}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Snapshot
              </button>
              <Link 
                href="/scenarios"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 inline-block"
              >
                New Scenario
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {latestSnapshot ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Net Worth</h3>
              <p className="text-3xl font-bold text-gray-900">${latestSnapshot.net_worth.toLocaleString()}</p>
              <p className="text-sm text-gray-500">{latestSnapshot.quarter}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Assets</h3>
              <p className="text-3xl font-bold text-green-600">${latestSnapshot.total_assets.toLocaleString()}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Liabilities</h3>
              <p className="text-3xl font-bold text-red-600">${latestSnapshot.total_liabilities.toLocaleString()}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">FIRE Progress</h3>
              <p className="text-3xl font-bold text-blue-600">
                {((latestSnapshot.net_worth / targetFireAmount) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-yellow-800">No Data Yet</h3>
            <p className="text-yellow-700 mt-2">
              Create your first net worth snapshot to start tracking your FIRE progress.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {projectionData ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Net Worth Projection</h2>
                <DashboardChart 
                  projectionData={projectionData} 
                  targetFireAmount={targetFireAmount}
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Scenarios</h2>
                <p className="text-gray-600 mb-4">
                  Select a scenario to view projections, or create a new one to explore different strategies.
                </p>
                {scenarios.length > 0 ? (
                  <div className="space-y-3">
                    {scenarios.map((scenario) => (
                      <div key={scenario.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{scenario.name}</h3>
                            <p className="text-sm text-gray-600">{scenario.description}</p>
                          </div>
                          <button
                            onClick={() => runProjection(scenario.id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                          >
                            Run Projection
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No scenarios created yet</p>
                    <Link 
                      href="/scenarios"
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 inline-block"
                    >
                      Create Your First Scenario
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Chat</h2>
              <StrategyChat currentScenarioId={selectedScenario || undefined} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}