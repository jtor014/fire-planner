# Claude Code Workspace Setup

## Quick Resume Instructions

### 1. Navigate to Project
```bash
cd /home/jtor014/dev/fire-planner
```

### 2. Verify Environment
```bash
# Check if everything is ready
npm run build     # Should pass without errors
git status        # Check for any uncommitted changes
```

### 3. Development Server
```bash
npm run dev       # Starts on http://localhost:3000
```

### 4. Key File Locations

**📋 Project Overview**
- `CLAUDE.md` - Complete project context for Claude Code
- `README.md` - User-facing documentation

**⚙️ Configuration**
- `.env.local.example` - Environment variables template
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

**🗄️ Database**
- `database/schema.sql` - Complete database schema
- `database/sample_data.sql` - Test data
- `database/migrations/` - Versioned database changes

**🔧 Core Application**
- `lib/supabase.ts` - Database client and TypeScript types
- `pages/api/` - All API endpoints
- `components/` - React components
- `pages/` - Next.js pages

## Environment Variables Needed

```bash
# Copy and edit:
cp .env.local.example .env.local

# Required:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Optional (for full functionality):
OPENAI_API_KEY=sk-your_openai_api_key
UP_API_TOKEN=up:yeah:your_up_bank_token
```

## Common Development Tasks

```bash
# Build & Test
npm run build           # Production build
npm run type-check      # TypeScript validation
npm run test:api        # API endpoint tests

# Database
npm run db:migrate:manual  # Show manual migration steps
node database/migrate.js   # Automated migration (if configured)

# Git
git status              # Check current state
git log --oneline -5    # Recent commits
```

## Project Status Indicators

**✅ Ready for Development**
- `npm run build` passes
- TypeScript compiles without errors
- Git repository is clean
- All documentation is current

**⚠️ Needs Setup**
- Environment variables not configured
- Database not initialized
- External API keys missing

**❌ Issues**
- Build failures
- TypeScript errors
- Missing dependencies

## Quick Context for Claude Code

This is a complete FIRE (Financial Independence, Retire Early) planning application built for Australian users. It includes:

- **Net worth tracking** with automatic calculations
- **Scenario modeling** for retirement planning
- **AI financial advice** using OpenAI/Anthropic
- **Bank integration** with Up Bank API
- **Interactive charts** using Chart.js
- **Australian tax calculations** and superannuation modeling

The application is production-ready with comprehensive error handling, TypeScript throughout, and full documentation. It's deployed to GitHub at https://github.com/jtor014/fire-planner and ready for Vercel deployment.

All business logic is in the `lib/` directory, API endpoints in `pages/api/`, and React components in `components/`. The database schema is fully defined with migrations available.

## Development Philosophy

- **TypeScript-first** - Everything is strictly typed
- **Production-ready** - Comprehensive error handling
- **Australian-focused** - Tax rates, super rules, etc.
- **Modular architecture** - Clear separation of concerns
- **Documentation-driven** - Every feature is documented

The codebase is ready for immediate development or deployment without additional setup beyond environment variables.