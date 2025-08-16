#!/usr/bin/env node

const fs = require('fs');

async function testImports() {
  console.log('🧪 Testing CSV import APIs...');
  
  // Test PayCalculator import
  try {
    console.log('\n📊 Testing PayCalculator import...');
    const paycalcContent = fs.readFileSync('paycalculator-summary (2).csv', 'utf8');
    
    const paycalcResponse = await fetch('http://localhost:3001/api/import/paycalculator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csv_content: paycalcContent,
        filename: 'paycalculator-summary.csv'
      })
    });
    
    const paycalcResult = await paycalcResponse.json();
    console.log('PayCalculator Result:', JSON.stringify(paycalcResult, null, 2));
    
  } catch (error) {
    console.error('PayCalculator test failed:', error.message);
  }

  // Test Mortgage Monster import
  try {
    console.log('\n🏠 Testing Mortgage Monster import...');
    const mortgageContent = fs.readFileSync('mortgage.monster - PropertyValue.csv', 'utf8');
    
    const mortgageResponse = await fetch('http://localhost:3001/api/import/mortgage-monster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csv_content: mortgageContent,
        filename: 'mortgage-monster-property.csv',
        property_name: 'Test Property'
      })
    });
    
    const mortgageResult = await mortgageResponse.json();
    console.log('Mortgage Monster Result:', JSON.stringify(mortgageResult, null, 2));
    
  } catch (error) {
    console.error('Mortgage Monster test failed:', error.message);
  }
}

testImports().catch(console.error);