# 🚀 AI Test Automation Platform

A full-stack enterprise-style platform for managing software testing workflows, structured work items, Jira-based requirement intake, specification-document extraction, RAG-enabled AI test case generation, automation script generation, natural-language analytics, and human review of generated QA assets.

The platform is designed as the foundation for an **AI-driven QA and test automation SaaS**. Requirements from different sources are normalized into internal `WorkItem` objects, indexed as project knowledge, transformed into reviewable manual test cases, converted into automation script candidates through Playwright page inspection, and analyzed through a natural-language analytics assistant.

### Latest Update

The platform now includes an enhanced professional **Audit & Activity Logs** module for admin monitoring. Admins can track security events, user management actions, project changes, WorkItem activity, AI generation lifecycle events, automation script review actions, live executions, reports, scheduled runs, and analytics assistant usage from a centralized audit timeline.

The audit module now supports filtered **CSV export**, styled **Excel export**, row selection, selected-log deletion, and clear matching/all audit-log actions with a confirmation modal. Export and clear actions respect the active search/filter state, making the audit module suitable for admin reporting, operational cleanup, and review workflows.

The platform also includes an expanded **Live Execution & Reporting** workflow for approved automation scripts. Executions can produce automatic defect/bug reports when they fail, generate test suite reports from selected runs, export reports as PDFs, and schedule approved scripts to run automatically using cron-based schedules such as "every Friday at 09:00".

---

## 📌 Project Overview

The platform helps QA and testing teams organize and transform requirements by combining:

- 🔐 JWT-based authentication
- 👥 Role-based access: Admin / Tester
- 🛡️ Admin audit and activity logs with CSV/Excel export and controlled cleanup actions
- 📁 Project-based organization
- 🧩 Work item management
- ✍️ Manual work item creation
- 🔗 Jira Cloud import using OAuth 2.0
- 📄 Specification document import from PDF, DOCX, TXT, and MD files
- 🧠 AI-assisted requirement extraction
- 🧪 AI-generated manual test cases
- ✅ Human review workflow for generated test cases
- 🤖 AI-generated automation scripts from approved test cases
- 🕸️ Playwright page inspection before script generation
- ▶️ Live automation script execution from approved scripts
- 🐳 Docker-based isolated execution runners
- 🧰 Multi-framework runner support for Playwright TS, Cypress TS, Playwright Python, and Selenium Java
- 📎 Execution artifacts: screenshots, traces, videos, and reports
- 🕘 Execution history and execution detail modal
- 📊 Per-script execution analytics: total runs, pass rate, failures, average duration, latest failed run, and most used browser
- 🐞 Automatic defect/bug reports when script executions fail or time out
- 📑 Test suite reports generated from selected execution runs
- 📄 PDF export for defect reports and test suite reports
- 🗓️ Scheduled test runs for approved scripts using cron-based schedules
- 🔎 RAG-ready project knowledge retrieval using Qdrant
- ⏳ Async AI generation using FastAPI, Redis, and Celery
- 📊 Dashboard analytics and project visibility
- 💬 Natural-language AI analytics assistant
- 🧮 Safe PostgreSQL SELECT query generation
- 📈 AI-recommended charts and SQL result insights
- 🕵️ Centralized audit trail for security, QA, AI, execution, and reporting actions

The main product flow is:

```txt
External requirement source
  → normalized WorkItem
  → automatically indexed project knowledge
  → AI-generated TestCase candidates
  → human review and approval
  → approved TestCase
  → Playwright page inspection + AI script generation
  → generated AutomationScript candidate
  → human review / edit / approve / decline / download
  → approved AutomationScript
  → configurable live execution
  → Docker runner
  → streamed logs + persisted artifacts
  → execution history and detail review
  → execution analytics summary
  → automatic defect report when execution fails
  → optional test suite report + PDF export
  → optional scheduled recurring execution

Analytics side flow:

Natural language QA question
  → schema-aware SQL plan
  → SQL safety validation + project scoping
  → PostgreSQL SELECT execution
  → chart recommendation
  → final insight

Audit side flow:

User/admin/system action
  → backend captures actor + action + entity + request context
  → sanitized before/after metadata is saved
  → admin reviews searchable timeline, filters, stats, and event details
```

---

## 🏗️ Tech Stack

### Backend

- NestJS
- Prisma
- PostgreSQL
- JWT authentication
- bcrypt
- Axios
- Jira Cloud REST API
- Groq SDK for Jira/specification extraction support
- FastAPI integration clients for:
  - AI test case generation
  - automation script generation
  - RAG indexing/search
  - async AI job sync
- OpenAI SDK for schema-aware analytics SQL planning and insight generation
- Safe PostgreSQL analytics execution through validated read-only SELECT queries
- NestJS Schedule for recurring scheduled test runs
- cron-parser for next-run calculation
- PDFKit for backend PDF report generation
- ExcelJS for styled audit-log Excel exports
- Centralized audit logging through Prisma and PostgreSQL

### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Axios
- Recharts
- Sonner
- Lucide React
- Dark analytics assistant UI with chat, SQL, result table, and chart panels
- Execution history UI with defect report and suite report actions
- Scheduled test run panel for creating, pausing, resuming, and disabling recurring runs
- Admin audit logs page with KPI cards, advanced filters, table, pagination, event details modal, CSV/Excel export, row selection, and controlled delete/clear actions

### AI Service

- FastAPI
- Pydantic
- OpenAI SDK
- OpenAI Structured Outputs
- Qdrant vector database
- Redis
- Celery
- Provider-based AI architecture
- Prompt builder
- Output quality checker
- RAG retrieval pipeline

---

## 👤 Roles

### 🛠️ Admin

- Login / logout
- Create users
- Assign roles
- Activate / deactivate accounts
- View global statistics
- Create and manage projects
- Assign testers to projects
- View all projects
- Access and manage work items inside projects
- View centralized audit and activity logs
- Filter audit events by action, entity, severity, status, date, user, and project
- Export audit logs to CSV or styled Excel files
- Delete selected audit logs or clear matching logs with confirmation

### 🧪 Tester

- Login / logout
- Access assigned projects
- View project details
- View project work items
- Use AI analytics assistant across assigned projects
- Optionally scope analytics to a selected assigned project
- Create manual work items
- Import Jira issues into assigned projects
- Upload technical specification documents
- Select an AI model before extracting WorkItems
- Preview AI-extracted WorkItems before import
- Generate AI test cases from normalized work items
- Use RAG/project context during generation
- Review, edit, approve, or decline generated test cases
- View generation history, warnings, confidence, and AI trace metadata
- Run approved automation scripts manually or on a recurring schedule
- Generate and download defect reports and test suite reports as PDFs

---

## 🧱 Core Functional Modules

### 1. Authentication & Users

- JWT access + refresh token flow
- Role-based authorization
- Protected backend endpoints
- User management for admins
- Account activation / deactivation
- Password hashing with bcrypt

### 1.1 Audit & Activity Logs

The platform includes a centralized admin-only audit module for tracking important user, admin, AI, QA, and system activities.

The audit log captures:

- actor information: user id, name, email, and role
- action name, such as `LOGIN`, `USER_CREATED`, `PROJECT_UPDATED`, or `SCRIPT_EXECUTION_FAILED`
- entity type and entity id
- optional project scope
- human-readable event message
- severity: `INFO`, `WARNING`, or `CRITICAL`
- success or failure status
- request context, including IP address and user agent
- sanitized `before`, `after`, and `metadata` JSON payloads

Tracked activity categories include:

- authentication events: login, failed login, logout, password changes, password reset flow
- admin user management: create, update, activate, and deactivate users
- project management: create, update, delete, assign tester, and remove tester
- WorkItem lifecycle: manual creation, update, delete, Jira import, and specification-document import
- test case generation and review: generation started/completed/failed, edit, approve, decline
- automation script generation and review: generation started/completed/failed, edit, approve, decline, remove, download
- live execution: started, passed, failed, timed out, and canceled executions
- reporting: defect reports, suite reports, and PDF downloads
- scheduled runs: create, update, pause, resume, and disable schedules
- analytics assistant usage

Admin UI features:

- `/admin/audit-logs` page
- KPI cards for today’s events, failed actions, critical events, and failed logins
- advanced filters by search text, action, entity type, severity, success/failure, and date range
- paginated activity timeline table
- status and severity badges
- CSV export for lightweight audit reporting
- styled Excel export with formatted columns, frozen header, and status/severity highlighting
- row selection for bulk actions
- delete selected audit logs with confirmation
- clear matching/all audit logs with confirmation and active-filter awareness
- event details modal with actor, entity, project, IP address, user agent, before/after data, and metadata

### 2. Project Management

- Create, update, delete projects
- Assign testers to projects
- Remove testers from projects
- Role-based project visibility:
  - Admin sees all projects
  - Tester sees assigned projects only

### 3. Work Items

A `WorkItem` is the central normalized requirement object.

A work item can come from:

- `MANUAL`
- `JIRA`
- `SPEC_DOCUMENT`

Supported fields include:

- title
- description
- acceptanceCriteria
- businessRules
- priority
- source
- status
- externalSystem
- externalRef
- rawPayload
- normalizedContent
- metadata

Important design idea:

```txt
rawPayload         = original source payload or import context
normalizedContent = structured internal requirement content
metadata          = extraction/import metadata
```

After creation/import/update, useful work item content is automatically indexed into the RAG knowledge base through the AI service and Qdrant.

---

## 🔗 Jira Integration

The platform supports Jira Cloud OAuth 2.0 so each user can connect their own Jira account.

Implemented:

- OAuth URL generation
- signed state validation
- callback handling
- token storage
- access token refresh
- per-user Jira connections
- Jira issue fetch by key
- Jira issue search using JQL
- issue preview before import
- work item import from Jira
- automatic RAG indexing after successful import

### Jira Content Extraction

Imported Jira tickets are normalized into structured internal content.

Current extraction pipeline:

- rules-first parsing
- ADF-aware parsing
- section detection from headings
- fallback inference for unlabeled Jira lists
- French-friendly classification
- extraction of:
  - description
  - acceptanceCriteria
  - businessRules
  - tasks
  - testCases
  - definitionOfDone
  - notes

### AI Fallback Extraction

When rule-based parsing is weak or ambiguous, the platform can use Groq Cloud as a fallback.

The AI fallback:

- preserves the original language
- does not replace the rules pipeline by default
- enriches extraction only when needed
- stores extraction metadata for traceability

---

## 📄 Specification Document Import

The platform supports importing WorkItems from technical specification documents and requirements documents.

Supported document types:

- PDF
- DOCX
- TXT
- MD

Supported AI extraction models:

- `llama-3.3-70b-versatile`
- `openai/gpt-oss-120b`
- `meta-llama/llama-4-scout-17b-16e-instruct`

Implemented flow:

1. Tester uploads a specification document inside an assigned project.
2. Tester selects the AI extraction model to use.
3. Backend validates the selected model against an allowlist.
4. Backend extracts readable text from the uploaded file.
5. AI analyzes the document using the selected model.
6. The platform returns a preview of extracted WorkItems.
7. Tester can select, edit, remove, and validate WorkItems before import.
8. Selected WorkItems are saved with source `SPEC_DOCUMENT`.
9. Imported WorkItems are automatically indexed for RAG.

Extracted WorkItems can include:

- title
- type
- description
- acceptanceCriteria
- businessRules
- priority
- confidence score
- source section

---

## 🔎 RAG / Project Knowledge

The platform includes a RAG-ready architecture using Qdrant.

### What is indexed

Work item content is automatically indexed after:

- manual work item creation
- Jira work item import
- specification document work item import
- work item update

Indexed content includes:

- title
- type
- source
- priority
- description
- acceptance criteria
- business rules
- normalized content
- metadata

### RAG flow

```txt
WorkItem saved in PostgreSQL
  → NestJS builds clean RAG content
  → NestJS sends chunk to FastAPI
  → FastAPI embeds content
  → Qdrant stores vector + metadata
  → AI generation can retrieve related context when useRag=true
```

### Debug endpoints

The backend can expose debug endpoints for RAG indexing/search:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/work-items/:workItemId/rag/index` | Manually index one work item for RAG |
| `GET` | `/work-items/:workItemId/rag/search` | Search RAG context related to a work item |

These endpoints are useful during development. In the normal product flow, the user does not need to click an index button.

---

## 🧪 AI Test Case Generation

The platform includes a dedicated AI test case generation workflow.

### Design Principle

The system does not generate automation scripts directly from raw requirements.

Instead:

```txt
WorkItem.normalizedContent
  → AI-generated manual TestCase candidates
  → tester approval/edit/decline
  → approved TestCases
  → future script generation
```

This keeps the workflow auditable and human-controlled.

### Backend Workflow

NestJS owns product data and review lifecycle.

```txt
POST /work-items/:workItemId/test-cases/generate
  → load work item
  → verify project access
  → create TestCaseGeneration with PROCESSING
  → send async job request to FastAPI
  → FastAPI creates Celery job
  → frontend polls latest generation
  → NestJS syncs FastAPI job status/result
  → save TestCase records with GENERATED status
```

Generated test cases can then be:

- listed
- opened
- edited
- approved
- declined

### FastAPI AI Service Workflow

FastAPI owns AI orchestration, not application data.

Current AI pipeline:

```txt
GenerateTestCasesRequest
  → validate input schema
  → optionally retrieve RAG context from Qdrant
  → build prompt
  → call OpenAI with strict structured output
  → validate output with Pydantic
  → run quality checker
  → return structured test case candidates
```

### Human Review Lifecycle

```txt
GENERATED → APPROVED
GENERATED → DECLINED
GENERATED → EDITED → APPROVED
```

### Async Generation Lifecycle

```txt
PENDING / PROCESSING → COMPLETED
PENDING / PROCESSING → FAILED
```

The UI supports:

- background polling
- generation history
- warnings display
- confidence display
- retry failed generation
- timeout/manual mark-failed UX

### Traceability

Each generation stores:

- provider
- model
- promptVersion
- generationMethod
- inputHash
- options
- warnings
- errorMessage
- confidence
- aiTrace
- Celery job id / job status when async
- generated test cases

Each test case stores:

- title
- objective
- type
- priority
- preconditions
- steps
- expectedResult
- testData
- tags
- coverage
- status
- review metadata

---


## 🤖 Automation Script Generation

The platform supports generating automation script candidates from **approved** test cases.

### Design Principle

The system does not pass only a page URL directly to the AI.

Instead:

```txt
Approved TestCase
  + WorkItem context
  + tester-provided execution context
  + Playwright page inspection result
  → OpenAI strict structured script generation
  → AutomationScript candidate
  → human review/edit/approve/decline/download
```

### Script Generation Context

The tester provides:

- framework
- URL/page link to test
- environment
- browser
- auth required or not
- auth role
- auth instructions
- selector strategy
- extra instructions
- variables metadata

Sensitive values should not be hardcoded. Auth instructions should guide the generated script to use environment variables such as `BASE_URL`, `TESTER_EMAIL`, or `TESTER_PASSWORD`.

### Supported Frameworks

| Framework | Extension |
|---|---:|
| `PLAYWRIGHT_TS` | `.spec.ts` |
| `PLAYWRIGHT_PYTHON` | `.py` |
| `CYPRESS_TS` | `.cy.ts` |
| `SELENIUM_JAVA` | `.java` |

### Backend Workflow

```txt
POST /test-cases/:testCaseId/automation-scripts/generate
  → verify test case exists
  → verify project access
  → require test case status APPROVED
  → create AutomationScriptGeneration with PROCESSING
  → send async script job request to FastAPI
  → FastAPI creates Celery job
  → frontend polls latest script generation
  → NestJS syncs FastAPI job status/result
  → save AutomationScript with GENERATED status
```

Generated automation scripts can then be:

- listed under the approved test case
- opened
- edited
- approved
- declined
- removed
- downloaded with the correct file name and extension

### FastAPI Script Generation Workflow

```txt
GenerateAutomationScriptRequest
  → validate input schema
  → validate target URL safety
  → inspect target URL with Playwright
  → extract visible text, inputs, buttons, links, forms, recommended selectors
  → build prompt with approved test case + work item + page inspection
  → call OpenAI with strict structured output
  → run script quality checker
  → return script candidate
```

### Review Lifecycle

```txt
GENERATED → APPROVED
GENERATED → DECLINED
GENERATED → EDITED → APPROVED
GENERATED → REMOVED
```

### Async Generation Lifecycle

```txt
PENDING / PROCESSING → COMPLETED
PENDING / PROCESSING → FAILED
```

The UI supports:

- Generate Script button only for approved test cases
- script generation modal
- framework selection
- browser/environment/auth/selector configuration
- background polling
- processing banner
- failed generation retry
- timeout/manual mark-failed UX
- generated script review card
- edit/save
- approve/decline/remove
- local download as file

---

## ▶️ Live Automation Script Execution

The platform now supports running approved automation scripts directly from the UI.

### Design Principle

Generated scripts must be reviewed and approved before execution.

```txt
Generated AutomationScript
  → tester review/edit
  → approve script
  → configure execution
  → start live run
  → stream logs
  → save artifacts
  → review execution history
```

### Run Configuration Modal

Before starting a live execution, testers can configure:

- target URL
- browser
- environment
- runtime variables such as `EMAIL`, `PASSWORD`, `TOKEN`, or custom test data

For Docker mode on macOS, local frontend targets should usually use:

```txt
http://host.docker.internal:3000
```

instead of `http://localhost:3000`.

### Live Execution Panel

The frontend displays:

- current execution status
- browser
- environment
- target URL
- exit code
- streamed logs
- stdout / stderr
- error message
- downloadable artifacts

### Execution History

Each script card includes an execution history panel showing previous runs for that script.

The history displays:

- status
- browser
- environment
- target URL
- duration
- created date
- artifact count

Clicking a history row opens a dedicated execution detail modal.

### Execution Detail Modal

The execution detail modal shows:

- status and metadata
- framework
- browser
- environment
- command
- target URL
- timestamps
- duration
- logs
- stdout / stderr
- artifacts
- error message

### Execution Analytics Panel

Each automation script card includes a lightweight execution analytics panel that summarizes previous live runs for that script.

The panel displays:

- total executions
- passed executions
- failed executions
- timed-out executions
- canceled executions
- queued/running executions
- pass rate
- average execution duration
- most used browser
- latest execution status
- latest failed execution

These metrics are refreshed automatically after a live run finishes and can also be manually refreshed from the UI.

### Backend Execution Flow

```txt
POST /automation-scripts/:scriptId/executions
  → verify script exists
  → verify project access
  → require script status APPROVED
  → create AutomationScriptExecution with QUEUED
  → runner switches to RUNNING
  → prepare framework-specific project
  → run script locally or inside Docker
  → stream stdout/stderr into logs
  → collect artifacts
  → mark PASSED / FAILED / TIMED_OUT
```

### Execution Analytics Backend Flow

```txt
GET /automation-scripts/:scriptId/execution-stats
  → verify script exists
  → verify project access
  → load all executions for the script
  → calculate status counts
  → calculate pass rate
  → calculate average duration
  → detect most used browser
  → return latest execution and latest failed execution summary
```

### Supported Live Execution Frameworks

| Framework | Runner | Notes |
|---|---|---|
| `PLAYWRIGHT_TS` | Docker / local runner workspace | Supports traces, screenshots, and videos |
| `CYPRESS_TS` | Docker Cypress runner | Uses `cypress.config.js` and Electron by default |
| `PLAYWRIGHT_PYTHON` | Docker Python Playwright runner | Uses pytest |
| `SELENIUM_JAVA` | Docker Maven Java runner | Requires Docker/headless-compatible generated Java code |

### Docker Runner Images

The project uses dedicated Docker images for live execution:

```txt
testflow-playwright-ts-runner
testflow-cypress-ts-runner
testflow-playwright-python-runner
testflow-selenium-java-runner
```

The NestJS runner chooses the correct image based on the script framework.

### Docker Isolation

Live execution can run in Docker with:

- CPU limit
- memory limit
- process limit
- shared memory size
- temporary mounted work directory
- isolated dependency environment

Current Docker mode is intended for development and controlled testing. Production hardening should further restrict networking, users, capabilities, and mounted paths.


## 🐞 Execution Reports & Test Run Scheduler

The platform now supports reporting and recurring execution workflows on top of live script execution.

### Defect / Bug Reports

When an approved automation script execution finishes with `FAILED` or `TIMED_OUT`, the runner can automatically create a defect report linked to the failed execution.

A defect report stores:

- project, work item, test case, script, and execution links
- title and summary
- severity and lifecycle status
- failure reason
- reproduction context
- browser, environment, and target URL
- command and exit code
- stdout/stderr excerpts
- execution logs and artifacts metadata

Defect report lifecycle:

```txt
OPEN → TRIAGED → IN_PROGRESS → RESOLVED → CLOSED
OPEN → REJECTED
```

The frontend execution history displays bug-report actions for failed and timed-out executions:

- view bug report
- create bug report manually if needed
- download bug report as PDF

### Test Suite Reports

A test suite report can be generated from selected finished executions.

Included execution statuses:

```txt
PASSED, FAILED, TIMED_OUT, CANCELED
```

Excluded execution statuses:

```txt
QUEUED, RUNNING
```

A test suite report stores:

- total executions
- passed / failed / timed-out / canceled / running / queued counts
- pass rate
- total duration
- started/completed timestamps
- execution-level report items
- generated summary metadata

Suite report lifecycle/status:

```txt
PASSED / FAILED / PARTIAL
```

The frontend supports:

- selecting executions from history
- generating a suite report
- viewing saved suite reports for a script
- downloading suite reports as PDF

### PDF Report Export

Backend PDF generation is handled with PDFKit.

Supported exports:

```txt
GET /script-executions/:executionId/defect-report/pdf
GET /test-suite-reports/:reportId/pdf
```

PDF downloads use authenticated Axios `blob` requests on the frontend so protected JWT endpoints still work correctly.

### Scheduled Test Runs

Approved automation scripts can be scheduled to run automatically.

Supported schedule presets:

- daily
- weekly
- monthly
- custom cron expression

Example:

```txt
Run login test every Friday at 09:00 Africa/Tunis
```

The scheduler stores:

- script/project/work item ownership
- schedule name and description
- cron expression
- timezone
- target URL
- browser
- environment
- variables
- last run time
- next run time
- last execution id

Scheduled test run statuses:

```txt
ACTIVE / PAUSED / DISABLED
```

The backend scheduler polls due schedules every minute, reuses the existing `ScriptExecutionsService.runScript()` flow, and therefore scheduled executions produce the same logs, artifacts, execution history, analytics, and defect reports as manual live runs.


## 💬 AI Analytics Assistant

The platform includes a natural-language analytics assistant for QA and test automation metrics.

### Purpose

The assistant allows admins and testers to ask questions such as:

```txt
How many test cases are approved vs declined?
Which projects have the most generated test cases?
What is the automation coverage by project?
Which approved test cases do not have approved automation scripts?
How many automation scripts were generated by framework?
Which AI generations failed recently?
```

### Analytics Workflow

```txt
User question
  → OpenAI generates a schema-aware PostgreSQL SELECT plan
  → backend validates SQL safety
  → backend repairs SQL once if validation fails
  → backend applies project/user scope
  → PostgreSQL executes safe SELECT query
  → backend returns rows + chart recommendation + insight
  → frontend displays chat, SQL, chart, result table, and explanation
```

### Safety Model

The analytics assistant is designed to be read-only and schema-bound.

Implemented safety rules:

- only `SELECT` queries are allowed
- destructive SQL is blocked
- multiple SQL statements are blocked
- sensitive columns are blocked
- generated SQL can only reference allowed schema tables
- testers are restricted to assigned projects
- admins can ask global questions
- selected project scope is verified against user access
- SQL repair fallback runs once and is validated again before execution

Blocked operations include:

```txt
INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE, MERGE, CALL, EXEC, COPY
```

Sensitive fields are excluded from analytics, including password hashes, refresh token hashes, Jira access tokens, Jira refresh tokens, and password reset token hashes.

### Project Scoping

The analytics page uses a project selector.

```txt
Admin + Global analytics selected
  → analytics across all projects

Admin + selected project
  → analytics for that project

Tester + All accessible projects selected
  → analytics across assigned projects only

Tester + selected assigned project
  → analytics for that project only
```

### Frontend Analytics UI

Implemented pages:

```txt
/tester/analytics-assistant
/admin/analytics-assistant
```

Both pages provide:

- AI chat panel
- quick prompt chips
- project/global scope selector
- generated SQL display
- result table
- chart visualization using Recharts
- final AI-generated insight
- dark analytics portal style UI

### Analytics Backend Endpoint

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/analytics-assistant/ask` | Ask a natural-language QA analytics question |

Example request:

```json
{
  "question": "How many test cases are approved vs declined?",
  "projectId": "optional-project-id"
}
```

---

## 🗄️ Data Model Highlights

### User

Stores authentication and profile data:

- fullName
- email
- passwordHash
- role
- isActive
- refreshTokenHash
- profilePicture
- password reset info

### Project

Represents a project space:

- name
- description
- createdBy
- members
- work items

### ProjectMember

Links testers/admins to projects with a project-level role.

### WorkItem

Represents normalized work for QA and AI processing.

### JiraConnection

Stores OAuth connection per user and per Jira site:

- cloudId
- siteName
- siteUrl
- accessToken
- refreshToken
- scope
- expiresAt

### TestCaseGeneration

Represents one AI generation attempt for a work item.

Important fields:

- workItemId
- requestedById
- status
- provider
- model
- promptVersion
- generationMethod
- inputHash
- options
- warnings
- errorMessage
- aiTrace
- confidence
- startedAt
- completedAt

### TestCase

Represents a generated or approved manual QA test case.

Important fields:

- workItemId
- generationId
- generatedById
- title
- objective
- type
- priority
- status
- preconditions
- steps
- expectedResult
- testData
- coverage
- aiTrace
- reviewNotes
- approvedAt
- declinedAt
- editedAt


### AutomationScriptGeneration

Represents one AI automation script generation attempt for an approved test case.

Important fields:

- testCaseId
- workItemId
- requestedById
- status
- framework
- browser
- targetUrl
- environment
- context
- pageInspection
- warnings
- errorMessage
- provider
- model
- promptVersion
- generationMethod
- confidence
- aiTrace
- startedAt
- completedAt

### AutomationScript

Represents one generated automation script candidate.

Important fields:

- generationId
- testCaseId
- workItemId
- generatedById
- status
- framework
- fileName
- language
- code
- explanation
- dependencies
- setupNotes
- selectorsUsed
- warnings
- aiTrace
- reviewNotes
- approvedAt
- declinedAt
- editedAt
- removedAt

### AutomationScriptExecution

Represents one live execution attempt for an approved automation script.

Important fields:

- scriptId
- testCaseId
- workItemId
- requestedById
- status
- framework
- browser
- targetUrl
- environment
- variables
- command
- exitCode
- stdout
- stderr
- logs
- artifacts
- errorMessage
- startedAt
- completedAt

Execution statuses include:

```txt
QUEUED → RUNNING → PASSED / FAILED / TIMED_OUT / CANCELED
```

Artifacts can include screenshots, Playwright traces, Cypress videos, and framework reports. They are copied from the temporary runner directory into backend static uploads under:

```txt
uploads/executions/:executionId
```

Execution statistics are calculated from `AutomationScriptExecution` records and include total runs, pass rate, failure counts, average duration, latest execution, latest failed execution, and most used browser.

### DefectReport

Represents a bug report created from a failed or timed-out script execution.

Important fields:

- projectId
- workItemId
- testCaseId
- scriptId
- executionId
- createdById
- title
- summary
- severity
- status
- failureReason
- reproductionSteps
- browser
- environment
- targetUrl
- command
- exitCode
- stdoutExcerpt
- stderrExcerpt
- logs
- artifacts

### TestSuiteReport

Represents a summary report generated from selected script executions.

Important fields:

- projectId
- workItemId
- scriptId
- requestedById
- title
- status
- total
- passed
- failed
- timedOut
- canceled
- running
- queued
- passRate
- durationMs
- startedAt
- completedAt
- summary
- artifacts

### TestSuiteReportItem

Represents one execution row inside a test suite report.

Important fields:

- reportId
- executionId
- scriptId
- testCaseId
- workItemId
- status
- durationMs
- errorMessage

### ScheduledTestRun

Represents a recurring scheduled execution configuration for an approved automation script.

Important fields:

- projectId
- workItemId
- scriptId
- createdById
- name
- description
- status
- cronExpression
- timezone
- targetUrl
- browser
- environment
- variables
- lastRunAt
- nextRunAt
- lastExecutionId

### AuditLog

Represents a centralized immutable-style activity event used by admins to monitor platform activity.

Important fields:

- actorId
- actorEmail
- actorName
- actorRole
- action
- entityType
- entityId
- projectId
- message
- severity
- success
- ipAddress
- userAgent
- before
- after
- metadata
- createdAt

Audit actions include authentication, user management, project management, WorkItem imports, AI generation events, test case reviews, automation script reviews, live executions, defect reports, suite reports, scheduled runs, and analytics assistant questions.

---

## 🔐 Authentication Flow

1. User logs in via `/auth/login`.
2. Backend returns:
- `accessToken`
- `refreshToken`
3. Frontend stores tokens.
4. Axios interceptor attaches `Authorization: Bearer <token>`.
5. Protected routes enforce role-based access.

---

## 🔗 Jira OAuth Flow

1. Frontend requests `/jira/oauth/url`.
2. Backend builds Atlassian authorization URL.
3. Signed `state` contains:
- userId
- returnTo
- nonce
- expiration
4. User authenticates on Atlassian.
5. Jira redirects to `/jira/oauth/callback`.
6. Backend:
- verifies signed state
- exchanges authorization code
- retrieves accessible resources
- stores/upserts Jira connection
7. User is redirected back to frontend.

Security measures implemented:

- signed state
- HMAC protection
- expiration check
- sanitized `returnTo`

---

## 📊 Features Implemented

### Core System

- ✅ JWT authentication
- ✅ Role-based authorization
- ✅ User management
- ✅ Account activation / deactivation
- ✅ Centralized audit and activity log data model
- ✅ Admin-only audit log APIs
- ✅ Actor, action, entity, project, IP, user agent, severity, and success tracking

### Dashboard

- ✅ Global statistics endpoint
- ✅ KPI cards
- ✅ Charts
- ✅ Search & filter
- ✅ Toast notifications
- ✅ Responsive UI

### Audit & Activity Logs

- ✅ Prisma `AuditLog` model
- ✅ Audit enums for actions, entity types, and severities
- ✅ Reusable NestJS `AuditLogsModule`
- ✅ Reusable `AuditLogsService.create()` helper
- ✅ Admin-only audit list endpoint with pagination
- ✅ Admin-only audit stats endpoint
- ✅ Admin-only recent audit events endpoint
- ✅ Admin-only single audit event details endpoint
- ✅ Admin-only filtered audit CSV export endpoint
- ✅ Admin-only filtered styled Excel export endpoint
- ✅ Admin-only delete selected audit logs endpoint
- ✅ Admin-only clear matching/all audit logs endpoint
- ✅ Authentication audit logs for login, failed login, logout, password changes, and password reset events
- ✅ User management audit logs for create, update, activate, and deactivate actions
- ✅ Project audit logs for create, update, delete, member assignment, and member removal
- ✅ WorkItem audit logs for manual creation, update, delete, Jira import, and specification-document import
- ✅ Test case audit logs for AI generation lifecycle, edit, approve, and decline actions
- ✅ Automation script audit logs for generation lifecycle, edit, approve, decline, remove, and download actions
- ✅ Live execution audit logs for started, passed, failed, timed-out, and canceled runs
- ✅ Reporting audit logs for defect reports, suite reports, and PDF downloads
- ✅ Scheduled run audit logs for create, update, pause, resume, and disable actions
- ✅ Analytics assistant audit event support
- ✅ Frontend audit log TypeScript types
- ✅ Frontend audit logs service using Axios
- ✅ Admin audit logs page at `/admin/audit-logs`
- ✅ Audit KPI cards
- ✅ Advanced audit filters
- ✅ Paginated audit timeline table
- ✅ Audit event details modal with JSON before/after/metadata display
- ✅ CSV export from the audit timeline using active filters
- ✅ Styled Excel export from the audit timeline using active filters
- ✅ Row selection for audit-log bulk actions
- ✅ Delete selected audit logs from the admin UI
- ✅ Clear matching/all audit logs with a destructive-action confirmation modal

### AI Analytics Assistant

- ✅ Natural-language QA analytics questions
- ✅ OpenAI schema-aware SQL planning
- ✅ PostgreSQL SELECT-only query generation
- ✅ SQL safety validator
- ✅ Sensitive-column blocking
- ✅ Project-aware scoping for testers and admins
- ✅ Assigned-project restriction for tester users
- ✅ SQL repair fallback when validation fails
- ✅ AI-generated insight with deterministic fallback
- ✅ Chart recommendation: bar, line, pie, table, KPI
- ✅ Tester analytics assistant page
- ✅ Admin analytics assistant page
- ✅ Project selector / global selector
- ✅ Generated SQL display
- ✅ Query result table
- ✅ Recharts visualization panel

### Project Module

- ✅ Create project
- ✅ Update project
- ✅ Delete project
- ✅ Assign testers
- ✅ Remove testers
- ✅ Project details page
- ✅ Member management UI
- ✅ Role-based visibility

### Work Item Module

- ✅ Manual work item creation
- ✅ Work item listing by project
- ✅ Work item details
- ✅ Delete work item
- ✅ Jira issue import into work items
- ✅ Specification document import into work items
- ✅ Preview before import
- ✅ Editable AI extraction preview before saving
- ✅ Storage of raw Jira payload
- ✅ Storage of specification import metadata
- ✅ Storage of normalized structured content
- ✅ Automatic RAG indexing after creation/import/update

### Jira Module

- ✅ OAuth URL generation
- ✅ OAuth callback
- ✅ Store Jira connections
- ✅ Access token refresh
- ✅ Search Jira issues
- ✅ Fetch issue by key
- ✅ Preview mapped issue
- ✅ Import issue into project work items

### Extraction / AI

- ✅ ADF parsing
- ✅ Section detection
- ✅ French-aware extraction rules
- ✅ Business rule separation
- ✅ Extra section preservation
- ✅ AI fallback through Groq
- ✅ AI extraction from PDF/DOCX/TXT/MD specification documents
- ✅ Multi-model Groq support for specification extraction
- ✅ User-selectable AI extraction model
- ✅ Confidence score and source section tracking

### Test Case Generation

- ✅ FastAPI AI service integration
- ✅ OpenAI Structured Outputs
- ✅ Strict JSON schema output
- ✅ AI provider abstraction
- ✅ Prompt builder
- ✅ Output quality checker
- ✅ RAG retrieval with Qdrant
- ✅ Redis + Celery async generation jobs
- ✅ Test case generation from normalized WorkItems
- ✅ Test case generation history
- ✅ Async polling and job sync
- ✅ Retry failed generation
- ✅ Timeout / mark-failed UX
- ✅ Test case review workflow
- ✅ Approve / edit / decline generated test cases
- ✅ Frontend AI Test Cases panel on work item details page

### Automation Script Generation

- ✅ Prisma data model for automation script generations and script candidates
- ✅ NestJS automation-scripts module
- ✅ FastAPI automation script generation endpoint
- ✅ Playwright page inspection before AI generation
- ✅ OpenAI strict structured output for script generation
- ✅ Supported frameworks: Playwright TS, Playwright Python, Cypress TS, Selenium Java
- ✅ Redis + Celery async automation script generation jobs
- ✅ NestJS job sync and persistence of generated scripts
- ✅ Retry failed automation script generation
- ✅ Timeout / mark-failed UX for automation script jobs
- ✅ Frontend Generate Script modal
- ✅ Frontend script review cards
- ✅ Edit / approve / decline / remove / download generated scripts

### Live Automation Script Execution

- ✅ Prisma data model for automation script executions
- ✅ Approved-script-only live execution
- ✅ Run Configuration Modal with target URL, browser, environment, and runtime variables
- ✅ Server-Sent Events live status/log streaming
- ✅ Real-time stdout/stderr log persistence
- ✅ Execution cancellation endpoint
- ✅ Docker execution mode
- ✅ Reusable local runner workspace mode
- ✅ Multi-framework execution routing
- ✅ Playwright TypeScript Docker runner
- ✅ Cypress TypeScript Docker runner
- ✅ Playwright Python Docker runner
- ✅ Selenium Java Docker runner
- ✅ Artifact collection from runner output folders
- ✅ Downloadable screenshots, traces, videos, and reports
- ✅ Execution History panel per automation script
- ✅ Execution Detail modal with full logs, metadata, and artifacts
- ✅ Execution Analytics panel with total runs, pass rate, failures, average duration, most used browser, and latest failed run
- ✅ Backend execution stats endpoint for per-script analytics

### Execution Reports & Scheduling

- ✅ Prisma data model for defect reports
- ✅ Prisma data model for test suite reports and report items
- ✅ Automatic defect report creation for failed/timed-out executions
- ✅ Manual defect report creation endpoint
- ✅ Defect report retrieval by execution
- ✅ Defect report PDF export
- ✅ Test suite report creation from selected executions
- ✅ Saved suite reports listing by automation script
- ✅ Test suite report PDF export
- ✅ Frontend defect report modal and PDF download actions
- ✅ Frontend suite report selection, creation, saved reports, and PDF download actions
- ✅ Prisma data model for scheduled test runs
- ✅ NestJS scheduled test run module and controller
- ✅ Daily / weekly / monthly / custom-cron schedule presets
- ✅ Cron-based next-run calculation with timezone support
- ✅ Scheduler polling for due runs
- ✅ Reuse of existing live execution runner for scheduled runs
- ✅ Pause / resume / disable scheduled runs
- ✅ Frontend scheduler panel inside automation script runs tab

---

## ⚙️ Backend Setup

### 1. Navigate to backend

```bash
cd backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file:

```bash
cp .env.example .env
```

Configure at least:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/db_name?schema=public"

JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:3000

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password_here
MAIL_FROM=your_email@gmail.com

ATLASSIAN_CLIENT_ID=your_atlassian_client_id
ATLASSIAN_CLIENT_SECRET=your_atlassian_client_secret
ATLASSIAN_REDIRECT_URI=http://localhost:3001/jira/oauth/callback
ATLASSIAN_SCOPES=read:jira-user read:jira-work offline_access
JIRA_OAUTH_STATE_SECRET=your_state_secret_here

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=qwen/qwen3-32b
GROQ_SPEC_MODEL=llama-3.3-70b-versatile
SPEC_DOC_MAX_CHARS=45000

AI_SERVICE_URL=http://127.0.0.1:8001
AI_SERVICE_TIMEOUT_MS=120000
AI_TEST_CASE_PROMPT_VERSION=test_case_generation_v1_async_celery

OPENAI_API_KEY=your_openai_api_key_here
ANALYTICS_OPENAI_MODEL=gpt-4.1-mini

# Live execution
LIVE_EXECUTION_MODE=docker
LIVE_EXECUTION_PLAYWRIGHT_TS_IMAGE=testflow-playwright-ts-runner
LIVE_EXECUTION_CYPRESS_TS_IMAGE=testflow-cypress-ts-runner
LIVE_EXECUTION_PLAYWRIGHT_PYTHON_IMAGE=testflow-playwright-python-runner
LIVE_EXECUTION_SELENIUM_JAVA_IMAGE=testflow-selenium-java-runner
LIVE_EXECUTION_TIMEOUT_MS=300000

# Scheduled test runs
DEFAULT_SCHEDULER_TIMEZONE=Africa/Tunis
```

Notes:

- `GROQ_API_KEY` is optional for Jira AI fallback.
- `GROQ_API_KEY` is required for AI-based specification document extraction if Groq extraction is enabled.
- `AI_SERVICE_URL` points to the FastAPI AI service.
- `OPENAI_API_KEY` is required for the analytics assistant SQL planner and AI insight generator.
- `ANALYTICS_OPENAI_MODEL` controls the model used for analytics SQL planning, repair, and insight generation.
- `LIVE_EXECUTION_MODE` can be `docker` or `local`.
- Docker live execution requires the framework runner images listed in the Docker runner setup section.
- Scheduled test runs use `Africa/Tunis` by default unless another timezone is provided when the schedule is created.

### 4. Run database migration

```bash
npx prisma migrate dev
```

### 5. Seed admin user

```bash
npx prisma db seed
```

Default admin:

```txt
email: admin@project.com
password: Admin12345!
```

### 6. Start backend

```bash
npm run start:dev
```

Backend default:

```txt
http://localhost:3001
```

### 7. Build live execution Docker runner images

From the backend root:

```bash
mkdir -p runner-images
```

Build all runner images:

```bash
docker build -f runner-images/playwright-ts.Dockerfile -t testflow-playwright-ts-runner .
docker build -f runner-images/cypress-ts.Dockerfile -t testflow-cypress-ts-runner .
docker build -f runner-images/playwright-python.Dockerfile -t testflow-playwright-python-runner .
docker build -f runner-images/selenium-java.Dockerfile -t testflow-selenium-java-runner .
```

Verify images:

```bash
docker images | grep testflow
```

Expected images:

```txt
testflow-playwright-ts-runner
testflow-cypress-ts-runner
testflow-playwright-python-runner
testflow-selenium-java-runner
```

Useful image tests:

```bash
docker run --rm testflow-playwright-ts-runner
docker run --rm testflow-cypress-ts-runner
docker run --rm testflow-playwright-python-runner
docker run --rm testflow-selenium-java-runner
```

For Docker mode on macOS, the tested frontend URL should usually be:

```txt
http://host.docker.internal:3000
```

---

## 🌐 Frontend Setup

### 1. Navigate to frontend

```bash
cd frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DEFAULT_TARGET_URL=http://host.docker.internal:3000
```

### 4. Start frontend

```bash
npm run dev
```

Frontend default:

```txt
http://localhost:3000
```

---

## 🤖 AI Service Setup

The FastAPI AI service is documented separately in `ai-service/README.md`.

Local default:

```txt
http://localhost:8001
```

The backend calls FastAPI for:

```txt
POST /v1/test-case-generations/jobs
GET  /v1/test-case-generations/jobs/:jobId
POST /v1/automation-script-generations/jobs
GET  /v1/automation-script-generations/jobs/:jobId
POST /v1/rag/chunks
POST /v1/rag/search
```

Legacy synchronous generation may still be available:

```txt
POST /v1/test-cases/generate
```

---

## API Endpoints

### 🔐 Auth

| Method | Endpoint |
|--------|----------|
| `POST` | `/auth/login` |
| `GET` | `/auth/me` |
| `POST` | `/auth/logout` |

### 👤 Users

| Method | Endpoint |
|--------|----------|
| `POST` | `/users` |
| `GET` | `/users` |
| `GET` | `/users?role=TESTER` |
| `PATCH` | `/users/:id` |
| `PATCH` | `/users/:id/activate` |
| `PATCH` | `/users/:id/deactivate` |

### 📊 Stats

| Method | Endpoint |
|--------|----------|
| `GET` | `/stats/global` |

### 🛡️ Audit Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/audit-logs` | List audit events with filters and pagination |
| `GET` | `/audit-logs/stats` | Get audit KPI counts for admin dashboard cards |
| `GET` | `/audit-logs/recent` | Get recent audit events |
| `GET` | `/audit-logs/export/csv` | Export filtered audit events as CSV |
| `GET` | `/audit-logs/export/excel` | Export filtered audit events as styled Excel |
| `DELETE` | `/audit-logs` | Delete selected audit events by ids |
| `DELETE` | `/audit-logs/clear` | Clear all audit events matching active filters |
| `GET` | `/audit-logs/:id` | Get one audit event with details |

### 📁 Projects

| Method | Endpoint |
|--------|----------|
| `POST` | `/projects` |
| `GET` | `/projects` |
| `GET` | `/projects/:id` |
| `PATCH` | `/projects/:id` |
| `DELETE` | `/projects/:id` |

### 👥 Project Members

| Method | Endpoint |
|--------|----------|
| `GET` | `/projects/:id/members` |
| `POST` | `/projects/:id/members` |
| `DELETE` | `/projects/:id/members/:userId` |

### 🧩 Work Items

| Method | Endpoint |
|--------|----------|
| `POST` | `/work-items` |
| `POST` | `/work-items/import/jira` |
| `GET` | `/work-items?projectId=...` |
| `GET` | `/work-items/:id` |
| `PATCH` | `/work-items/:id` |
| `DELETE` | `/work-items/:id` |

### 🔎 RAG Debug

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/work-items/:workItemId/rag/index` | Manually index one work item for RAG |
| `GET` | `/work-items/:workItemId/rag/search` | Search RAG context for one work item |

### 🧪 Test Cases

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/work-items/:workItemId/test-cases/generate` | Start async AI test case generation |
| `GET` | `/work-items/:workItemId/test-cases` | List test cases for a work item |
| `GET` | `/work-items/:workItemId/test-case-generations` | List generation history for a work item |
| `GET` | `/work-items/:workItemId/test-case-generations/latest` | Get latest generation and auto-sync async job status |
| `GET` | `/test-case-generations/:generationId` | Get one generation with test cases |
| `POST` | `/test-case-generations/:generationId/sync` | Manually sync one async generation job |
| `POST` | `/test-case-generations/:generationId/retry` | Retry a failed generation |
| `POST` | `/test-case-generations/:generationId/mark-failed` | Mark stuck processing generation as failed |
| `GET` | `/test-cases/:id` | Get one test case |
| `PATCH` | `/test-cases/:id` | Edit a test case |
| `POST` | `/test-cases/:id/approve` | Approve a generated/edited test case |
| `POST` | `/test-cases/:id/decline` | Decline a generated/edited test case |

### 🤖 Automation Scripts

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/test-cases/:testCaseId/automation-scripts/generate` | Start async automation script generation from an approved test case |
| `GET` | `/test-cases/:testCaseId/automation-scripts` | List non-removed scripts for a test case |
| `GET` | `/test-cases/:testCaseId/automation-script-generations/latest` | Get latest script generation and auto-sync async job status |
| `GET` | `/automation-script-generations/:generationId` | Get one script generation with scripts |
| `POST` | `/automation-script-generations/:generationId/sync` | Manually sync one script generation job |
| `POST` | `/automation-script-generations/:generationId/retry` | Retry failed script generation |
| `POST` | `/automation-script-generations/:generationId/mark-failed` | Mark stuck script generation as failed |
| `GET` | `/automation-scripts/:scriptId` | Get one script |
| `PATCH` | `/automation-scripts/:scriptId` | Edit generated script |
| `POST` | `/automation-scripts/:scriptId/approve` | Approve script |
| `POST` | `/automation-scripts/:scriptId/decline` | Decline script |
| `POST` | `/automation-scripts/:scriptId/remove` | Soft-remove script |
| `GET` | `/automation-scripts/:scriptId/download` | Download script code |
| `POST` | `/automation-scripts/:scriptId/executions` | Queue live execution for an approved script |
| `GET` | `/automation-scripts/:scriptId/executions` | List live execution history for one script |
| `GET` | `/automation-scripts/:scriptId/execution-stats` | Get per-script live execution analytics |
| `GET` | `/script-executions/:executionId` | Get one live execution with logs and artifacts |
| `GET` | `/script-executions/:executionId/events` | Stream live execution updates through SSE |
| `POST` | `/script-executions/:executionId/cancel` | Cancel a queued/running execution |
| `GET` | `/script-executions/:executionId/defect-report` | Get defect report for a failed/timed-out execution |
| `POST` | `/script-executions/:executionId/defect-report` | Create defect report manually if the execution failed/timed out |
| `GET` | `/script-executions/:executionId/defect-report/pdf` | Download defect report PDF |
| `POST` | `/test-suite-reports` | Generate a test suite report from selected executions |
| `GET` | `/test-suite-reports/:reportId` | Get one test suite report with items |
| `GET` | `/test-suite-reports/:reportId/pdf` | Download test suite report PDF |
| `GET` | `/automation-scripts/:scriptId/test-suite-reports` | List saved suite reports for one script |
| `POST` | `/scheduled-test-runs` | Create a scheduled test run |
| `GET` | `/automation-scripts/:scriptId/scheduled-test-runs` | List schedules for one script |
| `GET` | `/scheduled-test-runs/:id` | Get one scheduled test run |
| `PATCH` | `/scheduled-test-runs/:id` | Update schedule metadata/runtime config |
| `POST` | `/scheduled-test-runs/:id/pause` | Pause an active schedule |
| `POST` | `/scheduled-test-runs/:id/resume` | Resume a paused schedule |
| `POST` | `/scheduled-test-runs/:id/disable` | Disable a schedule |

### 📄 Specification Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/spec-documents/models` | Return the allowed AI extraction models |
| `POST` | `/spec-documents/preview` | Upload a file, choose an AI model, and preview AI-extracted WorkItems |
| `POST` | `/spec-documents/import` | Save selected extracted WorkItems into the project with model metadata |

### 🔗 Jira

| Method | Endpoint |
|--------|----------|
| `GET` | `/jira/oauth/url` |
| `GET` | `/jira/oauth/callback` |
| `GET` | `/jira/oauth/connections` |
| `GET` | `/jira/issue?issueKey=...` |
| `GET` | `/jira/search?query=...` |

---

## 📥 Work Item Sources

### Manual

A tester or admin creates a work item directly inside a project.

### Jira

Connect Jira, search/select an issue, preview normalized content, then import into a project.

Imported items store:

- original Jira payload
- normalized internal content
- extraction metadata
- external reference

### Specification Document

Upload a requirements document, select an AI model, extract readable text, preview generated WorkItems, then import selected items.

Imported items store:

- source document metadata
- selected model
- confidence score
- source section
- normalized content

---


## 🛡️ Security Notes

Before production:

- Add internal service API key between NestJS and FastAPI
- Avoid exposing FastAPI directly to browsers
- Do not allow arbitrary private URL inspection unless intentionally needed
- Never store real passwords in script generation context
- Use environment variable names for credentials in generated scripts
- Redact secrets before AI calls and logs
- Add rate limiting for AI endpoints
- Track OpenAI token usage and cost
- Add tenant-aware limits for script/test generation
- Use a dedicated read-only PostgreSQL user for analytics execution in production
- Keep analytics SQL validation enabled even when using trusted models
- Audit analytics prompts and generated SQL for suspicious requests
- Keep audit logging enabled for security-sensitive actions
- Redact secrets from audit `before`, `after`, and `metadata` payloads
- Require confirmation and strict admin authorization for destructive audit-log cleanup actions
- Prefer retention/archive policies over permanent deletion for regulated production environments
- Add audit log retention and archive policies before production
- Run generated automation scripts only in isolated containers in production
- Restrict Docker runner networking, capabilities, filesystem mounts, and user permissions
- Store execution variables and credentials in a secrets manager instead of plain request payloads
- Strip/redact sensitive values from live logs and artifacts before persistence
- Validate and restrict custom cron expressions if exposed to end users beyond trusted testers
- Avoid storing real scheduled-run credentials in plain `variables`; use a secrets manager for production schedules
- Prevent duplicate scheduler workers from running the same schedule in multi-instance deployments by adding database locks or queue-based dispatch

---

## 🔮 Roadmap

- Prompt version synchronization between NestJS and FastAPI
- Internal service API key between NestJS and FastAPI
- Batch approve/decline for test cases
- Coverage matrix for requirements and generated test cases
- Similar approved test case retrieval through RAG
- Batch approve/decline for test cases
- Batch script generation from selected approved test cases
- Screenshot-aware script generation
- Secure secrets manager integration for auth flows
- Project-level execution analytics dashboards
- Admin/tester execution analytics dashboards
- Docker runner security hardening
- Improved AI prompts for Cypress TS, Playwright Python, and Selenium Java
- Maven/npm dependency cache optimization for runner images
- ANSI log cleanup for execution logs
- Script generation history UI for all attempts
- Analytics saved questions and dashboard widgets
- Audit log PDF export
- Audit log retention policies and archive jobs
- Audit log anomaly detection for repeated failed login attempts
- Export analytics results to CSV/PDF
- Advanced SQL parser for deeper analytics query validation
- Cost and usage dashboard for AI analytics prompts
- CI/CD integration for approved automation scripts
- Dedicated report details pages for defect and suite reports
- Email/slack notifications for scheduled run failures
- Database-backed scheduler locking for multi-instance deployments
- Schedule-level run history and trend analytics
- Report templates and branded PDF customization

---

## 👨‍💻 Author

Developed in an enterprise-style context for a QA / testing platform initiative.
