#!/usr/bin/env node

const fs = require('fs');

async function testHouseholdImport() {
  console.log('🏠 Testing Household PayCalculator imports...');
  
  // Test import for first household member
  try {
    console.log('\n👤 Testing import for Member 1...');
    const paycalcContent = fs.readFileSync('paycalculator-summary (2).csv', 'utf8');
    
    const member1Response = await fetch('http://localhost:3001/api/import/paycalculator-household', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csv_content: paycalcContent,
        filename: 'member1-paycalc.csv',
        member_name: 'John Smith',
        member_role: 'primary'
      })
    });
    
    const member1Result = await member1Response.json();
    console.log('Member 1 Result:', JSON.stringify(member1Result, null, 2));
    
  } catch (error) {
    console.error('Member 1 import failed:', error.message);
  }

  // Test import for second household member (simulate different income)
  try {
    console.log('\n👤 Testing import for Member 2...');
    const paycalcContent = fs.readFileSync('paycalculator-summary (2).csv', 'utf8');
    
    // Simulate a partner with lower income by modifying the CSV content
    const modifiedContent = paycalcContent.replace('95102', '75000').replace('54612.84', '55000');
    
    const member2Response = await fetch('http://localhost:3001/api/import/paycalculator-household', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csv_content: modifiedContent,
        filename: 'member2-paycalc.csv',
        member_name: 'Sarah Smith',
        member_role: 'partner'
      })
    });
    
    const member2Result = await member2Response.json();
    console.log('Member 2 Result:', JSON.stringify(member2Result, null, 2));
    
  } catch (error) {
    console.error('Member 2 import failed:', error.message);
  }

  // Test household summary API
  try {
    console.log('\n🏠 Testing household summary API...');
    
    const summaryResponse = await fetch('http://localhost:3001/api/household/income-summary');
    const summaryResult = await summaryResponse.json();
    
    console.log('Household Summary:', JSON.stringify(summaryResult, null, 2));
    
  } catch (error) {
    console.error('Household summary failed:', error.message);
  }
}

testHouseholdImport().catch(console.error);