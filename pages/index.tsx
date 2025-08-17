import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface SuperData {
  combined_balance: number
  combined_contributions: number
  scenarios_count: number
  success_rate: number
  next_retirement_year: number
}

export default function Home() {
  const [data, setData] = useState<SuperData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSuperData()
  }, [])

  const fetchSuperData = async () => {
    try {
      // Fetch baseline settings to get super data
      const baselineResponse = await fetch('/api/super/baseline-settings')
      const scenariosResponse = await fetch('/api/super/scenarios')

      let combinedBalance = 0
      let combinedContributions = 0
      let scenariosCount = 0
      let successRate = 0
      let nextRetirementYear = new Date().getFullYear() + 30

      if (baselineResponse.ok) {
        const baseline = await baselineResponse.json()
        if (baseline.success && baseline.data) {
          combinedBalance = baseline.data.person1_current_balance + baseline.data.person2_current_balance
          combinedContributions = baseline.data.person1_annual_contribution + baseline.data.person2_annual_contribution
          
          // Estimate retirement year based on preservation age
          const person1RetirementYear = new Date().getFullYear() + (60 - baseline.data.person1_age)
          const person2RetirementYear = new Date().getFullYear() + (60 - baseline.data.person2_age)
          nextRetirementYear = Math.min(person1RetirementYear, person2RetirementYear)
        }
      }

      if (scenariosResponse.ok) {
        const scenarios = await scenariosResponse.json()
        if (scenarios.success) {
          scenariosCount = scenarios.data.length
        }
      }

      setData({
        combined_balance: combinedBalance,
        combined_contributions: combinedContributions,
        scenarios_count: scenariosCount,
        success_rate: successRate,
        next_retirement_year: nextRetirementYear
      })
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">FIRE Planner</h1>
          <p className="text-gray-600">Australian FIRE Planning with Pre-60 Bridge Strategy and Super Optimization</p>
        </div>

        {/* Current Status */}
        {!loading && data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Combined Super</h3>
              <p className="text-2xl font-bold text-gray-900">${data.combined_balance.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Current balance</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Annual Contributions</h3>
              <p className="text-2xl font-bold text-blue-600">${data.combined_contributions.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Household total</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Scenarios</h3>
              <p className="text-2xl font-bold text-green-600">{data.scenarios_count}</p>
              <p className="text-xs text-gray-500">Modeled strategies</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Preservation Age</h3>
              <p className="text-2xl font-bold text-orange-600">{data.next_retirement_year}</p>
              <p className="text-xs text-gray-500">First eligible year</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FIRE Calculators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Pre-60 FIRE Calculator */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Pre-60 FIRE Calculator</h3>
            <p className="text-gray-600 mb-4">Bridge strategy until super access at 60</p>
            
            <Link 
              href="/pre60-fire"
              className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 inline-block w-full text-center"
            >
              Calculate Bridge Funding
            </Link>
          </div>

          {/* Super Spend-to-Zero Calculator */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Super Spend-to-Zero</h3>
            <p className="text-gray-600 mb-4">Optimal withdrawal strategy from age 60+</p>
            
            <Link 
              href="/super-spend-zero"
              className="bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 inline-block w-full text-center"
            >
              Optimize Withdrawals
            </Link>
          </div>
        </div>

        {/* Legacy Tools */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Legacy Super Planning Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Baseline Settings</h3>
              <p className="text-gray-600 text-sm mb-3">Configure couple's super balances and assumptions</p>
              <Link 
                href="/super-baseline"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors inline-block w-full text-center"
              >
                Configure Baseline
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Manage Scenarios</h3>
              <p className="text-gray-600 text-sm mb-3">Create complex Monte Carlo scenarios</p>
              <Link 
                href="/super-scenarios"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors inline-block w-full text-center"
              >
                Manage Scenarios
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">View Projections</h3>
              <p className="text-gray-600 text-sm mb-3">Run Monte Carlo simulations</p>
              <Link 
                href="/super-scenarios"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors inline-block w-full text-center"
              >
                View Scenarios
              </Link>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Super Planner Features</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Monte Carlo Simulations</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Market volatility modeling with normal distribution</li>
                  <li>• Australian super preservation age (60) compliance</li>
                  <li>• Confidence intervals (10th-90th percentile)</li>
                  <li>• 1000+ simulation runs for statistical accuracy</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Scenario Modeling</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Target Income → Find retirement date</li>
                  <li>• Target Date → Find sustainable income</li>
                  <li>• Inheritance event modeling with allocation strategies</li>
                  <li>• Couple-based super contributions and splits</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Interactive Charts</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Balance projections over time</li>
                  <li>• Sustainable income trajectories</li>
                  <li>• Risk assessment and success rates</li>
                  <li>• Cached results for fast re-access</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Australian Context</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Superannuation-focused FIRE planning</li>
                  <li>• Preservation age compliance</li>
                  <li>• Safe withdrawal rate modeling</li>
                  <li>• Inflation adjustment for long-term planning</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}