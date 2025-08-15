// API Endpoint Test Script
// Run with: node tests/api-test.js
// Requires the development server to be running on localhost:3000

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testEndpoint(name, method, url, data = null) {
  try {
    log(colors.blue, `\n🧪 Testing ${name}...`);
    
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    log(colors.green, `✅ ${name} - Status: ${response.status}`);
    
    if (response.data) {
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    log(colors.red, `❌ ${name} - Error: ${error.message}`);
    
    if (error.response) {
      console.log('Error Response:', JSON.stringify(error.response.data, null, 2));
      return { success: false, error: error.response.data, status: error.response.status };
    }
    
    return { success: false, error: error.message, status: null };
  }
}

async function runTests() {
  log(colors.yellow, '🚀 Starting API Tests for FIRE Planner');
  log(colors.yellow, '=' .repeat(50));
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test 1: Create Net Worth Snapshot
  const snapshotTest = await testEndpoint(
    'Create Net Worth Snapshot',
    'POST',
    '/networth/snapshot',
    { notes: 'Test snapshot from API test' }
  );
  results.tests.push({ name: 'Net Worth Snapshot', ...snapshotTest });
  snapshotTest.success ? results.passed++ : results.failed++;
  
  // Test 2: Import Up Bank Transactions (will fail without API key)
  const importTest = await testEndpoint(
    'Import Up Bank Transactions',
    'POST',
    '/import/up',
    { days: 7 }
  );
  results.tests.push({ name: 'Up Bank Import', ...importTest });
  importTest.success ? results.passed++ : results.failed++;
  
  // Test 3: AI Query (will fail without API key)
  const aiTest = await testEndpoint(
    'AI Financial Query',
    'POST',
    '/ai/query',
    { 
      question: 'Should I prioritize paying off debt or investing?',
      scenarioId: null 
    }
  );
  results.tests.push({ name: 'AI Query', ...aiTest });
  aiTest.success ? results.passed++ : results.failed++;
  
  // Test 4: Scenario Projection (will fail without valid scenario ID)
  const projectionTest = await testEndpoint(
    'Scenario Projection',
    'POST',
    '/scenario/test-id/project',
    { years: 20 }
  );
  results.tests.push({ name: 'Scenario Projection', ...projectionTest });
  projectionTest.success ? results.passed++ : results.failed++;
  
  // Summary
  log(colors.yellow, '\n' + '=' .repeat(50));
  log(colors.yellow, '📊 Test Results Summary');
  log(colors.yellow, '=' .repeat(50));
  
  log(colors.green, `✅ Passed: ${results.passed}`);
  log(colors.red, `❌ Failed: ${results.failed}`);
  log(colors.blue, `📝 Total: ${results.tests.length}`);
  
  // Detailed results
  console.log('\n📋 Detailed Results:');
  results.tests.forEach((test, index) => {
    const status = test.success ? '✅' : '❌';
    const statusColor = test.success ? colors.green : colors.red;
    log(statusColor, `${index + 1}. ${status} ${test.name} (Status: ${test.status || 'N/A'})`);
    
    if (!test.success && test.error) {
      console.log(`   Error: ${JSON.stringify(test.error, null, 2)}`);
    }
  });
  
  log(colors.yellow, '\n💡 Notes:');
  console.log('- Up Bank and AI tests will fail without proper API keys in .env.local');
  console.log('- Scenario projection test will fail without a valid scenario in the database');
  console.log('- Net worth snapshot test requires database connection');
  console.log('- Make sure the development server is running: npm run dev');
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests };