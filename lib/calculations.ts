export function calculateIncomeTax(income: number): number {
  const taxBrackets = [
    { min: 0, max: 18200, rate: 0 },
    { min: 18200, max: 45000, rate: 0.19 },
    { min: 45000, max: 120000, rate: 0.325 },
    { min: 120000, max: 180000, rate: 0.37 },
    { min: 180000, max: Infinity, rate: 0.45 }
  ]
  
  let tax = 0
  
  for (const bracket of taxBrackets) {
    if (income > bracket.min) {
      const taxableInThisBracket = Math.min(income, bracket.max) - bracket.min
      tax += taxableInThisBracket * bracket.rate
    }
  }
  
  const medicareLevy = income * 0.02
  
  return tax + medicareLevy
}

export function calculateSuperContribution(income: number, age: number): number {
  const superRate = 0.105
  const mandatoryContribution = income * superRate
  
  const concessionalCap = age >= 50 ? 27500 : 25000
  const maxAdditionalContribution = Math.max(0, concessionalCap - mandatoryContribution)
  
  const voluntaryContribution = Math.min(5000, maxAdditionalContribution)
  
  return mandatoryContribution + voluntaryContribution
}

export function calculateAfterTaxIncome(income: number): number {
  const tax = calculateIncomeTax(income)
  return income - tax
}

export function calculateFIRENumber(annualExpenses: number, withdrawalRate: number = 0.04): number {
  return annualExpenses / withdrawalRate
}

export function calculateTimeToFIRE(
  currentNetWorth: number,
  targetAmount: number,
  annualSavings: number,
  investmentReturn: number = 0.07
): number {
  if (annualSavings <= 0) return Infinity
  
  const monthlyReturn = investmentReturn / 12
  const monthlyPayment = annualSavings / 12
  
  if (currentNetWorth >= targetAmount) return 0
  
  const futureValue = targetAmount - currentNetWorth
  
  const months = Math.log(1 + (futureValue * monthlyReturn) / monthlyPayment) / Math.log(1 + monthlyReturn)
  
  return Math.ceil(months / 12)
}

export function calculateCompoundGrowth(
  principal: number,
  rate: number,
  years: number,
  additionalContributions: number = 0
): number {
  if (additionalContributions === 0) {
    return principal * Math.pow(1 + rate, years)
  }
  
  const futureValuePrincipal = principal * Math.pow(1 + rate, years)
  const futureValueAnnuity = additionalContributions * (Math.pow(1 + rate, years) - 1) / rate
  
  return futureValuePrincipal + futureValueAnnuity
}

export function calculateSuperBalance(
  currentBalance: number,
  annualContributions: number,
  years: number,
  returnRate: number = 0.07,
  age: number = 35
): { balance: number; accessibleAt: number } {
  const preservationAge = 60
  const yearsToAccess = Math.max(0, preservationAge - age)
  
  const balance = calculateCompoundGrowth(currentBalance, returnRate, years, annualContributions)
  
  return {
    balance,
    accessibleAt: age + yearsToAccess
  }
}

export function calculateMortgagePayoff(
  principal: number,
  rate: number,
  extraPayments: number = 0
): { years: number; totalInterest: number; monthlySavings: number } {
  const monthlyRate = rate / 12
  const years = 30
  const totalPayments = years * 12
  
  const baseMonthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
    (Math.pow(1 + monthlyRate, totalPayments) - 1)
  
  const monthlyPaymentWithExtra = baseMonthlyPayment + extraPayments
  
  let remainingBalance = principal
  let months = 0
  let totalInterest = 0
  
  while (remainingBalance > 0 && months < totalPayments) {
    const interestPayment = remainingBalance * monthlyRate
    const principalPayment = Math.min(monthlyPaymentWithExtra - interestPayment, remainingBalance)
    
    totalInterest += interestPayment
    remainingBalance -= principalPayment
    months++
  }
  
  const yearsToPayoff = months / 12
  const interestSavings = (baseMonthlyPayment * totalPayments) - (principal + totalInterest)
  
  return {
    years: yearsToPayoff,
    totalInterest,
    monthlySavings: interestSavings / months
  }
}