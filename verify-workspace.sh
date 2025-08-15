#!/bin/bash

# FIRE Planner Workspace Verification Script
# Run this to verify the workspace is ready for Claude Code

echo "🔍 FIRE Planner Workspace Verification"
echo "======================================"
echo

# Check we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d ".git" ]]; then
    echo "❌ Error: Not in the FIRE Planner project directory"
    echo "   Please run: cd /home/jtor014/dev/fire-planner"
    exit 1
fi

echo "📁 Project Directory: $(pwd)"
echo "📅 Verification Date: $(date)"
echo

# Check Git status
echo "🔄 Git Status:"
if git status --porcelain | grep -q .; then
    echo "⚠️  Uncommitted changes detected:"
    git status --short
else
    echo "✅ Git repository is clean"
fi
echo

# Check recent commits
echo "📋 Recent Commits:"
git log --oneline -3
echo

# Check Node.js and dependencies
echo "🔧 Node.js Environment:"
echo "   Node version: $(node --version 2>/dev/null || echo 'Not found')"
echo "   NPM version: $(npm --version 2>/dev/null || echo 'Not found')"

if [[ -f "package-lock.json" ]]; then
    echo "✅ Dependencies installed (package-lock.json exists)"
else
    echo "⚠️  Dependencies may not be installed"
fi
echo

# Check build status
echo "🏗️  Build Verification:"
if npm run build --silent > /dev/null 2>&1; then
    echo "✅ Build passes"
else
    echo "❌ Build fails - run 'npm run build' to see errors"
fi

# Check TypeScript
if npm run type-check --silent > /dev/null 2>&1; then
    echo "✅ TypeScript compilation passes"
else
    echo "❌ TypeScript errors - run 'npm run type-check' to see errors"
fi
echo

# Check key files
echo "📄 Key Files Status:"
files=(
    "CLAUDE.md"
    ".claude/context.md"
    ".claude/workspace.md"
    "STATUS.md"
    "README.md"
    "DEVELOPMENT.md"
    "DEPLOYMENT.md"
    "database/schema.sql"
    "lib/supabase.ts"
    "pages/api/ai/query.ts"
)

for file in "${files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
    fi
done
echo

# Check environment setup
echo "⚙️  Environment Configuration:"
if [[ -f ".env.local.example" ]]; then
    echo "✅ Environment template exists (.env.local.example)"
else
    echo "❌ Environment template missing"
fi

if [[ -f ".env.local" ]]; then
    echo "✅ Local environment configured (.env.local)"
    echo "   Note: Verify API keys are set for full functionality"
else
    echo "⚠️  Local environment not configured"
    echo "   Run: cp .env.local.example .env.local"
    echo "   Then edit .env.local with your API keys"
fi
echo

# Check database files
echo "🗄️  Database Setup:"
db_files=(
    "database/schema.sql"
    "database/sample_data.sql"
    "database/migrate.js"
    "database/migrations/001_initial_schema.sql"
)

all_db_files_exist=true
for file in "${db_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
        all_db_files_exist=false
    fi
done

if $all_db_files_exist; then
    echo "✅ All database files present"
else
    echo "❌ Some database files missing"
fi
echo

# Claude Code readiness check
echo "🤖 Claude Code Readiness:"
claude_files=(
    "CLAUDE.md"
    ".claude/context.md"
    ".claude/workspace.md"
)

claude_ready=true
for file in "${claude_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        claude_ready=false
        break
    fi
done

if $claude_ready; then
    echo "✅ Claude Code context files ready"
    echo "✅ Project overview documented"
    echo "✅ Development setup documented"
    echo "✅ Quick resume instructions available"
else
    echo "❌ Claude Code context files missing"
fi
echo

# GitHub status
echo "📡 GitHub Repository:"
if git remote get-url origin > /dev/null 2>&1; then
    echo "✅ Remote repository configured: $(git remote get-url origin)"
    
    # Check if we're up to date
    git fetch --quiet 2>/dev/null
    if git status | grep -q "up to date"; then
        echo "✅ Local repository is up to date"
    else
        echo "⚠️  Local repository may be out of sync"
    fi
else
    echo "❌ No remote repository configured"
fi
echo

# Final summary
echo "📊 Workspace Summary:"
echo "=================="

# Count files
total_files=$(find . -type f -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./.git/*" | wc -l)
code_files=$(find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | wc -l)

echo "📁 Total files: $total_files"
echo "💻 Code files: $code_files"
echo "📦 Repository: https://github.com/jtor014/fire-planner"
echo

# Quick start reminder
echo "🚀 Quick Start Commands:"
echo "========================"
echo "npm run dev              # Start development server"
echo "npm run build            # Verify production build"
echo "npm run test:api         # Test API endpoints"
echo "npm run db:migrate:manual # Database setup instructions"
echo

echo "✨ Workspace verification complete!"
echo
echo "📋 To resume development with Claude Code:"
echo "   1. Open Claude Code in this directory"
echo "   2. Read CLAUDE.md for complete project context"
echo "   3. Check STATUS.md for current status"
echo "   4. Follow .claude/workspace.md for quick setup"