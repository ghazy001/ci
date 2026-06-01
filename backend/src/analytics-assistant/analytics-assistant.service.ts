import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AskAnalyticsQuestionDto } from './dto/ask-analytics-question.dto';
import { AnalyticsAiClient } from './analytics-ai.client';
import { SqlSafetyValidator } from './sql-safety.validator';
import { AnalyticsInsightService } from './analytics-insight.service';
import { AnalyticsAnswer, AnalyticsSqlPlan } from './analytics-assistant.types';

@Injectable()
export class AnalyticsAssistantService {
  private readonly sqlValidator = new SqlSafetyValidator();

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsAiClient: AnalyticsAiClient,
    private readonly analyticsInsightService: AnalyticsInsightService,
  ) {}

  async ask(
    dto: AskAnalyticsQuestionDto,
    userId: string,
    userRole: Role,
  ): Promise<AnalyticsAnswer> {
    const assignedProjectIds = await this.getAssignedProjectIds(
      userId,
      userRole,
    );

    if (dto.projectId) {
      await this.ensureProjectAccess(dto.projectId, userId, userRole);
    }

    let plan: AnalyticsSqlPlan;

    /**
     * Deterministic shortcut for a common analytics question.
     * This avoids AI generating invalid SQL for:
     * "Which work items have no approved test cases?"
     */
    if (this.isNoApprovedTestCasesQuestion(dto.question)) {
      plan = this.buildNoApprovedTestCasesPlan({
        projectId: dto.projectId,
        userRole,
      });
    } else {
      plan = await this.analyticsAiClient.createSqlPlan({
        question: dto.question,
        projectId: dto.projectId,
        userRole,
      });
    }

    const scope = this.buildScope({
      userRole,
      projectId: dto.projectId,
      assignedProjectIds,
    });

    if (!plan.needsSql || !plan.sql) {
      return {
        question: dto.question,
        needsSql: false,
        sql: null,
        rows: [],
        chart: plan.chart,
        explanation: plan.explanation,
        insight:
          plan.unavailableReason ||
          'This question cannot be answered with the available schema.',
        unavailableReason: plan.unavailableReason,
        scope,
      };
    }

    const validated = await this.validateOrRepairPlan({
      plan,
      question: dto.question,
      userRole,
      projectId: dto.projectId,
      assignedProjectIds,
    });

    plan = validated.plan;

    const { query, params } = this.prepareScopedQuery(validated.sql, {
      userRole,
      projectId: dto.projectId,
      assignedProjectIds,
    });

    /**
     * Helpful while debugging analytics SQL.
     * You can remove these logs after confirming everything works.
     */
    console.log('Analytics SQL:', query);
    console.log('Analytics SQL params:', params);

    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      query,
      ...params,
    );

    const insight = await this.analyticsInsightService.summarize({
      question: dto.question,
      rows,
      chart: plan.chart,
      sql: query,
    });

    return {
      question: dto.question,
      needsSql: true,
      sql: query,
      rows,
      chart: plan.chart,
      explanation: plan.explanation,
      insight,
      unavailableReason: null,
      scope,
    };
  }

  private async validateOrRepairPlan(params: {
    plan: AnalyticsSqlPlan;
    question: string;
    userRole: Role;
    projectId?: string;
    assignedProjectIds: string[];
  }): Promise<{
    plan: AnalyticsSqlPlan;
    sql: string;
  }> {
    try {
      const sql = this.sqlValidator.validateScopedSql(params.plan.sql || '', {
        userRole: params.userRole,
        projectId: params.projectId,
        assignedProjectIds: params.assignedProjectIds,
      });

      return {
        plan: params.plan,
        sql,
      };
    } catch (error: any) {
      const validationError =
        error?.response?.message || error?.message || 'SQL validation failed';

      const repairedPlan = await this.analyticsAiClient.repairSqlPlan({
        question: params.question,
        originalPlan: params.plan,
        validationError,
        projectId: params.projectId,
        userRole: params.userRole,
      });

      if (!repairedPlan.needsSql || !repairedPlan.sql) {
        throw error;
      }

      const repairedSql = this.sqlValidator.validateScopedSql(
        repairedPlan.sql,
        {
          userRole: params.userRole,
          projectId: params.projectId,
          assignedProjectIds: params.assignedProjectIds,
        },
      );

      return {
        plan: repairedPlan,
        sql: repairedSql,
      };
    }
  }

  private prepareScopedQuery(
    sql: string,
    params: {
      userRole: Role;
      projectId?: string;
      assignedProjectIds: string[];
    },
  ): {
    query: string;
    params: unknown[];
  } {
    let query = sql.trim();
    const queryParams: unknown[] = [];

    /**
     * Project-specific scope.
     *
     * AI should generate:
     * "WorkItem"."projectId" = '__PROJECT_ID__'
     *
     * We safely replace the placeholder with a Prisma/PostgreSQL parameter.
     */
    if (params.projectId) {
      queryParams.push(params.projectId);
      const projectParam = `$${queryParams.length}`;

      query = query.replaceAll("'__PROJECT_ID__'", projectParam);
      query = query.replaceAll('__PROJECT_ID__', projectParam);

      this.rejectUnresolvedScopePlaceholders(query);

      return {
        query,
        params: queryParams,
      };
    }

    /**
     * Tester without selected project:
     * restrict analytics to assigned projects.
     */
    if (params.userRole !== Role.ADMIN) {
      if (params.assignedProjectIds.length === 0) {
        return {
          query: this.forceEmptyResultQuery(query),
          params: [],
        };
      }

      queryParams.push(params.assignedProjectIds);
      const assignedProjectsParam = `$${queryParams.length}::text[]`;

      /**
       * Convert:
       * "WorkItem"."projectId" IN (__ASSIGNED_PROJECT_IDS__)
       *
       * Into:
       * "WorkItem"."projectId" = ANY($1::text[])
       */
      query = query.replace(
        /"WorkItem"\."projectId"\s+IN\s*\(\s*__ASSIGNED_PROJECT_IDS__\s*\)/gi,
        `"WorkItem"."projectId" = ANY(${assignedProjectsParam})`,
      );

      query = query.replace(
        /"Project"\."id"\s+IN\s*\(\s*__ASSIGNED_PROJECT_IDS__\s*\)/gi,
        `"Project"."id" = ANY(${assignedProjectsParam})`,
      );

      query = query.replace(
        /"ProjectMember"\."projectId"\s+IN\s*\(\s*__ASSIGNED_PROJECT_IDS__\s*\)/gi,
        `"ProjectMember"."projectId" = ANY(${assignedProjectsParam})`,
      );

      /**
       * Also support AI output like:
       * ANY(__ASSIGNED_PROJECT_IDS__)
       */
      query = query.replace(
        /ANY\s*\(\s*__ASSIGNED_PROJECT_IDS__\s*\)/gi,
        `ANY(${assignedProjectsParam})`,
      );

      /**
       * Also support AI output like:
       * = '__PROJECT_ID__'
       *
       * This should not happen for tester/global assigned scope,
       * but this guard helps avoid sending broken SQL to PostgreSQL.
       */
      this.rejectUnresolvedScopePlaceholders(query);

      return {
        query,
        params: queryParams,
      };
    }

    /**
     * Admin without selected project:
     * global analytics are allowed.
     */
    this.rejectUnresolvedScopePlaceholders(query);

    return {
      query,
      params: [],
    };
  }

  private rejectUnresolvedScopePlaceholders(query: string): void {
    if (
      query.includes('__PROJECT_ID__') ||
      query.includes('__ASSIGNED_PROJECT_IDS__')
    ) {
      throw new Error(`SQL contains unresolved scope placeholder: ${query}`);
    }
  }

  private forceEmptyResultQuery(sql: string): string {
    const cleaned = sql.trim().replace(/;\s*$/, '');

    if (/\bWHERE\b/i.test(cleaned)) {
      return cleaned.replace(/\bWHERE\b/i, 'WHERE 1 = 0 AND');
    }

    if (/\bGROUP\s+BY\b/i.test(cleaned)) {
      return cleaned.replace(/\bGROUP\s+BY\b/i, 'WHERE 1 = 0 GROUP BY');
    }

    if (/\bORDER\s+BY\b/i.test(cleaned)) {
      return cleaned.replace(/\bORDER\s+BY\b/i, 'WHERE 1 = 0 ORDER BY');
    }

    if (/\bLIMIT\b/i.test(cleaned)) {
      return cleaned.replace(/\bLIMIT\b/i, 'WHERE 1 = 0 LIMIT');
    }

    return `${cleaned} WHERE 1 = 0`;
  }

  private async getAssignedProjectIds(
    userId: string,
    userRole: Role,
  ): Promise<string[]> {
    if (userRole === Role.ADMIN) {
      return [];
    }

    const memberships = await this.prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });

    return memberships.map((membership) => membership.projectId);
  }

  private buildScope(params: {
    userRole: Role;
    projectId?: string;
    assignedProjectIds: string[];
  }): AnalyticsAnswer['scope'] {
    if (params.userRole === Role.ADMIN && !params.projectId) {
      return {
        mode: 'GLOBAL_ADMIN',
        projectId: null,
        assignedProjectIds: [],
      };
    }

    if (params.projectId) {
      return {
        mode: 'PROJECT',
        projectId: params.projectId,
        assignedProjectIds: [],
      };
    }

    return {
      mode: 'ASSIGNED_PROJECTS',
      projectId: null,
      assignedProjectIds: params.assignedProjectIds,
    };
  }

  private async ensureProjectAccess(
    projectId: string,
    userId: string,
    userRole: Role,
  ) {
    if (userRole === Role.ADMIN) {
      return;
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private isNoApprovedTestCasesQuestion(question: string): boolean {
    const q = question.toLowerCase().replace(/\s+/g, ' ').trim();

    return (
      (q.includes('work item') || q.includes('work items')) &&
      (q.includes('no approved test') ||
        q.includes('without approved test') ||
        q.includes('missing approved test') ||
        q.includes('do not have approved test') ||
        q.includes("don't have approved test") ||
        q.includes('have no approved test'))
    );
  }

  private buildNoApprovedTestCasesPlan(params: {
    projectId?: string;
    userRole: Role;
  }): AnalyticsSqlPlan {
    const projectScopeSql = `
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
`.trim();

    const assignedProjectsScopeSql = `
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
`.trim();

    const adminGlobalSql = `
SELECT
  "WorkItem"."id",
  "WorkItem"."title",
  "WorkItem"."type",
  "WorkItem"."status",
  "WorkItem"."priority",
  "WorkItem"."createdAt"
FROM "WorkItem"
WHERE NOT EXISTS (
  SELECT 1
  FROM "TestCase"
  WHERE "TestCase"."workItemId" = "WorkItem"."id"
    AND "TestCase"."status" = 'APPROVED'
)
ORDER BY "WorkItem"."createdAt" DESC
LIMIT 100
`.trim();

    const sql = params.projectId
      ? projectScopeSql
      : params.userRole === Role.ADMIN
        ? adminGlobalSql
        : assignedProjectsScopeSql;

    return {
      needsSql: true,
      sql,
      explanation:
        'Lists work items that do not have any related test case with APPROVED status.',
      chart: {
        type: 'table',
        x: 'title',
        y: null,
        series: null,
        reason:
          'A table is best because the user asked which work items match the condition.',
      },
      unavailableReason: null,
    };
  }
}
