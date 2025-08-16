#!/usr/bin/env node

// Deploy schema using Supabase Management API
const https = require('https');
const fs = require('fs');

// Read the access token from environment or CLI config
const accessToken = 'sbp_0dde77f2bbc31364373ab85df510b282b9a7ce75';
const projectRef = 'jbxwxltzrpifwijvkfgi';

async function deploySchema() {
  console.log('🚀 Deploying schema via Supabase Management API...');
  
  // Read the migration file
  let sql;
  try {
    sql = fs.readFileSync('supabase/migrations/20250816_001_initial_schema.sql', 'utf8');
  } catch (error) {
    console.error('❌ Could not read migration file');
    process.exit(1);
  }
  
  const postData = JSON.stringify({
    query: sql
  });
  
  const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: `/v1/projects/${projectRef}/database/query`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Schema deployed successfully!');
          console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
          resolve(data);
        } else {
          console.error('❌ Schema deployment failed');
          console.error('Status:', res.statusCode);
          console.error('Response:', data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

deploySchema().catch(console.error);