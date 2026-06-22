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
  → Automated Tests + Coverage
  → Dependency, Secret, and Code Security Scans
  → CodeScene Code Health Analysis
  → SonarQube Cloud Analysis
  → Docker Build Validation
  → Trivy Container Vulnerability Report
  → Snyk Dependency Monitoring Dashboard
  → Railway Deployment
  → Monitoring with Sentry + Uptime Monitoring
```

The pipeline uses complementary tools for different concerns: tests validate behavior, SonarQube and CodeScene evaluate maintainability, CodeQL checks source-code security, Gitleaks protects secrets, Trivy scans Docker images, and Snyk provides dependency visibility in its dashboard.

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

We added the base security workflow:

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

### Relationship With New Security Tools

The base `security.yml` workflow is now complemented by additional security workflows:

```txt
CodeQL   → scans application source code for security bugs
Gitleaks → scans the repository for leaked secrets
Trivy    → scans Docker images and reports vulnerabilities
Snyk     → monitors dependency vulnerabilities in the Snyk dashboard
```

Together, these tools cover different layers of the project:

```txt
source code
dependencies
secrets
Docker images
dashboard monitoring
```

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
## 10. CodeScene Code Health Analysis — `codescene.yml`

We added CodeScene as a code health and technical debt analysis workflow:

```txt
.github/workflows/codescene.yml
```

CodeScene is used to understand the long-term health of the codebase. It looks at both the code and the Git history to identify risk areas.

CodeScene helps answer questions such as:

```txt
Which files are becoming hard to maintain?
Which files are changed often and risky?
Did this pull request make code health worse?
Where should refactoring be prioritized?
Are there hotspots or technical debt trends?
```

This is different from tests and linters:

```txt
Tests      → check if the app behaves correctly
Linters    → check style and simple code problems
SonarQube  → checks quality, smells, bugs, duplication, coverage
CodeScene  → checks code health, hotspots, maintainability trends, and change risk
```

### CodeScene Workflow Behavior

The CodeScene workflow runs on:

```txt
pull requests
push to main
manual trigger
```

The workflow uses full Git history:

```yaml
fetch-depth: 0
```

This is important because CodeScene uses Git history to understand how the code changes over time.

### CodeScene Secret

The CodeScene CLI requires a token stored in GitHub Secrets:

```txt
CODESCENE_ACCESS_TOKEN
```

Optional for self-hosted/on-prem CodeScene:

```txt
CODESCENE_ONPREM_URL
```

### Beginner-Safe Mode

The first version of CodeScene is configured as beginner-safe:

```yaml
continue-on-error: true
```

That means CodeScene reports issues but does not block the pipeline yet.

Later, when the team is comfortable with the results, this can be changed into a strict quality gate by removing:

```yaml
continue-on-error: true
```

---

## 11. CodeQL Code Security Analysis — `codeql.yml`

We added GitHub CodeQL security scanning:

```txt
.github/workflows/codeql.yml
```

CodeQL scans the source code itself for security problems and unsafe coding patterns.

It analyzes:

```txt
backend + frontend  → JavaScript / TypeScript
ai-service          → Python
```

CodeQL helps find issues such as:

```txt
SQL injection
cross-site scripting
unsafe user input handling
path traversal
dangerous coding patterns
security bugs inside application code
```

### Why CodeQL Is Different

CodeQL is not the same as Dependabot or npm audit.

```txt
Dependabot / npm audit / pip-audit → vulnerable third-party packages
CodeQL                            → vulnerabilities inside our own source code
```

### CodeQL Workflow Behavior

The workflow runs on:

```txt
pull requests
push to main
weekly schedule
manual trigger
```

It uses:

```yaml
queries: +security-extended
```

This enables additional security-focused checks.

No custom secret is required for the basic CodeQL workflow.

Results appear in:

```txt
GitHub → Security → Code scanning
```

---

## 12. Gitleaks Secret Scanning — `gitleaks.yml`

We added Gitleaks:

```txt
.github/workflows/gitleaks.yml
```

Gitleaks scans the repository for accidentally committed secrets.

It protects against pushing values such as:

```txt
API keys
database URLs
JWT secrets
GitHub tokens
private keys
OpenAI keys
Qdrant API keys
Railway tokens
Sentry tokens
```

This is important because the project uses many sensitive environment variables for production deployments.

Examples of secrets that must never be committed:

```env
OPENAI_API_KEY=...
DATABASE_URL=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
QDRANT_API_KEY=...
SENTRY_DSN=...
SNYK_TOKEN=...
SONAR_TOKEN=...
CODESCENE_ACCESS_TOKEN=...
```

Gitleaks runs on pushes and pull requests.

If Gitleaks finds a real secret, the safe action is:

```txt
1. Remove the secret from the repository
2. Rotate/revoke the exposed token immediately
3. Create a new secret value
4. Store the new value only in GitHub Secrets or Railway variables
```

---

## 13. Trivy Container Vulnerability Reports — `trivy.yml`

We added Trivy image scanning:

```txt
.github/workflows/trivy.yml
```

Trivy scans Docker images for vulnerable OS packages and application dependencies.

It scans:

```txt
backend Docker image
ai-service Docker image
```

Trivy helps answer:

```txt
Does this Docker image include vulnerable OS packages?
Does the Python image contain vulnerable Python packages?
Does the Node image contain vulnerable Node packages?
Is the image safe enough to deploy?
```

### Report-Only Mode

The current Trivy setup is intentionally report-only:

```yaml
exit-code: "0"
```

This means:

```txt
Trivy finds vulnerabilities → report them
GitHub Actions workflow     → still passes
Deployment                  → not blocked by Trivy
```

This is useful during the beginner/learning phase because the team can see issues without breaking the full CI/CD pipeline.

The workflow still reports HIGH and CRITICAL vulnerabilities:

```yaml
severity: CRITICAL,HIGH
```

It ignores unfixed issues:

```yaml
ignore-unfixed: true
```

This reduces noise from vulnerabilities where no fix exists yet.

### SARIF Upload

Trivy also generates SARIF results for GitHub:

```txt
GitHub → Security → Code scanning
```

### Making Trivy Strict Later

When the project is ready to enforce container security, change:

```yaml
exit-code: "0"
```

to:

```yaml
exit-code: "1"
```

Then HIGH or CRITICAL findings can block the workflow.

---

## 14. Snyk Dependency Monitoring Dashboard — `snyk.yml`

We added Snyk as a report-only dependency security and monitoring workflow:

```txt
.github/workflows/snyk.yml
```

Snyk is used mainly for dependency visibility and dashboard monitoring.

It scans:

```txt
backend    → npm dependencies
frontend   → npm dependencies
ai-service → Python dependencies
```

We are not using Snyk Container at this stage because Trivy already scans Docker images.

We are not relying on Snyk Code at this stage because CodeQL already scans source-code security.

### Snyk Secret

Snyk requires a token stored in GitHub Secrets:

```txt
SNYK_TOKEN
```

### Snyk Workflow Behavior

On pull requests:

```txt
snyk test runs
results appear in GitHub Actions
SARIF can be uploaded to GitHub Security
the workflow does not block CI/CD
```

On push to main:

```txt
snyk test runs
snyk monitor runs
project snapshots are sent to the Snyk dashboard
the workflow does not block CI/CD
```

### Report-Only Mode

The workflow uses report-only behavior:

```bash
|| true
```

That means:

```txt
Snyk finds vulnerabilities → report them
GitHub Actions workflow    → still passes
Deployment                 → not blocked by Snyk
```

### Where Results Appear

After the workflow runs on `main`, results can appear in:

```txt
Snyk Dashboard → Projects
GitHub → Security → Code scanning
GitHub Actions logs
```

Expected Snyk dashboard projects:

```txt
ai-test-automation-platform:backend
ai-test-automation-platform:frontend
ai-test-automation-platform:ai-service
```

---

## 15. SonarQube Cloud Analysis

We added a SonarQube Cloud stage to the CI pipeline to provide a higher-level code quality gate.

SonarQube Cloud checks:

```txt
bugs
code smells
duplicated code
maintainability
security hotspots
test coverage
quality gate status
```

SonarQube does **not** replace ESLint, Ruff, tests, or dependency security scanning. Instead, it complements them by giving a dashboard and quality gate for the whole project.

### SonarQube Cloud Setup

In SonarQube Cloud, Automatic Analysis was disabled because the project now uses CI-based analysis through GitHub Actions.

A GitHub Actions secret was added:

```txt
SONAR_TOKEN
```

The token must only exist in GitHub Secrets. It must never be committed to the repository. If a token is pasted publicly or shared by mistake, it should be revoked and regenerated.

### Sonar Project Configuration

We added this file at the repository root:

```txt
sonar-project.properties
```

Example configuration:

```properties
sonar.projectKey=ghazy001_ai-test-automation-platform
sonar.organization=ghazy001
sonar.projectName=ai-test-automation-platform

sonar.sources=backend/src,frontend,ai-service/app
sonar.tests=backend/test,frontend,ai-service/tests

sonar.exclusions=**/node_modules/**,**/.next/**,**/dist/**,**/coverage/**,**/.venv/**,**/__pycache__/**,**/.pytest_cache/**,**/.ruff_cache/**,**/uploads/**,**/tmp/**,**/temp/**
sonar.test.inclusions=**/*.spec.ts,**/*.test.ts,**/*.test.tsx,ai-service/tests/**/*.py

sonar.javascript.lcov.reportPaths=backend/coverage/lcov.info,frontend/coverage/lcov.info
sonar.typescript.lcov.reportPaths=backend/coverage/lcov.info,frontend/coverage/lcov.info
sonar.python.coverage.reportPaths=ai-service/coverage.xml

sonar.sourceEncoding=UTF-8
```

### SonarQube Job in GitHub Actions

The SonarQube job was added to:

```txt
.github/workflows/ci.yml
```

It runs after the main CI jobs pass:

```yaml
needs:
  - backend
  - frontend
  - ai-service
```

The job checks out the full Git history with:

```yaml
fetch-depth: 0
```

This is recommended because shallow clones reduce the quality and accuracy of Sonar analysis.

The Sonar stage generates or reads coverage reports from:

```txt
backend/coverage/lcov.info
frontend/coverage/lcov.info
ai-service/coverage.xml
```

Then it runs:

```yaml
- name: SonarQube Cloud Scan
  uses: SonarSource/sonarqube-scan-action@v8.1.0
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Where SonarQube Fits

SonarQube sits after tests and before deployment confidence checks:

```txt
Tests produce coverage
  → SonarQube reads coverage
  → SonarQube checks bugs, smells, duplication, hotspots
  → Quality Gate passes or fails
```

If the quality gate fails, the team should inspect SonarQube Cloud, fix the issue, and push again.

---

## 16. Docker Build Validation — `docker-build.yml`

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

Docker build validation is separate from Trivy:

```txt
docker-build.yml → confirms the images can be built
trivy.yml        → scans the built images for vulnerabilities
```

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

## 17. Deployment Platform — Railway

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

## 18. Railway Services

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

## 19. Database Migrations

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

## 20. Monitoring with Sentry

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

## 21. Health Checks

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

## 22. Uptime Monitoring

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

## 23. Uptime Monitor Settings

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

## 24. Recommended Monitoring Locations

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

## 25. How the Whole Pipeline Works

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
Base security workflow scans npm and Python dependencies
  ↓
Gitleaks checks for leaked secrets
  ↓
CodeQL analyzes application source code security
  ↓
CodeScene analyzes code health, hotspots, and maintainability risk
  ↓
SonarQube Cloud analyzes code quality, coverage, duplication, bugs, and security hotspots
  ↓
Docker workflow validates backend and AI service images
  ↓
Trivy scans backend and AI service Docker images in report-only mode
  ↓
Snyk tests dependencies and sends main-branch snapshots to the Snyk dashboard
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

The key idea is layered confidence:

```txt
CI tests validate behavior
security tools detect risks
quality tools evaluate maintainability
Docker workflows validate packaging
monitoring tools watch production
```

## 26. What Happens on a Normal Code Change

Example: a developer changes backend code.

```txt
1. Developer commits and pushes code
2. GitHub Actions CI starts automatically
3. Backend lint/test/build must pass
4. Base dependency security checks run
5. Gitleaks checks that no secrets were committed
6. CodeQL scans source code security
7. CodeScene reports code health and change risk
8. SonarQube Cloud analyzes code quality and the quality gate
9. Docker image validation runs
10. Trivy reports container vulnerabilities without blocking the workflow
11. Snyk reports dependency issues and updates the Snyk dashboard on main
12. Railway detects the push and redeploys the relevant service
13. If runtime errors happen, Sentry reports them
14. If the service goes offline, uptime monitoring sends an alert
```

This gives fast feedback and safer deployments.

## 27. What Happens on a Broken Change

If code has a lint error:

```txt
GitHub Actions CI fails
Railway deployment should not be trusted until fixed
Developer checks the failed job logs
Developer fixes the issue
Developer pushes again
```

If CodeQL, SonarQube, or base dependency security checks fail:

```txt
Developer opens the failing workflow
Developer reads the reported issue
Developer fixes the code or dependency
Developer pushes again
```

If Trivy or Snyk reports vulnerabilities:

```txt
The workflow reports the issue
The workflow does not fail because these tools are currently report-only
Developer reviews the report
Developer updates packages, base images, or Dockerfiles when possible
```

If Gitleaks reports a real secret:

```txt
The exposed secret must be considered compromised
Developer removes it from the repository
Developer rotates/revokes the token
Developer creates a new secret in GitHub/Railway/Snyk/etc.
Developer pushes the safe version
```

If production deploys but crashes:

```txt
Sentry reports the exception
Uptime monitor may detect downtime
Developer checks Railway logs
Developer rolls forward with a fix
```

## 28. Current Tooling Summary

| Concern | Tool | Purpose |
|---|---|---|
| Git hosting | GitHub | Source code repository |
| CI | GitHub Actions | Automated checks on push/PR |
| Backend lint/test/build | ESLint, Jest, Nest build | Validate backend quality |
| Frontend lint/test/build | ESLint, Jest, Next build | Validate frontend quality |
| Python lint/test | Ruff, Pytest | Validate AI service quality |
| Dependency security | npm audit, pip-audit | Detect vulnerable packages |
| Dependency updates | Dependabot | Automated dependency PRs |
| Source-code security | CodeQL | Detect security bugs inside JavaScript/TypeScript and Python code |
| Secret scanning | Gitleaks | Detect accidentally committed API keys, tokens, and private keys |
| Code health / technical debt | CodeScene | Detect hotspots, code health decline, maintainability risk, and risky changes |
| Dependency monitoring dashboard | Snyk | Report dependency vulnerabilities and send snapshots to the Snyk dashboard |
| Docker validation | Docker Build workflow | Validate deployable images |
| Container vulnerability scanning | Trivy | Report HIGH/CRITICAL vulnerabilities in Docker images without blocking CI |
| Code quality dashboard | SonarQube Cloud | Bugs, code smells, duplication, security hotspots, coverage, quality gate |
| Hosting | Railway | Deploy app services and databases |
| Database | Railway PostgreSQL | Main relational database |
| Queue/cache | Railway Redis | Celery broker/result backend |
| Vector DB | Qdrant Cloud | RAG/project knowledge storage |
| Error tracking | Sentry | Runtime errors and performance |
| Uptime monitoring | UptimeRobot or HetrixTools | Public availability checks and downtime alerts |

## 29. Recommended Next Improvements

These are optional improvements for later:

```txt
1. Add branch protection on main
2. Require important CI checks to pass before merging pull requests
3. Decide which report-only tools should become blocking later
4. Add coverage thresholds
5. Add end-to-end tests with Playwright
6. Add production smoke tests after deploy
7. Add Sentry release tracking
8. Add Railway rollback documentation
9. Add database backup strategy
10. Add separate staging and production environments
11. Add Hadolint for Dockerfile best practices
12. Add OpenSSF Scorecard if the repository becomes public/open-source
```

Recommended strictness strategy:

```txt
Now:
  Trivy and Snyk report only

Later:
  Block only CRITICAL vulnerabilities

Mature stage:
  Block HIGH and CRITICAL vulnerabilities after the team has a fix process
```

For now, the pipeline is complete enough for a serious first CI/CD setup without being over-engineered.

## 30. Useful Commands

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

Run Snyk locally if the CLI is installed:

```bash
cd backend
snyk test
snyk monitor
```

Run Trivy locally against a built image:

```bash
trivy image qa-platform-backend:local
trivy image qa-platform-ai-service:local
```

Run Gitleaks locally if installed:

```bash
gitleaks detect --source .
```

## 31. Final Result

At the end of today’s work, the project has a complete professional CI/CD foundation:

```txt
Code quality checks
Automated tests
Dependency security scans
Secret scanning with Gitleaks
Source-code security scanning with CodeQL
Code health and technical debt analysis with CodeScene
SonarQube Cloud quality gate
Docker build validation
Trivy container vulnerability reporting
Snyk dependency monitoring dashboard
Railway deployment
Sentry error tracking
Uptime monitoring
```

This setup gives confidence that the application can be changed, tested, deployed, scanned, and monitored safely.

The current security posture is beginner-friendly:

```txt
Blocking:
  lint/test/build failures
  base npm audit / pip-audit policy
  SonarQube quality gate if configured as blocking
  CodeQL if GitHub code scanning is configured to enforce it

Report-only:
  CodeScene
  Trivy
  Snyk
```

The report-only tools still give useful visibility without blocking deployments while the team is learning and stabilizing the workflow.

## 32. Final CI/CD Flow Diagram

```txt
Developer on macOS
  │
  │  git add .
  │  git commit -m "change"
  │  git push
  ▼
GitHub Repository
  │
  ├──────────────────────────────────────────────────────────────┐
  │                                                              │
  ▼                                                              ▼
GitHub Actions CI                                          Security Workflows
  │                                                              │
  ├─ Backend Job                                                 ├─ npm audit backend
  │    ├─ npm ci                                                 ├─ npm audit frontend
  │    ├─ prisma generate                                        ├─ pip-audit ai-service
  │    ├─ prisma migrate deploy                                  ├─ Gitleaks secret scan
  │    ├─ ESLint                                                 ├─ CodeQL code security scan
  │    ├─ Jest tests + coverage                                  ├─ Snyk dependency report
  │    └─ NestJS build                                           └─ Dependabot PRs
  │
  ├─ Frontend Job
  │    ├─ npm ci
  │    ├─ ESLint
  │    ├─ Jest tests + coverage
  │    └─ Next.js build
  │
  └─ AI Service Job
       ├─ pip install
       ├─ Ruff lint
       ├─ Ruff format check
       └─ Pytest + coverage
  │
  ▼
Code Health + Quality Analysis
  │
  ├─ CodeScene
  │    ├─ code health
  │    ├─ hotspots
  │    ├─ technical debt trends
  │    └─ risky changes
  │
  └─ SonarQube Cloud
       ├─ reads backend/coverage/lcov.info
       ├─ reads frontend/coverage/lcov.info
       ├─ reads ai-service/coverage.xml
       ├─ checks bugs, code smells, duplication
       ├─ checks security hotspots
       └─ applies Quality Gate
  │
  ▼
Docker Validation + Container Scanning
  │
  ├─ Docker Build Validation
  │    ├─ build backend Docker image
  │    └─ build ai-service Docker image
  │
  └─ Trivy Report-Only Scan
       ├─ scan backend image
       ├─ scan ai-service image
       ├─ report HIGH/CRITICAL vulnerabilities
       └─ upload SARIF to GitHub Security
  │
  ▼
Snyk Dashboard Monitoring
  │
  ├─ snyk test on backend/frontend/ai-service
  ├─ snyk monitor on main branch
  └─ project snapshots appear in Snyk Dashboard
  │
  ▼
Railway Deployment
  │
  ├─ Frontend service     → Next.js app
  ├─ Backend service      → NestJS API
  ├─ AI service           → FastAPI API
  ├─ AI worker            → Celery worker
  ├─ PostgreSQL           → Prisma database
  └─ Redis                → Celery broker/result backend
  │
  ▼
External Cloud Services
  │
  └─ Qdrant Cloud         → RAG vector database
  │
  ▼
Production Monitoring
  │
  ├─ Sentry
  │    ├─ frontend runtime errors
  │    ├─ backend API errors
  │    └─ ai-service / worker errors
  │
  └─ UptimeRobot or HetrixTools
       ├─ checks frontend URL
       ├─ checks backend /health
       └─ checks ai-service /health
```

This flow means every code change is checked before and after deployment: CI validates the code, security tools report risks, SonarQube and CodeScene evaluate maintainability and quality, Railway deploys the services, and monitoring tools alert you if production has runtime errors or downtime.


