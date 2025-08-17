// Australian superannuation preservation age calculator
// Based on birth year as per ATO rules

export function validateBirthYear(birthYear: number): { isValid: boolean; error?: string } {
  const currentYear = new Date().getFullYear()
  
  if (!birthYear || isNaN(birthYear)) {
    return { isValid: false, error: 'Birth year is required' }
  }
  
  if (birthYear < 1940) {
    return { isValid: false, error: 'Birth year seems too early (before 1940)' }
  }
  
  if (birthYear > currentYear - 18) {
    return { isValid: false, error: 'Must be at least 18 years old' }
  }
  
  return { isValid: true }
}

export function calculatePreservationAge(birthYear: number): number {
  if (birthYear < 1960) return 55
  if (birthYear >= 1960 && birthYear <= 1964) {
    // Graduated preservation age for transition period
    const ageMap: { [key: number]: number } = {
      1960: 56,
      1961: 57,
      1962: 58,
      1963: 59,
      1964: 60
    }
    return ageMap[birthYear] || 60
  }
  if (birthYear >= 1965) return 60
  
  // Fallback (shouldn't reach here)
  return 60
}

export function getPreservationAgeDescription(birthYear: number): string {
  const age = calculatePreservationAge(birthYear)
  
  if (birthYear < 1960) {
    return `Preservation age ${age} (born before 1960)`
  } else if (birthYear >= 1960 && birthYear <= 1964) {
    return `Preservation age ${age} (graduated scale for ${birthYear})`
  } else {
    return `Preservation age ${age} (born 1965 or later)`
  }
}

export function getPreservationAgeExplanation(birthYear: number): string {
  const age = calculatePreservationAge(birthYear)
  
  if (birthYear < 1960) {
    return `You can access your super at age ${age}. This is the lowest preservation age available.`
  } else if (birthYear >= 1960 && birthYear <= 1964) {
    return `You can access your super at age ${age}. This age increases gradually for birth years 1960-1964.`
  } else {
    return `You can access your super at age ${age}. This is the standard preservation age for people born from 1965 onwards.`
  }
}

export function canAccessSuper(currentAge: number, birthYear: number): boolean {
  const preservationAge = calculatePreservationAge(birthYear)
  return currentAge >= preservationAge
}

export function yearsUntilSuperAccess(currentAge: number, birthYear: number): number {
  const preservationAge = calculatePreservationAge(birthYear)
  return Math.max(0, preservationAge - currentAge)
}