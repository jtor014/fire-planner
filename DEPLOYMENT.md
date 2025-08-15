# FIRE Planner - Production Deployment Guide

This guide covers deploying the FIRE Planner to production on Vercel with Supabase.

## 🚀 Pre-Deployment Checklist

### ✅ Code Quality
- [x] TypeScript compilation passes (`npm run type-check`)
- [x] Next.js build succeeds (`npm run build`)
- [x] All API endpoints have error handling
- [x] Environment variables are documented
- [x] Database schema is version controlled

### ✅ Security
- [x] Service keys are environment variables only
- [x] No secrets in code repository
- [x] API endpoints validate input
- [x] Database uses RLS (recommended)
- [x] CORS configured properly

### ✅ Performance
- [x] Static pages are optimized
- [x] Database queries use indexes
- [x] Images are optimized
- [x] Bundle size is reasonable (<100KB first load)

## 🗄️ Database Setup

### 1. Supabase Project Setup

1. **Create Project**: Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. **Run Migrations**: Execute SQL files in order:
   ```sql
   -- In Supabase SQL Editor:
   -- 1. Copy/paste: database/migrations/001_initial_schema.sql
   -- 2. Copy/paste: database/migrations/002_projections_and_chat.sql  
   -- 3. Copy/paste: database/migrations/003_helper_functions.sql
   -- 4. (Optional) Copy/paste: database/sample_data.sql
   ```

3. **Get Credentials**:
   - Project URL: `https://your-project.supabase.co`
   - Service Role Key: Found in Project Settings → API

### 2. Row Level Security (Optional but Recommended)

```sql
-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE networth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Add policies (customize based on your auth strategy)
-- Example: Allow all operations for now (customize for multi-user)
CREATE POLICY "Allow all for authenticated users" ON accounts
  FOR ALL USING (true);
-- Repeat for other tables...
```

## ☁️ Vercel Deployment

### 1. Repository Setup

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial FIRE Planner implementation"

# Push to GitHub
git remote add origin https://github.com/your-username/fire-planner.git
git branch -M main
git push -u origin main
```

### 2. Vercel Project Setup

1. **Connect Repository**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import from GitHub
   - Select your `fire-planner` repository

2. **Configure Build Settings**:
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Output Directory: `.next` (default)
   - Install Command: `npm install`

3. **Environment Variables**:
   Add these in Vercel Project Settings → Environment Variables:

   ```env
   # Required - Supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key

   # Optional - AI Services (for chat feature)
   OPENAI_API_KEY=sk-your_openai_api_key
   # OR
   ANTHROPIC_API_KEY=your_anthropic_api_key

   # Optional - Up Bank (for transaction imports)
   UP_API_TOKEN=up:yeah:your_up_bank_personal_access_token

   # Next.js (automatically set by Vercel)
   NEXTAUTH_URL=https://your-domain.vercel.app
   NEXTAUTH_SECRET=your_nextauth_secret_generate_this
   ```

4. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete
   - Test the deployment

### 3. Custom Domain (Optional)

1. **Add Domain**: In Vercel Project Settings → Domains
2. **DNS Configuration**: Point your domain to Vercel
3. **SSL**: Automatic via Vercel

## 🔧 Production Configuration

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | ✅ Yes | Supabase service role key |
| `OPENAI_API_KEY` | ⭕ Optional | OpenAI API key for AI chat |
| `ANTHROPIC_API_KEY` | ⭕ Optional | Claude API key (alternative to OpenAI) |
| `UP_API_TOKEN` | ⭕ Optional | Up Bank API token for transaction imports |
| `NEXTAUTH_SECRET` | 🔧 Recommended | Secret for session encryption |

### API Rate Limits

Consider implementing rate limiting for production:

```javascript
// pages/api/ai/query.ts - Example rate limiting
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowSize = 60000; // 1 minute
  const maxRequests = 10;
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowSize });
    return true;
  }
  
  const limit = rateLimitMap.get(ip);
  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + windowSize;
    return true;
  }
  
  if (limit.count >= maxRequests) {
    return false;
  }
  
  limit.count++;
  return true;
}
```

## 📊 Monitoring

### 1. Vercel Analytics

```javascript
// pages/_app.tsx - Add Vercel Analytics
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

### 2. Error Tracking

Consider integrating Sentry for error tracking:

```bash
npm install @sentry/nextjs
```

### 3. Performance Monitoring

- Use Vercel's built-in Web Vitals
- Monitor API response times
- Track database query performance

## 🔄 CI/CD Pipeline

### GitHub Actions (Optional)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run build
```

## 🛡️ Security Best Practices

### 1. Environment Variables
- ✅ Never commit secrets to git
- ✅ Use Vercel's environment variable encryption
- ✅ Rotate API keys regularly
- ✅ Use different keys for staging/production

### 2. Database Security
- ✅ Use connection pooling
- ✅ Enable Row Level Security (RLS)
- ✅ Validate all user inputs
- ✅ Use parameterized queries (Supabase handles this)

### 3. API Security
- ✅ Implement rate limiting
- ✅ Validate request bodies
- ✅ Use HTTPS only
- ✅ Add CORS headers appropriately

## 📈 Scaling Considerations

### Database
- **Connection Limits**: Supabase handles connection pooling
- **Query Performance**: All tables have appropriate indexes
- **Data Growth**: Consider archiving old transactions/projections

### API Performance
- **Caching**: Implement Redis for projection caching
- **CDN**: Vercel automatically provides CDN
- **Database Queries**: Already optimized with indexes

### Cost Optimization
- **Supabase**: Monitor database usage
- **Vercel**: Monitor function execution time
- **AI APIs**: Implement request caching for similar queries

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failures**
   - Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
   - Verify Supabase project is active
   - Check network connectivity

2. **Build Failures**
   - Run `npm run build` locally first
   - Check TypeScript errors
   - Verify all imports are correct

3. **API Timeouts**
   - AI API calls can be slow, implement proper timeout handling
   - Up Bank API has rate limits
   - Consider background job processing for heavy operations

4. **Environment Variable Issues**
   - Restart Vercel deployment after changing environment variables
   - Check variable names match exactly
   - Verify no extra spaces or quotes

### Health Check Endpoint

```javascript
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    services: {
      database: !!process.env.SUPABASE_URL,
      ai: !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY),
      upBank: !!process.env.UP_API_TOKEN
    }
  });
}
```

## 📞 Support

### Getting Help
- Check logs in Vercel dashboard
- Monitor Supabase logs
- Review error messages in browser console
- Check API response status codes

### Maintenance
- **Weekly**: Review error logs
- **Monthly**: Check API usage and costs  
- **Quarterly**: Update dependencies
- **Annually**: Rotate API keys

---

🎉 **Your FIRE Planner is ready for production!** 

Visit your deployed application and start tracking your path to financial independence.