# Claude Code Workspace - Super Planner

This file helps Claude Code quickly understand the project context and resume development.

## 🎯 Project Overview

**Super Planner** - A focused Australian superannuation Monte Carlo projection application for couples planning their financial independence and retirement.

### Key Features
- **Monte Carlo simulations** with 1000+ runs and confidence intervals
- **Couple-based super planning** with individual contribution tracking
- **Inheritance event modeling** with allocation strategy comparison
- **AI-powered strategy analysis** for lump-sum decision making
- **Interactive Chart.js visualizations** with confidence intervals
- **Australian super compliance** (preservation age, contribution caps)
- **Real-time projection caching** for performance optimization

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Supabase PostgreSQL
- **Simulation**: Custom Monte Carlo engine with Box-Muller distribution
- **Charts**: Chart.js with react-chartjs-2
- **Deployment**: Vercel-ready

## 📁 Project Structure

```
super-planner/
├── 📱 pages/                    # Next.js pages and API routes
│   ├── api/super/               # Super Planner API endpoints
│   │   ├── baseline-settings.ts # Couple's baseline super data
│   │   ├── scenarios.ts         # Scenario CRUD with inheritance events
│   │   ├── projection.ts        # Monte Carlo simulation endpoint
│   │   └── ai-compare.ts        # AI strategy comparison
│   ├── index.tsx                # Super Planner homepage
│   ├── super-baseline.tsx       # Baseline settings configuration
│   ├── super-scenarios.tsx      # Scenario management interface
│   ├── super-projection.tsx     # Monte Carlo projection visualization
│   └── super-ai-compare.tsx     # AI strategy comparison tool
├── 🧩 lib/                     # Core business logic
│   ├── supabase.ts             # Database client & types
│   └── monte-carlo-super.ts     # Monte Carlo simulation engine
├── 🗄️ database/               # Database management
│   └── create-super-planner-schema.js # Schema creation script
└── 📖 README.md                # Project documentation
```

## 🚀 Current Status (Last Updated: 2025-08-16)

### ✅ Completed Super Planner Features
- [x] **Focused database schema** with 4 core tables
- [x] **Baseline settings management** for couple's super data
- [x] **Scenario CRUD operations** with inheritance events
- [x] **Monte Carlo simulation engine** with Box-Muller distribution
- [x] **Interactive Chart.js projections** with confidence intervals
- [x] **AI strategy comparison** for inheritance allocation
- [x] **Result caching system** for performance optimization
- [x] **Australian super compliance** (preservation age, etc.)
- [x] **Comprehensive API validation** and error handling
- [x] **TypeScript coverage** throughout application
- [x] **Singleton baseline settings** with proper upsert handling
- [x] **Precise input validation** (dollar amounts with cents)
- [x] **Inheritance events persistence** fix for scenario updates

### 🎯 Project Metrics
- **8 pages** in focused Super Planner application
- **4 API endpoints** with comprehensive validation
- **1 simulation engine** with 1000+ Monte Carlo runs
- **Zero build errors** with TypeScript strict mode
- **Production ready** with Supabase PostgreSQL backend

### 🔗 Repository
- **GitHub**: https://github.com/jtor014/fire-planner
- **Status**: Refactored to Super Planner focus
- **Branch**: main (updated with Super Planner)

## ⚙️ Development Environment

### Prerequisites
- Node.js 18+
- Supabase account and database
- Optional: OpenAI or Anthropic API key for enhanced AI features

### Quick Start Commands
```bash
# Development
npm run dev              # Start development server (http://localhost:3001)
npm run build            # Build for production
npm run type-check       # TypeScript validation
npm run lint             # ESLint validation

# Database
node create-super-planner-schema.js  # Initialize Super Planner schema

# Testing
npm run test:api         # Test API endpoints (requires dev server)
```

### Environment Variables Required
```bash
# Core (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Optional Features
OPENAI_API_KEY=sk-your_openai_api_key          # For enhanced AI analysis
ANTHROPIC_API_KEY=your_anthropic_api_key       # Alternative to OpenAI
```

## 🎨 Key Design Patterns

### Database Layer
- **Focused schema** with 4 core tables: baseline_settings, super_scenarios, lumpsum_events, simulation_results
- **Singleton pattern** for baseline_settings (one record per application)
- **Referential integrity** with proper foreign key constraints
- **Result caching** with baseline settings hash for cache invalidation

### Monte Carlo Simulation
- **Box-Muller transform** for normal distribution random returns
- **Australian super rules** with preservation age (60) compliance
- **Inheritance event processing** with allocation strategies
- **Confidence intervals** (10th-90th percentile) for risk assessment

### API Layer
- **Comprehensive validation** with TypeScript interfaces
- **CRUD operations** for scenarios with inheritance events
- **Intelligent caching** to avoid re-running expensive simulations
- **Error handling** with specific HTTP codes and detailed messages

### Frontend Architecture
- **TypeScript-first** development with strict type checking
- **Chart.js integration** for interactive Monte Carlo visualizations
- **State management** with React hooks and proper form handling
- **Responsive design** with Tailwind CSS utility classes

## 🐛 Known Considerations

### Application Focus
- **Super-only planning** (removed household income, emergency funds, property analysis)
- **Couple-based modeling** (not designed for single person scenarios)
- **Australian context** (superannuation rules, preservation age, contribution caps)
- **Monte Carlo assumptions** (normal distribution, static contribution rates)

### Performance Characteristics
- **Simulation caching** prevents redundant Monte Carlo runs
- **Background processing** for heavy computational tasks
- **Result persistence** with hash-based cache invalidation
- **Chart rendering** optimized for large datasets

## 🔧 Development Context

### Recent Refactoring (2025-08-16)
The application was comprehensively refactored from a general FIRE planner to a focused Super Planner:

- **Database**: Migrated to focused schema with baseline_settings, super_scenarios, lumpsum_events, simulation_results
- **Simulation Engine**: Built custom Monte Carlo engine with Box-Muller distribution
- **UI/UX**: Created 4 focused pages for baseline → scenarios → projections → AI comparison
- **APIs**: Developed 4 robust endpoints with validation and caching
- **Features Removed**: Household income tracking, emergency funds, property analysis, Up Bank integration

### Recent Bug Fixes (2025-08-16)
Post-refactoring bug fixes for production stability:

- **Baseline Settings Singleton**: Fixed upsert handling for singleton database constraint
- **Input Precision**: Changed step="1000" to step="1" for precise dollar amount entry
- **Inheritance Events Persistence**: Fixed PUT method to properly handle lumpsum_events updates
- **Validation Constraints**: Ensured proper range validation (ages 18-100, returns 0-20%, etc.)

### Architecture Decisions
- **Monte Carlo simulations** chosen for realistic retirement projections with market volatility
- **Supabase** for managed PostgreSQL with real-time capabilities and result caching
- **Chart.js** for interactive visualizations with confidence interval support
- **TypeScript strict mode** for type safety and developer experience
- **Australian super focus** for specialized retirement planning context

## 📋 Quick Resume Checklist

When resuming development with Claude Code:

1. **✅ Check Environment**
   ```bash
   cd /home/jtor014/dev/fire-planner
   npm run build  # Verify Super Planner builds
   npm run dev    # Start at http://localhost:3001
   ```

2. **✅ Test Core Functionality**
   ```bash
   curl http://localhost:3001/api/super/baseline-settings
   curl http://localhost:3001/api/super/scenarios
   ```

3. **✅ Database Status**
   - Supabase configured with Super Planner schema
   - Sample data: Josh ($116k), Nancy ($96k), $25k contributions each
   - 4 sample scenarios with inheritance event support

4. **✅ Application Flow**
   - Homepage: Super Planner overview and navigation
   - Baseline: Configure couple's super data and assumptions
   - Scenarios: Create target income/date scenarios with inheritance events
   - Projections: Run Monte Carlo simulations with interactive charts
   - AI Compare: Analyze inheritance allocation strategies

## 🚀 Next Development Priorities

Based on the current Super Planner state:

1. **Production Deployment**
   - Deploy to Vercel with production Supabase database
   - Configure production environment variables
   - Set up monitoring and error tracking

2. **Feature Enhancements**
   - Advanced inheritance modeling (multiple events, tax implications)
   - Scenario comparison charts (side-by-side projections)
   - Export functionality (PDF reports, CSV data)
   - Mobile optimization for projection charts

3. **Performance Optimization**
   - WebWorkers for Monte Carlo simulations
   - Progressive chart loading for large datasets
   - Advanced caching strategies
   - Real-time collaboration features

4. **User Experience**
   - Guided onboarding flow
   - Contextual help and tooltips
   - Advanced chart interactions (zoom, pan, data points)
   - Scenario templates for common strategies

## 💡 Tips for Claude Code

- **Monte Carlo engine** is in `lib/monte-carlo-super.ts` with Box-Muller distribution
- **Database schema** is defined in `create-super-planner-schema.js`
- **API endpoints** follow consistent patterns in `/api/super/` directory
- **React components** use TypeScript with strict type checking
- **Chart.js integration** handles confidence intervals and interactive features
- **Caching system** uses baseline settings hash to invalidate simulation results

The Super Planner is production-ready with comprehensive Monte Carlo simulations, inheritance event modeling, and AI-powered strategy comparison specifically designed for Australian superannuation planning.