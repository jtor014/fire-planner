import React from 'react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            FIRE Planner
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Plan your path to Financial Independence and Retire Early with comprehensive 
            scenario modeling and AI-powered financial advice.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Net Worth</h3>
              <p className="text-gray-600">
                Automatically import transactions from Up Bank and manually track investments, 
                super, and property values to maintain an accurate quarterly net worth snapshot.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Scenario Modeling</h3>
              <p className="text-gray-600">
                Model different retirement strategies including employment changes, property decisions, 
                and lump sum allocations to see their impact on your FIRE timeline.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Financial Advisor</h3>
              <p className="text-gray-600">
                Get personalized financial advice using AI that understands your specific situation, 
                goals, and the Australian financial landscape.
              </p>
            </div>
          </div>

          <div className="mt-12 space-x-4">
            <Link 
              href="/dashboard"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors inline-block"
            >
              View Dashboard
            </Link>
            <Link 
              href="/scenarios"
              className="bg-gray-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-700 transition-colors inline-block"
            >
              Create Scenario
            </Link>
          </div>

          <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting Started</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-3">1</div>
                <h3 className="font-semibold mb-2">Set Up Accounts</h3>
                <p className="text-sm text-gray-600">
                  Configure your environment variables with Supabase, Up Bank API, and AI API keys.
                </p>
              </div>
              <div>
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-3">2</div>
                <h3 className="font-semibold mb-2">Import Data</h3>
                <p className="text-sm text-gray-600">
                  Import transactions from Up Bank and manually add your investment accounts.
                </p>
              </div>
              <div>
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-3">3</div>
                <h3 className="font-semibold mb-2">Create Scenarios</h3>
                <p className="text-sm text-gray-600">
                  Model different retirement strategies and get AI-powered financial advice.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}