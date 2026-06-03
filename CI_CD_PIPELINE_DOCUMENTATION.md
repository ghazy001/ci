# CI/CD Pipeline Documentation — AI Test Automation Platform

## 1. Project Context

This project is a full-stack AI-powered QA and test automation platform composed of multiple services:

```txt
repo/
├── backend/      # NestJS API, Prisma, PostgreSQL
├── frontend/     # Next.js frontend
├── ai-service/   # FastAPI, Celery, Redis, Qdrant, AI workflows
└── .github/      # GitHub Actions workflows
```

The goal of the CI/CD pipeline is to make sure every change is automatically checked, tested, packaged, deployed, and monitored.

The pipeline is intentionally simple and professional:

```txt
GitHub Push / Pull Request
  → Code Quality Checks
  → Automated Tests
  → Security Scans
  → Docker Build Validation
  → Railway Deployment
  → Monitoring with Sentry + Uptime Monitoring
```

We avoided redundant tools and used one good tool per concern.

---

## 2. GitHub Repository Setup

We created a GitHub repository:

```txt
https://github.com/ghazy001/ai-test-automation-platform
```

Then we initialized Git locally:

```bash
git init
git branch -M main
git remote add origin https://github.com/ghazy001/ai-test-automation-platform.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

A `.gitignore` file was added to avoid committing unnecessary or sensitive files such as:

```txt
node_modules/
.env
.env.*
backend/dist/
frontend/.next/
ai-service/.venv/
coverage/
.DS_Store
```

This keeps the repository clean and prevents secrets from being pushed.

---

## 3. Local CI Readiness

Before adding GitHub Actions, we verified that all checks work locally.

### Backend

The backend uses NestJS, TypeScript, Prisma, and PostgreSQL.

Typical local checks:

```bash
cd backend
npm install
npm run lint
npm test
npm run build
```

These commands make sure the backend can be linted, tested, and compiled.

### Frontend

The frontend uses Next.js, React, TypeScript, and Tailwind CSS.

Typical local checks:

```bash
cd frontend
npm install
npm run lint
npm test
npm run build
```

These commands make sure the frontend code is valid and production-buildable.

### AI Service

The AI service uses FastAPI, Celery, Redis, Qdrant, and Python.

Typical local checks:

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install ruff pytest pytest-cov pip-audit
ruff check .
ruff format --check .
pytest
```

These commands make sure Python code is clean, formatted, and tested.

---

## 4. Continuous Integration — `ci.yml`

We added the GitHub Actions CI workflow:

```txt
.github/workflows/ci.yml
```

This workflow runs automatically on:

```yaml
on:
  pull_request:
  push:
    branches: [main]
```

That means CI runs whenever code is pushed to `main` or a pull request is opened.

---

## 5. CI Job: Backend

The backend CI job runs on Ubuntu and starts temporary PostgreSQL and Redis containers.

Why PostgreSQL?

The backend uses Prisma and PostgreSQL, so tests and migrations need a real database.

Why Redis?

The platform integrates with async AI workflows and background jobs, so Redis is included for compatibility.

Backend CI steps:

```txt
1. Checkout repository
2. Install Node.js
3. Install backend dependencies with npm ci
4. Generate Prisma client
5. Run database migrations
6. Run lint checks
7. Run tests
8. Build the backend
```

The backend uses test environment variables inside GitHub Actions, for example:

```env
NODE_ENV=test
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/testflow_test?schema=public
JWT_ACCESS_SECRET=test_access_secret
JWT_REFRESH_SECRET=test_refresh_secret
AI_SERVICE_URL=http://127.0.0.1:8001
LIVE_EXECUTION_MODE=local
```

No real production secrets are used in CI.

---

## 6. CI Job: Frontend

The frontend CI job validates the Next.js app.

Frontend CI steps:

```txt
1. Checkout repository
2. Install Node.js
3. Install frontend dependencies with npm ci
4. Run lint checks
5. Run tests
6. Build the frontend
```

The frontend uses safe test variables such as:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DEFAULT_TARGET_URL=http://host.docker.internal:3000
```

The most important check is:

```bash
npm run build
```

This confirms that the Next.js application can be compiled successfully for production.

---

## 7. CI Job: AI Service

The AI service CI job validates the FastAPI service.

It starts temporary Redis and Qdrant containers.

Why Redis?

Celery uses Redis as broker and result backend.

Why Qdrant?

The AI service uses Qdrant for RAG/project knowledge retrieval.

AI service CI steps:

```txt
1. Checkout repository
2. Install Python 3.11
3. Install requirements
4. Install dev tools
5. Run Ruff lint
6. Run Ruff format check
7. Run Pytest
```

The AI service uses fake providers during CI:

```env
LLM_PROVIDER=fake
LLM_FALLBACK_PROVIDER=fake
SCRIPT_LLM_PROVIDER=fake
SCRIPT_LLM_FALLBACK_PROVIDER=fake
```

This is important because CI should not depend on OpenAI, Groq, Ollama, or paid AI APIs.

---

## 8. Security Workflow — `security.yml`

We added the security workflow:

```txt
.github/workflows/security.yml
```

This workflow scans dependencies for known vulnerabilities.

It runs on:

```txt
push to main
pull requests
weekly schedule
manual trigger
```

### Backend and Frontend Security

For Node.js dependencies, we use:

```bash
npm audit --audit-level=high --omit=dev
```

This checks production dependencies and fails the workflow if high-severity vulnerabilities are found.

### AI Service Security

For Python dependencies, we use:

```bash
pip-audit -r requirements.txt
```

This scans Python packages for known vulnerabilities.

---

## 9. Dependabot

We added:

```txt
.github/dependabot.yml
```

Dependabot checks for outdated or vulnerable dependencies and opens pull requests automatically.

It monitors:

```txt
/backend npm dependencies
/frontend npm dependencies
/ai-service pip dependencies
GitHub Actions versions
```

This keeps the project safer over time without manually checking every package.

---

## 10. Docker Build Validation — `docker-build.yml`

We added a Docker build validation workflow:

```txt
.github/workflows/docker-build.yml
```

This workflow builds Docker images for:

```txt
backend
ai-service
```

It does not deploy anything. It only proves that the Docker images can be built successfully.

### Backend Dockerfile

The backend Dockerfile:

```txt
backend/Dockerfile
```

Builds the NestJS app, generates Prisma client, removes dev dependencies, and runs:

```bash
node dist/main.js
```

### AI Service Dockerfile

The AI service Dockerfile:

```txt
ai-service/Dockerfile
```

Installs Python dependencies, installs Playwright Chromium, copies the FastAPI app, and runs:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}
```

The `${PORT:-8001}` part is important for Railway compatibility because Railway injects its own `PORT` variable.

---

## 11. Deployment Platform — Railway

We switched from Render to Railway because Render required a card and the card was declined.

Railway is used to host:

```txt
frontend
backend
ai-service
ai-worker
PostgreSQL
Redis
```

Qdrant is hosted separately on Qdrant Cloud.

---

## 12. Railway Services

The Railway project contains these services:

```txt
1. frontend
2. backend
3. ai-service
4. ai-worker
5. PostgreSQL
6. Redis
```

### Frontend Service

Root directory:

```txt
frontend
```

Build command:

```bash
npm ci && npm run build
```

Start command:

```bash
npm start
```

Important environment variables:

```env
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_DEFAULT_TARGET_URL=https://your-frontend.up.railway.app
NEXT_PUBLIC_SENTRY_DSN=your_frontend_sentry_dsn
```

---

### Backend Service

Root directory:

```txt
backend
```

Uses:

```txt
backend/Dockerfile
```

Important environment variables:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_ACCESS_SECRET=your_long_secret
JWT_REFRESH_SECRET=your_long_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend.up.railway.app
AI_SERVICE_URL=https://your-ai-service.up.railway.app
AI_SERVICE_TIMEOUT_MS=120000
OPENAI_API_KEY=your_openai_key
ANALYTICS_OPENAI_MODEL=gpt-4.1-mini
LIVE_EXECUTION_MODE=local
DEFAULT_SCHEDULER_TIMEZONE=Africa/Tunis
SENTRY_DSN=your_backend_sentry_dsn
```

The backend must listen on Railway's port:

```ts
const port = process.env.PORT || 3001;
await app.listen(port);
```

---

### AI Service

Root directory:

```txt
ai-service
```

Uses:

```txt
ai-service/Dockerfile
```

Important environment variables:

```env
APP_ENV=production
PORT=8001
LLM_PROVIDER=openai
LLM_FALLBACK_PROVIDER=fake
SCRIPT_LLM_PROVIDER=openai
SCRIPT_LLM_FALLBACK_PROVIDER=fake
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
QDRANT_URL=your_qdrant_cloud_url
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=project_knowledge
REDIS_URL=${{Redis.REDIS_URL}}
CELERY_BROKER_URL=${{Redis.REDIS_URL}}
CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}
PAGE_INSPECTION_ALLOW_PRIVATE_URLS=false
SENTRY_DSN=your_ai_service_sentry_dsn
```

---

### AI Worker

The AI worker uses the same source folder and Dockerfile as the AI service:

```txt
ai-service
```

But instead of running FastAPI, it runs Celery:

```bash
celery -A app.celery_app.celery_app worker --loglevel=info
```

The worker uses the same Redis and AI environment variables as the AI service.

The worker does not need a public URL.

---

## 13. Database Migrations

After deploying the backend, Prisma migrations must be applied to the Railway PostgreSQL database.

Using Railway CLI:

```bash
brew install railway
railway login
railway link
cd backend
railway run npx prisma migrate deploy
```

If the seed script is safe, seed the initial admin:

```bash
railway run npx prisma db seed
```

If a default admin is created, the password should be changed immediately after first login.

---

## 14. Monitoring with Sentry

Sentry is used for:

```txt
error tracking
exception reporting
basic performance monitoring
```

We added Sentry to:

```txt
backend
frontend
ai-service
ai-worker
```

---

### Backend Sentry

Installed package:

```bash
cd backend
npm install @sentry/node
```

Created:

```txt
backend/src/instrument.ts
```

Example:

```ts
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}
```

Then imported it at the very top of:

```txt
backend/src/main.ts
```

```ts
import './instrument';
```

Railway variable:

```env
SENTRY_DSN=your_backend_sentry_dsn
```

---

### Frontend Sentry

Installed package:

```bash
cd frontend
npm install @sentry/nextjs
```

The Sentry wizard can configure Next.js:

```bash
npx @sentry/wizard@latest -i nextjs
```

Railway variable:

```env
NEXT_PUBLIC_SENTRY_DSN=your_frontend_sentry_dsn
```

Optional source map variables:

```env
SENTRY_AUTH_TOKEN=your_token
SENTRY_ORG=your_org
SENTRY_PROJECT=your_frontend_project
```

---

### AI Service Sentry

Installed package:

```bash
cd ai-service
source .venv/bin/activate
pip install sentry-sdk
pip freeze > requirements.txt
```

Added to:

```txt
ai-service/app/main.py
```

Example:

```python
import os
import sentry_sdk

if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        environment=os.getenv("APP_ENV", "development"),
        traces_sample_rate=0.1 if os.getenv("APP_ENV") == "production" else 1.0,
    )
```

Railway variable for both `ai-service` and `ai-worker`:

```env
SENTRY_DSN=your_ai_service_sentry_dsn
```

---

## 15. Health Checks

Health endpoints were added so uptime monitoring can verify the services are online.

### Backend Health

Endpoint:

```txt
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "service": "backend",
  "timestamp": "2026-06-03T00:00:00.000Z"
}
```

### AI Service Health

Endpoint:

```txt
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "service": "ai-service"
}
```

### Frontend Health

For the frontend, the homepage is enough:

```txt
GET /
```

Expected result:

```txt
HTTP 200
```

---

## 16. Uptime Monitoring

We first considered Better Stack, but the free account only allowed one monitor in practice.

So we switched to an uptime monitoring tool with more free monitors.

Recommended options:

```txt
UptimeRobot
HetrixTools
```

The setup is the same concept for both tools:

```txt
Monitor the frontend URL
Monitor the backend /health URL
Monitor the AI service /health URL
```

---

## 17. Uptime Monitor Settings

### Frontend Monitor

```txt
Monitor Type: HTTP(s)
Monitor Name: QA Platform Frontend
Website Link: https://your-frontend.up.railway.app
HTTP Method: GET
Keyword: leave empty
Accepted HTTP Codes: 200
Timeout: 30 seconds
Maximum Redirects: 3
Checkup Frequency: 5 minutes
Number of Tries: 2
Alert after downtime: 5 minutes
SSL Certificate Verification: enabled
SSL Hostname Verification: enabled
```

---

### Backend Monitor

```txt
Monitor Type: HTTP(s)
Monitor Name: QA Platform Backend API
Website Link: https://your-backend.up.railway.app/health
HTTP Method: GET
Keyword: backend
Accepted HTTP Codes: 200
Timeout: 30 seconds
Maximum Redirects: 3
Checkup Frequency: 5 minutes
Number of Tries: 2
Alert after downtime: 5 minutes
SSL Certificate Verification: enabled
SSL Hostname Verification: enabled
```

The keyword `backend` should exist in the backend health response.

---

### AI Service Monitor

```txt
Monitor Type: HTTP(s)
Monitor Name: QA Platform AI Service
Website Link: https://your-ai-service.up.railway.app/health
HTTP Method: GET
Keyword: ai-service
Accepted HTTP Codes: 200
Timeout: 30 seconds
Maximum Redirects: 3
Checkup Frequency: 5 minutes
Number of Tries: 2
Alert after downtime: 5 minutes
SSL Certificate Verification: enabled
SSL Hostname Verification: enabled
```

The keyword `ai-service` should exist in the AI service health response.

---

## 18. Recommended Monitoring Locations

Because the developer is based in Tunisia, recommended check locations are mostly European:

```txt
London
Frankfurt
Amsterdam
New York
```

If using 4 monitoring locations, configure:

```txt
Number of Triggering Locations: 3
```

This avoids false alerts caused by one temporary regional network issue.

---

## 19. How the Whole Pipeline Works

The final pipeline looks like this:

```txt
Developer pushes code to GitHub
  ↓
GitHub Actions CI starts
  ↓
Backend job runs lint, tests, migrations, build
  ↓
Frontend job runs lint, tests, build
  ↓
AI service job runs Ruff and Pytest
  ↓
Security workflow scans npm and Python dependencies
  ↓
Docker workflow validates backend and AI service images
  ↓
Railway auto-deploys connected services from GitHub
  ↓
Railway runs frontend, backend, ai-service, ai-worker, PostgreSQL, Redis
  ↓
Qdrant Cloud stores vector data for RAG
  ↓
Sentry catches runtime errors
  ↓
Uptime monitoring checks public URLs every few minutes
```

---

## 20. What Happens on a Normal Code Change

Example: a developer changes backend code.

```txt
1. Developer commits and pushes code
2. GitHub Actions CI starts automatically
3. Backend lint/test/build must pass
4. Security and Docker checks run
5. Railway detects the push and redeploys the backend
6. If runtime errors happen, Sentry reports them
7. If the service goes offline, uptime monitoring sends an alert
```

This gives fast feedback and safer deployments.

---

## 21. What Happens on a Broken Change

If code has a lint error:

```txt
GitHub Actions CI fails
Railway deployment should not be trusted until fixed
Developer checks the failed job logs
Developer fixes the issue
Developer pushes again
```

If production deploys but crashes:

```txt
Sentry reports the exception
Uptime monitor may detect downtime
Developer checks Railway logs
Developer rolls forward with a fix
```

---

## 22. Current Tooling Summary

| Concern | Tool | Purpose |
|---|---|---|
| Git hosting | GitHub | Source code repository |
| CI | GitHub Actions | Automated checks on push/PR |
| Backend lint/test/build | ESLint, Jest, Nest build | Validate backend quality |
| Frontend lint/test/build | ESLint, Jest, Next build | Validate frontend quality |
| Python lint/test | Ruff, Pytest | Validate AI service quality |
| Dependency security | npm audit, pip-audit | Detect vulnerable packages |
| Dependency updates | Dependabot | Automated dependency PRs |
| Docker validation | Docker Build workflow | Validate deployable images |
| Hosting | Railway | Deploy app services and databases |
| Database | Railway PostgreSQL | Main relational database |
| Queue/cache | Railway Redis | Celery broker/result backend |
| Vector DB | Qdrant Cloud | RAG/project knowledge storage |
| Error tracking | Sentry | Runtime errors and performance |
| Uptime monitoring | UptimeRobot or HetrixTools | Public availability checks |

---

## 23. Recommended Next Improvements

These are optional improvements for later:

```txt
1. Add branch protection on main
2. Require CI to pass before merging pull requests
3. Add coverage thresholds
4. Add end-to-end tests with Playwright
5. Add production smoke tests after deploy
6. Add Sentry release tracking
7. Add Railway rollback documentation
8. Add database backup strategy
9. Add separate staging and production environments
```

For now, the pipeline is complete enough for a serious first CI/CD setup without being over-engineered.

---

## 24. Useful Commands

Run local backend checks:

```bash
cd backend
npm run lint
npm test
npm run build
```

Run local frontend checks:

```bash
cd frontend
npm run lint
npm test
npm run build
```

Run local AI service checks:

```bash
cd ai-service
source .venv/bin/activate
ruff check .
ruff format --check .
pytest
```

Run Prisma migrations on Railway:

```bash
cd backend
railway run npx prisma migrate deploy
```

Check backend health:

```bash
curl https://your-backend.up.railway.app/health
```

Check AI service health:

```bash
curl https://your-ai-service.up.railway.app/health
```

---

## 25. Final Result

At the end of today’s work, the project has a complete professional CI/CD foundation:

```txt
Code quality checks
Automated tests
Security scans
Docker build validation
Railway deployment
Sentry error tracking
Uptime monitoring
```

This setup gives confidence that the application can be changed, tested, deployed, and monitored safely.
