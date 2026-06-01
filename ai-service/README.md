# 🤖 AI Test Case & Automation Script Generation Service

FastAPI microservice responsible for AI-assisted manual test case generation, RAG retrieval, Playwright page inspection, automation script generation, and async background AI jobs.

This service receives normalized `WorkItem` and approved `TestCase` payloads from the NestJS backend. It can retrieve project knowledge from Qdrant, inspect web pages with Playwright, call OpenAI using strict structured outputs, fall back to a local Ollama/Qwen model when OpenAI is unavailable, validate generated results, and return candidates to the backend for human review.

The service is intentionally separated from the main backend so AI orchestration can evolve independently into a more advanced AI QA SaaS architecture with RAG, async jobs, multiple providers, local-model fallback, page inspection, and automation script generation.

---

## 📌 Purpose

The service has two main AI responsibilities.

### 1. Manual test case generation

```txt
NestJS Backend
  → creates TestCaseGeneration row
  → sends async generation job request
  → FastAPI enqueues Celery task
  → Celery runs RAG + provider fallback + quality checks
  → NestJS polls/syncs job result
  → NestJS saves TestCase records as GENERATED
```

### 2. Automation script generation from approved test cases

```txt
NestJS Backend
  → creates AutomationScriptGeneration row
  → sends async script generation job request
  → FastAPI enqueues Celery task
  → Celery runs Playwright inspection + provider fallback + quality checks
  → NestJS polls/syncs job result
  → NestJS saves AutomationScript candidate as GENERATED
```

The service does **not** own product data. NestJS remains the system of record for users, projects, work items, test cases, automation scripts, review status, approvals, edits, retries, and failed job handling.

---

## 🏗️ Architecture

```txt
ai-service/
  app/
    main.py
    celery_app.py

    api/
      v1/
        routes/
          test_case_generation.py
          test_case_generation_jobs.py
          automation_script_generation.py
          automation_script_generation_jobs.py
          page_inspection.py
          rag.py

    core/
      config.py

    schemas/
      generation.py
      rag.py
      page_inspection.py
      script_generation.py

    services/
      prompt_builder.py
      generation_pipeline.py
      quality_checker.py
      embedding_service.py
      qdrant_service.py
      rag_service.py
      page_inspector.py
      script_prompt_builder.py
      script_generation_pipeline.py
      script_quality_checker.py
      url_safety.py

    providers/
      fake_provider.py
      openai_provider.py
      ollama_provider.py
      ollama_utils.py
      fake_script_provider.py
      openai_script_provider.py
      ollama_script_provider.py

    tasks/
      test_case_generation_tasks.py
      automation_script_generation_tasks.py

    prompts/
  tests/
```

---

## 🧠 Test Case Generation Pipeline

```txt
1. Receive GenerateTestCasesRequest
2. Validate request with Pydantic
3. If useRag=true, embed the work item query and retrieve project context from Qdrant
4. Select the configured primary provider: OpenAI, Ollama/Qwen, or fake
5. Build a provider-specific prompt with WorkItem + optional retrieved context
6. Try the primary provider
7. If the primary provider fails, try the configured fallback provider
8. If the fallback provider also fails, return a safe internal template result instead of crashing
9. Parse and validate JSON response with Pydantic
10. Run quality checker
11. Calculate confidence
12. Return GenerateTestCasesResponse
```

The quality checker normalizes or rejects weak output before NestJS saves candidates.

It checks:

- empty titles
- duplicate test cases
- missing steps
- empty step actions
- missing expected result per step
- max test case limit
- acceptance criteria coverage
- business rules coverage
- warning deduplication
- confidence normalization

---

## 🧩 Automation Script Generation Pipeline

Automation script generation is intentionally based on actual page structure, not just the page URL.

```txt
1. Receive GenerateAutomationScriptRequest
2. Validate request with Pydantic
3. Validate target URL safety
4. Use Playwright to inspect the target page
5. Extract visible text, inputs, buttons, links, forms, and recommended selectors
6. Build prompt from approved test case + work item + page inspection + tester context
7. Try the primary script provider
8. If the primary provider fails, try the configured local Ollama/Qwen fallback
9. If the local fallback also fails, return a safe script skeleton instead of crashing
10. Run script quality checker
11. Return GenerateAutomationScriptResponse
```

This makes generated scripts more reliable because the AI sees the real page structure.

### Page inspection extracts

- page URL and final URL
- page title
- visible text
- inputs
- buttons
- links
- forms
- labels, placeholders, names, IDs, test IDs
- recommended selectors
- warnings
- optional screenshot placeholder for future use

### Supported script frameworks

| Framework | Output extension | Language |
|---|---:|---|
| `PLAYWRIGHT_TS` | `.spec.ts` | TypeScript |
| `PLAYWRIGHT_PYTHON` | `.py` | Python |
| `CYPRESS_TS` | `.cy.ts` | TypeScript |
| `SELENIUM_JAVA` | `.java` | Java |

### Script quality checker

The script quality checker validates and normalizes:

- non-empty file name
- non-empty code
- framework-specific file extension
- expected language
- framework-specific imports/commands
- security warnings for sensitive-looking hardcoded values
- warnings deduplication

---


## 🔁 Provider Fallback Architecture

The service is no longer locked to a single external AI company. Manual test case generation and automation script generation both support a layered provider strategy:

```txt
Primary provider: OpenAI
  → if OpenAI is unavailable, too expensive, rate-limited, or has an invalid API key
Fallback provider: local Ollama/Qwen model
  → if the local model times out or returns invalid JSON
Final fallback: safe internal template provider
  → returns a usable low-confidence skeleton instead of failing the job
```

This design addresses vendor-lock-in, API downtime, and cost-risk concerns while preserving OpenAI as the high-quality production provider.

### Implemented fallback behavior

- `LLM_PROVIDER=openai` with `LLM_FALLBACK_PROVIDER=ollama` for manual test case generation.
- `SCRIPT_LLM_PROVIDER=openai` with `SCRIPT_LLM_FALLBACK_PROVIDER=ollama` for automation script generation.
- Local model tested through Ollama using `qwen3:0.6b` for faster Mac execution.
- Ollama providers request structured JSON using Ollama `format` schemas.
- Qwen/DeepSeek-style `<think>...</think>` blocks are stripped before JSON parsing.
- The local prompt is intentionally reduced for speed and reliability.
- The local model returns lower-confidence results because it is a degraded fallback mode.
- If OpenAI and Ollama both fail, the fake/safe provider returns a deterministic template result so Celery jobs do not crash.

### Example successful fallback results

Manual test case generation can return:

```json
{
  "provider": "ollama",
  "model": "qwen3:0.6b",
  "generationMethod": "local_ollama_qwen_generation_v1",
  "confidence": 0.6
}
```

Automation script generation can return:

```json
{
  "provider": "ollama",
  "model": "qwen3:0.6b",
  "generationMethod": "playwright_inspection_local_ollama_qwen_script_generation_v1",
  "confidence": 0.6
}
```

If both AI providers fail, the response may use:

```json
{
  "provider": "fake",
  "generationMethod": "safe_template_generation_v1"
}
```

or for scripts:

```json
{
  "provider": "fake",
  "generationMethod": "playwright_inspection_safe_template_script_generation_v1"
}
```

### Local fallback limitations

The local Qwen model is intended as a fallback, not a full OpenAI replacement. It is useful for demos, offline resilience, and cost control, but it may produce simpler test cases and script skeletons. Complex automation scripts, strict selector use, and rich business reasoning are still better handled by a stronger hosted model.

---

## 🔌 Providers

### Fake test case provider

Used for local integration tests and as the final safe fallback when both OpenAI and Ollama fail.

```env
LLM_PROVIDER=fake
```

### OpenAI test case provider

Used as the primary high-quality provider for real manual test case generation.

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
```

### Ollama/Qwen test case provider

Used as a local fallback provider for manual test case generation. It runs on the developer machine and avoids external API dependency.

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:0.6b
```

For production-style fallback:

```env
LLM_PROVIDER=openai
LLM_FALLBACK_PROVIDER=ollama
```

### Fake automation script provider

Used to verify the full NestJS → FastAPI → Celery → NestJS script flow and as the final safe fallback for script generation.

### OpenAI automation script provider

Used as the primary high-quality provider for real automation script generation.

```env
SCRIPT_LLM_PROVIDER=openai
SCRIPT_OPENAI_MODEL=gpt-4.1-mini
SCRIPT_PROMPT_VERSION=automation_script_generation_v1
```

### Ollama/Qwen automation script provider

Used as a local fallback provider for automation script generation. Because small local models can struggle with large code outputs and strict JSON, this provider uses a reduced prompt and safety normalization. It may return a usable framework-specific script skeleton with lower confidence.

```env
SCRIPT_LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:0.6b
```

For production-style fallback:

```env
SCRIPT_LLM_PROVIDER=openai
SCRIPT_LLM_FALLBACK_PROVIDER=ollama
```

Both OpenAI providers use strict JSON schema output through `response_format.type = json_schema`. Ollama providers use local structured JSON generation with schema-like `format` payloads plus defensive JSON extraction and validation.

---

## 🔎 RAG Architecture

The service supports RAG through Qdrant.

### RAG indexing

NestJS sends project/work item knowledge to:

```txt
POST /v1/rag/chunks
```

FastAPI does:

```txt
RagDocumentChunk
  → OpenAI embedding
  → Qdrant point upsert
```

Current note: RAG embeddings still depend on OpenAI embeddings. If OpenAI embeddings fail, generation continues without retrieved context and adds a warning. The local Ollama fallback is currently for generation, not embeddings.

### RAG search

NestJS or internal generation pipelines can call:

```txt
POST /v1/rag/search
```

Test case generation retrieves project context automatically when:

```json
{
  "generationOptions": {
    "useRag": true
  }
}
```

### Indexed content examples

- manually created work items
- imported Jira work items
- imported specification document work items
- work item updates
- future project QA rules
- future approved test case examples

---

## ⏳ Async Job Architecture

The service uses Celery background jobs with Redis.

```txt
NestJS
  → POST /v1/test-case-generations/jobs
  → POST /v1/automation-script-generations/jobs
  → FastAPI enqueues Celery task
  → Redis broker
  → Celery worker executes generation pipeline
  → result stored in Redis result backend
  → NestJS polls FastAPI job status
  → NestJS persists final result in PostgreSQL
```

This prevents long HTTP waits between frontend, NestJS, FastAPI, Playwright, OpenAI, Qdrant, and Redis.

---

## 📦 Test Case Generation Contracts

### Sync debug endpoint

```txt
POST /v1/test-cases/generate
```

### Async production-style endpoints

```txt
POST /v1/test-case-generations/jobs
GET  /v1/test-case-generations/jobs/:jobId
```

### Example async request

```json
{
  "requestId": "req-001",
  "tenantId": "project-001",
  "userId": "user-001",
  "workItemId": "workitem-001",
  "source": "JIRA",
  "normalizedContent": {
    "type": "USER_STORY",
    "title": "Implémentation de la page de connexion",
    "priority": "Highest",
    "description": "En tant qu’utilisateur, je veux pouvoir me connecter...",
    "businessRules": [
      "La page doit contenir deux champs obligatoires : Email et Mot de passe."
    ],
    "acceptanceCriteria": [
      "Redirection vers le tableau de bord après une connexion réussie."
    ],
    "extraSections": {}
  },
  "generationOptions": {
    "maxTestCases": 10,
    "includePositiveTests": true,
    "includeNegativeTests": true,
    "includeEdgeCases": true,
    "includeSecurityTests": false,
    "useRag": true,
    "language": "fr"
  }
}
```

---

## 🧪 Automation Script Generation Contracts

### Sync debug endpoint

```txt
POST /v1/automation-scripts/generate
```

### Async production-style endpoints

```txt
POST /v1/automation-script-generations/jobs
GET  /v1/automation-script-generations/jobs/:jobId
```

### Page inspection endpoint

```txt
POST /v1/page-inspection/inspect
```

### Example script generation request

```json
{
  "requestId": "req-script-001",
  "tenantId": "project-001",
  "userId": "user-001",
  "testCaseId": "tc-001",
  "workItemId": "wi-001",
  "testCase": {
    "id": "tc-001",
    "title": "Verify successful login",
    "objective": "Validate that a user can login with valid credentials.",
    "type": "FUNCTIONAL",
    "priority": "HIGH",
    "preconditions": ["The user has an active account"],
    "steps": [
      {
        "order": 1,
        "action": "Open the login page",
        "expected": "The login page is displayed"
      },
      {
        "order": 2,
        "action": "Enter valid email and password",
        "expected": "The credentials are accepted"
      }
    ],
    "expectedResult": "The user is authenticated and redirected to the dashboard."
  },
  "workItem": {
    "id": "wi-001",
    "title": "Login page",
    "description": "The system must allow users to login.",
    "acceptanceCriteria": ["User can login with valid credentials"],
    "businessRules": ["Email and password are required"]
  },
  "generationContext": {
    "framework": "PLAYWRIGHT_TS",
    "targetUrl": "https://example.com",
    "browser": "CHROMIUM",
    "environment": "staging",
    "selectorsStrategy": "AUTO",
    "auth": {
      "required": false,
      "role": null,
      "instructions": null
    },
    "extraInstructions": "Use environment variables for sensitive values.",
    "variables": {}
  }
}
```

### Example script generation response

```json
{
  "requestId": "req-script-001",
  "testCaseId": "tc-001",
  "workItemId": "wi-001",
  "provider": "openai",
  "model": "gpt-4.1-mini",
  "promptVersion": "automation_script_generation_v1",
  "generationMethod": "playwright_inspection_structured_script_generation_v1",
  "confidence": 0.85,
  "warnings": [],
  "pageInspection": {
    "url": "https://example.com",
    "finalUrl": "https://example.com/",
    "title": "Example Domain",
    "visibleText": ["Example Domain"]
  },
  "script": {
    "fileName": "verify-successful-login.spec.ts",
    "language": "typescript",
    "code": "import { test, expect } from '@playwright/test';\n...",
    "explanation": "This script validates successful login using inspected selectors.",
    "dependencies": ["@playwright/test"],
    "setupNotes": ["Set BASE_URL before running the test."],
    "selectorsUsed": [
      {
        "purpose": "Login button",
        "selector": "page.getByRole('button', { name: 'Sign in' })",
        "source": "page_inspection"
      }
    ],
    "warnings": []
  }
}
```

---

## ⚙️ Local Setup

### 1. Navigate to the AI service

```bash
cd ai-service
```

### 2. Create a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

On Windows:

```bash
.venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

If `requirements.txt` does not exist yet:

```bash
pip install fastapi uvicorn pydantic pydantic-settings python-dotenv httpx openai qdrant-client celery redis playwright
playwright install chromium
pip freeze > requirements.txt
```

For Firefox/WebKit later:

```bash
playwright install firefox webkit
```

### 4. Configure environment

Create `.env`:

```env
APP_ENV=local

# Primary + fallback providers
LLM_PROVIDER=openai
LLM_FALLBACK_PROVIDER=ollama
SCRIPT_LLM_PROVIDER=openai
SCRIPT_LLM_FALLBACK_PROVIDER=ollama

# OpenAI primary provider
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TEMPERATURE=0.1
OPENAI_MAX_OUTPUT_TOKENS=4000
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

DEFAULT_MODEL=gpt-4.1-mini
PROMPT_VERSION=test_case_generation_v1_async_celery

SCRIPT_OPENAI_MODEL=gpt-4.1-mini
SCRIPT_OPENAI_TEMPERATURE=0.1
SCRIPT_OPENAI_MAX_OUTPUT_TOKENS=6000
SCRIPT_PROMPT_VERSION=automation_script_generation_v1

# Local Ollama fallback provider
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:0.6b
OLLAMA_TIMEOUT_SECONDS=120
OLLAMA_TEMPERATURE=0.1
OLLAMA_NUM_PREDICT=700
OLLAMA_NUM_CTX=2048

QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=project_knowledge
RAG_TOP_K=5

REDIS_URL=redis://localhost:6379
CELERY_BROKER_URL=redis://localhost:6379
CELERY_RESULT_BACKEND=redis://localhost:6379

PAGE_INSPECTION_TIMEOUT_MS=30000
PAGE_INSPECTION_WAIT_UNTIL=networkidle
PAGE_INSPECTION_MAX_TEXT_ITEMS=80
PAGE_INSPECTION_MAX_ELEMENTS=80
PAGE_INSPECTION_ALLOW_PRIVATE_URLS=true
```

For local fake generation:

```env
LLM_PROVIDER=fake
SCRIPT_LLM_PROVIDER=fake
```

---


### 5. Install and test local Ollama/Qwen fallback

Install Ollama for macOS, then pull the lightweight model used for local fallback:

```bash
ollama pull qwen3:0.6b
```

Quick local API test:

```bash
curl http://localhost:11434/api/generate   -d '{
    "model": "qwen3:0.6b",
    "prompt": "Return only JSON: {"message": "ok"}",
    "stream": false,
    "format": "json",
    "options": {
      "temperature": 0.1,
      "num_predict": 100,
      "num_ctx": 2048
    }
  }'
```

For local-only testing without OpenAI:

```env
LLM_PROVIDER=ollama
LLM_FALLBACK_PROVIDER=fake
SCRIPT_LLM_PROVIDER=ollama
SCRIPT_LLM_FALLBACK_PROVIDER=fake
```

For production-style fallback:

```env
LLM_PROVIDER=openai
LLM_FALLBACK_PROVIDER=ollama
SCRIPT_LLM_PROVIDER=openai
SCRIPT_LLM_FALLBACK_PROVIDER=ollama
```

---

## 🐳 Local Infrastructure

Create or use `docker-compose.ai.yml`:

```yaml
services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: ai-qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage

  redis:
    image: redis:7-alpine
    container_name: ai-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  qdrant_data:
  redis_data:
```

Start infrastructure:

```bash
docker compose -f docker-compose.ai.yml up -d
```

Check Redis:

```bash
docker exec -it ai-redis redis-cli ping
```

Expected:

```txt
PONG
```

Qdrant dashboard:

```txt
http://localhost:6333/dashboard
```

---

## ▶️ Running the Service

### Start FastAPI

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Swagger docs:

```txt
http://127.0.0.1:8001/docs
```

Health check:

```txt
GET /health
```

### Start Celery Worker

```bash
celery -A app.celery_app.celery_app worker --loglevel=info
```

The worker should show both registered tasks:

```txt
generate_test_cases_task
generate_automation_script_task
```

If Celery says `Received unregistered task`, make sure `app/celery_app.py` includes both task modules:

```python
include=[
    "app.tasks.test_case_generation_tasks",
    "app.tasks.automation_script_generation_tasks",
]
```

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---:|---|
| `APP_ENV` | No | Runtime environment, e.g. `local`, `dev`, `prod` |
| `LLM_PROVIDER` | Yes | `fake`, `openai`, or `ollama` for test case generation |
| `LLM_FALLBACK_PROVIDER` | No | Optional fallback provider, usually `ollama` or `fake` |
| `SCRIPT_LLM_PROVIDER` | Yes | `fake`, `openai`, or `ollama` for automation script generation |
| `SCRIPT_LLM_FALLBACK_PROVIDER` | No | Optional script fallback provider, usually `ollama` or `fake` |
| `OPENAI_API_KEY` | Required for OpenAI | OpenAI API key |
| `OPENAI_MODEL` | No | Model used for test case generation |
| `SCRIPT_OPENAI_MODEL` | No | Model used for script generation |
| `OPENAI_EMBEDDING_MODEL` | Required for RAG | Embedding model used for Qdrant vectors |
| `PROMPT_VERSION` | Yes | Prompt version stored in test case generation trace |
| `SCRIPT_PROMPT_VERSION` | Yes | Prompt version stored in automation script generation trace |
| `QDRANT_URL` | Required for RAG | Qdrant server URL |
| `QDRANT_COLLECTION` | Required for RAG | Qdrant collection name |
| `RAG_TOP_K` | No | Number of chunks retrieved during generation |
| `REDIS_URL` | Required for async jobs | Redis URL |
| `CELERY_BROKER_URL` | Required for Celery | Redis broker URL |
| `CELERY_RESULT_BACKEND` | Required for Celery | Redis result backend URL |
| `PAGE_INSPECTION_TIMEOUT_MS` | No | Playwright page load timeout |
| `PAGE_INSPECTION_ALLOW_PRIVATE_URLS` | No | Allows local/private URLs for dev testing |
| `OLLAMA_BASE_URL` | Required for local fallback | Ollama API URL, usually `http://localhost:11434` |
| `OLLAMA_MODEL` | Required for local fallback | Local model name, tested with `qwen3:0.6b` |
| `OLLAMA_TIMEOUT_SECONDS` | No | HTTP read timeout for local model generation |
| `OLLAMA_TEMPERATURE` | No | Local model temperature |
| `OLLAMA_NUM_PREDICT` | No | Maximum tokens generated by Ollama |
| `OLLAMA_NUM_CTX` | No | Ollama context window size |

---

## 🧩 Main Endpoints

### Test case generation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/test-cases/generate` | Synchronous debug generation |
| `POST` | `/v1/test-case-generations/jobs` | Create async Celery generation job |
| `GET` | `/v1/test-case-generations/jobs/:jobId` | Check async job status/result |

### Automation script generation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/automation-scripts/generate` | Synchronous debug script generation |
| `POST` | `/v1/automation-script-generations/jobs` | Create async script generation job |
| `GET` | `/v1/automation-script-generations/jobs/:jobId` | Check script job status/result |

### Page inspection

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/page-inspection/inspect` | Inspect target page with Playwright |

### RAG

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/rag/chunks` | Index one chunk into Qdrant |
| `POST` | `/v1/rag/search` | Search indexed chunks by semantic similarity |

---

## 🧪 Test with cURL

### Create async test case generation job

```bash
curl -X POST http://127.0.0.1:8001/v1/test-case-generations/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "req-async-001",
    "tenantId": "project-001",
    "userId": "user-001",
    "workItemId": "workitem-001",
    "source": "MANUAL",
    "normalizedContent": {
      "type": "TASK",
      "title": "Create or Update Work Item Details",
      "priority": "MEDIUM",
      "description": "Define the required details for this work item.",
      "businessRules": ["All required fields must be completed before submission"],
      "acceptanceCriteria": ["Work item includes a clear title"],
      "extraSections": {}
    },
    "generationOptions": {
      "maxTestCases": 5,
      "includePositiveTests": true,
      "includeNegativeTests": true,
      "includeEdgeCases": true,
      "includeSecurityTests": false,
      "useRag": false,
      "language": "en"
    }
  }'
```

Then check status:

```bash
curl http://127.0.0.1:8001/v1/test-case-generations/jobs/YOUR_JOB_ID
```

### Inspect a page

```bash
curl -X POST http://127.0.0.1:8001/v1/page-inspection/inspect \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "browser": "CHROMIUM",
    "includeScreenshot": false
  }'
```

### Create async automation script generation job

```bash
curl -X POST http://127.0.0.1:8001/v1/automation-script-generations/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "req-script-001",
    "tenantId": "project-001",
    "userId": "user-001",
    "testCaseId": "tc-001",
    "workItemId": "wi-001",
    "testCase": {
      "id": "tc-001",
      "title": "Verify successful login",
      "objective": "Validate that a user can login with valid credentials.",
      "type": "FUNCTIONAL",
      "priority": "HIGH",
      "preconditions": ["The user has an active account"],
      "steps": [
        {"order": 1, "action": "Open the login page", "expected": "The login page is displayed"}
      ],
      "expectedResult": "The user is authenticated and redirected to the dashboard."
    },
    "workItem": {
      "id": "wi-001",
      "title": "Login page",
      "description": "The system must allow users to login.",
      "acceptanceCriteria": ["User can login with valid credentials"],
      "businessRules": ["Email and password are required"]
    },
    "generationContext": {
      "framework": "PLAYWRIGHT_TS",
      "targetUrl": "https://example.com",
      "browser": "CHROMIUM",
      "environment": "staging",
      "selectorsStrategy": "AUTO",
      "auth": {"required": false, "role": null, "instructions": null},
      "extraInstructions": "Use environment variables for sensitive values.",
      "variables": {}
    }
  }'
```

Then check status:

```bash
curl http://127.0.0.1:8001/v1/automation-script-generations/jobs/YOUR_JOB_ID
```

---

## 🧠 Prompting Rules

### Test case generation

OpenAI uses the full prompt and strict schema. Ollama/Qwen uses a shorter local-fallback prompt for speed and JSON reliability.

The model is instructed to:

- generate only test cases supported by the input work item and retrieved project context
- treat the normalized work item as the primary source of truth
- not invent product behavior
- cover acceptance criteria
- cover business rules
- keep the same language as the work item when possible
- produce manual QA test cases only
- include coverage metadata
- add warnings instead of inventing missing information

### Automation script generation

OpenAI uses the full page-inspection prompt and strict schema. Ollama/Qwen uses a reduced prompt and safety normalization because small local models can struggle with long code-in-JSON responses.

The model is instructed to:

- generate one complete script for the selected framework
- use the approved test case as the execution goal
- use Playwright page inspection as the source of page structure
- prefer stable selectors from `recommendedSelectors`
- avoid hardcoded credentials, tokens, and secrets
- use environment variables for authentication context
- include imports, assertions, dependencies, setup notes, selectors used, and warnings
- return strict structured JSON only

---

## 🛡️ Security Notes

Recommended improvements before production:

- Protect FastAPI with an internal service API key
- Do not expose FastAPI directly to the browser
- Redact secrets before sending content to AI providers
- Never store raw passwords in generation context
- Use environment variable names for auth data
- Disable private URL inspection in production unless intentionally supported
- Avoid logging full requirement content or generated secrets
- Add request rate limiting
- Add structured error handling for OpenAI failures
- Keep provider fallback enabled so the service can continue when OpenAI is unavailable
- Treat local-model output as lower confidence and keep human review required
- Track token usage and cost
- Store only safe AI traces

---

## 🔮 Roadmap

- Service API key authentication between NestJS and FastAPI
- Token usage and cost estimation
- Prompt files with versioning
- Golden tests using sample work items and pages
- Coverage scoring for generated test cases
- Similar approved test case retrieval through RAG
- Local embedding provider fallback for RAG to remove the remaining OpenAI embedding dependency
- Page screenshot support for script generation
- Batch script generation from multiple approved test cases
- Secure secrets manager integration for auth flows
- CI/CD integration for approved scripts
