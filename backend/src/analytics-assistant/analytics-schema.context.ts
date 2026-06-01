export const ANALYTICS_SCHEMA_CONTEXT = `
You can generate PostgreSQL SELECT queries using ONLY these tables and columns.

IMPORTANT:
- PostgreSQL table names are Prisma model names and must be double-quoted.
- Enum/string values must be single-quoted.
- Use only SELECT queries.
- Never query passwordHash, refreshTokenHash, accessToken, refreshToken, passwordResetTokenHash.
- Never modify data.

TABLE "User"
Allowed columns:
- id
- fullName
- email
- role
- isActive
- lastLoginAt
- createdAt
- updatedAt
- mustChangePassword
- profilePicture

TABLE "Project"
Allowed columns:
- id
- name
- description
- createdById
- createdAt
- updatedAt

TABLE "ProjectMember"
Allowed columns:
- id
- projectId
- userId
- role
- assignedAt

TABLE "WorkItem"
Allowed columns:
- id
- projectId
- createdById
- type
- source
- status
- title
- description
- acceptanceCriteria
- businessRules
- priority
- externalSystem
- externalCloudId
- externalRef
- rawPayload
- normalizedContent
- metadata
- createdAt
- updatedAt

TABLE "TestCaseGeneration"
Allowed columns:
- id
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
- createdAt
- startedAt
- completedAt
- updatedAt

TABLE "TestCase"
Allowed columns:
- id
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
- tags
- coverage
- aiTrace
- reviewNotes
- approvedAt
- declinedAt
- editedAt
- createdAt
- updatedAt

TABLE "AutomationScriptGeneration"
Allowed columns:
- id
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
- createdAt
- startedAt
- completedAt
- updatedAt

TABLE "AutomationScript"
Allowed columns:
- id
- generationId
- testCaseId
- workItemId
- generatedById
- status
- framework
- fileName
- language
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
- createdAt
- updatedAt

TABLE "JiraConnection"
Allowed columns:
- id
- userId
- cloudId
- siteName
- siteUrl
- scope
- expiresAt
- createdAt
- updatedAt

Relationships:
- "WorkItem"."projectId" = "Project"."id"
- "WorkItem"."createdById" = "User"."id"
- "TestCase"."workItemId" = "WorkItem"."id"
- "TestCase"."generationId" = "TestCaseGeneration"."id"
- "TestCase"."generatedById" = "User"."id"
- "TestCaseGeneration"."workItemId" = "WorkItem"."id"
- "TestCaseGeneration"."requestedById" = "User"."id"
- "AutomationScript"."testCaseId" = "TestCase"."id"
- "AutomationScript"."workItemId" = "WorkItem"."id"
- "AutomationScript"."generationId" = "AutomationScriptGeneration"."id"
- "AutomationScript"."generatedById" = "User"."id"
- "AutomationScriptGeneration"."testCaseId" = "TestCase"."id"
- "AutomationScriptGeneration"."workItemId" = "WorkItem"."id"
- "AutomationScriptGeneration"."requestedById" = "User"."id"
- "ProjectMember"."projectId" = "Project"."id"
- "ProjectMember"."userId" = "User"."id"
- "JiraConnection"."userId" = "User"."id"

Useful enum values:
Role: ADMIN, TESTER
WorkItemSource: MANUAL, JIRA, SPEC_DOCUMENT
WorkItemStatus: DRAFT, READY_FOR_AI, PROCESSING, ANALYZED, FAILED
TestCaseGenerationStatus: PENDING, PROCESSING, COMPLETED, FAILED
TestCaseStatus: GENERATED, EDITED, APPROVED, DECLINED
TestCaseType: FUNCTIONAL, VALIDATION, NEGATIVE, EDGE_CASE, SECURITY, UI, INTEGRATION, REGRESSION
TestCasePriority: LOW, MEDIUM, HIGH, CRITICAL
AutomationScriptGenerationStatus: PENDING, PROCESSING, COMPLETED, FAILED
AutomationScriptStatus: GENERATED, EDITED, APPROVED, DECLINED, REMOVED
AutomationFramework: PLAYWRIGHT_TS, PLAYWRIGHT_PYTHON, CYPRESS_TS, SELENIUM_JAVA
BrowserTarget: CHROMIUM, FIREFOX, WEBKIT, CHROME, EDGE
`;
