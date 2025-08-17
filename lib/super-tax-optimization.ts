// Super Tax Optimization Engine for Couples
// Determines optimal withdrawal sequence from multiple super accounts

export interface SuperAccount {
  owner: string
  balance: number
  preservation_age: number
  current_age: number
  tax_free_component: number // Portion that's tax-free
  taxable_component: number // Portion subject to tax
  pension_phase_eligible: boolean // Can transition to pension phase
}

export interface TaxBracket {
  min: number
  max: number
  rate: number
  description: string
}

export interface WithdrawalStrategy {
  name: string
  description: string
  tax_efficiency_score: number // 1-10
  sequence: {
    account_owner: string
    years: number[]
    annual_amounts: number[]
    cumulative_tax: number
    rationale: string
  }[]
  total_tax_over_retirement: number
  average_annual_tax: number
  benefits: string[]
  drawbacks: string[]
}

// Australian tax brackets for 2024-25 (simplified for FIRE planning)
export const TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 18200, rate: 0, description: 'Tax-free threshold' },
  { min: 18201, max: 45000, rate: 0.19, description: '19% tax bracket' },
  { min: 45001, max: 120000, rate: 0.325, description: '32.5% tax bracket' },
  { min: 120001, max: 180000, rate: 0.37, description: '37% tax bracket' },
  { min: 180001, max: Infinity, rate: 0.45, description: '45% tax bracket' }
]

export function calculateMarginalTaxRate(income: number): number {
  for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
    if (income >= TAX_BRACKETS[i].min) {
      return TAX_BRACKETS[i].rate
    }
  }
  return 0
}

export function calculateIncomeTax(income: number): number {
  let tax = 0
  let remainingIncome = income

  for (const bracket of TAX_BRACKETS) {
    if (remainingIncome <= 0) break
    
    const taxableInThisBracket = Math.min(
      remainingIncome, 
      bracket.max === Infinity ? remainingIncome : bracket.max - bracket.min + 1
    )
    
    if (bracket.min <= income) {
      tax += taxableInThisBracket * bracket.rate
      remainingIncome -= taxableInThisBracket
    }
  }

  return tax
}

export function calculateSuperWithdrawalTax(
  withdrawalAmount: number,
  account: SuperAccount,
  otherIncome: number = 0
): { tax: number; effectiveRate: number; breakdown: any } {
  // Super withdrawal tax rules (simplified):
  // - Tax-free component: Always tax-free
  // - Taxable component: 
  //   * Age 60+: Tax-free if pension phase
  //   * Age 55-59: 15% tax rate (plus Medicare levy)
  //   * Combined with other income for marginal rate calculation

  const taxFreeAmount = Math.min(withdrawalAmount, account.tax_free_component)
  const taxableAmount = withdrawalAmount - taxFreeAmount
  
  let tax = 0
  let effectiveRate = 0

  if (account.current_age >= 60 && account.pension_phase_eligible) {
    // Tax-free in pension phase after 60
    tax = 0
    effectiveRate = 0
  } else if (account.current_age >= 55) {
    // 15% rate on taxable component for preservation age access
    tax = taxableAmount * 0.15
    effectiveRate = tax / withdrawalAmount
  } else {
    // Not yet at preservation age - shouldn't be withdrawing
    tax = taxableAmount * 0.47 // High penalty rate
    effectiveRate = 0.47
  }

  return {
    tax,
    effectiveRate,
    breakdown: {
      taxFreeAmount,
      taxableAmount,
      marginalRate: calculateMarginalTaxRate(otherIncome + taxableAmount),
      pensionPhaseEligible: account.pension_phase_eligible
    }
  }
}

export function generateWithdrawalStrategies(
  accounts: SuperAccount[],
  annualWithdrawalTarget: number,
  yearsOfWithdrawals: number,
  householdExpenses: number
): WithdrawalStrategy[] {
  const strategies: WithdrawalStrategy[] = []

  // Strategy 1: Sequential - Drain first account completely, then second
  const sequentialStrategy = calculateSequentialStrategy(
    accounts, 
    annualWithdrawalTarget, 
    yearsOfWithdrawals
  )
  strategies.push(sequentialStrategy)

  // Strategy 2: Proportional - Withdraw proportionally from both accounts
  const proportionalStrategy = calculateProportionalStrategy(
    accounts, 
    annualWithdrawalTarget, 
    yearsOfWithdrawals
  )
  strategies.push(proportionalStrategy)

  // Strategy 3: Tax-Optimized - Minimize overall tax burden
  const taxOptimizedStrategy = calculateTaxOptimizedStrategy(
    accounts, 
    annualWithdrawalTarget, 
    yearsOfWithdrawals,
    householdExpenses
  )
  strategies.push(taxOptimizedStrategy)

  // Strategy 4: Longevity-Optimized - Maximize money lasting longest
  const longevityStrategy = calculateLongevityStrategy(
    accounts, 
    annualWithdrawalTarget, 
    yearsOfWithdrawals
  )
  strategies.push(longevityStrategy)

  return strategies.sort((a, b) => b.tax_efficiency_score - a.tax_efficiency_score)
}

function calculateSequentialStrategy(
  accounts: SuperAccount[],
  annualWithdrawalTarget: number,
  yearsOfWithdrawals: number
): WithdrawalStrategy {
  // Determine which account to drain first - typically the one with better tax position
  const sortedAccounts = [...accounts].sort((a, b) => {
    // Prefer account with higher tax-free component percentage
    const aFreePercent = a.tax_free_component / a.balance
    const bFreePercent = b.tax_free_component / b.balance
    return bFreePercent - aFreePercent
  })

  let totalTax = 0
  const sequence = []
  let remainingTarget = annualWithdrawalTarget * yearsOfWithdrawals

  for (const account of sortedAccounts) {
    const yearsToDeplete = Math.min(
      Math.ceil(account.balance / annualWithdrawalTarget),
      Math.ceil(remainingTarget / annualWithdrawalTarget)
    )
    
    const accountWithdrawal = Math.min(account.balance, remainingTarget)
    const annualAmount = accountWithdrawal / yearsToDeplete
    
    let accountTax = 0
    for (let year = 0; year < yearsToDeplete; year++) {
      const { tax } = calculateSuperWithdrawalTax(annualAmount, account)
      accountTax += tax
    }

    sequence.push({
      account_owner: account.owner,
      years: Array.from({ length: yearsToDeplete }, (_, i) => i + 1),
      annual_amounts: Array(yearsToDeplete).fill(annualAmount),
      cumulative_tax: accountTax,
      rationale: `Drain ${account.owner}'s account first due to ${(account.tax_free_component / account.balance * 100).toFixed(0)}% tax-free component`
    })

    totalTax += accountTax
    remainingTarget -= accountWithdrawal

    if (remainingTarget <= 0) break
  }

  return {
    name: 'Sequential Withdrawal',
    description: 'Completely exhaust one super account before touching the other',
    tax_efficiency_score: 7,
    sequence,
    total_tax_over_retirement: totalTax,
    average_annual_tax: totalTax / yearsOfWithdrawals,
    benefits: [
      'Simplified account management',
      'Maximizes tax-free component usage',
      'Reduced ongoing administrative complexity'
    ],
    drawbacks: [
      'May not optimize across tax brackets',
      'Less flexibility for tax planning',
      'Could create uneven tax years'
    ]
  }
}

function calculateProportionalStrategy(
  accounts: SuperAccount[],
  annualWithdrawalTarget: number,
  yearsOfWithdrawals: number
): WithdrawalStrategy {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
  let totalTax = 0
  const sequence = []

  for (const account of accounts) {
    const proportion = account.balance / totalBalance
    const annualAmount = annualWithdrawalTarget * proportion
    
    let accountTax = 0
    for (let year = 0; year < yearsOfWithdrawals; year++) {
      const { tax } = calculateSuperWithdrawalTax(annualAmount, account)
      accountTax += tax
    }

    sequence.push({
      account_owner: account.owner,
      years: Array.from({ length: yearsOfWithdrawals }, (_, i) => i + 1),
      annual_amounts: Array(yearsOfWithdrawals).fill(annualAmount),
      cumulative_tax: accountTax,
      rationale: `Withdraw ${(proportion * 100).toFixed(0)}% from ${account.owner}'s account to maintain balance proportion`
    })

    totalTax += accountTax
  }

  return {
    name: 'Proportional Withdrawal',
    description: 'Withdraw from each account in proportion to their current balances',
    tax_efficiency_score: 6,
    sequence,
    total_tax_over_retirement: totalTax,
    average_annual_tax: totalTax / yearsOfWithdrawals,
    benefits: [
      'Maintains account balance ratios',
      'Spreads tax burden evenly',
      'Preserves flexibility for both partners'
    ],
    drawbacks: [
      'May not be tax-optimal',
      'More complex administration',
      'Doesn\'t prioritize tax-free components'
    ]
  }
}

function calculateTaxOptimizedStrategy(
  accounts: SuperAccount[],
  annualWithdrawalTarget: number,
  yearsOfWithdrawals: number,
  householdExpenses: number
): WithdrawalStrategy {
  // Advanced strategy: Optimize for tax brackets and pension phase transitions
  let totalTax = 0
  const sequence = []

  // Sort accounts by tax efficiency (higher tax-free component first)
  const sortedAccounts = [...accounts].sort((a, b) => {
    const aEfficiency = (a.tax_free_component / a.balance) * (a.pension_phase_eligible ? 1.2 : 1)
    const bEfficiency = (b.tax_free_component / b.balance) * (b.pension_phase_eligible ? 1.2 : 1)
    return bEfficiency - aEfficiency
  })

  // Strategy: Use account with best tax position while staying in lower tax brackets
  for (const account of sortedAccounts) {
    const maxAnnualWithoutPenalty = 45000 // Stay in 19% bracket
    const annualAmount = Math.min(annualWithdrawalTarget, maxAnnualWithoutPenalty)
    const yearsToDeplete = Math.min(
      Math.ceil(account.balance / annualAmount),
      yearsOfWithdrawals
    )
    
    let accountTax = 0
    for (let year = 0; year < yearsToDeplete; year++) {
      const { tax } = calculateSuperWithdrawalTax(annualAmount, account)
      accountTax += tax
    }

    sequence.push({
      account_owner: account.owner,
      years: Array.from({ length: yearsToDeplete }, (_, i) => i + 1),
      annual_amounts: Array(yearsToDeplete).fill(annualAmount),
      cumulative_tax: accountTax,
      rationale: `Optimize ${account.owner}'s withdrawals to stay in lower tax brackets and maximize pension phase benefits`
    })

    totalTax += accountTax
  }

  return {
    name: 'Tax-Optimized Withdrawal',
    description: 'Minimize total tax burden through strategic account sequencing and bracket management',
    tax_efficiency_score: 9,
    sequence,
    total_tax_over_retirement: totalTax,
    average_annual_tax: totalTax / yearsOfWithdrawals,
    benefits: [
      'Minimizes overall tax burden',
      'Optimizes pension phase transitions',
      'Stays within favorable tax brackets',
      'Maximizes tax-free component usage'
    ],
    drawbacks: [
      'More complex to execute',
      'Requires ongoing tax planning',
      'May need professional advice'
    ]
  }
}

function calculateLongevityStrategy(
  accounts: SuperAccount[],
  annualWithdrawalTarget: number,
  yearsOfWithdrawals: number
): WithdrawalStrategy {
  // Strategy: Preserve the account with better growth potential/tax treatment for longer
  const conservationAccount = accounts.reduce((best, current) => {
    const currentScore = (current.tax_free_component / current.balance) + 
                        (current.pension_phase_eligible ? 0.2 : 0)
    const bestScore = (best.tax_free_component / best.balance) + 
                     (best.pension_phase_eligible ? 0.2 : 0)
    return currentScore > bestScore ? current : best
  })

  let totalTax = 0
  const sequence = []

  // Deplete other accounts first, preserve the best one for last
  for (const account of accounts) {
    const isConservationAccount = account.owner === conservationAccount.owner
    const priority = isConservationAccount ? 2 : 1
    
    const annualAmount = isConservationAccount ? 
      annualWithdrawalTarget * 0.3 : // Minimal withdrawal from best account
      annualWithdrawalTarget * 0.7   // Heavy withdrawal from other account
    
    const yearsToDeplete = Math.ceil(account.balance / annualAmount)
    
    let accountTax = 0
    for (let year = 0; year < Math.min(yearsToDeplete, yearsOfWithdrawals); year++) {
      const { tax } = calculateSuperWithdrawalTax(annualAmount, account)
      accountTax += tax
    }

    sequence.push({
      account_owner: account.owner,
      years: Array.from({ length: Math.min(yearsToDeplete, yearsOfWithdrawals) }, (_, i) => i + 1),
      annual_amounts: Array(Math.min(yearsToDeplete, yearsOfWithdrawals)).fill(annualAmount),
      cumulative_tax: accountTax,
      rationale: isConservationAccount ? 
        `Preserve ${account.owner}'s account for longevity due to superior tax treatment` :
        `Draw heavily from ${account.owner}'s account first to preserve better account`
    })

    totalTax += accountTax
  }

  return {
    name: 'Longevity-Optimized Withdrawal',
    description: 'Preserve the account with best tax treatment for longer retirement periods',
    tax_efficiency_score: 8,
    sequence,
    total_tax_over_retirement: totalTax,
    average_annual_tax: totalTax / yearsOfWithdrawals,
    benefits: [
      'Preserves best account for longevity',
      'Maintains flexibility for later years',
      'Optimizes for extended retirement'
    ],
    drawbacks: [
      'May not minimize immediate tax',
      'Complex withdrawal pattern',
      'Requires longer-term planning'
    ]
  }
}

export function recommendOptimalStrategy(
  strategies: WithdrawalStrategy[],
  retirementLength: number,
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
): WithdrawalStrategy {
  if (retirementLength > 30 && riskTolerance === 'conservative') {
    // Long retirement - prioritize longevity
    return strategies.find(s => s.name === 'Longevity-Optimized Withdrawal') || strategies[0]
  } else if (riskTolerance === 'aggressive') {
    // Aggressive - minimize tax
    return strategies.find(s => s.name === 'Tax-Optimized Withdrawal') || strategies[0]
  } else {
    // Moderate - balanced approach
    return strategies.find(s => s.name === 'Sequential Withdrawal') || strategies[0]
  }
}