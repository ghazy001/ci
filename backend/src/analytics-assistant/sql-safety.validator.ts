import { BadRequestException } from '@nestjs/common';

const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'ALTER',
  'TRUNCATE',
  'CREATE',
  'GRANT',
  'REVOKE',
  'MERGE',
  'CALL',
  'EXEC',
  'EXECUTE',
  'COPY',
  'VACUUM',
  'ANALYZE',
  'COMMENT',
  'LOCK',
  'SET',
  'RESET',
  'SHOW',
];

const FORBIDDEN_COLUMNS = [
  'passwordHash',
  'refreshTokenHash',
  'accessToken',
  'refreshToken',
  'passwordResetTokenHash',
];

const ALLOWED_TABLES = [
  'User',
  'Project',
  'ProjectMember',
  'WorkItem',
  'TestCaseGeneration',
  'TestCase',
  'AutomationScriptGeneration',
  'AutomationScript',
  'JiraConnection',
];

export class SqlSafetyValidator {
  validate(sql: string): string {
    const cleaned = sql.trim();

    if (!cleaned) {
      throw new BadRequestException('SQL query is empty');
    }

    this.rejectComments(cleaned);

    const normalized = cleaned.replace(/\s+/g, ' ').trim();
    const upper = normalized.toUpperCase();

    if (!upper.startsWith('SELECT')) {
      throw new BadRequestException('Only SELECT queries are allowed');
    }

    this.rejectMultipleStatements(normalized);
    this.rejectForbiddenKeywords(normalized);
    this.rejectForbiddenColumns(normalized);
    this.validateReferencedTables(normalized);

    return this.ensureLimit(normalized);
  }

  validateScopedSql(
    sql: string,
    params: {
      userRole: string;
      projectId?: string | null;
      assignedProjectIds?: string[];
    },
  ): string {
    const safeSql = this.validate(sql);

    if (params.userRole === 'ADMIN' && !params.projectId) {
      if (safeSql.includes('__PROJECT_ID__')) {
        throw new BadRequestException(
          'Global admin analytics query must not include __PROJECT_ID__ placeholder',
        );
      }

      if (safeSql.includes('__ASSIGNED_PROJECT_IDS__')) {
        throw new BadRequestException(
          'Global admin analytics query must not include __ASSIGNED_PROJECT_IDS__ placeholder',
        );
      }

      return safeSql;
    }

    const referencesProject = /"Project"/i.test(safeSql);
    const referencesWorkItem = /"WorkItem"/i.test(safeSql);
    const referencesTestCase = /"TestCase"/i.test(safeSql);
    const referencesTestCaseGeneration = /"TestCaseGeneration"/i.test(safeSql);
    const referencesAutomationScript = /"AutomationScript"/i.test(safeSql);
    const referencesAutomationScriptGeneration =
      /"AutomationScriptGeneration"/i.test(safeSql);

    const needsProjectScope =
      referencesProject ||
      referencesWorkItem ||
      referencesTestCase ||
      referencesTestCaseGeneration ||
      referencesAutomationScript ||
      referencesAutomationScriptGeneration;

    if (!needsProjectScope) {
      return safeSql;
    }

    if (params.projectId) {
      if (!safeSql.includes('__PROJECT_ID__')) {
        throw new BadRequestException(
          'Project-scoped analytics query must include the __PROJECT_ID__ placeholder',
        );
      }

      if (safeSql.includes('__ASSIGNED_PROJECT_IDS__')) {
        throw new BadRequestException(
          'Project-scoped analytics query must not include the __ASSIGNED_PROJECT_IDS__ placeholder',
        );
      }

      return safeSql;
    }

    if (params.userRole !== 'ADMIN') {
      if (!safeSql.includes('__ASSIGNED_PROJECT_IDS__')) {
        throw new BadRequestException(
          'Tester analytics query must include the __ASSIGNED_PROJECT_IDS__ placeholder',
        );
      }

      if (safeSql.includes("'__ASSIGNED_PROJECT_IDS__'")) {
        throw new BadRequestException(
          '__ASSIGNED_PROJECT_IDS__ must not be quoted',
        );
      }

      if (safeSql.includes('__PROJECT_ID__')) {
        throw new BadRequestException(
          'Tester assigned-project analytics query must not include __PROJECT_ID__ placeholder',
        );
      }
    }

    return safeSql;
  }

  private rejectComments(sql: string) {
    if (/--|\/\*|\*\//.test(sql)) {
      throw new BadRequestException('SQL comments are not allowed');
    }
  }

  private rejectMultipleStatements(sql: string) {
    const withoutTrailingSemicolon = sql.replace(/;\s*$/, '');

    if (withoutTrailingSemicolon.includes(';')) {
      throw new BadRequestException('Multiple SQL statements are not allowed');
    }
  }

  private rejectForbiddenKeywords(sql: string) {
    for (const keyword of FORBIDDEN_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');

      if (regex.test(sql)) {
        throw new BadRequestException(
          `Unsafe SQL keyword is not allowed: ${keyword}`,
        );
      }
    }
  }

  private rejectForbiddenColumns(sql: string) {
    for (const column of FORBIDDEN_COLUMNS) {
      const regex = new RegExp(`\\b${column}\\b`, 'i');

      if (regex.test(sql)) {
        throw new BadRequestException(
          `Sensitive column is not allowed: ${column}`,
        );
      }
    }
  }

  private validateReferencedTables(sql: string) {
    const tableRegex = /\bFROM\s+"([^"]+)"|\bJOIN\s+"([^"]+)"/gi;
    const matches = sql.matchAll(tableRegex);

    for (const match of matches) {
      const table = match[1] || match[2];

      if (!ALLOWED_TABLES.includes(table)) {
        throw new BadRequestException(`Table is not allowed: ${table}`);
      }
    }
  }

  private ensureLimit(sql: string): string {
    const isAggregateOnly =
      /\bCOUNT\s*\(/i.test(sql) ||
      /\bSUM\s*\(/i.test(sql) ||
      /\bAVG\s*\(/i.test(sql) ||
      /\bMIN\s*\(/i.test(sql) ||
      /\bMAX\s*\(/i.test(sql);

    if (/\bLIMIT\s+\d+\b/i.test(sql)) {
      return sql;
    }

    if (isAggregateOnly && !/\bGROUP\s+BY\b/i.test(sql)) {
      return sql;
    }

    if (/;\s*$/.test(sql)) {
      return sql.replace(/;\s*$/, ' LIMIT 100');
    }

    return `${sql} LIMIT 100`;
  }
}
