# Super Planner

A comprehensive Australian superannuation Monte Carlo projection application for couples planning their financial independence and retirement.

## 🎯 Overview

Super Planner is a focused financial planning tool that uses Monte Carlo simulations to model retirement scenarios for Australian couples. It specializes in superannuation projections with inheritance event modeling and AI-powered strategy comparison.

## ✨ Key Features

### 🎲 Monte Carlo Simulations
- **1000+ simulation runs** for statistical accuracy
- **Market volatility modeling** using normal distribution (Box-Muller transform)
- **Australian super preservation age (60)** compliance
- **Confidence intervals** (10th-90th percentile) for risk assessment

### 📊 Scenario Modeling
- **Target Income Mode**: Find retirement date for desired annual income
- **Target Date Mode**: Find sustainable income for target retirement date
- **Inheritance event modeling** with multiple allocation strategies
- **Couple-based super contributions** with customizable splits

### 📈 Interactive Visualizations
- **Chart.js projections** with confidence interval shading
- **Balance vs income chart toggle** for different perspectives
- **Success rate analysis** and risk assessment
- **Real-time simulation execution** with intelligent caching

### 🤖 AI Strategy Comparison
- **Compare inheritance allocation strategies**: Super vs Mortgage vs Taxable Investment
- **Parallel Monte Carlo analysis** across strategies
- **AI-generated insights** and risk considerations
- **Recommendation engine** based on success rates

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Supabase PostgreSQL
- **Visualization**: Chart.js with react-chartjs-2
- **Simulation**: Custom Monte Carlo engine with Box-Muller distribution

### Database Schema
```sql
-- Core couple superannuation data
baseline_settings (
  person1_name, person1_current_balance, person1_annual_contribution, person1_age,
  person2_name, person2_current_balance, person2_annual_contribution, person2_age,
  expected_return_mean, expected_return_volatility, safe_withdrawal_rate
)

-- Scenario definitions
super_scenarios (
  name, mode, target_annual_income, target_retirement_date, monte_carlo_runs
)

-- Inheritance events
lumpsum_events (
  scenario_id, name, amount, event_date, allocation_strategy, person1_split, person2_split
)

-- Cached simulation results
simulation_results (
  scenario_id, baseline_hash, yearly_projections, distribution_data
)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account and database
- Optional: OpenAI or Anthropic API key for enhanced AI features

### Installation
```bash
# Clone the repository
git clone https://github.com/jtor014/fire-planner.git
cd fire-planner

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run database migrations
node create-super-planner-schema.js

# Start development server
npm run dev
```

### Environment Variables
```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Optional
OPENAI_API_KEY=sk-your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## 📱 Application Flow

### 1. Baseline Configuration (`/super-baseline`)
- Configure couple's current super balances
- Set annual contribution amounts and ages
- Define investment assumptions (expected return, volatility, withdrawal rate)
- Real-time summary calculations and validation

### 2. Scenario Management (`/super-scenarios`)
- Create multiple scenarios with different targets
- Add inheritance events with allocation strategies
- Configure 50/50 or custom splits for super contributions
- Edit and delete scenarios with full CRUD operations

### 3. Monte Carlo Projections (`/super-projection?scenario={id}`)
- Run 1000+ Monte Carlo simulations
- View interactive charts with confidence intervals
- Toggle between balance and income projections
- Analyze success rates and risk metrics

### 4. AI Strategy Comparison (`/super-ai-compare`)
- Compare inheritance allocation strategies
- Get AI-powered insights and recommendations
- View parallel simulation results
- Understand risk considerations and next steps

## 🔧 API Endpoints

### Baseline Settings
- `GET /api/super/baseline-settings` - Retrieve couple's baseline data
- `POST /api/super/baseline-settings` - Update baseline settings

### Scenarios
- `GET /api/super/scenarios` - List all scenarios with inheritance events
- `POST /api/super/scenarios` - Create new scenario
- `PUT /api/super/scenarios?id={id}` - Update scenario and events
- `DELETE /api/super/scenarios?id={id}` - Soft delete scenario

### Projections
- `GET /api/super/projection?scenario_id={id}` - Run Monte Carlo simulation

### AI Analysis
- `POST /api/super/ai-compare` - Compare inheritance allocation strategies

## 🎲 Monte Carlo Simulation Details

### Market Return Modeling
```typescript
// Box-Muller transform for normal distribution
function generateRandomReturn(mean: number, volatility: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return (mean + volatility * z) / 100
}
```

### Australian Super Rules
- **Preservation Age**: Cannot access super before age 60
- **Contribution Limits**: Validates against Australian contribution caps
- **Withdrawal Rates**: Default 3.5% safe withdrawal rate
- **Inflation Adjustment**: Long-term targets adjusted for inflation

### Inheritance Event Processing
- **Super Allocation**: Contributes to super with person1/person2 splits
- **Mortgage Payoff**: Reduces debt burden (simulated impact)
- **Taxable Investment**: Creates accessible investment balance

## 🧪 Testing

```bash
# Run the test suite
npm run test:api

# Build validation
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📊 Performance Features

- **Result Caching**: Simulation results cached by baseline settings hash
- **Incremental Updates**: Only re-run simulations when baseline changes
- **Background Processing**: Monte Carlo runs don't block UI
- **Optimized Queries**: Efficient database operations with proper indexing

## 🔒 Security Considerations

- **Input Validation**: All API endpoints validate user inputs
- **SQL Injection Protection**: Parameterized queries via Supabase
- **Rate Limiting**: Supabase built-in protection
- **Environment Secrets**: Secure API key management

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard
# Point to production Supabase database
```

### Manual Deployment
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Australian Financial Context

### Superannuation System
- **Preservation Age**: Currently 60 (may increase)
- **Contribution Caps**: $27,500 concessional, $110,000 non-concessional (2024)
- **Tax Treatment**: 15% contributions tax, 0% pension phase
- **Access Rules**: Condition of release requirements

### FIRE Planning Considerations
- **Super vs Taxable**: Balance accessibility vs tax efficiency
- **Preservation Age**: Plan for bridge strategies before 60
- **Healthcare**: Medicare vs private health considerations
- **Age Pension**: Means testing and integration strategies

## 📞 Support

For questions or support, please:
1. Check the [documentation](docs/)
2. Search [existing issues](https://github.com/jtor014/fire-planner/issues)
3. Create a [new issue](https://github.com/jtor014/fire-planner/issues/new)

---

**Built with ❤️ for the Australian FIRE community**