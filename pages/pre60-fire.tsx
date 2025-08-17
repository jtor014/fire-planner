import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { calculatePreservationAge, getPreservationAgeDescription, getPreservationAgeExplanation, validateBirthYear } from '@/lib/preservation-age'
import { LumpSumEvent, generateEventId, validateLumpSumEvent, calculateExpectedValue, calculateGuaranteedValue, getEventSourceDescription, getTaxTreatmentDescription, calculateTaxImpact } from '@/lib/lump-sum-events'
import { generateStrategicPlan, StrategicAllocationPlan } from '@/lib/strategic-allocation'
import { createDefaultBridgeSources, generateBridgeIncomeStrategy, BridgeIncomeStrategy, IncomeSource } from '@/lib/bridge-income-modeling'
import { createSampleRentalProperty, projectRentalPortfolio, RentalProperty, PortfolioProjection } from '@/lib/rental-income-modeling'
import { WITHDRAWAL_RULES, generateMarketScenarios, compareWithdrawalStrategies, DynamicWithdrawalStrategy, WithdrawalRule } from '@/lib/dynamic-withdrawal-rates'
import { runMonteCarloSimulation, createDefaultMonteCarloSettings, createDefaultMarketAssumptions, MonteCarloResults, MonteCarloSettings, MarketAssumptions, getWithdrawalStrategyDescription, getSuccessRateColor } from '@/lib/monte-carlo-fire'

interface Person {
  name: string
  birth_year: number
  current_age: number
  target_fire_age: number
  preservation_age: number
  current_super: number
  annual_contributions: number
  will_keep_working: boolean
  ongoing_salary?: number
}

interface Pre60FireSettings {
  // Enhanced person management
  person1: Person
  person2: Person
  
  // Household configuration
  household_type: 'both_fire' | 'staggered' | 'single_fire' | 'lump_sum_bridge'
  household_expenses: number
  single_person_expenses: number
  
  // Bridge funding - Enhanced with multi-event timeline
  lump_sum_available: number // Legacy field for simple mode
  lump_sum_events: LumpSumEvent[] // New multi-event timeline
  use_advanced_lump_sum: boolean // Toggle between simple and advanced mode
  part_time_income: number
  investment_income: number
  
  // Enhanced Bridge Income
  bridge_income_sources: IncomeSource[]
  use_bridge_income_modeling: boolean
  
  // Rental Property Portfolio
  rental_properties: RentalProperty[]
  use_rental_portfolio: boolean
  
  // Market assumptions
  super_return_rate: number
  inflation_rate: number
  
  // Dynamic Withdrawal Rates
  use_dynamic_withdrawal: boolean
  withdrawal_rule: string // Rule name from WITHDRAWAL_RULES
  market_scenario: 'optimistic' | 'expected' | 'pessimistic'
  
  // Monte Carlo Simulation
  use_monte_carlo: boolean
  monte_carlo_runs: number
  asset_allocation_stocks: number // 0-100
  asset_allocation_bonds: number // 0-100
  withdrawal_strategy_mc: 'fixed_real' | 'fixed_nominal' | 'dynamic' | 'floor_ceiling'
}

interface FireProjection {
  is_feasible: boolean
  household_strategy: 'both_fire' | 'staggered' | 'single_fire' | 'lump_sum_bridge'
  
  // Timeline analysis
  first_to_fire: {
    person: string
    age: number
    year: number
    years_until_preservation: number
  }
  second_to_fire?: {
    person: string
    age: number
    year: number
    years_until_preservation: number
  }
  
  // Financial requirements
  total_bridge_years: number
  lump_sum_required: number
  lump_sum_shortfall: number
  annual_household_gap: number
  working_partner_contribution: number
  
  // Super projections at preservation age
  super_at_preservation: {
    person1_balance: number
    person1_preservation_year: number
    person2_balance: number
    person2_preservation_year: number
    combined_balance: number
  }
  
  strategy_description: string
  recommendations: string[]
}

export default function Pre60Fire() {
  const [settings, setSettings] = useState<Pre60FireSettings>({
    person1: {
      name: 'Josh',
      birth_year: 1989, // Age 35
      current_age: 35,
      target_fire_age: 55,
      preservation_age: calculatePreservationAge(1989), // 60
      current_super: 150000,
      annual_contributions: 25000,
      will_keep_working: false,
      ongoing_salary: 80000
    },
    person2: {
      name: 'Nancy', 
      birth_year: 1991, // Age 33
      current_age: 33,
      target_fire_age: 50, // Different FIRE age for staggered retirement
      preservation_age: calculatePreservationAge(1991), // 60
      current_super: 120000,
      annual_contributions: 22000,
      will_keep_working: true, // Nancy keeps working after Josh FIREs
      ongoing_salary: 75000
    },
    
    household_type: 'lump_sum_bridge',
    household_expenses: 80000,
    single_person_expenses: 55000, // Reduced expenses for single person
    
    lump_sum_available: 500000,
    lump_sum_events: [
      {
        id: generateEventId(),
        name: 'Property Sale',
        amount: 400000,
        date: new Date(2029, 5, 1), // June 2029
        probability: 90,
        source: 'property_sale',
        tax_treatment: 'capital_gains',
        notes: 'Investment property sale'
      },
      {
        id: generateEventId(),
        name: 'Inheritance',
        amount: 150000,
        date: new Date(2032, 0, 1), // January 2032
        probability: 70,
        source: 'inheritance',
        tax_treatment: 'tax_free',
        notes: 'Expected family inheritance'
      }
    ],
    use_advanced_lump_sum: false, // Start with simple mode
    part_time_income: 0,
    investment_income: 0,
    
    // Enhanced Bridge Income
    bridge_income_sources: createDefaultBridgeSources(new Date().getFullYear() + 1),
    use_bridge_income_modeling: false,
    
    // Rental Portfolio
    rental_properties: [createSampleRentalProperty('rental-1')],
    use_rental_portfolio: false,
    
    super_return_rate: 7,
    inflation_rate: 2.5,
    
    // Dynamic Withdrawal Settings
    use_dynamic_withdrawal: false,
    withdrawal_rule: 'Moderate Dynamic',
    market_scenario: 'expected',
    
    // Monte Carlo Settings
    use_monte_carlo: false,
    monte_carlo_runs: 1000,
    asset_allocation_stocks: 60,
    asset_allocation_bonds: 30,
    withdrawal_strategy_mc: 'fixed_real'
  })

  const [projection, setProjection] = useState<FireProjection | null>(null)
  const [loading, setLoading] = useState(false)
  const [bridgeIncomeStrategy, setBridgeIncomeStrategy] = useState<BridgeIncomeStrategy | null>(null)
  const [rentalPortfolioProjection, setRentalPortfolioProjection] = useState<PortfolioProjection | null>(null)
  const [withdrawalStrategies, setWithdrawalStrategies] = useState<DynamicWithdrawalStrategy[]>([])
  const [selectedWithdrawalStrategy, setSelectedWithdrawalStrategy] = useState<DynamicWithdrawalStrategy | null>(null)
  const [monteCarloResults, setMonteCarloResults] = useState<MonteCarloResults | null>(null)
  const [monteCarloLoading, setMonteCarloLoading] = useState(false)

  const calculateProjection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/pre60-fire/projection', {
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
    
    // Calculate bridge income strategy if enabled
    if (settings.use_bridge_income_modeling && settings.bridge_income_sources.length > 0) {
      const bridgeYears = Math.max(
        settings.person1.target_fire_age - settings.person1.current_age,
        settings.person2.target_fire_age - settings.person2.current_age
      )
      const currentYear = new Date().getFullYear()
      const strategy = generateBridgeIncomeStrategy(
        settings.bridge_income_sources,
        currentYear + 1,
        currentYear + bridgeYears
      )
      setBridgeIncomeStrategy(strategy)
    } else {
      setBridgeIncomeStrategy(null)
    }
    
    // Calculate rental portfolio projection if enabled
    if (settings.use_rental_portfolio && settings.rental_properties.length > 0) {
      const bridgeYears = Math.max(
        settings.person1.target_fire_age - settings.person1.current_age,
        settings.person2.target_fire_age - settings.person2.current_age
      )
      const portfolioProjection = projectRentalPortfolio(
        settings.rental_properties,
        bridgeYears + 10 // Project beyond FIRE for full picture
      )
      setRentalPortfolioProjection(portfolioProjection)
    } else {
      setRentalPortfolioProjection(null)
    }
    
    // Calculate dynamic withdrawal strategies if enabled
    if (settings.use_dynamic_withdrawal && projection) {
      const totalSuperAtPreservation = projection.super_at_preservation.person1_balance + 
                                       projection.super_at_preservation.person2_balance
      
      const retirementYears = 35 // Project 35 years of retirement
      const marketScenarios = generateMarketScenarios(
        retirementYears,
        settings.super_return_rate / 100,
        settings.inflation_rate / 100
      )
      
      const selectedScenario = marketScenarios[settings.market_scenario]
      const strategies = compareWithdrawalStrategies(
        totalSuperAtPreservation,
        settings.household_expenses,
        selectedScenario
      )
      
      setWithdrawalStrategies(strategies)
      
      // Find the selected strategy or default to best one
      const selectedStrategy = strategies.find(s => s.rule.name === settings.withdrawal_rule) || strategies[0]
      setSelectedWithdrawalStrategy(selectedStrategy)
    } else {
      setWithdrawalStrategies([])
      setSelectedWithdrawalStrategy(null)
    }
    
    // Run Monte Carlo simulation if enabled
    if (settings.use_monte_carlo && projection && !monteCarloLoading) {
      setMonteCarloLoading(true)
      
      const totalSuperAtPreservation = projection.super_at_preservation.person1_balance + 
                                       projection.super_at_preservation.person2_balance
      
      // Create Monte Carlo settings
      const mcSettings = createDefaultMonteCarloSettings(totalSuperAtPreservation, settings.household_expenses)
      mcSettings.simulation_runs = settings.monte_carlo_runs
      mcSettings.withdrawal_strategy = settings.withdrawal_strategy_mc
      mcSettings.asset_allocation = {
        stocks: settings.asset_allocation_stocks / 100,
        bonds: settings.asset_allocation_bonds / 100,
        cash: (100 - settings.asset_allocation_stocks - settings.asset_allocation_bonds) / 100
      }
      
      const marketAssumptions = createDefaultMarketAssumptions()
      marketAssumptions.mean_return = settings.super_return_rate / 100
      marketAssumptions.inflation_mean = settings.inflation_rate / 100
      
      // Run simulation asynchronously to avoid blocking UI
      setTimeout(() => {
        try {
          const results = runMonteCarloSimulation(mcSettings, marketAssumptions)
          setMonteCarloResults(results)
        } catch (error) {
          console.error('Monte Carlo simulation failed:', error)
          setMonteCarloResults(null)
        } finally {
          setMonteCarloLoading(false)
        }
      }, 100)
    } else if (!settings.use_monte_carlo) {
      setMonteCarloResults(null)
      setMonteCarloLoading(false)
    }
  }, [settings, projection, monteCarloLoading])

  const handleInputChange = (field: keyof Pre60FireSettings, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? (isNaN(Number(value)) ? value : Number(value)) : value
    }))
  }

  const handlePersonChange = (personKey: 'person1' | 'person2', field: keyof Person, value: string | number | boolean) => {
    setSettings(prev => {
      const updatedPerson = {
        ...prev[personKey],
        [field]: typeof value === 'string' ? (isNaN(Number(value)) ? value : Number(value)) : value
      }
      
      // Auto-calculate preservation age when birth year changes
      if (field === 'birth_year' && typeof value === 'number') {
        updatedPerson.preservation_age = calculatePreservationAge(value)
      }
      
      return {
        ...prev,
        [personKey]: updatedPerson
      }
    })
  }

  const getBirthYearValidation = (birthYear: number) => {
    const validation = validateBirthYear(birthYear)
    return validation
  }

  const addLumpSumEvent = () => {
    const newEvent: LumpSumEvent = {
      id: generateEventId(),
      name: 'New Event',
      amount: 100000,
      date: new Date(new Date().getFullYear() + 5, 0, 1), // 5 years from now
      probability: 100,
      source: 'other',
      tax_treatment: 'tax_free',
      notes: ''
    }
    
    setSettings(prev => ({
      ...prev,
      lump_sum_events: [...prev.lump_sum_events, newEvent]
    }))
  }

  const updateLumpSumEvent = (eventId: string, updates: Partial<LumpSumEvent>) => {
    setSettings(prev => ({
      ...prev,
      lump_sum_events: prev.lump_sum_events.map(event => 
        event.id === eventId ? { ...event, ...updates } : event
      )
    }))
  }

  const removeLumpSumEvent = (eventId: string) => {
    setSettings(prev => ({
      ...prev,
      lump_sum_events: prev.lump_sum_events.filter(event => event.id !== eventId)
    }))
  }

  const calculateTotalLumpSum = () => {
    if (!settings.use_advanced_lump_sum) {
      return settings.lump_sum_available
    }
    
    // Use expected value for advanced mode
    return calculateExpectedValue(settings.lump_sum_events)
  }

  const generateStrategicRecommendations = (): StrategicAllocationPlan | null => {
    if (!settings.use_advanced_lump_sum || settings.lump_sum_events.length === 0 || !projection) {
      return null
    }

    return generateStrategicPlan(
      settings.lump_sum_events,
      settings.household_expenses,
      projection.total_bridge_years,
      settings.person1.current_super + settings.person2.current_super,
      0, // existingDebt - could add this as a future enhancement
      projection.lump_sum_shortfall > 0 ? projection.lump_sum_required : 0
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pre-60 FIRE Calculator</h1>
              <p className="text-gray-600 mt-2">Plan your early retirement bridge strategy until super access at preservation age</p>
            </div>
            <Link
              href="/super-spend-zero"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Super Calculator →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="space-y-6">
            {/* People Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">People</h2>
              
              {/* Person 1 */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Person 1 Name</label>
                  <input
                    type="text"
                    value={settings.person1.name}
                    onChange={(e) => handlePersonChange('person1', 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birth Year</label>
                    <input
                      type="number"
                      value={settings.person1.birth_year}
                      onChange={(e) => handlePersonChange('person1', 'birth_year', Number(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-md ${
                        getBirthYearValidation(settings.person1.birth_year).isValid 
                          ? 'border-gray-300 focus:border-blue-500' 
                          : 'border-red-300 focus:border-red-500'
                      }`}
                      placeholder="e.g. 1989"
                      min="1940"
                      max={new Date().getFullYear() - 18}
                    />
                    {getBirthYearValidation(settings.person1.birth_year).isValid ? (
                      <div className="mt-1">
                        <p className="text-xs font-medium text-blue-600">{getPreservationAgeDescription(settings.person1.birth_year)}</p>
                        <p className="text-xs text-gray-500">{getPreservationAgeExplanation(settings.person1.birth_year)}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-red-600 mt-1">{getBirthYearValidation(settings.person1.birth_year).error}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Age</label>
                    <input
                      type="number"
                      value={settings.person1.current_age}
                      onChange={(e) => handlePersonChange('person1', 'current_age', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target FIRE Age</label>
                    <input
                      type="number"
                      value={settings.person1.target_fire_age}
                      onChange={(e) => handlePersonChange('person1', 'target_fire_age', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Super Balance</label>
                    <input
                      type="number"
                      value={settings.person1.current_super}
                      onChange={(e) => handlePersonChange('person1', 'current_super', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Annual Contributions</label>
                    <input
                      type="number"
                      value={settings.person1.annual_contributions}
                      onChange={(e) => handlePersonChange('person1', 'annual_contributions', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.person1.will_keep_working}
                        onChange={(e) => handlePersonChange('person1', 'will_keep_working', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Will keep working after FIRE</span>
                    </label>
                  </div>
                  {settings.person1.will_keep_working && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ongoing Salary</label>
                      <input
                        type="number"
                        value={settings.person1.ongoing_salary || 0}
                        onChange={(e) => handlePersonChange('person1', 'ongoing_salary', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Person 2 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Person 2 Name</label>
                  <input
                    type="text"
                    value={settings.person2.name}
                    onChange={(e) => handlePersonChange('person2', 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birth Year</label>
                    <input
                      type="number"
                      value={settings.person2.birth_year}
                      onChange={(e) => handlePersonChange('person2', 'birth_year', Number(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-md ${
                        getBirthYearValidation(settings.person2.birth_year).isValid 
                          ? 'border-gray-300 focus:border-blue-500' 
                          : 'border-red-300 focus:border-red-500'
                      }`}
                      placeholder="e.g. 1991"
                      min="1940"
                      max={new Date().getFullYear() - 18}
                    />
                    {getBirthYearValidation(settings.person2.birth_year).isValid ? (
                      <div className="mt-1">
                        <p className="text-xs font-medium text-blue-600">{getPreservationAgeDescription(settings.person2.birth_year)}</p>
                        <p className="text-xs text-gray-500">{getPreservationAgeExplanation(settings.person2.birth_year)}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-red-600 mt-1">{getBirthYearValidation(settings.person2.birth_year).error}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Age</label>
                    <input
                      type="number"
                      value={settings.person2.current_age}
                      onChange={(e) => handlePersonChange('person2', 'current_age', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target FIRE Age</label>
                    <input
                      type="number"
                      value={settings.person2.target_fire_age}
                      onChange={(e) => handlePersonChange('person2', 'target_fire_age', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Super Balance</label>
                    <input
                      type="number"
                      value={settings.person2.current_super}
                      onChange={(e) => handlePersonChange('person2', 'current_super', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Annual Contributions</label>
                    <input
                      type="number"
                      value={settings.person2.annual_contributions}
                      onChange={(e) => handlePersonChange('person2', 'annual_contributions', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.person2.will_keep_working}
                        onChange={(e) => handlePersonChange('person2', 'will_keep_working', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Will keep working after FIRE</span>
                    </label>
                  </div>
                  {settings.person2.will_keep_working && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ongoing Salary</label>
                      <input
                        type="number"
                        value={settings.person2.ongoing_salary || 0}
                        onChange={(e) => handlePersonChange('person2', 'ongoing_salary', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Household Strategy Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Household Strategy</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Household Retirement Strategy</label>
                  
                  <div className="space-y-3">
                    {[
                      { 
                        value: 'both_fire', 
                        title: 'Both FIRE - Retire Simultaneously',
                        description: 'Both retire at the same time and live off lump sum until super access. Higher expenses but simpler planning.',
                        icon: '👫',
                        suitableFor: 'Couples with similar ages and FIRE readiness'
                      },
                      { 
                        value: 'staggered', 
                        title: 'Staggered - One Fires First',
                        description: 'One person retires early while the other keeps working, providing salary bridge income. Reduces lump sum requirement.',
                        icon: '🔄',
                        suitableFor: 'Couples where one is more FIRE-ready or enjoys work'
                      },
                      { 
                        value: 'single_fire', 
                        title: 'Single FIRE - One Person Only',
                        description: 'Only one person retires while the other continues career. Lower expenses due to single-person FIRE lifestyle.',
                        icon: '👤',
                        suitableFor: 'One partner wants early retirement, other prefers to keep working'
                      },
                      { 
                        value: 'lump_sum_bridge', 
                        title: 'Lump Sum Bridge - Sequential Super Access',
                        description: 'Both stop working and live entirely on lump sum, then strategically access super accounts sequentially for tax optimization.',
                        icon: '🌉',
                        suitableFor: 'Couples with substantial lump sum and different preservation ages'
                      }
                    ].map((strategy) => (
                      <div 
                        key={strategy.value}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          settings.household_type === strategy.value
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleInputChange('household_type', strategy.value)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">{strategy.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                value={strategy.value}
                                checked={settings.household_type === strategy.value}
                                onChange={() => handleInputChange('household_type', strategy.value)}
                                className="text-blue-600"
                              />
                              <h4 className="font-medium text-gray-900">{strategy.title}</h4>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{strategy.description}</p>
                            <p className="text-xs text-blue-600 mt-2 font-medium">💡 {strategy.suitableFor}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Household Expenses</label>
                    <input
                      type="number"
                      value={settings.household_expenses}
                      onChange={(e) => handleInputChange('household_expenses', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-sm text-gray-500 mt-1">Annual expenses for both people</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Single Person Expenses</label>
                    <input
                      type="number"
                      value={settings.single_person_expenses}
                      onChange={(e) => handleInputChange('single_person_expenses', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-sm text-gray-500 mt-1">Reduced expenses for one person</p>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">Bridge Funding Sources</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Simple</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.use_advanced_lump_sum}
                          onChange={(e) => handleInputChange('use_advanced_lump_sum', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      <span className="text-sm text-gray-600">Advanced</span>
                    </div>
                  </div>
                  
                  {!settings.use_advanced_lump_sum ? (
                    // Simple mode - single lump sum input
                    <div>
                      <input
                        type="number"
                        value={settings.lump_sum_available}
                        onChange={(e) => handleInputChange('lump_sum_available', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g. 500000"
                      />
                      <p className="text-sm text-gray-500 mt-1">Savings, investments, inheritance available for bridge period</p>
                    </div>
                  ) : (
                    // Advanced mode - multi-event timeline
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Multi-Event Timeline</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-blue-700">Expected Value:</span>
                            <span className="font-semibold text-blue-900 ml-2">
                              ${calculateExpectedValue(settings.lump_sum_events).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-blue-700">Guaranteed Value:</span>
                            <span className="font-semibold text-blue-900 ml-2">
                              ${calculateGuaranteedValue(settings.lump_sum_events).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {settings.lump_sum_events.map((event, index) => (
                          <div key={event.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                              <input
                                type="text"
                                value={event.name}
                                onChange={(e) => updateLumpSumEvent(event.id, { name: e.target.value })}
                                className="font-medium text-gray-900 bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                                placeholder="Event name"
                              />
                              <button
                                onClick={() => removeLumpSumEvent(event.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                                <input
                                  type="number"
                                  value={event.amount}
                                  onChange={(e) => updateLumpSumEvent(event.id, { amount: Number(e.target.value) })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Probability %</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={event.probability}
                                  onChange={(e) => updateLumpSumEvent(event.id, { probability: Number(e.target.value) })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                                <input
                                  type="date"
                                  value={event.date.toISOString().split('T')[0]}
                                  onChange={(e) => updateLumpSumEvent(event.id, { date: new Date(e.target.value) })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
                                <select
                                  value={event.source}
                                  onChange={(e) => updateLumpSumEvent(event.id, { source: e.target.value as LumpSumEvent['source'] })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                >
                                  <option value="inheritance">Inheritance</option>
                                  <option value="property_sale">Property Sale</option>
                                  <option value="investment_exit">Investment Exit</option>
                                  <option value="windfall">Windfall</option>
                                  <option value="bonus">Bonus/Severance</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                            </div>
                            
                            <div className="mt-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Tax Treatment</label>
                              <select
                                value={event.tax_treatment}
                                onChange={(e) => updateLumpSumEvent(event.id, { tax_treatment: e.target.value as LumpSumEvent['tax_treatment'] })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              >
                                <option value="tax_free">Tax Free</option>
                                <option value="capital_gains">Capital Gains</option>
                                <option value="income">Income Tax</option>
                                <option value="super_contribution">Super Contribution</option>
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                {getTaxTreatmentDescription(event.tax_treatment)}
                              </p>
                            </div>
                            
                            {event.tax_treatment !== 'tax_free' && (
                              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                <span className="text-yellow-800">
                                  Net amount: ${calculateTaxImpact(event).netAmount.toLocaleString()}
                                  {' '}(Tax: ${calculateTaxImpact(event).taxAmount.toLocaleString()})
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        <button
                          onClick={addLumpSumEvent}
                          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                        >
                          + Add Lump Sum Event
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Enhanced Bridge Income Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-blue-900">Enhanced Bridge Income Modeling</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.use_bridge_income_modeling}
                        onChange={(e) => handleInputChange('use_bridge_income_modeling', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {settings.use_bridge_income_modeling && (
                    <div className="space-y-3">
                      <p className="text-sm text-blue-700">
                        Model multiple declining income sources like part-time work, consulting, and rental properties.
                      </p>
                      
                      {bridgeIncomeStrategy && (
                        <div className="bg-white rounded border p-3">
                          <h4 className="font-medium text-gray-900 mb-2">Bridge Income Summary</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Total Net Income:</span>
                              <div className="font-semibold">${bridgeIncomeStrategy.net_bridge_income.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Sustainability Score:</span>
                              <div className={`font-semibold ${
                                bridgeIncomeStrategy.sustainability_score >= 80 ? 'text-green-600' :
                                bridgeIncomeStrategy.sustainability_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {bridgeIncomeStrategy.sustainability_score}/100
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Income Sources:</span>
                              <div className="font-semibold">{bridgeIncomeStrategy.income_sources.length}</div>
                            </div>
                          </div>
                          
                          {bridgeIncomeStrategy.recommendations.length > 0 && (
                            <div className="mt-3">
                              <h5 className="text-sm font-medium text-gray-700 mb-1">Recommendations:</h5>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {bridgeIncomeStrategy.recommendations.slice(0, 2).map((rec, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-blue-600 mr-1">•</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Rental Portfolio Section */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-green-900">Rental Property Portfolio</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.use_rental_portfolio}
                        onChange={(e) => handleInputChange('use_rental_portfolio', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                  
                  {settings.use_rental_portfolio && (
                    <div className="space-y-3">
                      <p className="text-sm text-green-700">
                        Model investment property cash flows, tax benefits, and FIRE suitability.
                      </p>
                      
                      {rentalPortfolioProjection && (
                        <div className="bg-white rounded border p-3">
                          <h4 className="font-medium text-gray-900 mb-2">Portfolio Summary</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Total Value:</span>
                              <div className="font-semibold">${rentalPortfolioProjection.total_portfolio_value.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Annual Income:</span>
                              <div className={`font-semibold ${
                                rentalPortfolioProjection.total_annual_income > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ${rentalPortfolioProjection.total_annual_income.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Diversification:</span>
                              <div className={`font-semibold ${
                                rentalPortfolioProjection.diversification_score >= 70 ? 'text-green-600' :
                                rentalPortfolioProjection.diversification_score >= 50 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {rentalPortfolioProjection.diversification_score}/100
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <h5 className="text-sm font-medium text-gray-700 mb-1">FIRE Readiness:</h5>
                            <div className="text-xs text-gray-600">
                              <p>Reliable Income: {rentalPortfolioProjection.fire_readiness_assessment.reliable_income_percentage.toFixed(1)}% of portfolio value</p>
                              {rentalPortfolioProjection.fire_readiness_assessment.optimization_opportunities.length > 0 && (
                                <p className="mt-1">Key Opportunity: {rentalPortfolioProjection.fire_readiness_assessment.optimization_opportunities[0]}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Part-time Income {!settings.use_bridge_income_modeling ? '(Simple)' : '(Legacy)'}</label>
                    <input
                      type="number"
                      value={settings.part_time_income}
                      onChange={(e) => handleInputChange('part_time_income', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={settings.use_bridge_income_modeling}
                    />
                    <p className="text-sm text-gray-500 mt-1">{settings.use_bridge_income_modeling ? 'Replaced by enhanced income modeling above' : 'Annual income during FIRE'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Investment Income {!settings.use_rental_portfolio ? '(Simple)' : '(Legacy)'}</label>
                    <input
                      type="number"
                      value={settings.investment_income}
                      onChange={(e) => handleInputChange('investment_income', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={settings.use_rental_portfolio}
                    />
                    <p className="text-sm text-gray-500 mt-1">{settings.use_rental_portfolio ? 'Replaced by rental portfolio modeling above' : 'Dividends, rent, etc.'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Assumptions Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Market Assumptions</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Super Return Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.super_return_rate}
                    onChange={(e) => handleInputChange('super_return_rate', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inflation Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.inflation_rate}
                    onChange={(e) => handleInputChange('inflation_rate', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              {/* Dynamic Withdrawal Rates Section */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-purple-900">Dynamic Withdrawal Rate Analysis</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.use_dynamic_withdrawal}
                      onChange={(e) => handleInputChange('use_dynamic_withdrawal', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                
                {settings.use_dynamic_withdrawal && (
                  <div className="space-y-3">
                    <p className="text-sm text-purple-700">
                      Analyze how withdrawal rates adjust based on market performance during retirement.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Strategy</label>
                        <select
                          value={settings.withdrawal_rule}
                          onChange={(e) => handleInputChange('withdrawal_rule', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        >
                          {WITHDRAWAL_RULES.map(rule => (
                            <option key={rule.name} value={rule.name}>{rule.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Market Scenario</label>
                        <select
                          value={settings.market_scenario}
                          onChange={(e) => handleInputChange('market_scenario', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        >
                          <option value="optimistic">Optimistic (+2% returns)</option>
                          <option value="expected">Expected (base case)</option>
                          <option value="pessimistic">Pessimistic (-2% returns)</option>
                        </select>
                      </div>
                    </div>
                    
                    {selectedWithdrawalStrategy && (
                      <div className="bg-white rounded border p-3">
                        <h4 className="font-medium text-gray-900 mb-2">Strategy Analysis</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Success Probability:</span>
                            <div className={`font-semibold ${
                              selectedWithdrawalStrategy.success_probability >= 90 ? 'text-green-600' :
                              selectedWithdrawalStrategy.success_probability >= 70 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {selectedWithdrawalStrategy.success_probability}%
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Sustainability Score:</span>
                            <div className={`font-semibold ${
                              selectedWithdrawalStrategy.sustainability_score >= 80 ? 'text-green-600' :
                              selectedWithdrawalStrategy.sustainability_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {selectedWithdrawalStrategy.sustainability_score}/100
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Final Portfolio:</span>
                            <div className="font-semibold">
                              ${(selectedWithdrawalStrategy.final_portfolio_value / 1000).toFixed(0)}k
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <p className="text-xs text-gray-600">
                            {selectedWithdrawalStrategy.rule.description}
                          </p>
                        </div>
                        
                        {selectedWithdrawalStrategy.annual_adjustments.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium text-gray-700 mb-1">Rate Adjustments:</h5>
                            <div className="text-xs text-gray-600">
                              <p>Starting rate: {(selectedWithdrawalStrategy.rule.base_rate * 100).toFixed(1)}%</p>
                              <p>Range: {(selectedWithdrawalStrategy.rule.min_rate * 100).toFixed(1)}% - {(selectedWithdrawalStrategy.rule.max_rate * 100).toFixed(1)}%</p>
                              <p>Adjustments made: {selectedWithdrawalStrategy.annual_adjustments.filter(a => Math.abs(a.actual_rate - a.previous_rate) > 0.002).length} times</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {withdrawalStrategies.length > 1 && (
                      <div className="bg-white rounded border p-3">
                        <h4 className="font-medium text-gray-900 mb-2">Strategy Comparison</h4>
                        <div className="space-y-2">
                          {withdrawalStrategies.slice(0, 3).map((strategy, idx) => (
                            <div key={strategy.rule.name} className={`flex justify-between items-center p-2 rounded text-sm ${
                              strategy.rule.name === settings.withdrawal_rule ? 'bg-purple-100' : 'bg-gray-50'
                            }`}>
                              <span className="font-medium">{strategy.rule.name}</span>
                              <div className="flex space-x-4 text-xs">
                                <span className={`${
                                  strategy.success_probability >= 85 ? 'text-green-600' : 'text-gray-600'
                                }`}>
                                  {strategy.success_probability}% success
                                </span>
                                <span className="text-gray-600">
                                  Score: {strategy.sustainability_score}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Monte Carlo Simulation Section */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-orange-900">Monte Carlo Simulation</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.use_monte_carlo}
                      onChange={(e) => handleInputChange('use_monte_carlo', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>
                
                {settings.use_monte_carlo && (
                  <div className="space-y-3">
                    <p className="text-sm text-orange-700">
                      Run thousands of scenarios to stress test your FIRE plan against market volatility.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Simulation Runs</label>
                        <select
                          value={settings.monte_carlo_runs}
                          onChange={(e) => handleInputChange('monte_carlo_runs', Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        >
                          <option value={500}>500 (Fast)</option>
                          <option value={1000}>1,000 (Recommended)</option>
                          <option value={5000}>5,000 (Thorough)</option>
                          <option value={10000}>10,000 (Maximum)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Strategy</label>
                        <select
                          value={settings.withdrawal_strategy_mc}
                          onChange={(e) => handleInputChange('withdrawal_strategy_mc', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        >
                          <option value="fixed_real">Fixed Real (Inflation Adjusted)</option>
                          <option value="fixed_nominal">Fixed Nominal (Same $)</option>
                          <option value="dynamic">Dynamic (+/-10%)</option>
                          <option value="floor_ceiling">Guardrails (80%-120%)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock Allocation (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={settings.asset_allocation_stocks}
                          onChange={(e) => {
                            const stocks = Number(e.target.value)
                            const maxBonds = 100 - stocks
                            handleInputChange('asset_allocation_stocks', stocks)
                            if (settings.asset_allocation_bonds > maxBonds) {
                              handleInputChange('asset_allocation_bonds', maxBonds)
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bond Allocation (%)</label>
                        <input
                          type="number"
                          min="0"
                          max={100 - settings.asset_allocation_stocks}
                          value={settings.asset_allocation_bonds}
                          onChange={(e) => handleInputChange('asset_allocation_bonds', Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600">
                      <p>Cash allocation: {100 - settings.asset_allocation_stocks - settings.asset_allocation_bonds}%</p>
                      <p>Strategy: {getWithdrawalStrategyDescription(settings.withdrawal_strategy_mc)}</p>
                    </div>
                    
                    {monteCarloLoading && (
                      <div className="bg-white rounded border p-3">
                        <div className="flex items-center space-x-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
                          <span className="text-sm text-gray-700">
                            Running {settings.monte_carlo_runs.toLocaleString()} simulations...
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {monteCarloResults && !monteCarloLoading && (
                      <div className="bg-white rounded border p-3">
                        <h4 className="font-medium text-gray-900 mb-2">Simulation Results</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Success Rate:</span>
                            <div className={`text-lg font-bold ${
                              getSuccessRateColor(monteCarloResults.summary_statistics.success_rate)
                            }`}>
                              {monteCarloResults.summary_statistics.success_rate.toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Median Final Value:</span>
                            <div className="text-lg font-bold text-blue-600">
                              ${(monteCarloResults.summary_statistics.median_final_value / 1000).toFixed(0)}k
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Risk of Ruin:</span>
                            <div className={`text-lg font-bold ${
                              monteCarloResults.summary_statistics.probability_of_ruin > 20 ? 'text-red-600' :
                              monteCarloResults.summary_statistics.probability_of_ruin > 10 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {monteCarloResults.summary_statistics.probability_of_ruin.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t">
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Stress Test Results:</h5>
                          <div className="text-xs text-gray-600 space-y-1">
                            <p>• Sequence risk impact: {(monteCarloResults.stress_test_results.sequence_risk_impact * 100).toFixed(1)}% of scenarios</p>
                            <p>• Best case: {monteCarloResults.stress_test_results.best_case_scenario}</p>
                            <p>• Worst case: {monteCarloResults.stress_test_results.worst_case_scenario}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {loading ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Calculating FIRE feasibility...</p>
                </div>
              </div>
            ) : projection ? (
              <>
                {/* Feasibility Overview */}
                <div className={`rounded-lg shadow p-6 ${projection.is_feasible ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="text-center">
                    <div className={`text-6xl mb-4 ${projection.is_feasible ? 'text-green-600' : 'text-red-600'}`}>
                      {projection.is_feasible ? '✅' : '❌'}
                    </div>
                    <h2 className={`text-2xl font-bold ${projection.is_feasible ? 'text-green-900' : 'text-red-900'}`}>
                      {projection.is_feasible ? 'FIRE is Feasible!' : 'FIRE Plan Needs Adjustment'}
                    </h2>
                    <p className={`mt-2 ${projection.is_feasible ? 'text-green-700' : 'text-red-700'}`}>
                      {projection.is_feasible 
                        ? `You can bridge ${projection.total_bridge_years} years until super access`
                        : `Shortfall of $${projection.lump_sum_shortfall.toLocaleString()} for bridge period`
                      }
                    </p>
                  </div>
                </div>

                {/* Bridge Strategy Details */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Bridge Strategy</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Years to Bridge:</span>
                      <span className="font-semibold">{projection.total_bridge_years} years</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lump Sum Required:</span>
                      <span className="font-semibold">${projection.lump_sum_required.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lump Sum Available:</span>
                      <span className="font-semibold">${calculateTotalLumpSum().toLocaleString()}</span>
                    </div>
                    
                    {settings.use_advanced_lump_sum && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <span className="text-blue-800">
                          Using advanced timeline: Expected value from {settings.lump_sum_events.length} events
                          {' '}(Guaranteed: ${calculateGuaranteedValue(settings.lump_sum_events).toLocaleString()})
                        </span>
                      </div>
                    )}
                    
                    {!projection.is_feasible && (
                      <div className="flex justify-between text-red-600">
                        <span>Shortfall:</span>
                        <span className="font-semibold">${projection.lump_sum_shortfall.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {projection.working_partner_contribution > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                        <h4 className="text-sm font-medium text-green-800 mb-2">Working Partner Income Bridge</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-green-700">Annual Salary:</span>
                            <span className="font-semibold text-green-800">${projection.working_partner_contribution.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-green-700">Coverage:</span>
                            <span className="font-semibold text-green-800">
                              {((projection.working_partner_contribution / settings.household_expenses) * 100).toFixed(0)}% of expenses
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-green-700">Bridge Duration:</span>
                            <span className="font-semibold text-green-800">{projection.total_bridge_years} years</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-600">{projection.strategy_description}</p>
                    </div>
                  </div>
                </div>

                {/* Income Breakdown for Staggered Strategy */}
                {projection.household_strategy === 'staggered' && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Income Breakdown During Bridge Period</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Household Expenses:</span>
                        <span className="font-semibold">${settings.household_expenses.toLocaleString()}/year</span>
                      </div>
                      
                      {projection.working_partner_contribution > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Working Partner Salary:</span>
                          <span className="font-semibold">${projection.working_partner_contribution.toLocaleString()}/year</span>
                        </div>
                      )}
                      
                      {settings.part_time_income > 0 && (
                        <div className="flex justify-between text-blue-600">
                          <span>FIRE Person Part-time Income:</span>
                          <span className="font-semibold">${settings.part_time_income.toLocaleString()}/year</span>
                        </div>
                      )}
                      
                      {settings.investment_income > 0 && (
                        <div className="flex justify-between text-purple-600">
                          <span>Investment Income:</span>
                          <span className="font-semibold">${settings.investment_income.toLocaleString()}/year</span>
                        </div>
                      )}
                      
                      <div className="border-t pt-3">
                        <div className="flex justify-between">
                          <span className="text-gray-900 font-medium">Total Income:</span>
                          <span className="font-bold">
                            ${(projection.working_partner_contribution + settings.part_time_income + settings.investment_income).toLocaleString()}/year
                          </span>
                        </div>
                        
                        <div className="flex justify-between mt-2">
                          <span className="text-gray-600">Annual Gap to Cover:</span>
                          <span className={`font-semibold ${projection.annual_household_gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${projection.annual_household_gap.toLocaleString()}/year
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Super at Preservation Age */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Super Balance at Preservation Age</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{settings.person1.name}:</span>
                      <span className="font-semibold">${projection.super_at_preservation.person1_balance.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">{settings.person2.name}:</span>
                      <span className="font-semibold">${projection.super_at_preservation.person2_balance.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between border-t pt-3">
                      <span className="text-gray-900 font-medium">Combined Total:</span>
                      <span className="font-bold text-lg">${projection.super_at_preservation.combined_balance.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <Link
                      href={`/super-spend-zero?person1_balance=${projection.super_at_preservation.person1_balance}&person2_balance=${projection.super_at_preservation.person2_balance}&annual_expenses=${settings.household_expenses}`}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center block"
                    >
                      Plan Super Withdrawal Strategy →
                    </Link>
                  </div>
                </div>

                {/* Recommendations */}
                {projection.recommendations.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
                    <ul className="space-y-2">
                      {projection.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-600 mr-2">•</span>
                          <span className="text-sm text-gray-700">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Strategic Allocation Engine */}
                {(() => {
                  const strategicPlan = generateStrategicRecommendations()
                  if (!strategicPlan) return null

                  return (
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Strategic Allocation Engine</h3>
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          Optimization Score: {strategicPlan.optimization_score}%
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-2">Overall Strategy: {strategicPlan.overall_strategy}</h4>
                          <p className="text-sm text-blue-700">
                            Total Expected Value: ${strategicPlan.total_allocation.toLocaleString()}
                            {' '}from {settings.lump_sum_events.length} events
                          </p>
                        </div>

                        {/* Timeline Recommendations */}
                        <div className="space-y-3">
                          <h5 className="font-medium text-gray-900">Event-by-Event Recommendations:</h5>
                          {strategicPlan.timeline_recommendations.map((rec, index) => (
                            <div key={rec.event.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                              <div className="flex items-center justify-between mb-3">
                                <h6 className="font-medium text-gray-900">{rec.event.name}</h6>
                                <span className="text-sm text-gray-600">
                                  ${calculateTaxImpact(rec.event).netAmount.toLocaleString()} net
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div className="text-sm">
                                  <span className="text-gray-600">Recommended Strategy:</span>
                                  <span className="font-medium text-gray-900 ml-2">{rec.recommended_strategy.name}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-600">Tax Efficiency:</span>
                                  <span className="font-medium text-gray-900 ml-2">{rec.recommended_strategy.tax_efficiency}/10</span>
                                </div>
                              </div>

                              {/* Allocation Breakdown */}
                              <div className="space-y-2">
                                <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Allocation Breakdown:</h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {rec.allocation_breakdown.bridge_funding > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-red-600">Bridge Funding:</span>
                                      <span className="font-medium">${rec.allocation_breakdown.bridge_funding.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {rec.allocation_breakdown.super_contributions > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-blue-600">Super Contributions:</span>
                                      <span className="font-medium">${rec.allocation_breakdown.super_contributions.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {rec.allocation_breakdown.debt_reduction > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-orange-600">Debt Reduction:</span>
                                      <span className="font-medium">${rec.allocation_breakdown.debt_reduction.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {rec.allocation_breakdown.investment_account > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-green-600">Investment Account:</span>
                                      <span className="font-medium">${rec.allocation_breakdown.investment_account.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {rec.allocation_breakdown.emergency_buffer > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-purple-600">Emergency Buffer:</span>
                                      <span className="font-medium">${rec.allocation_breakdown.emergency_buffer.toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Key Reasoning */}
                              {rec.reasoning.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="text-xs text-gray-600">
                                    <strong>Key Reasoning:</strong> {rec.reasoning[0]}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Key Benefits */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium text-green-900 mb-2">Key Benefits:</h5>
                            <ul className="text-sm text-green-700 space-y-1">
                              {strategicPlan.key_benefits.map((benefit, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-green-600 mr-2">✓</span>
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h5 className="font-medium text-orange-900 mb-2">Potential Risks:</h5>
                            <ul className="text-sm text-orange-700 space-y-1">
                              {strategicPlan.potential_risks.map((risk, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-orange-600 mr-2">⚠</span>
                                  <span>{risk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
                
                {/* Dynamic Withdrawal Analysis Results */}
                {settings.use_dynamic_withdrawal && selectedWithdrawalStrategy && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Dynamic Withdrawal Rate Analysis</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">{selectedWithdrawalStrategy.rule.name}</h4>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Success Rate:</span>
                              <div className={`text-lg font-bold ${
                                selectedWithdrawalStrategy.success_probability >= 90 ? 'text-green-600' :
                                selectedWithdrawalStrategy.success_probability >= 70 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {selectedWithdrawalStrategy.success_probability}%
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Score:</span>
                              <div className={`text-lg font-bold ${
                                selectedWithdrawalStrategy.sustainability_score >= 80 ? 'text-green-600' :
                                selectedWithdrawalStrategy.sustainability_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {selectedWithdrawalStrategy.sustainability_score}/100
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{selectedWithdrawalStrategy.rule.description}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Strategy Comparison</h4>
                        {withdrawalStrategies.length > 1 && (
                          <div className="space-y-2">
                            {withdrawalStrategies.slice(0, 3).map(strategy => (
                              <div key={strategy.rule.name} className={`p-2 rounded border text-sm ${
                                strategy.rule.name === settings.withdrawal_rule ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
                              }`}>
                                <div className="flex justify-between">
                                  <span className="font-medium">{strategy.rule.name}</span>
                                  <span className="text-green-600">{strategy.success_probability}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailed Monte Carlo Results */}
                {settings.use_monte_carlo && monteCarloResults && !monteCarloLoading && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Monte Carlo Analysis Details</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Portfolio Sustainability Metrics */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Portfolio Sustainability</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Success Rate:</span>
                            <span className={`font-bold ${getSuccessRateColor(monteCarloResults.summary_statistics.success_rate)}`}>
                              {monteCarloResults.summary_statistics.success_rate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Risk of Ruin:</span>
                            <span className={`font-bold ${
                              monteCarloResults.summary_statistics.probability_of_ruin > 20 ? 'text-red-600' :
                              monteCarloResults.summary_statistics.probability_of_ruin > 10 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {monteCarloResults.summary_statistics.probability_of_ruin.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Safe Withdrawal Rate (90%):</span>
                            <span className="font-bold text-blue-600">
                              {(monteCarloResults.summary_statistics.safe_withdrawal_rate * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Conservative Rate (95%):</span>
                            <span className="font-bold text-green-600">
                              {(monteCarloResults.summary_statistics.conservative_withdrawal_rate * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stress Test Analysis */}
                      <div className="bg-orange-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Stress Test Analysis</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-600">Sequence Risk Impact:</span>
                            <span className="ml-2 font-medium">
                              {(monteCarloResults.stress_test_results.sequence_risk_impact * 100).toFixed(1)}% of scenarios
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Inflation Risk Impact:</span>
                            <span className="ml-2 font-medium">
                              {(monteCarloResults.stress_test_results.inflation_risk_impact * 100).toFixed(1)}% failure rate
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Volatility Drag:</span>
                            <span className="ml-2 font-medium">
                              {(monteCarloResults.stress_test_results.volatility_drag_impact * 100).toFixed(2)}% annual impact
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Confidence Intervals */}
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-3">Portfolio Value Confidence Intervals</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Time Horizon</th>
                              <th className="text-right py-2">5th Percentile</th>
                              <th className="text-right py-2">Median (50th)</th>
                              <th className="text-right py-2">95th Percentile</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            <tr>
                              <td className="py-2 font-medium">10 Years</td>
                              <td className="py-2 text-right text-red-600">
                                ${(monteCarloResults.confidence_intervals.portfolio_value_10_years.p5 / 1000).toFixed(0)}k
                              </td>
                              <td className="py-2 text-right font-bold">
                                ${(monteCarloResults.confidence_intervals.portfolio_value_10_years.p50 / 1000).toFixed(0)}k
                              </td>
                              <td className="py-2 text-right text-green-600">
                                ${(monteCarloResults.confidence_intervals.portfolio_value_10_years.p95 / 1000).toFixed(0)}k
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2 font-medium">20 Years</td>
                              <td className="py-2 text-right text-red-600">
                                ${(monteCarloResults.confidence_intervals.portfolio_value_20_years.p5 / 1000).toFixed(0)}k
                              </td>
                              <td className="py-2 text-right font-bold">
                                ${(monteCarloResults.confidence_intervals.portfolio_value_20_years.p50 / 1000).toFixed(0)}k
                              </td>
                              <td className="py-2 text-right text-green-600">
                                ${(monteCarloResults.confidence_intervals.portfolio_value_20_years.p95 / 1000).toFixed(0)}k
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2 font-medium">30 Years</td>
                              <td className="py-2 text-right text-red-600">
                                ${(monteCarloResults.confidence_intervals.portfolio_value_30_years.p5 / 1000).toFixed(0)}k
                              </td>
                              <td className="py-2 text-right font-bold">
                                ${(monteCarloResults.confidence_intervals.portfolio_value_30_years.p50 / 1000).toFixed(0)}k
                              </td>
                              <td className="py-2 text-right text-green-600">
                                ${(monteCarloResults.confidence_intervals.portfolio_value_30_years.p95 / 1000).toFixed(0)}k
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Scenario Descriptions */}
                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <h5 className="font-medium text-green-800 mb-1">Best Case Scenario</h5>
                        <p className="text-sm text-green-700">
                          {monteCarloResults.stress_test_results.best_case_scenario}
                        </p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <h5 className="font-medium text-red-800 mb-1">Worst Case Scenario</h5>
                        <p className="text-sm text-red-700">
                          {monteCarloResults.stress_test_results.worst_case_scenario}
                        </p>
                      </div>
                    </div>

                    {/* Market Assumptions Used */}
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h5 className="font-medium text-blue-800 mb-2">Market Assumptions Used</h5>
                      <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                        <div>
                          <span className="font-medium">Expected Return:</span> {(monteCarloResults.market_assumptions.mean_return * 100).toFixed(1)}%
                        </div>
                        <div>
                          <span className="font-medium">Volatility:</span> {(monteCarloResults.market_assumptions.volatility * 100).toFixed(1)}%
                        </div>
                        <div>
                          <span className="font-medium">Inflation:</span> {(monteCarloResults.market_assumptions.inflation_mean * 100).toFixed(1)}%
                        </div>
                        <div>
                          <span className="font-medium">Simulation Runs:</span> {monteCarloResults.settings.simulation_runs.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-center">Enter your details to see FIRE feasibility</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}