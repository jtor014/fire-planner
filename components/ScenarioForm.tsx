import React, { useState } from 'react'

interface ScenarioData {
  name: string
  description: string
  employment_status: 'full_time' | 'part_time' | 'retired'
  income_reduction: number
  lump_sum_amount: number
  lump_sum_allocation: 'mortgage' | 'super' | 'investment' | 'mixed'
  property_action: 'keep' | 'sell'
  target_fire_amount: number
}

interface ScenarioFormProps {
  onSubmit: (scenario: ScenarioData) => Promise<void>
  initialData?: Partial<ScenarioData>
  isLoading?: boolean
}

export default function ScenarioForm({ onSubmit, initialData, isLoading }: ScenarioFormProps) {
  const [formData, setFormData] = useState<ScenarioData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    employment_status: initialData?.employment_status || 'full_time',
    income_reduction: initialData?.income_reduction || 0,
    lump_sum_amount: initialData?.lump_sum_amount || 0,
    lump_sum_allocation: initialData?.lump_sum_allocation || 'mortgage',
    property_action: initialData?.property_action || 'keep',
    target_fire_amount: initialData?.target_fire_amount || 1250000,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const handleChange = (field: keyof ScenarioData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scenario Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Semi-retirement at 50"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employment Status
          </label>
          <select
            value={formData.employment_status}
            onChange={(e) => handleChange('employment_status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Describe this scenario..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Income Reduction (%)
          </label>
          <input
            type="number"
            value={formData.income_reduction}
            onChange={(e) => handleChange('income_reduction', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            max="100"
            step="5"
          />
          <p className="text-sm text-gray-500 mt-1">
            Percentage reduction from current income
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            FIRE Target Amount ($)
          </label>
          <input
            type="number"
            value={formData.target_fire_amount}
            onChange={(e) => handleChange('target_fire_amount', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="50000"
          />
          <p className="text-sm text-gray-500 mt-1">
            Target net worth for financial independence
          </p>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Lump Sum Allocation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lump Sum Amount ($)
            </label>
            <input
              type="number"
              value={formData.lump_sum_amount}
              onChange={(e) => handleChange('lump_sum_amount', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="10000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allocation Strategy
            </label>
            <select
              value={formData.lump_sum_allocation}
              onChange={(e) => handleChange('lump_sum_allocation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="mortgage">Pay Down Mortgage</option>
              <option value="super">Additional Super Contribution</option>
              <option value="investment">Investment Portfolio</option>
              <option value="mixed">Mixed Strategy (50/50)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Property Strategy</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Property Action
          </label>
          <select
            value={formData.property_action}
            onChange={(e) => handleChange('property_action', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="keep">Keep Property</option>
            <option value="sell">Sell Property</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            {formData.property_action === 'keep' 
              ? 'Continue receiving rental income and capital growth'
              : 'Sell property and invest proceeds in other assets'
            }
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create Scenario'}
        </button>
      </div>
    </form>
  )
}