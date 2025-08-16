import React, { useState } from 'react'
import Link from 'next/link'

interface ComparisonResult {
  strategy: string
  description: string
  allocation: string
  success_rate: number
  median_retirement_year?: number
  median_final_income?: number
  percentile_10_retirement_year?: number
  percentile_90_retirement_year?: number
  percentile_10_final_income?: number
  percentile_90_final_income?: number
}

interface AIAnalysis {
  recommended_strategy: string
  key_insights: string[]
  risk_considerations: string[]
  next_steps: string[]
}

interface ComparisonData {
  inheritance_amount: number
  inheritance_date: string
  comparison_results: ComparisonResult[]
  ai_analysis: AIAnalysis
  baseline_info: {
    combined_balance: number
    combined_contributions: number
    expected_return: number
    volatility: number
  }
}

export default function SuperAICompare() {
  const [formData, setFormData] = useState({
    inheritance_amount: 250000,
    inheritance_date: '2030-01-01',
    target_mode: 'target_income' as 'target_income' | 'target_date',
    target_value: 80000
  })
  
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ComparisonData | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/super/ai-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      
      if (result.success) {
        setResults(result.data)
      } else {
        setError(result.error)
      }
    } catch (error) {
      console.error('Failed to run comparison:', error)
      setError('Failed to run AI comparison')
    } finally {
      setLoading(false)
    }
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSuccessRateBg = (rate: number) => {
    if (rate >= 80) return 'bg-green-100'
    if (rate >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/super-scenarios" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Scenarios
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Strategy Comparison</h1>
            <p className="text-gray-600 mt-2">Compare inheritance allocation strategies using Monte Carlo analysis</p>
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Inheritance Event Parameters</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Inheritance Amount</label>
                <input
                  type="number"
                  min="10000"
                  step="10000"
                  value={formData.inheritance_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, inheritance_amount: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Date</label>
                <input
                  type="date"
                  value={formData.inheritance_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, inheritance_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Mode</label>
                <select
                  value={formData.target_mode}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_mode: e.target.value as 'target_income' | 'target_date' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="target_income">Target Income Analysis</option>
                  <option value="target_date">Target Date Analysis</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.target_mode === 'target_income' ? 'Target Annual Income' : 'Target Retirement Date'}
                </label>
                {formData.target_mode === 'target_income' ? (
                  <input
                    type="number"
                    min="30000"
                    step="5000"
                    value={formData.target_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_value: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                ) : (
                  <input
                    type="date"
                    value={new Date(formData.target_value).toISOString().split('T')[0]}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_value: new Date(e.target.value).getFullYear() }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                )}
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Running Analysis...' : 'Compare Strategies'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-8">
            {error}
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Running Monte Carlo simulations for each strategy...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </div>
        )}

        {results && (
          <>
            {/* Strategy Comparison Results */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold">Strategy Comparison Results</h2>
                <p className="text-sm text-gray-600 mt-1">
                  ${results.inheritance_amount.toLocaleString()} inheritance in {new Date(results.inheritance_date).getFullYear()}
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {results.comparison_results.map((result, index) => (
                    <div key={index} className={`border-2 rounded-lg p-6 ${
                      result.strategy === results.ai_analysis.recommended_strategy 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">{result.strategy}</h3>
                        {result.strategy === results.ai_analysis.recommended_strategy && (
                          <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4">{result.description}</p>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">Success Rate</span>
                            <span className={`font-bold ${getSuccessRateColor(result.success_rate)}`}>
                              {result.success_rate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                result.success_rate >= 80 ? 'bg-green-500' :
                                result.success_rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${result.success_rate}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        {result.median_retirement_year && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Retirement Year</span>
                            <span className="font-medium">{result.median_retirement_year}</span>
                          </div>
                        )}
                        
                        {result.median_final_income && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Sustainable Income</span>
                            <span className="font-medium">${result.median_final_income.toLocaleString()}</span>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          {formData.target_mode === 'target_income' 
                            ? `Range: ${result.percentile_10_retirement_year}-${result.percentile_90_retirement_year}`
                            : `Range: $${result.percentile_10_final_income?.toLocaleString()}-$${result.percentile_90_final_income?.toLocaleString()}`
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold">AI Analysis & Recommendations</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Key Insights</h3>
                    <ul className="space-y-2">
                      {results.ai_analysis.key_insights.map((insight, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-sm text-gray-700">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Risk Considerations</h3>
                    <ul className="space-y-2">
                      {results.ai_analysis.risk_considerations.map((risk, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-sm text-gray-700">{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="md:col-span-2">
                    <h3 className="font-medium text-gray-900 mb-3">Next Steps</h3>
                    <ul className="space-y-2">
                      {results.ai_analysis.next_steps.map((step, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-sm text-gray-700">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <strong>Recommended Strategy:</strong> {results.ai_analysis.recommended_strategy}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}