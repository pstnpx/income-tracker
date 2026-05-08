# Income Tracker

Personal income & investment dashboard for tracking salary, LTI grants, stock purchases, and fixed costs.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router, standalone), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI (Python 3.12), uvicorn, uv |
| Auth | NextAuth v5 — Google OAuth only |
| Charts | Recharts via shadcn chart |
| Animations | framer-motion |
| Deployment | Docker → k3s (FluxCD) |

## Features

- **Income overview** — salary, LTI, STI, and bonus payments with gross/net toggle
- **LTI grants** — vesting schedules for multiple grants with paid/upcoming tracking
- **Stock tracker** — live price, P&L per half-year purchase period, custom price projection
- **Fixed costs** — monthly expense breakdown split across pay dates
- **Salary left** — remaining balance per pay date after all deductions
- **Settings** — configure salary, LTI grants, stock buy prices, fixed costs, and tax rates via UI

## Architecture

```
frontend/          Next.js 15 app
  src/
    app/           Routes & API proxy routes
    components/    UI components (income, lti, stock, costs, settings)
    lib/           Types & utils
    auth.ts        NextAuth config

backend/
  app.py           FastAPI server
  income_calc.py   Calculation engine (IncomeCalc class)
  config.json      Default config template for new users
  configs/         Per-user config files (auto-created on first login)
  Dockerfile
```

### Multi-user isolation

Each Google account gets its own config file at `backend/configs/<sanitized_email>.json`. New users are seeded from `config.json`. The backend is secured with a shared `INTERNAL_API_KEY` header — only the Next.js frontend can call it.

## Local development

### Backend

```bash
cd backend
uv sync
uv run uvicorn app:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in secrets
npm run dev                         # http://localhost:3000
```

### Environment variables (frontend)

```env
FLASK_API_URL=http://localhost:8000
INTERNAL_API_KEY=<random secret>
AUTH_URL=http://localhost:3000
AUTH_SECRET=<random secret>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

## Deployment

```bash
# 1. Build & push image
sg docker -c "docker build -t pstnpx/tanupat:income-tracker-<version> frontend/"
sg docker -c "docker push pstnpx/tanupat:income-tracker-<version>"

# 2. Bump version in GitOps repo
# repo/home-cicd/apps/income-tracker/overlays/dev/patch.yaml
# FluxCD picks it up automatically
```
