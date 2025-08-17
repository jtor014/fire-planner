import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { generateWithdrawalStrategies, recommendOptimalStrategy, SuperAccount, WithdrawalStrategy } from '@/lib/super-tax-optimization'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface SuperSpendSettings {
  // Starting position at preservation age
  person1_name: string
  person1_balance: number
  person1_preservation_age: number
  person1_current_age: number
  person1_tax_free_component: number
  
  person2_name: string
  person2_balance: number
  person2_preservation_age: number
  person2_current_age: number
  person2_tax_free_component: number
  
  // Strategy & Tax Optimization
  withdrawal_strategy: 'sequential' | 'proportional' | 'optimize_tax' | 'longevity_optimized'
  enable_tax_optimization: boolean
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive'
  life_expectancy: number
  annual_expenses: number
  
  // Market assumptions
  return_rate: number
  volatility: number
  inflation_rate: number
}

interface SpendZeroProjection {
  annual_withdrawal: number
  withdrawal_real_value: number
  final_year: number
  strategy_description: string
  yearly_projections: Array<{
    year: number
    age: number
    person1_balance: number
    person2_balance: number
    combined_balance: number
    annual_withdrawal: number
    real_purchasing_power: number
  }>
  risk_analysis: {
    success_probability: number
    worst_case_scenario: string
    recommendations: string[]
  }
}

export default function SuperSpendZero() {
  const router = useRouter()
  
  const [settings, setSettings] = useState<SuperSpendSettings>({
    person1_name: 'Person 1',
    person1_balance: 800000,
    person1_preservation_age: 60,
    person1_current_age: 60,
    person1_tax_free_component: 600000, // 75% tax-free
    
    person2_name: 'Person 2',
    person2_balance: 750000,
    person2_preservation_age: 60,
    person2_current_age: 58,
    person2_tax_free_component: 450000, // 60% tax-free
    
    withdrawal_strategy: 'optimize_tax',
    enable_tax_optimization: true,
    risk_tolerance: 'moderate',
    life_expectancy: 95,
    annual_expenses: 80000,
    
    return_rate: 7,
    volatility: 12,
    inflation_rate: 2.5
  })

  const [projection, setProjection] = useState<SpendZeroProjection | null>(null)
  const [loading, setLoading] = useState(false)
  const [withdrawalStrategies, setWithdrawalStrategies] = useState<WithdrawalStrategy[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<WithdrawalStrategy | null>(null)

  // Load parameters from URL (from Pre-60 calculator)
  useEffect(() => {
    if (router.query.person1_balance) {
      setSettings(prev => ({
        ...prev,
        person1_balance: Number(router.query.person1_balance) || prev.person1_balance,
        person2_balance: Number(router.query.person2_balance) || prev.person2_balance,
        annual_expenses: Number(router.query.annual_expenses) || prev.annual_expenses
      }))
    }
  }, [router.query])

  const calculateProjection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/super-spend-zero/projection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        const result = await response.json()
        setProjection(result.data)
      }
    } catch (error) {
      console.error('Projection failed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    calculateProjection()
  }, [settings])

  const handleInputChange = (field: keyof SuperSpendSettings, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? (isNaN(Number(value)) ? value : Number(value)) : value
    }))
  }

  const generateTaxOptimizationStrategies = () => {
    if (!settings.enable_tax_optimization) return []

    const accounts: SuperAccount[] = [
      {
        owner: settings.person1_name,
        balance: settings.person1_balance,
        preservation_age: settings.person1_preservation_age,
        current_age: settings.person1_current_age,
        tax_free_component: settings.person1_tax_free_component,
        taxable_component: settings.person1_balance - settings.person1_tax_free_component,
        pension_phase_eligible: settings.person1_current_age >= settings.person1_preservation_age
      },
      {
        owner: settings.person2_name,
        balance: settings.person2_balance,
        preservation_age: settings.person2_preservation_age,
        current_age: settings.person2_current_age,
        tax_free_component: settings.person2_tax_free_component,
        taxable_component: settings.person2_balance - settings.person2_tax_free_component,
        pension_phase_eligible: settings.person2_current_age >= settings.person2_preservation_age
      }
    ]

    const retirementYears = settings.life_expectancy - Math.max(settings.person1_current_age, settings.person2_current_age)
    
    return generateWithdrawalStrategies(
      accounts,
      settings.annual_expenses,
      retirementYears,
      settings.annual_expenses
    )
  }

  // Generate strategies when settings change
  useEffect(() => {
    if (settings.enable_tax_optimization) {
      const strategies = generateTaxOptimizationStrategies()
      setWithdrawalStrategies(strategies)
      
      if (strategies.length > 0) {
        const optimal = recommendOptimalStrategy(
          strategies,
          settings.life_expectancy - Math.max(settings.person1_current_age, settings.person2_current_age),
          settings.risk_tolerance
        )
        setSelectedStrategy(optimal)
      }
    }
  }, [settings])

  const getChartData = () => {
    if (!projection?.yearly_projections) return null

    const projections = projection.yearly_projections
    const years = projections.map(p => p.year)

    return {
      labels: years,
      datasets: [
        {
          label: 'Combined Super Balance',
          data: projections.map(p => p.combined_balance),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: false,
          tension: 0.1,
        },
        {
          label: 'Annual Withdrawal (Real Value)',
          data: projections.map(p => p.real_purchasing_power),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: false,
          tension: 0.1,
          yAxisID: 'y1',
        }
      ]
    }
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Spend-to-Zero Projection'
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || ''
            if (label) {
              label += ': '
            }
            if (context.parsed.y !== null) {
              label += '$' + context.parsed.y.toLocaleString()
            }
            return label
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Year'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Super Balance ($)'
        },
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString()
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Annual Income ($)'
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString()
          }
        }
      },
    },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Super Spend-to-Zero Calculator</h1>
              <p className="text-gray-600 mt-2">Optimize withdrawal strategy to exhaust super by life expectancy</p>
            </div>
            <Link
              href="/pre60-fire"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              ← Pre-60 Calculator
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="space-y-6">
            {/* Super Balances */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Super Balances at Age 60</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Person 1 Name</label>
                  <input
                    type="text"
                    value={settings.person1_name}
                    onChange={(e) => handleInputChange('person1_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Balance</label>
                    <input
                      type="number"
                      value={settings.person1_balance}
                      onChange={(e) => handleInputChange('person1_balance', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preservation Age</label>
                    <input
                      type="number"
                      value={settings.person1_preservation_age}
                      onChange={(e) => handleInputChange('person1_preservation_age', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Person 2 Name</label>
                  <input
                    type="text"
                    value={settings.person2_name}
                    onChange={(e) => handleInputChange('person2_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Balance</label>
                    <input
                      type="number"
                      value={settings.person2_balance}
                      onChange={(e) => handleInputChange('person2_balance', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preservation Age</label>
                    <input
                      type="number"
                      value={settings.person2_preservation_age}
                      onChange={(e) => handleInputChange('person2_preservation_age', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-blue-900">Combined Total:</span>
                    <span className="text-xl font-bold text-blue-900">
                      ${(settings.person1_balance + settings.person2_balance).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Withdrawal Strategy */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Withdrawal Strategy & Tax Optimization</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">Enable Advanced Tax Optimization</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enable_tax_optimization}
                        onChange={(e) => handleInputChange('enable_tax_optimization', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <select
                    value={settings.withdrawal_strategy}
                    onChange={(e) => handleInputChange('withdrawal_strategy', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="sequential">Sequential (Drain one account first)</option>
                    <option value="proportional">Proportional (Draw from both equally)</option>
                    <option value="optimize_tax">Tax Optimized (Smart sequencing)</option>
                    <option value="longevity_optimized">Longevity Optimized (Preserve best account)</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    {settings.withdrawal_strategy === 'sequential' && 'Exhaust one super account completely before touching the other'}
                    {settings.withdrawal_strategy === 'proportional' && 'Withdraw proportionally from both accounts'}
                    {settings.withdrawal_strategy === 'optimize_tax' && 'Optimize for tax efficiency and preservation rules'}
                    {settings.withdrawal_strategy === 'longevity_optimized' && 'Preserve the account with better tax treatment for longer retirement'}
                  </p>
                </div>

                {/* Tax Optimization Settings */}
                {settings.enable_tax_optimization && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-3">Tax Optimization Settings</h3>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Risk Tolerance</label>
                        <select
                          value={settings.risk_tolerance}
                          onChange={(e) => handleInputChange('risk_tolerance', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                          <option value="conservative">Conservative</option>
                          <option value="moderate">Moderate</option>
                          <option value="aggressive">Aggressive</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Person 1 Tax-Free %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={Math.round((settings.person1_tax_free_component / settings.person1_balance) * 100)}
                          onChange={(e) => {
                            const percent = Number(e.target.value) / 100
                            handleInputChange('person1_tax_free_component', settings.person1_balance * percent)
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Person 2 Tax-Free %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={Math.round((settings.person2_tax_free_component / settings.person2_balance) * 100)}
                          onChange={(e) => {
                            const percent = Number(e.target.value) / 100
                            handleInputChange('person2_tax_free_component', settings.person2_balance * percent)
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                    
                    <p className="text-xs text-blue-700 mt-2">
                      Tax-free component is typically contributions made after age 60 or amounts rolled over from other super funds.
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Life Expectancy</label>
                    <input
                      type="number"
                      value={settings.life_expectancy}
                      onChange={(e) => handleInputChange('life_expectancy', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Annual Expenses</label>
                    <input
                      type="number"
                      value={settings.annual_expenses}
                      onChange={(e) => handleInputChange('annual_expenses', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Market Assumptions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Market Assumptions</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Return Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.return_rate}
                      onChange={(e) => handleInputChange('return_rate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Volatility (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.volatility}
                      onChange={(e) => handleInputChange('volatility', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inflation (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.inflation_rate}
                      onChange={(e) => handleInputChange('inflation_rate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {loading ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Calculating optimal withdrawal strategy...</p>
                </div>
              </div>
            ) : projection ? (
              <>
                {/* Key Metrics */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Optimal Withdrawal Strategy</h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">${projection.annual_withdrawal.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Annual Withdrawal</div>
                      <div className="text-xs text-gray-500">(Starting amount)</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">${projection.withdrawal_real_value.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Real Purchasing Power</div>
                      <div className="text-xs text-gray-500">(Today's dollars)</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Exhaustion Year:</span>
                      <span className="font-semibold">{projection.final_year}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-700">{projection.strategy_description}</p>
                  </div>
                </div>

                {/* Risk Analysis */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Risk Analysis</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Success Probability:</span>
                      <span className={`font-bold ${
                        projection.risk_analysis.success_probability >= 90 ? 'text-green-600' :
                        projection.risk_analysis.success_probability >= 70 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {projection.risk_analysis.success_probability}%
                      </span>
                    </div>
                    
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-1">Worst Case Scenario:</h4>
                      <p className="text-sm text-yellow-700">{projection.risk_analysis.worst_case_scenario}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Recommendations:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {projection.risk_analysis.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Tax Optimization Strategies */}
                {settings.enable_tax_optimization && withdrawalStrategies.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Tax Optimization Strategies</h3>
                    
                    {selectedStrategy && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-green-900 mb-2">
                          🎯 Recommended: {selectedStrategy.name}
                        </h4>
                        <p className="text-sm text-green-700 mb-2">{selectedStrategy.description}</p>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-green-700">Tax Efficiency:</span>
                            <span className="font-semibold text-green-900 ml-2">{selectedStrategy.tax_efficiency_score}/10</span>
                          </div>
                          <div>
                            <span className="text-green-700">Total Tax:</span>
                            <span className="font-semibold text-green-900 ml-2">${selectedStrategy.total_tax_over_retirement.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-green-700">Annual Tax:</span>
                            <span className="font-semibold text-green-900 ml-2">${selectedStrategy.average_annual_tax.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <h5 className="font-medium text-gray-900">All Available Strategies:</h5>
                      {withdrawalStrategies.map((strategy, index) => (
                        <div 
                          key={index} 
                          className={`border rounded-lg p-4 ${
                            selectedStrategy?.name === strategy.name 
                              ? 'border-green-300 bg-green-50' 
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h6 className="font-medium text-gray-900">{strategy.name}</h6>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-600">
                                Tax Score: {strategy.tax_efficiency_score}/10
                              </span>
                              {selectedStrategy?.name === strategy.name && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                  Recommended
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{strategy.description}</p>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2 block">Benefits:</h4>
                              <ul className="text-xs text-green-700 space-y-1">
                                {strategy.benefits.map((benefit, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-green-600 mr-1">✓</span>
                                    <span>{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2 block">Considerations:</h4>
                              <ul className="text-xs text-orange-700 space-y-1">
                                {strategy.drawbacks.map((drawback, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-orange-600 mr-1">⚠</span>
                                    <span>{drawback}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Withdrawal Sequence */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2 block">Withdrawal Sequence:</h4>
                            <div className="space-y-2">
                              {strategy.sequence.map((seq, seqIdx) => (
                                <div key={seqIdx} className="text-xs">
                                  <span className="font-medium text-gray-900">{seq.account_owner}:</span>
                                  <span className="text-gray-600 ml-2">
                                    ${seq.annual_amounts[0]?.toLocaleString()}/year for {seq.years.length} years
                                  </span>
                                  <span className="text-gray-500 ml-2">
                                    (Tax: ${seq.cumulative_tax.toLocaleString()})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedStrategy(strategy)}
                            className={`mt-3 px-3 py-1 rounded text-sm font-medium transition-colors ${
                              selectedStrategy?.name === strategy.name
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {selectedStrategy?.name === strategy.name ? 'Selected' : 'Select Strategy'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chart */}
                {getChartData() && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Projection Chart</h3>
                    <div style={{ height: '400px' }}>
                      <Line data={getChartData()!} options={chartOptions} />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-center">Enter your super balances to see withdrawal strategy</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}