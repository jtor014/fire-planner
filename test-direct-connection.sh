#!/bin/bash

echo "Testing direct database connection..."

# Test connection pooler
echo "Testing pooler connection..."
nc -zv aws-1-ap-southeast-2.pooler.supabase.com 6543 2>&1

# Test if we can resolve the hostname
echo "Testing DNS resolution..."
nslookup aws-1-ap-southeast-2.pooler.supabase.com

# Try direct connection to database (usually port 5432)
echo "Testing direct database port..."
nc -zv db.jbxwxltzrpifwijvkfgi.supabase.co 5432 2>&1

echo "Testing database port 6543..."
nc -zv db.jbxwxltzrpifwijvkfgi.supabase.co 6543 2>&1