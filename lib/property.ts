export interface PropertyCashflow {
  rentalIncome: number
  expenses: number
  mortgagePayments: number
  netCashflow: number
  taxBenefit: number
  annualReturn: number
}

export interface PropertySaleResult {
  salePrice: number
  sellingCosts: number
  capitalGains: number
  capitalGainsTax: number
  mortgagePayoff: number
  netProceeds: number
}

export function calculatePropertyCashflow(
  propertyValue: number,
  mortgageBalance: number,
  rentalYield: number = 0.04,
  taxRate: number = 0.37
): PropertyCashflow {
  const rentalIncome = propertyValue * rentalYield
  
  const managementFees = rentalIncome * 0.08
  const insurance = 1200
  const rates = 2500
  const maintenance = propertyValue * 0.01
  const expenses = managementFees + insurance + rates + maintenance
  
  const interestRate = 0.06
  const mortgagePayments = mortgageBalance * interestRate
  
  const netRentalIncome = rentalIncome - expenses - mortgagePayments
  
  const negativeGearing = netRentalIncome < 0
  const taxBenefit = negativeGearing ? Math.abs(netRentalIncome) * taxRate : 0
  
  const depreciation = propertyValue * 0.025
  const depreciationTaxBenefit = depreciation * taxRate
  
  const totalTaxBenefit = taxBenefit + depreciationTaxBenefit
  
  const netCashflow = netRentalIncome + totalTaxBenefit
  
  const capitalGrowth = propertyValue * 0.05
  const annualReturn = netCashflow + capitalGrowth
  
  return {
    rentalIncome,
    expenses,
    mortgagePayments,
    netCashflow,
    taxBenefit: totalTaxBenefit,
    annualReturn
  }
}

export function calculatePropertySaleProceeds(
  propertyValue: number,
  mortgageBalance: number,
  purchasePrice: number = propertyValue * 0.7,
  holdingPeriod: number = 5,
  taxRate: number = 0.37
): PropertySaleResult {
  const salePrice = propertyValue
  
  const agentFees = salePrice * 0.025
  const legalFees = 1500
  const marketingCosts = 3000
  const sellingCosts = agentFees + legalFees + marketingCosts
  
  const capitalGains = salePrice - purchasePrice - sellingCosts
  
  const cgtDiscount = holdingPeriod >= 1 ? 0.5 : 0
  const taxableCapitalGains = capitalGains * (1 - cgtDiscount)
  const capitalGainsTax = Math.max(0, taxableCapitalGains * taxRate)
  
  const netProceeds = salePrice - sellingCosts - capitalGainsTax - mortgageBalance
  
  return {
    salePrice,
    sellingCosts,
    capitalGains,
    capitalGainsTax,
    mortgagePayoff: mortgageBalance,
    netProceeds
  }
}

export function calculateNegativeGearingBenefit(
  rentalIncome: number,
  deductibleExpenses: number,
  interestPayments: number,
  depreciation: number,
  taxRate: number = 0.37
): number {
  const totalDeductions = deductibleExpenses + interestPayments + depreciation
  const taxableRentalIncome = rentalIncome - totalDeductions
  
  if (taxableRentalIncome < 0) {
    return Math.abs(taxableRentalIncome) * taxRate
  }
  
  return 0
}

export function calculatePropertyROI(
  propertyValue: number,
  mortgageBalance: number,
  annualCashflow: number,
  annualCapitalGrowth: number
): number {
  const equity = propertyValue - mortgageBalance
  const totalReturn = annualCashflow + annualCapitalGrowth
  
  return equity > 0 ? (totalReturn / equity) * 100 : 0
}