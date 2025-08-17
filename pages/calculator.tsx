import React, { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import { runFirePlan, RunRequest, RunResult } from '@/lib/engine'
import { getCurrentAssumptions } from '@/lib/assumptions/registry'
import { 
  generateShareableUrl, 
  extractStateFromUrl, 
  updateUrlWithState, 
  createDownloadLink 
} from '@/lib/url-codec'
import { 
  AutoSaver, 
  saveState, 
  loadState, 
  getSavedStates, 
  deleteState 
} from '@/lib/storage'

// Accordion Component
interface AccordionProps {
  title: string
  children: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  badge?: string
  status?: 'pending' | 'valid' | 'invalid'
}

const Accordion: React.FC<AccordionProps> = ({ title, children, isOpen, onToggle, badge, status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'valid': return 'text-green-600 bg-green-100'
      case 'invalid': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {badge && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}>
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  )
}

// Form Input Components
const FormGroup: React.FC<{ label: string; children: React.ReactNode; error?: string }> = ({ label, children, error }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    {children}
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
)

const Input: React.FC<{
  type?: string
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}> = ({ type = 'text', value, onChange, placeholder, className = '' }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
  />
)

const Select: React.FC<{
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
}> = ({ value, onChange, options, className = '' }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
  >
    {options.map(option => (
      <option key={option.value} value={option.value}>{option.label}</option>
    ))}
  </select>
)

// Scenario Management
interface Scenario {
  id: string
  name: string
  description?: string
  state: CalculatorState
  results?: RunResult
  createdAt: number
  modifiedAt: number
}

interface ScenarioComparison {
  baseScenario: Scenario
  compareScenario: Scenario
  diffs: ScenarioDiff[]
}

interface ScenarioDiff {
  path: string
  label: string
  baseValue: any
  compareValue: any
  type: 'changed' | 'added' | 'removed'
}

// Main Calculator Interface
interface CalculatorState {
  // Household Structure
  household: {
    structure: 'single' | 'couple'
    people: Array<{
      id: string
      name: string
      birth_year: number
      annual_salary: number
      super_balance: number
      super_contribution_rate: number
      fire_age?: number
      life_expectancy: number
    }>
    annual_expenses: {
      single_person: number
      couple: number
      current: number
    }
    assets: {
      non_super_investments: number
      home_value: number
      other_assets: number
      mortgage_balance: number
    }
    strategy: {
      type: 'both_stop_same_year' | 'person1_fire_first' | 'person2_fire_first' | 'staggered_retirement'
      expense_modeling: 'household_throughout' | 'single_then_household' | 'dynamic_optimization'
      withdrawal_sequencing: 'sequential' | 'proportional' | 'tax_optimized'
    }
  }
  
  // Strategy Configuration
  strategy: {
    household: {
      type: 'both_stop_same_year' | 'person1_fire_first' | 'person2_fire_first' | 'staggered_retirement'
    }
    bridge: {
      part_time_income: {
        annual_amount: number
        years_duration: number
        decline_rate: number
      }
      salary_income: { [personId: string]: any }
      rental_income: {
        use_portfolio: boolean
        properties: any[]
      }
      lump_sum_events: any[]
    }
    spenddown: {
      type: 'sequential' | 'proportional' | 'tax_optimized' | 'min_drawdown_only'
      withdrawal_method: 'fixed_real' | 'fixed_nominal' | 'dynamic' | 'guardrails' | 'spend_to_zero'
      longevity_planning_age: number
      use_transition_to_retirement: boolean
      age_pension_optimization: boolean
    }
    tax_optimization: {
      person1_drain_first: boolean
      minimize_total_tax: boolean
      preserve_tax_free_component: boolean
    }
  }
  
  // Return Model
  returns: {
    type: 'deterministic' | 'monte_carlo'
    scenario: 'base' | 'conservative' | 'optimistic'
    assumptions: {
      super_return_rate: number
      non_super_return_rate: number
      inflation_rate: number
      volatility?: number
    }
    monte_carlo_settings?: any
  }
  
  // Simulation Options
  options: {
    include_monte_carlo: boolean
    monte_carlo_runs?: number
    include_stress_testing: boolean
    detailed_timeline: boolean
    projection_years: number
  }
  
  // Results
  results?: RunResult
  isCalculating: boolean
  error?: string
}

const defaultState: CalculatorState = {
  household: {
    structure: 'couple',
    people: [
      {
        id: 'person1',
        name: 'Person 1',
        birth_year: 1985,
        annual_salary: 120000,
        super_balance: 200000,
        super_contribution_rate: 0.05,
        fire_age: 55,
        life_expectancy: 90
      },
      {
        id: 'person2',
        name: 'Person 2',
        birth_year: 1987,
        annual_salary: 100000,
        super_balance: 150000,
        super_contribution_rate: 0.03,
        fire_age: 57,
        life_expectancy: 92
      }
    ],
    annual_expenses: {
      single_person: 60000,
      couple: 90000,
      current: 90000
    },
    assets: {
      non_super_investments: 100000,
      home_value: 800000,
      other_assets: 50000,
      mortgage_balance: 400000
    },
    strategy: {
      type: 'both_stop_same_year',
      expense_modeling: 'household_throughout',
      withdrawal_sequencing: 'sequential'
    }
  },
  strategy: {
    household: {
      type: 'both_stop_same_year'
    },
    bridge: {
      part_time_income: {
        annual_amount: 30000,
        years_duration: 5,
        decline_rate: 10
      },
      salary_income: {},
      rental_income: {
        use_portfolio: false,
        properties: []
      },
      lump_sum_events: []
    },
    spenddown: {
      type: 'sequential',
      withdrawal_method: 'fixed_real',
      longevity_planning_age: 95,
      use_transition_to_retirement: false,
      age_pension_optimization: true
    },
    tax_optimization: {
      person1_drain_first: false,
      minimize_total_tax: true,
      preserve_tax_free_component: true
    }
  },
  returns: {
    type: 'deterministic',
    scenario: 'base',
    assumptions: {
      super_return_rate: 0.07,
      non_super_return_rate: 0.065,
      inflation_rate: 0.025,
      volatility: 0.15
    }
  },
  options: {
    include_monte_carlo: false,
    monte_carlo_runs: 1000,
    include_stress_testing: false,
    detailed_timeline: true,
    projection_years: 40
  },
  isCalculating: false
}

export default function Calculator() {
  const [state, setState] = useState<CalculatorState>(defaultState)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['household']))
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [savedStates, setSavedStates] = useState<Array<{ name: string; timestamp: number }>>([])
  const autoSaverRef = useRef<AutoSaver<CalculatorState> | null>(null)
  
  // Scenario Management State
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string>('base')
  const [showScenarioComparison, setShowScenarioComparison] = useState(false)
  const [comparisonScenarioId, setComparisonScenarioId] = useState<string | null>(null)
  const [scenarioComparison, setScenarioComparison] = useState<ScenarioComparison | null>(null)

  // Initialize state from URL or localStorage on mount
  useEffect(() => {
    // Try URL first (for shared links)
    const urlState = extractStateFromUrl(defaultState)
    
    if (urlState.isFromUrl) {
      setState(urlState.state)
    } else {
      // Fallback to localStorage
      const stored = loadState<CalculatorState>()
      if (stored) {
        setState(stored.state)
      }
    }

    // Initialize auto-saver
    autoSaverRef.current = new AutoSaver(state, {
      autoSave: true,
      saveInterval: 3000, // Save every 3 seconds
      maxHistory: 10
    })

    // Load saved states list
    setSavedStates(getSavedStates())

    return () => {
      autoSaverRef.current?.destroy()
    }
  }, [])

  // Update auto-saver when state changes
  useEffect(() => {
    autoSaverRef.current?.updateState(state)
    
    // Update URL (debounced)
    const timeoutId = setTimeout(() => {
      updateUrlWithState(state)
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [state])

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const updateState = useCallback((path: string, value: any) => {
    setState(prev => {
      const keys = path.split('.')
      const newState = JSON.parse(JSON.stringify(prev))
      let current = newState
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      
      return newState
    })
  }, [])

  const runCalculation = async () => {
    setState(prev => ({ ...prev, isCalculating: true, error: undefined }))
    
    try {
      const assumptions = getCurrentAssumptions()
      
      const request: RunRequest = {
        household: {
          ...state.household,
          strategy: {
            type: state.household.strategy.type,
            expense_modeling: state.household.strategy.expense_modeling,
            withdrawal_sequencing: state.household.strategy.withdrawal_sequencing
          }
        },
        strategy: {
          household: {
            type: state.household.strategy.type,
            expense_modeling: state.household.strategy.expense_modeling,
            withdrawal_sequencing: state.household.strategy.withdrawal_sequencing
          },
          bridge: state.strategy.bridge,
          spenddown: state.strategy.spenddown,
          tax_optimization: state.strategy.tax_optimization
        },
        returns: state.returns,
        horizon: {
          start_year: new Date().getFullYear(),
          end_age: Math.max(...state.household.people.map(p => p.life_expectancy))
        },
        assumptions,
        options: state.options
      }

      const results = await runFirePlan(request)
      setState(prev => ({ ...prev, results, isCalculating: false }))
      
      // Open results section
      setOpenSections(prev => new Set([...Array.from(prev), 'results']))
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Calculation failed',
        isCalculating: false 
      }))
    }
  }

  const validateSection = (section: string): 'valid' | 'invalid' | 'pending' => {
    switch (section) {
      case 'household':
        return state.household.people.every(p => p.birth_year > 1900 && p.annual_salary > 0) ? 'valid' : 'invalid'
      case 'strategy':
        return 'valid' // Simplified validation
      case 'returns':
        return state.returns.assumptions.super_return_rate > 0 ? 'valid' : 'invalid'
      default:
        return 'pending'
    }
  }

  const handleShare = () => {
    const url = generateShareableUrl(state)
    setShareUrl(url)
    setShowShareModal(true)
  }

  const handleSave = (name: string) => {
    const success = saveState(state, name)
    if (success) {
      setSavedStates(getSavedStates())
      alert(`Saved as "${name}"`)
    } else {
      alert('Failed to save state')
    }
  }

  const handleLoad = (name: string) => {
    const stored = loadState<CalculatorState>(name)
    if (stored) {
      setState(stored.state)
      alert(`Loaded "${name}"`)
    } else {
      alert('Failed to load state')
    }
  }

  const handleDownload = () => {
    const downloadUrl = createDownloadLink(state, 'fire-plan.json')
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `fire-plan-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(downloadUrl)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Copied to clipboard!')
    }
  }

  // Scenario Management Functions
  const createNewScenario = (name: string, description?: string) => {
    const newScenario: Scenario = {
      id: `scenario-${Date.now()}`,
      name,
      description,
      state: JSON.parse(JSON.stringify(state)), // Deep copy
      createdAt: Date.now(),
      modifiedAt: Date.now()
    }
    
    setScenarios(prev => [...prev, newScenario])
    setActiveScenarioId(newScenario.id)
  }

  const duplicateScenario = (scenarioId: string, newName: string) => {
    const originalScenario = scenarios.find(s => s.id === scenarioId)
    if (!originalScenario) return
    
    const duplicatedScenario: Scenario = {
      id: `scenario-${Date.now()}`,
      name: newName,
      description: `Copy of ${originalScenario.name}`,
      state: JSON.parse(JSON.stringify(originalScenario.state)), // Deep copy
      createdAt: Date.now(),
      modifiedAt: Date.now()
    }
    
    setScenarios(prev => [...prev, duplicatedScenario])
    setActiveScenarioId(duplicatedScenario.id)
  }

  const deleteScenario = (scenarioId: string) => {
    if (scenarioId === 'base') return // Can't delete base scenario
    
    setScenarios(prev => prev.filter(s => s.id !== scenarioId))
    
    if (activeScenarioId === scenarioId) {
      setActiveScenarioId('base')
      setState(defaultState)
    }
  }

  const switchToScenario = (scenarioId: string) => {
    if (scenarioId === 'base') {
      setActiveScenarioId('base')
      setState(defaultState)
      return
    }
    
    const scenario = scenarios.find(s => s.id === scenarioId)
    if (scenario) {
      setActiveScenarioId(scenarioId)
      setState(scenario.state)
    }
  }

  const saveCurrentScenario = () => {
    if (activeScenarioId === 'base') return
    
    setScenarios(prev => prev.map(scenario => 
      scenario.id === activeScenarioId 
        ? { ...scenario, state: JSON.parse(JSON.stringify(state)), modifiedAt: Date.now() }
        : scenario
    ))
  }

  const compareScenarios = (baseId: string, compareId: string) => {
    const baseScenario = baseId === 'base' 
      ? { id: 'base', name: 'Base Scenario', state: defaultState, createdAt: 0, modifiedAt: 0 }
      : scenarios.find(s => s.id === baseId)
    const compareScenario = compareId === 'base'
      ? { id: 'base', name: 'Base Scenario', state: defaultState, createdAt: 0, modifiedAt: 0 }
      : scenarios.find(s => s.id === compareId)
      
    if (!baseScenario || !compareScenario) return
    
    const diffs = generateScenarioDiffs(baseScenario.state, compareScenario.state)
    setScenarioComparison({
      baseScenario: baseScenario as Scenario,
      compareScenario: compareScenario as Scenario,
      diffs
    })
    setShowScenarioComparison(true)
  }

  const generateScenarioDiffs = (baseState: CalculatorState, compareState: CalculatorState): ScenarioDiff[] => {
    const diffs: ScenarioDiff[] = []
    
    // Compare key values
    const compareValue = (path: string, label: string, baseVal: any, compareVal: any) => {
      if (JSON.stringify(baseVal) !== JSON.stringify(compareVal)) {
        diffs.push({
          path,
          label,
          baseValue: baseVal,
          compareValue: compareVal,
          type: 'changed'
        })
      }
    }
    
    // Household structure
    compareValue('household.structure', 'Household Structure', baseState.household.structure, compareState.household.structure)
    compareValue('household.annual_expenses.current', 'Annual Expenses', baseState.household.annual_expenses.current, compareState.household.annual_expenses.current)
    
    // Strategy
    compareValue('strategy.household.type', 'Household Strategy', baseState.strategy.household.type, compareState.strategy.household.type)
    compareValue('strategy.spenddown.type', 'Spenddown Strategy', baseState.strategy.spenddown.type, compareState.strategy.spenddown.type)
    
    // Returns
    compareValue('returns.scenario', 'Return Scenario', baseState.returns.scenario, compareState.returns.scenario)
    compareValue('returns.assumptions.super_return_rate', 'Super Return Rate', baseState.returns.assumptions.super_return_rate, compareState.returns.assumptions.super_return_rate)
    
    return diffs
  }

  const exportScenarioComparison = () => {
    if (!scenarioComparison) return
    
    const exportData = {
      comparison: {
        baseScenario: {
          name: scenarioComparison.baseScenario.name,
          state: scenarioComparison.baseScenario.state
        },
        compareScenario: {
          name: scenarioComparison.compareScenario.name,
          state: scenarioComparison.compareScenario.state
        },
        diffs: scenarioComparison.diffs
      },
      exportedAt: new Date().toISOString()
    }
    
    const downloadUrl = createDownloadLink(exportData, `scenario-comparison-${Date.now()}.json`)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `scenario-comparison-${Date.now()}.json`
    link.click()
  }

  const exportAllScenarios = () => {
    const exportData = {
      baseScenario: { name: 'Base Scenario', state: defaultState },
      scenarios: scenarios.map(s => ({ name: s.name, description: s.description, state: s.state })),
      exportedAt: new Date().toISOString()
    }
    
    const downloadUrl = createDownloadLink(exportData, `all-scenarios-${Date.now()}.json`)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `all-scenarios-${Date.now()}.json`
    link.click()
  }

  // Auto-save current scenario when state changes
  useEffect(() => {
    if (activeScenarioId !== 'base' && scenarios.length > 0) {
      const timeoutId = setTimeout(() => {
        saveCurrentScenario()
      }, 2000)
      
      return () => clearTimeout(timeoutId)
    }
  }, [state, activeScenarioId])

  return (
    <>
      <Head>
        <title>FIRE Calculator - Comprehensive Australian FIRE Planning</title>
        <meta name="description" content="Complete FIRE planning calculator with bridge income, super optimization, and age pension modeling for Australian investors." />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">FIRE Calculator</h1>
                <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                  Australian 2025-26
                </span>
              </div>
              <div className="flex items-center space-x-3">
                {/* Save/Load Dropdown */}
                <div className="relative">
                  <select
                    onChange={(e) => {
                      if (e.target.value === 'save') {
                        const name = prompt('Save as:')
                        if (name) handleSave(name)
                      } else if (e.target.value.startsWith('load:')) {
                        const name = e.target.value.substring(5)
                        handleLoad(name)
                      }
                      e.target.value = ''
                    }}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Save/Load</option>
                    <option value="save">💾 Save Current</option>
                    <option disabled>──────────</option>
                    {savedStates.map(saved => (
                      <option key={saved.name} value={`load:${saved.name}`}>
                        📁 {saved.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  🔗 Share
                </button>

                {/* Download Button */}
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 text-sm bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  📥 Download
                </button>

                {/* Calculate Button */}
                <button
                  onClick={runCalculation}
                  disabled={state.isCalculating}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.isCalculating ? 'Calculating...' : 'Calculate FIRE Plan'}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Scenario Tabs */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-1">
                {/* Base Scenario Tab */}
                <button
                  onClick={() => switchToScenario('base')}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeScenarioId === 'base'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📊 Base Scenario
                </button>

                {/* Custom Scenario Tabs */}
                {scenarios.map(scenario => (
                  <div key={scenario.id} className="relative group">
                    <button
                      onClick={() => switchToScenario(scenario.id)}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                        activeScenarioId === scenario.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      🎯 {scenario.name}
                    </button>
                    
                    {/* Delete button for custom scenarios */}
                    <button
                      onClick={() => deleteScenario(scenario.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* New Scenario Button */}
                <button
                  onClick={() => {
                    const name = prompt('Scenario name:')
                    if (name) createNewScenario(name)
                  }}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-t-lg hover:bg-blue-100 transition-colors"
                >
                  + New Scenario
                </button>
              </div>

              {/* Scenario Actions */}
              <div className="flex items-center space-x-2">
                {/* Current Scenario Info */}
                <span className="text-sm text-gray-600">
                  {activeScenarioId === 'base' ? 'Base Scenario' : scenarios.find(s => s.id === activeScenarioId)?.name}
                </span>

                {/* Duplicate Scenario */}
                {activeScenarioId !== 'base' && (
                  <button
                    onClick={() => {
                      const name = prompt('New scenario name:')
                      if (name) duplicateScenario(activeScenarioId, name)
                    }}
                    className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    📋 Duplicate
                  </button>
                )}

                {/* Compare Scenarios */}
                <div className="relative">
                  <select
                    onChange={(e) => {
                      if (e.target.value === 'compare' && scenarios.length > 0) {
                        const compareId = prompt(`Compare with scenario (options: base, ${scenarios.map(s => s.name).join(', ')})`)
                        if (compareId) {
                          const targetScenario = compareId === 'base' ? 'base' : scenarios.find(s => s.name === compareId)?.id
                          if (targetScenario) {
                            compareScenarios(activeScenarioId, targetScenario)
                          }
                        }
                      }
                    }}
                    className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    <option value="">🔍 Compare</option>
                    <option value="compare">Compare Scenarios</option>
                  </select>
                </div>

                {/* Export All Scenarios */}
                <button
                  onClick={exportAllScenarios}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  📦 Export All
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            
            {/* Household Configuration */}
            <Accordion
              title="Household & People"
              isOpen={openSections.has('household')}
              onToggle={() => toggleSection('household')}
              badge={`${state.household.people.length} ${state.household.people.length === 1 ? 'person' : 'people'}`}
              status={validateSection('household')}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <FormGroup label="Household Structure">
                    <Select
                      value={state.household.structure}
                      onChange={(value) => updateState('household.structure', value)}
                      options={[
                        { value: 'single', label: 'Single Person' },
                        { value: 'couple', label: 'Couple' }
                      ]}
                    />
                  </FormGroup>

                  <FormGroup label="Current Annual Expenses">
                    <Input
                      type="number"
                      value={state.household.annual_expenses.current}
                      onChange={(value) => updateState('household.annual_expenses.current', Number(value))}
                      placeholder="90000"
                    />
                  </FormGroup>

                  <FormGroup label="Single Person Expenses">
                    <Input
                      type="number"
                      value={state.household.annual_expenses.single_person}
                      onChange={(value) => updateState('household.annual_expenses.single_person', Number(value))}
                      placeholder="60000"
                    />
                  </FormGroup>
                </div>

                <div>
                  <FormGroup label="Non-Super Investments">
                    <Input
                      type="number"
                      value={state.household.assets.non_super_investments}
                      onChange={(value) => updateState('household.assets.non_super_investments', Number(value))}
                      placeholder="100000"
                    />
                  </FormGroup>

                  <FormGroup label="Home Value">
                    <Input
                      type="number"
                      value={state.household.assets.home_value}
                      onChange={(value) => updateState('household.assets.home_value', Number(value))}
                      placeholder="800000"
                    />
                  </FormGroup>

                  <FormGroup label="Mortgage Balance">
                    <Input
                      type="number"
                      value={state.household.assets.mortgage_balance}
                      onChange={(value) => updateState('household.assets.mortgage_balance', Number(value))}
                      placeholder="400000"
                    />
                  </FormGroup>
                </div>
              </div>

              {/* People Details */}
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">People</h3>
                <div className="space-y-6">
                  {state.household.people.map((person, index) => (
                    <div key={person.id} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-4">{person.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormGroup label="Birth Year">
                          <Input
                            type="number"
                            value={person.birth_year}
                            onChange={(value) => updateState(`household.people.${index}.birth_year`, Number(value))}
                            placeholder="1985"
                          />
                        </FormGroup>
                        <FormGroup label="Annual Salary">
                          <Input
                            type="number"
                            value={person.annual_salary}
                            onChange={(value) => updateState(`household.people.${index}.annual_salary`, Number(value))}
                            placeholder="120000"
                          />
                        </FormGroup>
                        <FormGroup label="Current Super Balance">
                          <Input
                            type="number"
                            value={person.super_balance}
                            onChange={(value) => updateState(`household.people.${index}.super_balance`, Number(value))}
                            placeholder="200000"
                          />
                        </FormGroup>
                        <FormGroup label="Target FIRE Age">
                          <Input
                            type="number"
                            value={person.fire_age || ''}
                            onChange={(value) => updateState(`household.people.${index}.fire_age`, value ? Number(value) : undefined)}
                            placeholder="55"
                          />
                        </FormGroup>
                        <FormGroup label="Life Expectancy">
                          <Input
                            type="number"
                            value={person.life_expectancy}
                            onChange={(value) => updateState(`household.people.${index}.life_expectancy`, Number(value))}
                            placeholder="90"
                          />
                        </FormGroup>
                        <FormGroup label="Extra Super Contribution Rate">
                          <Input
                            type="number"
                            value={(person.super_contribution_rate * 100).toFixed(1)}
                            onChange={(value) => updateState(`household.people.${index}.super_contribution_rate`, Number(value) / 100)}
                            placeholder="5.0"
                          />
                          <span className="text-sm text-gray-500">% above SG rate</span>
                        </FormGroup>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Accordion>

            {/* Strategy Configuration */}
            <Accordion
              title="FIRE Strategy"
              isOpen={openSections.has('strategy')}
              onToggle={() => toggleSection('strategy')}
              badge={state.strategy.household.type.replace(/_/g, ' ')}
              status={validateSection('strategy')}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <FormGroup label="Household Strategy">
                    <Select
                      value={state.strategy.household.type}
                      onChange={(value) => updateState('strategy.household.type', value)}
                      options={[
                        { value: 'both_fire_together', label: 'Both FIRE Together' },
                        { value: 'person1_fire_first', label: 'Person 1 FIREs First' },
                        { value: 'person2_fire_first', label: 'Person 2 FIREs First' },
                        { value: 'staggered_retirement', label: 'Staggered Retirement' }
                      ]}
                    />
                  </FormGroup>

                  <FormGroup label="Spenddown Strategy">
                    <Select
                      value={state.strategy.spenddown.type}
                      onChange={(value) => updateState('strategy.spenddown.type', value)}
                      options={[
                        { value: 'sequential', label: 'Sequential (Oldest First)' },
                        { value: 'proportional', label: 'Proportional' },
                        { value: 'tax_optimized', label: 'Tax Optimized' },
                        { value: 'min_drawdown_only', label: 'Minimum Drawdown Only' }
                      ]}
                    />
                  </FormGroup>

                  <FormGroup label="Withdrawal Method">
                    <Select
                      value={state.strategy.spenddown.withdrawal_method}
                      onChange={(value) => updateState('strategy.spenddown.withdrawal_method', value)}
                      options={[
                        { value: 'fixed_real', label: 'Fixed Real (Inflation Adjusted)' },
                        { value: 'fixed_nominal', label: 'Fixed Nominal' },
                        { value: 'dynamic', label: 'Dynamic (Market Based)' },
                        { value: 'guardrails', label: 'Guardrails Strategy' },
                        { value: 'spend_to_zero', label: 'Spend to Zero' }
                      ]}
                    />
                  </FormGroup>
                </div>

                <div>
                  <FormGroup label="Bridge Income (Annual)">
                    <Input
                      type="number"
                      value={state.strategy.bridge.part_time_income.annual_amount}
                      onChange={(value) => updateState('strategy.bridge.part_time_income.annual_amount', Number(value))}
                      placeholder="30000"
                    />
                  </FormGroup>

                  <FormGroup label="Bridge Income Duration (Years)">
                    <Input
                      type="number"
                      value={state.strategy.bridge.part_time_income.years_duration}
                      onChange={(value) => updateState('strategy.bridge.part_time_income.years_duration', Number(value))}
                      placeholder="5"
                    />
                  </FormGroup>

                  <FormGroup label="Longevity Planning Age">
                    <Input
                      type="number"
                      value={state.strategy.spenddown.longevity_planning_age}
                      onChange={(value) => updateState('strategy.spenddown.longevity_planning_age', Number(value))}
                      placeholder="95"
                    />
                  </FormGroup>
                </div>
              </div>
            </Accordion>

            {/* Return Assumptions */}
            <Accordion
              title="Return Assumptions"
              isOpen={openSections.has('returns')}
              onToggle={() => toggleSection('returns')}
              badge={`${(state.returns.assumptions.super_return_rate * 100).toFixed(1)}% super returns`}
              status={validateSection('returns')}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <FormGroup label="Return Scenario">
                    <Select
                      value={state.returns.scenario}
                      onChange={(value) => updateState('returns.scenario', value)}
                      options={[
                        { value: 'conservative', label: 'Conservative (5.5% / 5%)' },
                        { value: 'base', label: 'Base Case (7% / 6.5%)' },
                        { value: 'optimistic', label: 'Optimistic (8.5% / 8%)' }
                      ]}
                    />
                  </FormGroup>

                  <FormGroup label="Super Return Rate (%)">
                    <Input
                      type="number"
                      value={(state.returns.assumptions.super_return_rate * 100).toFixed(2)}
                      onChange={(value) => updateState('returns.assumptions.super_return_rate', Number(value) / 100)}
                      placeholder="7.0"
                    />
                  </FormGroup>

                  <FormGroup label="Non-Super Return Rate (%)">
                    <Input
                      type="number"
                      value={(state.returns.assumptions.non_super_return_rate * 100).toFixed(2)}
                      onChange={(value) => updateState('returns.assumptions.non_super_return_rate', Number(value) / 100)}
                      placeholder="6.5"
                    />
                  </FormGroup>
                </div>

                <div>
                  <FormGroup label="Inflation Rate (%)">
                    <Input
                      type="number"
                      value={(state.returns.assumptions.inflation_rate * 100).toFixed(2)}
                      onChange={(value) => updateState('returns.assumptions.inflation_rate', Number(value) / 100)}
                      placeholder="2.5"
                    />
                  </FormGroup>

                  <div className="flex items-center space-x-3 mb-4">
                    <input
                      type="checkbox"
                      id="monte-carlo"
                      checked={state.options.include_monte_carlo}
                      onChange={(e) => updateState('options.include_monte_carlo', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="monte-carlo" className="text-sm font-medium text-gray-700">
                      Include Monte Carlo Analysis
                    </label>
                  </div>

                  <FormGroup label="Projection Years">
                    <Input
                      type="number"
                      value={state.options.projection_years}
                      onChange={(value) => updateState('options.projection_years', Number(value))}
                      placeholder="40"
                    />
                  </FormGroup>
                </div>
              </div>
            </Accordion>

            {/* Results */}
            {(state.results || state.isCalculating || state.error) && (
              <Accordion
                title="Results"
                isOpen={openSections.has('results')}
                onToggle={() => toggleSection('results')}
                badge={state.results ? `${state.results.timeline.length} years projected` : state.isCalculating ? 'Calculating...' : 'Error'}
                status={state.results ? 'valid' : state.error ? 'invalid' : 'pending'}
              >
                {state.isCalculating && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Running FIRE calculation...</p>
                  </div>
                )}

                {state.error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-800">Calculation Error: {state.error}</p>
                  </div>
                )}

                {state.results && (
                  <div className="space-y-6">
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900">FIRE Feasible</h4>
                        <p className="text-2xl font-bold text-blue-600">
                          {state.results.metrics.fire_feasible ? 'Yes' : 'No'}
                        </p>
                        <p className="text-sm text-blue-700">
                          Confidence: {state.results.metrics.fire_confidence_score}%
                        </p>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-medium text-green-900">Bridge Years</h4>
                        <p className="text-2xl font-bold text-green-600">
                          {state.results.metrics.bridge_years_needed}
                        </p>
                        <p className="text-sm text-green-700">
                          Required: ${state.results.metrics.bridge_required_today.toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-medium text-purple-900">Timeline</h4>
                        <p className="text-2xl font-bold text-purple-600">
                          {state.results.timeline.length} years
                        </p>
                        <p className="text-sm text-purple-700">
                          To age {Math.max(...state.household.people.map(p => p.life_expectancy))}
                        </p>
                      </div>
                    </div>

                    {/* Major Risks */}
                    {state.results.metrics.major_risks.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <h4 className="font-medium text-red-900 mb-2">Major Risks</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {state.results.metrics.major_risks.map((risk, index) => (
                            <li key={index} className="text-red-800 text-sm">{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Optimization Opportunities */}
                    {state.results.metrics.optimization_opportunities.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <h4 className="font-medium text-yellow-900 mb-2">Optimization Opportunities</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {state.results.metrics.optimization_opportunities.map((opportunity, index) => (
                            <li key={index} className="text-yellow-800 text-sm">{opportunity}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Timeline Preview */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Timeline Preview (First 10 Years)</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ages</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Super</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bridge Income</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Surplus/Deficit</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {state.results.timeline.slice(0, 10).map((row, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                <td className="px-3 py-2 text-sm text-gray-900">{row.year}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">
                                  {Object.values(row.ages).join(', ')}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  ${row.total_super.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  ${row.bridge_income.total_bridge_income.toLocaleString()}
                                </td>
                                <td className={`px-3 py-2 text-sm ${row.surplus_deficit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ${row.surplus_deficit.toLocaleString()}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                    row.fire_feasible 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {row.fire_feasible ? 'Feasible' : 'Not Feasible'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Monte Carlo Results */}
                    {state.results.monte_carlo && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-4">Monte Carlo Analysis</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Success Rate</p>
                            <p className="text-lg font-semibold text-green-600">
                              {(state.results.monte_carlo.summary_statistics.success_rate * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Risk of Ruin</p>
                            <p className="text-lg font-semibold text-red-600">
                              {(state.results.monte_carlo.summary_statistics.risk_of_ruin * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Safe Withdrawal Rate</p>
                            <p className="text-lg font-semibold text-blue-600">
                              {(state.results.monte_carlo.summary_statistics.safe_withdrawal_rate * 100).toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Accordion>
            )}

          </div>
        </main>

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Share Your FIRE Plan</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shareable URL
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(shareUrl)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    This link contains your complete FIRE plan configuration and can be shared with others.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      copyToClipboard(shareUrl)
                      setShowShareModal(false)
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Copy & Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scenario Comparison Modal */}
        {showScenarioComparison && scenarioComparison && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-medium text-gray-900">Scenario Comparison</h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={exportScenarioComparison}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                    >
                      📦 Export Comparison
                    </button>
                    <button
                      onClick={() => setShowScenarioComparison(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-6 text-sm">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                    <span className="font-medium">{scenarioComparison.baseScenario.name}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                    <span className="font-medium">{scenarioComparison.compareScenario.name}</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Differences Summary */}
                {scenarioComparison.diffs.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                      Found {scenarioComparison.diffs.length} difference{scenarioComparison.diffs.length !== 1 ? 's' : ''}
                    </h4>
                    
                    <div className="space-y-3">
                      {scenarioComparison.diffs.map((diff, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900">{diff.label}</h5>
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                              {diff.type}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                              <div className="font-medium text-blue-700 mb-1">{scenarioComparison.baseScenario.name}</div>
                              <div className="text-gray-700">
                                {typeof diff.baseValue === 'object' 
                                  ? JSON.stringify(diff.baseValue, null, 2)
                                  : String(diff.baseValue)
                                }
                              </div>
                            </div>
                            
                            <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
                              <div className="font-medium text-green-700 mb-1">{scenarioComparison.compareScenario.name}</div>
                              <div className="text-gray-700">
                                {typeof diff.compareValue === 'object' 
                                  ? JSON.stringify(diff.compareValue, null, 2)
                                  : String(diff.compareValue)
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-lg mb-2">✅</div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Differences Found</h4>
                    <p className="text-gray-600">These scenarios have identical configurations.</p>
                  </div>
                )}

                {/* Side-by-Side Results Comparison */}
                {scenarioComparison.baseScenario.results && scenarioComparison.compareScenario.results && (
                  <div className="mt-8 border-t pt-8">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Results Comparison</h4>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <h5 className="font-medium text-blue-700 mb-3">{scenarioComparison.baseScenario.name}</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>FIRE Target Age:</span>
                            <span className="font-medium">{scenarioComparison.baseScenario.results.request_summary.fire_ages?.[0] || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Years to FIRE:</span>
                            <span className="font-medium">{scenarioComparison.baseScenario.results.metrics.bridge_years_needed || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Target:</span>
                            <span className="font-medium">
                              ${scenarioComparison.baseScenario.results.request_summary.total_current_super?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                        <h5 className="font-medium text-green-700 mb-3">{scenarioComparison.compareScenario.name}</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>FIRE Target Age:</span>
                            <span className="font-medium">{scenarioComparison.compareScenario.results.request_summary.fire_ages?.[0] || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Years to FIRE:</span>
                            <span className="font-medium">{scenarioComparison.compareScenario.results.metrics.bridge_years_needed || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Target:</span>
                            <span className="font-medium">
                              ${scenarioComparison.compareScenario.results.request_summary.total_current_super?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}