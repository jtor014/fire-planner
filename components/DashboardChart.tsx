import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface ProjectionPoint {
  year: number
  age: number
  netWorth: number
  superBalance: number
  fireProgress: number
}

interface DashboardChartProps {
  projectionData: ProjectionPoint[]
  targetFireAmount: number
}

export default function DashboardChart({ projectionData, targetFireAmount }: DashboardChartProps) {
  const data = {
    labels: projectionData.map(point => `Age ${point.age}`),
    datasets: [
      {
        label: 'Net Worth',
        data: projectionData.map(point => point.netWorth),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
      {
        label: 'Super Balance',
        data: projectionData.map(point => point.superBalance),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
      },
      {
        label: 'FIRE Target',
        data: projectionData.map(() => targetFireAmount),
        borderColor: 'rgb(255, 205, 86)',
        backgroundColor: 'rgba(255, 205, 86, 0.2)',
        borderDash: [5, 5],
        tension: 0.1,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Net Worth Projection',
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y
            return `${context.dataset.label}: $${value.toLocaleString()}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + (value / 1000).toFixed(0) + 'k'
          }
        }
      }
    },
  }

  const fireAchievementPoint = projectionData.find(point => point.netWorth >= targetFireAmount)

  return (
    <div className="w-full">
      <div className="mb-4">
        <Line data={data} options={options} />
      </div>
      
      {fireAchievementPoint && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800">FIRE Achievement Projected!</h3>
          <p className="text-green-700">
            Based on this scenario, you could achieve FIRE by age {fireAchievementPoint.age} 
            (in {fireAchievementPoint.year} years) with a net worth of ${fireAchievementPoint.netWorth.toLocaleString()}.
          </p>
        </div>
      )}
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800">Current Progress</h4>
          <p className="text-2xl font-bold text-blue-900">
            {projectionData[0]?.fireProgress.toFixed(1)}%
          </p>
          <p className="text-blue-700">of FIRE target</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-semibold text-purple-800">10-Year Projection</h4>
          <p className="text-2xl font-bold text-purple-900">
            ${projectionData[10]?.netWorth.toLocaleString() || 'N/A'}
          </p>
          <p className="text-purple-700">net worth</p>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg">
          <h4 className="font-semibold text-orange-800">20-Year Projection</h4>
          <p className="text-2xl font-bold text-orange-900">
            ${projectionData[20]?.netWorth.toLocaleString() || 'N/A'}
          </p>
          <p className="text-orange-700">net worth</p>
        </div>
      </div>
    </div>
  )
}