// POC Test Page - Upload CSVs and test FIRE projections
import { useState } from 'react'
import { useRouter } from 'next/router'

interface ProjectionResult {
  currentPosition: {
    combinedIncome: number
    combinedTakeHome: number
    combinedSuperBalance: number
    propertyEquity: number
    netWorth: number
  }
  milestones: {
    fireAchievementYear: number | null
    superPreservationYear: number
    loanPayoffYear: number | null
    superBalanceAtPreservation: number
    superBalanceAtFire: number | null
  }
  yearlyProjections: any[]
}

export default function POCTest() {
  const [householdId, setHouseholdId] = useState('')
  const [primaryMemberId, setPrimaryMemberId] = useState('')
  const [partnerMemberId, setPartnerMemberId] = useState('')
  const [projection, setProjection] = useState<ProjectionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Create household and members
  const setupHousehold = async () => {
    setLoading(true)
    try {
      // This would typically be done via API, but for POC we'll simulate
      const tempHouseholdId = 'household-poc-' + Date.now()
      const tempPrimaryId = 'member-primary-' + Date.now()
      const tempPartnerId = 'member-partner-' + Date.now()
      
      setHouseholdId(tempHouseholdId)
      setPrimaryMemberId(tempPrimaryId)
      setPartnerMemberId(tempPartnerId)
      setMessage('Household setup complete - ready for data import')
    } catch (error) {
      setMessage('Error setting up household: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
    setLoading(false)
  }

  // Handle PayCalculator CSV upload
  const handlePayCalcUpload = async (file: File | null, memberId: string, memberName: string) => {
    if (!file) return

    setLoading(true)
    try {
      const csvContent = await file.text()
      
      const response = await fetch('/api/import/paycalculator-poc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_member_id: memberId,
          csv_content: csvContent,
          filename: file.name,
          member_name: memberName
        })
      })

      const result = await response.json()
      if (result.success) {
        setMessage(`✅ ${memberName} PayCalculator data imported successfully`)
      } else {
        setMessage(`❌ Error importing ${memberName} data: ${result.error}`)
      }
    } catch (error) {
      setMessage('Error uploading PayCalculator data: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
    setLoading(false)
  }

  // Handle Mortgage Monster CSV upload
  const handleMortgageUpload = async (file: File | null) => {
    if (!file) return

    setLoading(true)
    try {
      const csvContent = await file.text()
      
      const response = await fetch('/api/import/mortgage-monster-poc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_id: householdId,
          csv_content: csvContent,
          filename: file.name,
          loan_name: 'Main Property Loan'
        })
      })

      const result = await response.json()
      if (result.success) {
        setMessage('✅ Mortgage data imported successfully')
      } else {
        setMessage('❌ Error importing mortgage data: ' + result.error)
      }
    } catch (error) {
      setMessage('Error uploading mortgage data: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
    setLoading(false)
  }

  // Update super balances
  const updateSuperBalance = async (memberId: string, memberName: string, balance: string | number) => {
    setLoading(true)
    try {
      const response = await fetch('/api/super/update-balance-poc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_member_id: memberId,
          fund_name: `${memberName} Super Fund`,
          current_balance: balance
        })
      })

      const result = await response.json()
      if (result.success) {
        setMessage(`✅ ${memberName} super balance updated`)
      } else {
        setMessage(`❌ Error updating ${memberName} super: ${result.error}`)
      }
    } catch (error) {
      setMessage('Error updating super balance: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
    setLoading(false)
  }

  // Run FIRE projection
  const runProjection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/fire/projection-poc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_id: householdId
        })
      })

      const result = await response.json()
      if (result.success) {
        setProjection(result.projection)
        setMessage('✅ FIRE projection calculated successfully!')
      } else {
        setMessage('❌ Error calculating projection: ' + result.error)
      }
    } catch (error) {
      setMessage('Error running projection: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">FIRE Planner POC Test</h1>
      
      {message && (
        <div className={`p-4 mb-6 rounded ${message.includes('❌') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Step 1: Setup Household */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Step 1: Setup Household</h2>
        {!householdId ? (
          <button 
            onClick={setupHousehold}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Create Household'}
          </button>
        ) : (
          <div className="text-green-600">
            ✅ Household created - ID: {householdId}
          </div>
        )}
      </div>

      {householdId && (
        <>
          {/* Step 2: Upload PayCalculator Data */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Step 2: Upload PayCalculator CSVs</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Your PayCalculator CSV</h3>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={(e) => handlePayCalcUpload(e.target.files?.[0] || null, primaryMemberId, 'Primary')}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Partner PayCalculator CSV</h3>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={(e) => handlePayCalcUpload(e.target.files?.[0] || null, partnerMemberId, 'Partner')}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Upload Mortgage Data */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Step 3: Upload Mortgage Monster CSV</h2>
            <input 
              type="file" 
              accept=".csv"
              onChange={(e) => handleMortgageUpload(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Step 4: Super Balances */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Step 4: Enter Current Super Balances</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Your Super Balance</h3>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    placeholder="e.g., 180000"
                    id="primarySuper"
                    className="flex-1 px-3 py-2 border rounded"
                  />
                  <button 
                    onClick={() => {
                      const element = document.getElementById('primarySuper') as HTMLInputElement
                      const balance = element?.value
                      if (balance) updateSuperBalance(primaryMemberId, 'Primary', balance)
                    }}
                    disabled={loading}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    Update
                  </button>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Partner Super Balance</h3>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    placeholder="e.g., 150000"
                    id="partnerSuper"
                    className="flex-1 px-3 py-2 border rounded"
                  />
                  <button 
                    onClick={() => {
                      const element = document.getElementById('partnerSuper') as HTMLInputElement
                      const balance = element?.value
                      if (balance) updateSuperBalance(partnerMemberId, 'Partner', balance)
                    }}
                    disabled={loading}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5: Run Projection */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Step 5: Run FIRE Projection</h2>
            <button 
              onClick={runProjection}
              disabled={loading}
              className="bg-purple-500 text-white px-6 py-3 rounded hover:bg-purple-600 disabled:opacity-50 text-lg"
            >
              {loading ? 'Calculating...' : 'Calculate FIRE Timeline'}
            </button>
          </div>

          {/* Results */}
          {projection && (
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">FIRE Projection Results</h2>
              
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded">
                  <h3 className="font-medium text-blue-900">Current Net Worth</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    ${projection.currentPosition.netWorth.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded">
                  <h3 className="font-medium text-green-900">FIRE Achievement</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {projection.milestones.fireAchievementYear || 'Not achieved in 35 years'}
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded">
                  <h3 className="font-medium text-purple-900">Super at Age 60</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    ${projection.milestones.superBalanceAtPreservation.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-medium mb-2">Key Milestones:</h3>
                <ul className="space-y-1 text-sm">
                  <li>🏠 Loan payoff: {projection.milestones.loanPayoffYear || 'Not specified'}</li>
                  <li>🏆 Super preservation age: {projection.milestones.superPreservationYear}</li>
                  <li>🔥 FIRE achievement: {projection.milestones.fireAchievementYear || 'Beyond 35 years'}</li>
                </ul>
              </div>

              <div className="text-xs text-gray-500">
                This is a simplified POC projection. Full implementation will include more detailed modeling, 
                stress testing, and multiple scenarios.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}