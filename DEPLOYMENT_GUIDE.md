# 🚀 Deployment Guide - Generative Dialogue Platform

## Quick Deploy Options

### Option 1: Vercel (Recommended - Fastest)
1. **Install Vercel CLI**: `npm i -g vercel`
2. **Deploy**: `cd client && vercel --prod`
3. **Follow prompts** (first time setup)
4. **Get live URL** instantly

### Option 2: Netlify (Alternative)
1. **Install Netlify CLI**: `npm i -g netlify-cli`
2. **Build**: `npm run build` (already done)
3. **Deploy**: `netlify deploy --prod --dir=build`
4. **Get live URL**

### Option 3: GitHub Pages (Free but slower)
1. **Push to GitHub** repository
2. **Enable GitHub Pages** in repo settings
3. **Set source** to GitHub Actions
4. **Auto-deploy** on push

## 📋 Pre-Deployment Checklist
- ✅ Build completed successfully
- ✅ ESLint warnings cleaned (critical ones)
- ✅ All major features working
- ✅ Responsive design tested

## 🎯 What Your Colleague Will See
- **Full Dashboard** with all modes (Config, Live, Analysis, Developer)
- **Complete Prompt Library** with AI learning system
- **Dialogue Configuration** with time guidance
- **Stage Configuration** with prompt integration
- **Professional UI** with muted colors and good contrast

## 🔗 Sharing Instructions
Once deployed, share:
1. **Live URL** (e.g., https://your-app.vercel.app)
2. **Developer Mode Password**: `devmode2024`
3. **Quick Start Guide** (see below)

---

## 📖 Quick Start Guide for Your Colleague

### Getting Started
1. **Visit the URL** you provide
2. **Explore Overview** - System health and metrics
3. **Try "Dialogues"** - Create and manage dialogue sessions
4. **Check "Developer"** - Enter password `devmode2024` for AI features

### Key Features to Show
- **📚 Prompt Library** (Dialogue Setup → Prompts)
- **🤖 AI Learning System** (Developer Mode)
- **⚙️ Dialogue Configuration** with time guidance
- **📊 Analytics Dashboard** (Analysis Mode)

### Best Demo Flow
1. **Create New Dialogue** → Configure stages → Use prompt library
2. **Show Developer Mode** → AI suggestions and learning flywheel
3. **Demonstrate Scalability** → 100+ participant handling

---

## 🛠 Technical Notes
- **Frontend Only**: No backend required for demo
- **Local Storage**: Data persists in browser
- **Responsive**: Works on desktop, tablet, mobile
- **Modern Browsers**: Chrome, Firefox, Safari, Edge

## 🔄 Updates
To update the live version:
1. **Make changes** locally
2. **Build**: `npm run build`
3. **Deploy**: `vercel --prod` (or your chosen method)
4. **Share new URL** if needed
