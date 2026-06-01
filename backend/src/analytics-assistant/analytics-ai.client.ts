import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ANALYTICS_SCHEMA_CONTEXT } from './analytics-schema.context';
import { AnalyticsSqlPlan } from './analytics-assistant.types';

const ANALYTICS_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    needsSql: { type: 'boolean' },
    sql: { type: ['string', 'null'] },
    explanation: { type: 'string' },
    chart: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: {
          type: 'string',
          enum: ['bar', 'line', 'pie', 'table', 'kpi'],
        },
        x: { type: ['string', 'null'] },
        y: { type: ['string', 'null'] },
        series: { type: ['string', 'null'] },
        reason: { type: 'string' },
      },
      required: ['type', 'x', 'y', 'series', 'reason'],
    },
    unavailableReason: { type: ['string', 'null'] },
  },
  required: ['needsSql', 'sql', 'explanation', 'chart', 'unavailableReason'],
};

@Injectable()
export class AnalyticsAiClient {
  private readonly logger = new Logger(AnalyticsAiClient.name);
  private readonly client: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is missing');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async createSqlPlan(params: {
    question: string;
    projectId?: string;
    userRole: string;
  }): Promise<AnalyticsSqlPlan> {
    try {
      const completion = await this.client.chat.completions.create({
        model: process.env.ANALYTICS_OPENAI_MODEL || 'gpt-4.1-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt(),
          },
          {
            role: 'user',
            content: JSON.stringify(
              {
                question: params.question,
                projectId: params.projectId ?? null,
                userRole: params.userRole,
              },
              null,
              2,
            ),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'analytics_sql_plan',
            schema: ANALYTICS_RESPONSE_SCHEMA,
            strict: true,
          },
        },
      });

      const raw = completion.choices[0]?.message?.content;

      if (!raw) {
        throw new Error('OpenAI returned empty analytics plan');
      }

      return JSON.parse(raw) as AnalyticsSqlPlan;
    } catch (error: any) {
      this.logger.error(
        `Analytics SQL planning failed: ${error?.message || error}`,
      );

      throw new BadGatewayException(
        'Analytics assistant failed to generate a safe SQL plan',
      );
    }
  }

  async repairSqlPlan(params: {
    question: string;
    originalPlan: AnalyticsSqlPlan;
    validationError: string;
    projectId?: string;
    userRole: string;
  }): Promise<AnalyticsSqlPlan> {
    try {
      const completion = await this.client.chat.completions.create({
        model: process.env.ANALYTICS_OPENAI_MODEL || 'gpt-4.1-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt(),
          },
          {
            role: 'user',
            content: JSON.stringify(
              {
                task: 'Repair the SQL plan. Return a corrected safe plan only.',
                question: params.question,
                projectId: params.projectId ?? null,
                userRole: params.userRole,
                originalPlan: params.originalPlan,
                validationError: params.validationError,
                repairRules: [
                  'Keep needsSql=true if the question can be answered.',
                  'Use only allowed tables and columns.',
                  'Use SELECT only.',
                  'If projectId is provided and project data is queried, include __PROJECT_ID__ placeholder.',
                  'If userRole is TESTER and projectId is not provided, include __ASSIGNED_PROJECT_IDS__ placeholder for project data.',
                  'For assigned projects, use IN (__ASSIGNED_PROJECT_IDS__), not ANY(__ASSIGNED_PROJECT_IDS__).',
                  'Do not use actual project IDs.',
                  'Do not quote __ASSIGNED_PROJECT_IDS__.',
                  'Do not use sensitive columns.',
                ],
              },
              null,
              2,
            ),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'analytics_sql_plan_repair',
            schema: ANALYTICS_RESPONSE_SCHEMA,
            strict: true,
          },
        },
      });

      const raw = completion.choices[0]?.message?.content;

      if (!raw) {
        throw new Error('OpenAI returned empty repaired analytics plan');
      }

      return JSON.parse(raw) as AnalyticsSqlPlan;
    } catch (error: any) {
      this.logger.error(
        `Analytics SQL repair failed: ${error?.message || error}`,
      );

      throw new BadGatewayException(
        'Analytics assistant failed to repair the SQL plan',
      );
    }
  }

  private buildSystemPrompt(): string {
    return `
You are a PostgreSQL analytics assistant for a QA and test automation dashboard.

Your job:
- Understand the user's analytics question.
- Generate one safe PostgreSQL SELECT query if the schema can answer the question.
- If the schema cannot answer it, set needsSql=false and explain why.
- Never invent table names or column names.
- Never generate destructive SQL.
- Never query sensitive columns.
- Always use double quotes around table and column names.
- Prefer clear aliases.
- Use COUNT(*)::int for counts.
- Use LIMIT 100 unless the query is a single aggregate KPI.
- Suggest a chart type.

SECURITY AND SCOPING RULES:
- If projectId is provided and the query touches project data, filter by the literal placeholder '__PROJECT_ID__'.
- Do NOT replace '__PROJECT_ID__' with an actual value.
- The backend will bind '__PROJECT_ID__' safely.
- For tester users without projectId, filter project data using the literal placeholder __ASSIGNED_PROJECT_IDS__.
- For tester users without projectId, write assigned project scope exactly as:
  "WorkItem"."projectId" IN (__ASSIGNED_PROJECT_IDS__)
- Do NOT use ANY(__ASSIGNED_PROJECT_IDS__).
- Do NOT quote __ASSIGNED_PROJECT_IDS__.
- Do NOT replace __ASSIGNED_PROJECT_IDS__ with actual IDs.
- Admin users without projectId may ask global questions.

Project data includes:
- Project
- WorkItem
- TestCase
- TestCaseGeneration
- AutomationScript
- AutomationScriptGeneration

How to scope tables:
- If querying "WorkItem" with projectId, use:
  "WorkItem"."projectId" = '__PROJECT_ID__'
- If querying "WorkItem" for tester assigned projects, use:
  "WorkItem"."projectId" IN (__ASSIGNED_PROJECT_IDS__)
- If querying "TestCase", join "WorkItem" and filter "WorkItem"."projectId".
- If querying "TestCaseGeneration", join "WorkItem" and filter "WorkItem"."projectId".
- If querying "AutomationScript", join "WorkItem" and filter "WorkItem"."projectId".
- If querying "AutomationScriptGeneration", join "WorkItem" and filter "WorkItem"."projectId".
- If querying "Project" with projectId, filter "Project"."id" = '__PROJECT_ID__'.
- If querying users within projects, join "ProjectMember" and filter "ProjectMember"."projectId".

Important SQL patterns:
- To find records with no related rows, prefer NOT EXISTS.
- To find work items with no approved test cases, use NOT EXISTS against "TestCase" where status = 'APPROVED'.
- Enum values must be single-quoted.
- Do not use markdown.
- Do not return semicolons.

Example for question:
"Which work items have no approved test cases?"

When projectId is provided:
SELECT
  "WorkItem"."id",
  "WorkItem"."title",
  "WorkItem"."type",
  "WorkItem"."status",
  "WorkItem"."priority",
  "WorkItem"."createdAt"
FROM "WorkItem"
WHERE "WorkItem"."projectId" = '__PROJECT_ID__'
  AND NOT EXISTS (
    SELECT 1
    FROM "TestCase"
    WHERE "TestCase"."workItemId" = "WorkItem"."id"
      AND "TestCase"."status" = 'APPROVED'
  )
ORDER BY "WorkItem"."createdAt" DESC
LIMIT 100

When tester user has no projectId:
SELECT
  "WorkItem"."id",
  "WorkItem"."title",
  "WorkItem"."type",
  "WorkItem"."status",
  "WorkItem"."priority",
  "WorkItem"."createdAt"
FROM "WorkItem"
WHERE "WorkItem"."projectId" IN (__ASSIGNED_PROJECT_IDS__)
  AND NOT EXISTS (
    SELECT 1
    FROM "TestCase"
    WHERE "TestCase"."workItemId" = "WorkItem"."id"
      AND "TestCase"."status" = 'APPROVED'
  )
ORDER BY "WorkItem"."createdAt" DESC
LIMIT 100

Allowed schema:
${ANALYTICS_SCHEMA_CONTEXT}

Return only the structured JSON schema.
`.trim();
  }
}
