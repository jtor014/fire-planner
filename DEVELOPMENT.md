# FIRE Planner - Development Guide

This guide provides step-by-step instructions for setting up the FIRE Planner development environment.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- A Supabase account
- (Optional) Up Bank personal access token
- (Optional) OpenAI or Anthropic API key

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd fire-planner

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.local.example .env.local

# Edit with your credentials
nano .env.local
```

Required environment variables:
```bash
# Supabase Configuration (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# AI API Configuration (Optional - for chat feature)
OPENAI_API_KEY=sk-your_openai_api_key
# OR
ANTHROPIC_API_KEY=your_anthropic_api_key

# Up Bank API Configuration (Optional - for transaction imports)
UP_API_TOKEN=up:yeah:your_up_bank_personal_access_token
```

### 3. Database Setup

#### Option A: Using Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or select existing one
3. Navigate to SQL Editor
4. Copy and paste the contents of `database/schema.sql`
5. Run the script
6. (Optional) Copy and paste the contents of `database/sample_data.sql` for test data

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 4. Development Server

```bash
# Start the development server
npm run dev

# Open in browser
open http://localhost:3000
```

## 🗄️ Database Schema Overview

### Core Tables

- **accounts**: Asset and liability accounts (bank, super, investment, property, loans)
- **transactions**: Transaction history from Up Bank and manual entries
- **scenarios**: FIRE planning scenarios with different parameters
- **networth_snapshots**: Quarterly net worth calculations
- **projections**: Cached projection results for scenarios
- **chat_history**: AI conversation history

### Key Features

- **Automatic timestamps** with `created_at` and `updated_at`
- **Data validation** with CHECK constraints
- **Optimized indexes** for common queries
- **Helpful views** for summary data
- **Functions** for automated snapshots

## 🔧 Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Testing
node tests/api-test.js  # Test API endpoints (requires dev server)

# Database
# Run SQL files in Supabase dashboard or CLI
```

## 📁 Project Structure

```
fire-planner/
├── 📱 pages/                   # Next.js pages and API routes
│   ├── api/                   # Backend API endpoints
│   │   ├── ai/query.ts        # AI chat endpoint
│   │   ├── import/up.ts       # Up Bank import
│   │   ├── networth/snapshot.ts # Net worth calculation
│   │   └── scenario/[id]/project.ts # Projections
│   ├── index.tsx              # Landing page
│   ├── dashboard.tsx          # Main dashboard
│   └── scenarios.tsx          # Scenario management
├── 🧩 components/             # React components
│   ├── DashboardChart.tsx     # Chart.js visualizations
│   ├── ScenarioForm.tsx       # Scenario creation form
│   └── StrategyChat.tsx       # AI chat interface
├── 📚 lib/                    # Utility libraries
│   ├── supabase.ts           # Database client
│   ├── simulation.ts         # Financial calculations
│   ├── ai.ts                 # AI API wrapper
│   ├── up-client.ts          # Up Bank API client
│   ├── property.ts           # Property calculations
│   └── calculations.ts       # Tax and super calculations
├── 🗄️ database/              # Database scripts
│   ├── schema.sql            # Full database schema
│   └── sample_data.sql       # Test data
├── 🧪 tests/                 # Test scripts
│   └── api-test.js           # API endpoint tests
└── 🎨 styles/                # CSS styles
    └── globals.css           # Tailwind CSS
```

## 🌐 API Endpoints

### POST `/api/networth/snapshot`
Create a net worth snapshot from current account balances.

**Request Body:**
```json
{
  "notes": "Optional notes about this snapshot"
}
```

**Response:**
```json
{
  "success": true,
  "snapshot": { ... },
  "summary": {
    "totalAssets": 1500000,
    "totalLiabilities": 500000,
    "netWorth": 1000000,
    "quarter": "2024-Q1"
  }
}
```

### POST `/api/scenario/{id}/project`
Run financial projection for a scenario.

**Request Body:**
```json
{
  "years": 30
}
```

**Response:**
```json
{
  "success": true,
  "projection": [
    {
      "year": 0,
      "age": 35,
      "netWorth": 1000000,
      "superBalance": 250000,
      "fireProgress": 80.0
    }
    // ... more years
  ]
}
```

### POST `/api/ai/query`
Ask AI financial advisor a question.

**Request Body:**
```json
{
  "question": "Should I pay off debt or invest?",
  "scenarioId": "optional-scenario-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "question": "Should I pay off debt or invest?",
  "answer": "Based on your situation...",
  "context": {
    "netWorth": 1000000,
    "quarter": "2024-Q1"
  }
}
```

### POST `/api/import/up`
Import recent transactions from Up Bank.

**Request Body:**
```json
{
  "days": 30
}
```

**Response:**
```json
{
  "success": true,
  "imported": 25,
  "message": "Imported 25 new transactions"
}
```

## 🧪 Testing

### API Testing

Run the comprehensive API test suite:

```bash
# Start development server first
npm run dev

# Run tests in another terminal
node tests/api-test.js
```

The test script will:
- ✅ Test net worth snapshot creation
- ⚠️  Test Up Bank import (requires API token)
- ⚠️  Test AI query (requires API key)
- ❌ Test scenario projection (requires database data)

### Manual Testing Checklist

1. **Landing Page**
   - [ ] Page loads correctly
   - [ ] Navigation links work
   - [ ] Responsive design

2. **Dashboard**
   - [ ] Displays current net worth
   - [ ] Charts render correctly
   - [ ] Import transactions button
   - [ ] Create snapshot button

3. **Scenarios**
   - [ ] Create new scenario
   - [ ] Form validation works
   - [ ] Run projection
   - [ ] Delete scenario

4. **AI Chat**
   - [ ] Ask a question
   - [ ] Receive contextual response
   - [ ] Error handling for missing API key

## 🚨 Common Issues

### Database Connection Issues

**Problem:** "Failed to fetch accounts" error
**Solution:** 
1. Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env.local`
2. Ensure database schema is created
3. Check Supabase project is active

### AI Service Not Working

**Problem:** "AI service not configured" error
**Solution:**
1. Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to `.env.local`
2. Restart development server
3. Check API key is valid and has credits

### Up Bank Import Failing

**Problem:** "Invalid Up Bank API token" error
**Solution:**
1. Get personal access token from Up Bank app
2. Add `UP_API_TOKEN=up:yeah:your_token` to `.env.local`
3. Token format must include "up:yeah:" prefix

### Build Errors

**Problem:** TypeScript compilation errors
**Solution:**
1. Run `npm run build` to see specific errors
2. Check all imports use correct paths
3. Ensure all environment variables are typed correctly

## 📈 Development Workflow

### Adding New Features

1. **Create branch**: `git checkout -b feature/new-feature`
2. **Database changes**: Update `database/schema.sql` if needed
3. **API endpoints**: Add to `pages/api/` directory
4. **Components**: Add to `components/` directory
5. **Test**: Run `npm run build` and test manually
6. **Commit**: `git commit -m "Add new feature"`
7. **Pull request**: Create PR for review

### Code Style

- **TypeScript**: Use strict typing
- **React**: Functional components with hooks
- **CSS**: Tailwind CSS classes
- **API**: RESTful endpoints with proper error handling
- **Database**: Use parameterized queries via Supabase client

### Performance Tips

1. **Database**: Use indexes for frequently queried fields
2. **API**: Implement caching for expensive calculations
3. **Frontend**: Use React.memo for heavy components
4. **Images**: Optimize images and use Next.js Image component

## 🚀 Deployment

### Vercel Deployment

1. **Push to GitHub**: Ensure code is in GitHub repository
2. **Connect Vercel**: Link GitHub repo to Vercel project
3. **Environment Variables**: Add all `.env.local` variables to Vercel dashboard
4. **Deploy**: Automatic deployment on git push

### Environment Variables in Vercel

Go to Vercel Dashboard → Project → Settings → Environment Variables:

```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_KEY = your_supabase_service_role_key
OPENAI_API_KEY = sk-your_openai_api_key
UP_API_TOKEN = up:yeah:your_up_bank_token
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the code style
4. Test thoroughly
5. Submit a pull request

## 📞 Support

- **Documentation**: Check README.md and this guide
- **Issues**: Create GitHub issues for bugs
- **Questions**: Use GitHub discussions

---

Happy coding! 🚀