# Facebook Growth Platform

A sophisticated, production-grade Facebook engagement automation platform with stealth technology, advanced account warming, and intelligent rate limiting.

## 🎯 Features

### Core Automation
- **Stealth Browser Automation**: Playwright-based automation with fingerprint spoofing and anti-detection measures
- **Human Behavior Simulation**: Realistic mouse movements (Bezier curves), typing patterns, and scrolling behavior
- **Account Warming**: 5-phase 15-day gradual activation schedule to avoid detection
- **Engagement Rate Limiting**: Dynamic daily action limits based on account age and warm-up phase

### Campaign Management
- **Campaign Dashboard**: Real-time progress tracking with visual indicators
- **Engagement Targets**: Set specific goals for followers, likes, comments, and shares
- **Activity Logging**: Comprehensive timestamped feed of all bot actions
- **Campaign History**: Track all past and active campaigns with completion status

### Account & Proxy Management
- **Bot Account Pool**: Add, manage, and monitor multiple automation accounts
- **Proxy Manager**: Support for mobile, residential, and datacenter proxies
- **Health Monitoring**: Automatic tracking of proxy success rates and account status
- **Intelligent Rotation**: Least-recently-used proxy rotation strategy

### User Experience
- **Elegant UI**: Premium design with Tailwind CSS 4 and Shadcn UI components
- **User Authentication**: Secure OAuth2 integration with Manus
- **Dashboard Analytics**: Real-time statistics and engagement metrics
- **Responsive Design**: Mobile-friendly interface

## 🏗️ Architecture

### Technology Stack

**Frontend**
- React 19 + Vite
- Tailwind CSS 4
- Shadcn UI Components
- tRPC for type-safe API calls
- React Hook Form + Zod validation

**Backend**
- Node.js + Express
- tRPC for RPC procedures
- Drizzle ORM with MySQL
- Manus OAuth2 integration

**Bot Engine**
- Playwright for browser automation
- Custom stealth plugins
- Human behavior simulation modules
- Proxy management system

**Deployment**
- Frontend: Vercel
- Backend: Render
- Database: MySQL-compatible (TiDB/PlanetScale)
- Repository: GitHub (monorepo structure)

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/exploreofficialzz-star/Facebook-Growth.git
cd Facebook-Growth

# Install dependencies
pnpm install

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Run database migrations
cd backend && pnpm drizzle-kit generate && pnpm drizzle-kit migrate

# Start development
pnpm dev
```

## 📊 Database Schema

- **users**: User accounts with OAuth integration
- **campaigns**: Campaign configurations and progress tracking
- **botAccounts**: Bot account credentials and warm-up tracking
- **proxies**: Proxy configurations and health metrics
- **activityLogs**: Timestamped record of all bot actions

## 🔐 Security

- AES-256-CBC password encryption
- OAuth2 authentication
- Dynamic rate limiting
- Stealth anti-detection measures
- Intelligent proxy rotation

## 📝 Stealth Strategy

**Account Warming (15 days)**
- Phase 1-5: Gradual activation from passive browsing to full engagement
- Dynamic rate limits based on account age
- Natural behavior simulation

**Anti-Detection**
- Browser fingerprint randomization
- Human-like mouse movements
- Realistic typing patterns
- Proxy rotation

## 🚢 Deployment

- **Frontend**: Vercel (automatic deployment from GitHub)
- **Backend**: Render (with render.yaml configuration)
- **Database**: MySQL-compatible service

## 📄 License

MIT License - see LICENSE file for details

---

**Version**: 1.0.0 | **Status**: Production Ready