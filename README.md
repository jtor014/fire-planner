# 🔥 FIRE Planner - Australian FIRE Calculator

> **Complete Australian FIRE (Financial Independence, Retire Early) planning application with PayCalculator-style interface, advanced Monte Carlo modeling, and comprehensive scenario management.**

[![Production Ready](https://img.shields.io/badge/status-production%20ready-brightgreen)](#deployment)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](#technology-stack)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](#technology-stack)
[![License](https://img.shields.io/badge/license-MIT-green)](#license)

## 🚀 **Live Demo**

- **Main Calculator**: [/calculator](https://fire-planner.vercel.app/calculator) - Complete FIRE planning with scenario management
- **Legacy Interface**: [/pre60-fire](https://fire-planner.vercel.app/pre60-fire) - Enhanced Pre-60 FIRE Calculator

## ✨ **Key Features**

### 🎯 **PayCalculator-Style Interface**
- **Single-page application** with progressive disclosure
- **Immutable sharing links** with URL state persistence
- **Real-time auto-save** with localStorage mirroring
- **Multiple scenario management** with diff visualization
- **Client-side export** for all data and comparisons

### 🧮 **Advanced FIRE Modeling**
- **Australian-specific calculations** with 2025-26 financial year constants
- **Monte Carlo simulation** for market volatility stress testing
- **Comprehensive bridge income planning** for pre-60 FIRE strategies
- **Dynamic withdrawal strategies** with multiple spenddown approaches
- **Tax optimization** for couples and individuals
- **Age pension integration** with eligibility modeling

### 🏗️ **Unified Engine Architecture**
- **Clean separation** between UI and business logic
- **Modular calculation engines** for different FIRE phases
- **TypeScript-first** with comprehensive type safety
- **Input validation** and robust error handling
- **Extensible assumptions registry** for different financial years

## 🛠️ **Technology Stack**

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Engine**: Custom unified calculation architecture
- **State Management**: URL codec with compression, localStorage persistence
- **Charts**: Chart.js with react-chartjs-2
- **Database**: Supabase (PostgreSQL) - optional
- **Deployment**: Vercel-ready with comprehensive error handling

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/jtor014/fire-planner.git
cd fire-planner

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000/calculator](http://localhost:3000/calculator) to access the main FIRE planning application.

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📊 **Usage**

### **Main Calculator Interface**

1. **Configure Household**
   - Add people with salaries, super balances, and FIRE ages
   - Set annual expenses and household structure
   - Configure assets and debts

2. **Select Strategies**
   - Choose household retirement timing
   - Configure bridge income sources
   - Set spenddown and tax optimization strategies

3. **Set Return Assumptions**
   - Select market scenarios (base, conservative, optimistic)
   - Enable Monte Carlo simulation for risk analysis
   - Configure asset allocation and withdrawal strategies

4. **Manage Scenarios**
   - Create multiple scenarios to compare strategies
   - Use diff visualization to see configuration differences
   - Export scenarios and comparisons as JSON

5. **Analyze Results**
   - View comprehensive FIRE timeline projections
   - Analyze bridge income requirements and feasibility
   - Review age pension eligibility and optimization opportunities

## 🎯 **Core Features**

### **Household Strategies**
- **Both stop same year**: Traditional joint retirement
- **Staggered retirement**: One person FIREs first, other continues working
- **Person-specific FIRE**: Individual retirement timing with bridge income

### **Bridge Income Sources**
- **Working partner salary**: Continued income from non-retired partner
- **Part-time income**: Declining consulting or casual work
- **Rental properties**: Investment property income with vacancy modeling
- **Lump sum events**: Inheritance, property sales, windfalls

### **Withdrawal Strategies**
- **Fixed real**: Inflation-adjusted withdrawals
- **Fixed nominal**: Same dollar amount each year
- **Dynamic**: Performance-based withdrawal adjustments
- **Guardrails**: Floor and ceiling withdrawal limits
- **Spend to zero**: Exhaust super by specific age

### **Risk Analysis**
- **Monte Carlo simulation**: Market volatility stress testing
- **Sequence of returns risk**: Early retirement risk analysis
- **Inflation impact**: Long-term purchasing power erosion
- **Longevity planning**: Extended life expectancy scenarios

## 🔧 **Configuration**

### **Environment Variables**

Create a `.env.local` file in the root directory:

```bash
# Core Application (Optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Optional Features
OPENAI_API_KEY=sk-your_openai_api_key          # For AI chat features
ANTHROPIC_API_KEY=your_anthropic_api_key       # Alternative to OpenAI
UP_API_TOKEN=up:yeah:your_up_bank_token        # For transaction imports
```

**Note**: The application works fully without any environment variables. They only enable optional features like AI chat, bank imports, and cloud data persistence.

### **Australian Financial Constants**

The application includes comprehensive Australian financial constants for 2025-26:
- Tax brackets with Stage 3 tax cuts
- Superannuation guarantee rates and caps
- Age pension rates and thresholds
- Preservation ages and minimum drawdown rates

## 📚 **API Documentation**

### **Main Engine Contract**

```typescript
import { runFirePlan } from '@/lib/engine'

const result = await runFirePlan({
  household: {
    people: [{ /* person config */ }],
    structure: 'couple',
    annual_expenses: { /* expense config */ },
    assets: { /* asset config */ },
    strategy: { /* household strategy */ }
  },
  strategy: {
    bridge: { /* bridge income config */ },
    spenddown: { /* withdrawal strategy */ },
    tax_optimization: { /* tax strategy */ }
  },
  returns: {
    type: 'monte_carlo',
    scenario: 'base',
    assumptions: { /* return assumptions */ }
  },
  assumptions: getCurrentAssumptions(), // 2025-26 constants
  options: {
    include_monte_carlo: true,
    include_stress_testing: true,
    detailed_timeline: true
  }
})
```

### **State Management**

```typescript
import { generateShareableUrl, extractStateFromUrl } from '@/lib/url-codec'
import { AutoSaver } from '@/lib/storage'

// Generate shareable URLs
const shareUrl = generateShareableUrl(calculatorState)

// Auto-save with debouncing
const autoSaver = new AutoSaver(state, { saveInterval: 3000 })
```

## 🧪 **Testing**

```bash
# TypeScript compilation check
npm run type-check

# ESLint validation
npm run lint

# API endpoint testing
npm run test:api
```

## 📈 **Performance**

- **Zero TypeScript compilation errors**
- **Optimized state management** with debounced operations
- **Efficient calculations** with memoization where appropriate
- **Responsive design** optimized for all device sizes
- **Fast rendering** with React optimizations

## 🚀 **Deployment**

### **Vercel (Recommended)**

1. Fork this repository
2. Connect to Vercel
3. Deploy with default settings
4. Configure environment variables if needed

### **Other Platforms**

- **Netlify**: Compatible with static deployment
- **AWS/GCP**: Container deployment ready
- **Self-hosted**: Docker support available

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Development Guidelines**

- **TypeScript first**: All code must pass `npm run type-check`
- **Comprehensive testing**: Test all user-facing functionality
- **Documentation**: Update docs for new features
- **Error handling**: Implement graceful error handling
- **Performance**: Consider performance impact of changes

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Australian Taxation Office** for public financial constants
- **Australian Prudential Regulation Authority** for superannuation regulations
- **PayCalculator.com.au** for UX inspiration
- **Next.js team** for excellent framework
- **Vercel** for hosting platform

---

## 📞 **Support**

- **Issues**: [GitHub Issues](https://github.com/jtor014/fire-planner/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jtor014/fire-planner/discussions)
- **Documentation**: [Project Wiki](https://github.com/jtor014/fire-planner/wiki)

---

<div align="center">

**🔥 Built for Australian FIRE enthusiasts by developers who understand the journey 🇦🇺**

[Demo](https://fire-planner.vercel.app/calculator) • [Documentation](./CLAUDE.md) • [Contributing](./CONTRIBUTING.md)

</div>