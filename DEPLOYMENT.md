# 🚀 FIRE Planner - Deployment Guide

This guide covers deploying the FIRE Planner application to various platforms.

## 📋 **Pre-Deployment Checklist**

### ✅ **Verification Steps**

1. **Build Verification**
   ```bash
   npm run build
   npm run type-check
   npm run lint
   ```

2. **Application Testing**
   ```bash
   npm run dev
   # Test main calculator at http://localhost:3000/calculator
   # Verify all features: scenarios, sharing, export, calculations
   ```

3. **Environment Configuration**
   - Review `.env.local` file (not committed to repo)
   - Ensure all required environment variables are documented
   - Test application with and without optional environment variables

## 🎯 **Vercel Deployment (Recommended)**

### **Quick Deploy**

1. **GitHub Integration**
   ```bash
   # Ensure code is pushed to GitHub
   git push origin main
   ```

2. **Vercel Setup**
   - Visit [vercel.com](https://vercel.com)
   - Connect GitHub account
   - Import `fire-planner` repository
   - Deploy with default settings

3. **Environment Variables** (Optional)
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your_service_key
   OPENAI_API_KEY=sk-your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key
   UP_API_TOKEN=up:yeah:your_up_token
   ```

## ✅ **Deployment Checklist**

- [ ] Build succeeds locally (`npm run build`)
- [ ] TypeScript compilation passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] All features tested manually
- [ ] Environment variables configured
- [ ] Domain/DNS configured (if custom domain)
- [ ] Health checks working
- [ ] Monitoring configured
- [ ] Security headers configured
- [ ] Performance optimized
- [ ] Documentation updated

**🎉 Ready for production deployment!**