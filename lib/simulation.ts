import { calculateIncomeTax, calculateSuperContribution } from './calculations'
import { calculatePropertyCashflow, calculatePropertySaleProceeds } from './property'

export interface ProjectionInput {
  scenario: any
  accounts: any[]
  currentNetWorth: number
  projectionYears: number
}

export interface ProjectionPoint {
  year: number
  age: number
  netWorth: number
  superBalance: number
  propertyValue: number
  totalAssets: number
  totalLiabilities: number
  fireProgress: number
}

export async function runProjection(input: ProjectionInput): Promise<ProjectionPoint[]> {
  const { scenario, accounts, currentNetWorth, projectionYears } = input
  
  const startingAge = 35
  const targetFireAmount = scenario.target_fire_amount || 1250000
  
  const superAccounts = accounts.filter(acc => acc.category === 'super')
  const propertyAccounts = accounts.filter(acc => acc.category === 'property')
  const loanAccounts = accounts.filter(acc => acc.category === 'loan')
  
  let currentSuper = superAccounts.reduce((sum, acc) => sum + acc.current_balance, 0)
  let currentProperty = propertyAccounts.reduce((sum, acc) => sum + acc.current_balance, 0)
  let currentLoans = loanAccounts.reduce((sum, acc) => sum + Math.abs(acc.current_balance), 0)
  
  const baseIncome = getBaseIncome(scenario.employment_status)
  const incomeReduction = scenario.income_reduction || 0
  const adjustedIncome = baseIncome * (1 - incomeReduction / 100)
  
  const projection: ProjectionPoint[] = []
  
  let netWorth = currentNetWorth
  let superBalance = currentSuper
  let propertyValue = currentProperty
  let loanBalance = currentLoans
  
  if (scenario.lump_sum_amount && scenario.lump_sum_allocation) {
    const allocation = allocateLumpSum(
      scenario.lump_sum_amount,
      scenario.lump_sum_allocation,
      { superBalance, loanBalance }
    )
    superBalance += allocation.toSuper
    loanBalance -= allocation.toLoan
    netWorth += scenario.lump_sum_amount - allocation.toLoan
  }
  
  if (scenario.property_action === 'sell') {
    const saleProceeds = calculatePropertySaleProceeds(propertyValue, loanBalance)
    netWorth += saleProceeds.netProceeds
    propertyValue = 0
    loanBalance = 0
  }
  
  for (let year = 0; year <= projectionYears; year++) {
    const age = startingAge + year
    
    if (year > 0) {
      const yearlyGrowth = calculateYearlyGrowth(
        adjustedIncome,
        superBalance,
        propertyValue,
        loanBalance,
        age
      )
      
      netWorth += yearlyGrowth.netWorthChange
      superBalance += yearlyGrowth.superGrowth
      propertyValue *= 1.05
      
      if (loanBalance > 0) {
        const mortgagePayment = calculateMortgagePayment(loanBalance)
        loanBalance = Math.max(0, loanBalance - mortgagePayment.principal)
        netWorth += mortgagePayment.principal
      }
    }
    
    const totalAssets = netWorth + loanBalance
    const fireProgress = Math.min(100, (netWorth / targetFireAmount) * 100)
    
    projection.push({
      year,
      age,
      netWorth: Math.round(netWorth),
      superBalance: Math.round(superBalance),
      propertyValue: Math.round(propertyValue),
      totalAssets: Math.round(totalAssets),
      totalLiabilities: Math.round(loanBalance),
      fireProgress: Math.round(fireProgress * 100) / 100
    })
  }
  
  return projection
}

function getBaseIncome(employmentStatus: string): number {
  switch (employmentStatus) {
    case 'full_time':
      return 180000
    case 'part_time':
      return 120000
    case 'retired':
      return 0
    default:
      return 150000
  }
}

function allocateLumpSum(
  amount: number,
  allocation: string,
  balances: { superBalance: number; loanBalance: number }
) {
  switch (allocation) {
    case 'mortgage':
      return { toSuper: 0, toLoan: Math.min(amount, balances.loanBalance) }
    case 'super':
      return { toSuper: amount, toLoan: 0 }
    case 'investment':
      return { toSuper: 0, toLoan: 0 }
    case 'mixed':
      const halfAmount = amount / 2
      return {
        toSuper: halfAmount,
        toLoan: Math.min(halfAmount, balances.loanBalance)
      }
    default:
      return { toSuper: 0, toLoan: 0 }
  }
}

function calculateYearlyGrowth(
  income: number,
  superBalance: number,
  propertyValue: number,
  loanBalance: number,
  age: number
) {
  const tax = calculateIncomeTax(income)
  const afterTaxIncome = income - tax
  
  const superContribution = calculateSuperContribution(income, age)
  const superGrowth = (superBalance + superContribution) * 0.07
  
  const expenses = 80000
  const savings = Math.max(0, afterTaxIncome - expenses)
  
  const investmentGrowth = savings * 0.08
  
  return {
    netWorthChange: savings + investmentGrowth,
    superGrowth: superContribution + superGrowth * 0.85,
    tax,
    expenses
  }
}

function calculateMortgagePayment(balance: number) {
  const annualRate = 0.06
  const monthlyRate = annualRate / 12
  const years = 25
  const totalPayments = years * 12
  
  const monthlyPayment = balance * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
    (Math.pow(1 + monthlyRate, totalPayments) - 1)
  
  const monthlyInterest = balance * monthlyRate
  const monthlyPrincipal = monthlyPayment - monthlyInterest
  
  return {
    total: monthlyPayment * 12,
    interest: monthlyInterest * 12,
    principal: monthlyPrincipal * 12
  }
}