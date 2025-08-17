#!/usr/bin/env node

const https = require('https');

const accessToken = 'sbp_0dde77f2bbc31364373ab85df510b282b9a7ce75';
const projectRef = 'jbxwxltzrpifwijvkfgi';

async function executeSQL(sql) {
  const postData = JSON.stringify({ query: sql });
  
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
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function allowNegativeAmounts() {
  console.log('🚀 Updating lumpsum_events to allow negative amounts (expenses)...');
  
  try {
    const sql = `
      -- Remove the positive amount constraint to allow negative values (expenses)
      ALTER TABLE lumpsum_events 
      DROP CONSTRAINT IF EXISTS lumpsum_events_amount_check;
      
      -- No new constraint needed - allow any amount (positive income, negative expense)
    `;
    
    await executeSQL(sql);
    console.log('✅ Lump sum events now allow negative amounts for expenses!');
    
    // Verify the constraint is gone
    const constraints = await executeSQL(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'lumpsum_events'::regclass 
      AND conname LIKE '%amount%';
    `);
    
    console.log('\n📊 Amount constraints remaining:');
    if (constraints.length === 0) {
      console.log('  ✅ No amount constraints - negative amounts allowed');
    } else {
      constraints.forEach(constraint => {
        console.log(`  📋 ${constraint.conname}: ${constraint.definition}`);
      });
    }
    
    console.log('\n💡 Lump sum events can now be:');
    console.log('  📈 Positive amounts: Inheritance, bonuses, investment gains');
    console.log('  📉 Negative amounts: Major expenses, debt payments, large purchases');
    
    console.log('\n🎉 Database update complete!');
    
  } catch (error) {
    console.error('❌ Error updating constraints:', error.message);
  }
}

allowNegativeAmounts().catch(console.error);