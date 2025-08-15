# FIRE Planner

A comprehensive web application for tracking net worth and planning Financial Independence Retire Early (FIRE) strategies. Built with Next.js, Supabase, and AI integration.

## Features

- **Net Worth Tracking**: Automatically import transactions from Up Bank and manually track investments, superannuation, and property values
- **Scenario Modeling**: Create and compare different retirement strategies including employment changes, property decisions, and lump sum allocations
- **AI Financial Advisor**: Get personalized financial advice using AI that understands your specific situation and Australian financial landscape
- **Projection Charts**: Visualize your path to FIRE with interactive charts showing net worth growth over time

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **External APIs**: 
  - Up Bank API for transaction imports
  - OpenAI/Anthropic for AI financial advice
- **Charts**: Chart.js with react-chartjs-2
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Up Bank personal access token
- OpenAI or Anthropic API key

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Configure your environment variables in `.env.local`:
   ```bash
   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key

   # AI API Configuration  
   OPENAI_API_KEY=sk-your_openai_api_key
   # OR use Claude instead:
   # ANTHROPIC_API_KEY=your_anthropic_api_key

   # Up Bank API Configuration
   UP_API_TOKEN=up:yeah:your_up_bank_personal_access_token
   ```

### Database Setup

Create the following tables in your Supabase database:

```sql
-- Net worth snapshots table
CREATE TABLE networth_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  quarter TEXT NOT NULL,
  total_assets DECIMAL NOT NULL,
  total_liabilities DECIMAL NOT NULL,
  net_worth DECIMAL NOT NULL,
  notes TEXT
);

-- Scenarios table
CREATE TABLE scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  employment_status TEXT NOT NULL CHECK (employment_status IN ('full_time', 'part_time', 'retired')),
  income_reduction INTEGER DEFAULT 0,
  lump_sum_amount DECIMAL DEFAULT 0,
  lump_sum_allocation TEXT CHECK (lump_sum_allocation IN ('mortgage', 'super', 'investment', 'mixed')),
  property_action TEXT CHECK (property_action IN ('keep', 'sell')),
  target_fire_amount DECIMAL DEFAULT 1250000
);

-- Accounts table
CREATE TABLE accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability')),
  category TEXT NOT NULL CHECK (category IN ('bank', 'super', 'investment', 'property', 'loan')),
  current_balance DECIMAL NOT NULL,
  institution TEXT NOT NULL
);

-- Transactions table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  category TEXT,
  account TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('up_bank', 'manual')),
  up_transaction_id TEXT UNIQUE
);
```

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### 1. Initial Setup
- Configure your environment variables
- Set up the Supabase database tables
- Add your initial account balances manually

### 2. Import Transactions
- Use the "Import Up Transactions" button to sync recent banking transactions
- Manually add transactions for accounts not connected to Up Bank

### 3. Create Net Worth Snapshots
- Click "Create Snapshot" to calculate and store your current net worth
- Snapshots are organized by quarter for tracking progress over time

### 4. Model Scenarios
- Navigate to the Scenarios page
- Create different scenarios exploring various retirement strategies:
  - Employment status changes (full-time → part-time → retired)
  - Lump sum allocations (mortgage, super, investments)
  - Property decisions (keep vs sell)
  - Different FIRE target amounts

### 5. Get AI Advice
- Use the Strategy Chat component to ask financial questions
- The AI considers your current financial situation and scenario context
- Get advice on mortgage vs investment decisions, super strategies, and more

## Deployment

This app is designed for easy deployment on Vercel:

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

## Project Structure

```
fire-planner/
├── pages/                    # Next.js pages and API routes
│   ├── api/                 # Backend API endpoints
│   ├── index.tsx            # Landing page
│   ├── dashboard.tsx        # Main dashboard with charts
│   └── scenarios.tsx        # Scenario builder page
├── components/              # React components
│   ├── DashboardChart.tsx   # Chart.js visualization
│   ├── ScenarioForm.tsx     # Scenario creation form
│   └── StrategyChat.tsx     # AI chat interface
├── lib/                     # Utility functions
│   ├── supabase.ts         # Database client
│   ├── simulation.ts       # Projection calculations
│   ├── ai.ts               # AI API wrapper
│   ├── up-client.ts        # Up Bank API client
│   ├── property.ts         # Property calculations
│   └── calculations.ts     # Financial calculations
└── styles/                 # CSS styles
```

## Key Features Explained

### Net Worth Tracking
- Automatically categorizes accounts as assets or liabilities
- Supports manual entry for all account types
- Generates quarterly snapshots for historical tracking

### Scenario Modeling
- Models complex retirement scenarios with multiple variables
- Calculates projections using Australian tax rates and super rules
- Considers property cash flow, capital gains, and negative gearing

### AI Financial Advisor
- Provides context-aware advice based on your financial situation
- Understands Australian financial products and tax implications
- Supports both OpenAI GPT and Anthropic Claude models

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.