import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
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

interface ProjectionData {
  median_retirement_year?: number
  percentile_10_retirement_year?: number
  percentile_90_retirement_year?: number
  median_final_income?: number
  percentile_10_final_income?: number
  percentile_90_final_income?: number
  yearly_projections: YearlyProjection[]
  distribution_data: any
  success_rate: number
}

interface YearlyProjection {
  year: number
  combined_balance_median: number
  combined_balance_p10: number
  combined_balance_p90: number
  sustainable_income_median: number
  sustainable_income_p10: number
  sustainable_income_p90: number
}

interface ScenarioInfo {
  name: string
  mode: 'target_income' | 'target_date'
  target_annual_income?: number
  target_retirement_date?: string
  monte_carlo_runs: number
}

interface BaselineInfo {
  person1_name: string
  person2_name: string
  combined_balance: number
  combined_contributions: number
}

export default function SuperProjection() {
  const router = useRouter()
  const { scenario } = router.query
  
  const [projectionData, setProjectionData] = useState<ProjectionData | null>(null)
  const [scenarioInfo, setScenarioInfo] = useState<ScenarioInfo | null>(null)
  const [baselineInfo, setBaselineInfo] = useState<BaselineInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [chartType, setChartType] = useState<'balance' | 'income'>('balance')
  const [cached, setCached] = useState(false)

  useEffect(() => {
    if (scenario) {
      fetchProjection()
    }
  }, [scenario])

  const fetchProjection = async () => {
    try {
      const response = await fetch(`/api/super/projection?scenario_id=${scenario}`)
      if (!response.ok) throw new Error('Failed to fetch projection')
      
      const result = await response.json()
      if (result.success) {
        setProjectionData(result.data)
        setScenarioInfo(result.scenario)
        setBaselineInfo(result.baseline)
        setCached(result.cached || false)
      } else {
        setError(result.error)
      }
    } catch (error) {
      console.error('Failed to fetch projection:', error)
      setError('Failed to load projection data')
    } finally {
      setLoading(false)
    }
  }

  const getChartData = () => {
    if (!projectionData?.yearly_projections) return null

    const projections = projectionData.yearly_projections
    const years = projections.map(p => p.year)

    if (chartType === 'balance') {
      return {
        labels: years,
        datasets: [
          {
            label: 'Combined Super Balance (Median)',
            data: projections.map(p => p.combined_balance_median),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: false,
            tension: 0.1,
          },
          {
            label: '90th Percentile',
            data: projections.map(p => p.combined_balance_p90),
            borderColor: 'rgba(34, 197, 94, 0.5)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: '+1',
            tension: 0.1,
            pointRadius: 0,
          },
          {
            label: '10th Percentile',
            data: projections.map(p => p.combined_balance_p10),
            borderColor: 'rgba(239, 68, 68, 0.5)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: false,
            tension: 0.1,
            pointRadius: 0,
          }
        ]
      }
    } else {
      return {
        labels: years,
        datasets: [
          {
            label: 'Sustainable Income (Median)',
            data: projections.map(p => p.sustainable_income_median),
            borderColor: 'rgb(147, 51, 234)',
            backgroundColor: 'rgba(147, 51, 234, 0.1)',
            fill: false,
            tension: 0.1,
          },
          {
            label: '90th Percentile',
            data: projections.map(p => p.sustainable_income_p90),
            borderColor: 'rgba(34, 197, 94, 0.5)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: '+1',
            tension: 0.1,
            pointRadius: 0,
          },
          {
            label: '10th Percentile',
            data: projections.map(p => p.sustainable_income_p10),
            borderColor: 'rgba(239, 68, 68, 0.5)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: false,
            tension: 0.1,
            pointRadius: 0,
          }
        ]
      }
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
        text: chartType === 'balance' ? 'Super Balance Projections' : 'Sustainable Income Projections'
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
        display: true,
        title: {
          display: true,
          text: chartType === 'balance' ? 'Super Balance ($)' : 'Annual Income ($)'
        },
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString()
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Running Monte Carlo simulation...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Projection</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/super-scenarios"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Scenarios
          </Link>
        </div>
      </div>
    )
  }

  const chartData = getChartData()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/super-scenarios" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Scenarios
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Monte Carlo Projection</h1>
              <p className="text-gray-600 mt-2">{scenarioInfo?.name}</p>
              {cached && (
                <p className="text-sm text-green-600 mt-1">📊 Using cached results</p>
              )}
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setChartType('balance')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  chartType === 'balance' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Balance
              </button>
              <button
                onClick={() => setChartType('income')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  chartType === 'income' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Income
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Scenario Mode</h3>
            <div className="text-lg font-semibold text-gray-900">
              {scenarioInfo?.mode === 'target_income' ? 'Target Income' : 'Target Date'}
            </div>
            <div className="text-sm text-gray-500">
              {scenarioInfo?.mode === 'target_income' 
                ? `$${scenarioInfo.target_annual_income?.toLocaleString()}/year`
                : new Date(scenarioInfo?.target_retirement_date || '').getFullYear()
              }
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Success Rate</h3>
            <div className="text-2xl font-bold text-gray-900">
              {projectionData?.success_rate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">
              {scenarioInfo?.monte_carlo_runs.toLocaleString()} simulations
            </div>
          </div>

          {scenarioInfo?.mode === 'target_income' && projectionData?.median_retirement_year && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Retirement Year</h3>
              <div className="text-2xl font-bold text-gray-900">
                {projectionData.median_retirement_year}
              </div>
              <div className="text-sm text-gray-500">
                {projectionData.percentile_10_retirement_year} - {projectionData.percentile_90_retirement_year} (10th-90th)
              </div>
            </div>
          )}

          {scenarioInfo?.mode === 'target_date' && projectionData?.median_final_income && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Sustainable Income</h3>
              <div className="text-lg font-bold text-gray-900">
                ${projectionData.median_final_income.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                ${projectionData.percentile_10_final_income?.toLocaleString()} - ${projectionData.percentile_90_final_income?.toLocaleString()} (10th-90th)
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Starting Position</h3>
            <div className="text-lg font-bold text-gray-900">
              ${baselineInfo?.combined_balance.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              ${baselineInfo?.combined_contributions.toLocaleString()}/year contributions
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Projection Chart</h2>
            <p className="text-sm text-gray-600 mt-1">
              Shaded area shows confidence interval (10th to 90th percentile)
            </p>
          </div>
          <div className="p-6">
            {chartData && (
              <div style={{ height: '400px' }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            )}
          </div>
        </div>

        {/* Key Insights */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Key Insights</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Baseline Assumptions</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{baselineInfo?.person1_name} & {baselineInfo?.person2_name}</span>
                    <span>Starting Super</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Combined Balance</span>
                    <span className="font-medium">${baselineInfo?.combined_balance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Annual Contributions</span>
                    <span className="font-medium">${baselineInfo?.combined_contributions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Simulation Runs</span>
                    <span className="font-medium">{scenarioInfo?.monte_carlo_runs.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Risk Assessment</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success Rate</span>
                    <span className={`font-medium ${
                      (projectionData?.success_rate || 0) >= 80 ? 'text-green-600' :
                      (projectionData?.success_rate || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {projectionData?.success_rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {(projectionData?.success_rate || 0) >= 80 && "High confidence in achieving goals"}
                    {(projectionData?.success_rate || 0) >= 60 && (projectionData?.success_rate || 0) < 80 && "Moderate confidence - consider risk management"}
                    {(projectionData?.success_rate || 0) < 60 && "Low confidence - review strategy and assumptions"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}