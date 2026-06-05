import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntityType,
  AuditSeverity,
  AutomationScriptExecutionStatus,
  DefectSeverity,
  Prisma,
  ProjectMemberRole,
  Role,
  TestSuiteReportStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import {
  buildDefectReportPdf,
  buildSuiteReportPdf,
} from './pdf-report-builder'; // ← new professional builder

type AuditContext = {
  actor?: {
    id: string;
    email: string;
    fullName: string;
    role: any;
  };
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class ScriptExecutionReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ─── Sanitizers ─────────────────────────────────────────────────────────────

  private sanitizeDefectReportForAudit(report: any) {
    return {
      id: report.id,
      projectId: report.projectId,
      workItemId: report.workItemId,
      testCaseId: report.testCaseId,
      scriptId: report.scriptId,
      executionId: report.executionId,
      createdById: report.createdById,
      title: report.title,
      severity: report.severity,
      status: report.status,
      failureReason: report.failureReason,
      browser: report.browser,
      environment: report.environment,
      targetUrl: report.targetUrl,
      exitCode: report.exitCode,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  // ─── Defect report ───────────────────────────────────────────────────────────

  async createDefectReportIfFailed(
    executionId: string,
    auditContext?: AuditContext,
  ) {
    const execution = await this.prisma.automationScriptExecution.findUnique({
      where: { id: executionId },
      include: {
        script: {
          include: {
            workItem: { select: { id: true, projectId: true, title: true } },
            testCase: {
              select: {
                id: true,
                title: true,
                steps: true,
                expectedResult: true,
              },
            },
          },
        },
      },
    });

    if (!execution) throw new NotFoundException('Script execution not found');

    const shouldCreate =
      execution.status === AutomationScriptExecutionStatus.FAILED ||
      execution.status === AutomationScriptExecutionStatus.TIMED_OUT;

    if (!shouldCreate) return null;

    const existing = await this.prisma.defectReport.findUnique({
      where: { executionId },
    });
    if (existing) return existing;

    const defectReport = await this.prisma.defectReport.create({
      data: {
        projectId: execution.script.workItem.projectId,
        workItemId: execution.workItemId,
        testCaseId: execution.testCaseId,
        scriptId: execution.scriptId,
        executionId: execution.id,
        createdById: execution.requestedById,

        title: `Bug: ${execution.script.testCase.title}`,
        summary: this.buildBugSummary(execution),
        severity: this.inferSeverity(execution),

        failureReason:
          execution.errorMessage ||
          execution.stderr ||
          'Automation script execution failed',

        reproductionSteps: this.toPrismaJson({
          testCaseSteps: execution.script.testCase.steps,
          expectedResult: execution.script.testCase.expectedResult,
          command: execution.command,
          targetUrl: execution.targetUrl,
          browser: execution.browser,
          environment: execution.environment,
        }),

        environment: execution.environment,
        browser: execution.browser,
        targetUrl: execution.targetUrl,
        command: execution.command,
        exitCode: execution.exitCode,
        stdoutExcerpt: this.truncate(execution.stdout, 4000),
        stderrExcerpt: this.truncate(execution.stderr, 4000),
        logs: this.toPrismaJson(execution.logs),
        artifacts: this.toPrismaJson(execution.artifacts),
      },
    });

    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.DEFECT_REPORT_CREATED,
      entityType: AuditEntityType.DEFECT_REPORT,
      entityId: defectReport.id,
      projectId: defectReport.projectId,
      message: `Defect report created: "${defectReport.title}"`,
      severity:
        defectReport.severity === 'CRITICAL'
          ? AuditSeverity.CRITICAL
          : AuditSeverity.WARNING,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      after: this.sanitizeDefectReportForAudit(defectReport),
      metadata: {
        executionId: defectReport.executionId,
        scriptId: defectReport.scriptId,
      },
    });

    return defectReport;
  }

  // ─── Suite report ────────────────────────────────────────────────────────────

  async createSuiteReportFromExecutions(params: {
    executionIds: string[];
    requestedById: string;
    userRole: Role;
    title?: string;
    auditContext?: AuditContext;
  }) {
    const executions = await this.prisma.automationScriptExecution.findMany({
      where: { id: { in: params.executionIds } },
      include: {
        script: { include: { workItem: { select: { projectId: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (executions.length === 0)
      throw new NotFoundException('No executions found');

    const projectIds = Array.from(
      new Set(executions.map((e) => e.script.workItem.projectId)),
    );
    if (projectIds.length !== 1) {
      throw new Error(
        'All executions in a suite report must belong to the same project',
      );
    }

    await this.ensureProjectAccess(
      projectIds[0],
      params.requestedById,
      params.userRole,
    );

    const total = executions.length;
    const passed = executions.filter((e) => e.status === 'PASSED').length;
    const failed = executions.filter((e) => e.status === 'FAILED').length;
    const timedOut = executions.filter((e) => e.status === 'TIMED_OUT').length;
    const canceled = executions.filter((e) => e.status === 'CANCELED').length;
    const running = executions.filter((e) => e.status === 'RUNNING').length;
    const queued = executions.filter((e) => e.status === 'QUEUED').length;
    const passRate =
      total > 0 ? Number(((passed / total) * 100).toFixed(2)) : 0;

    const durations = executions
      .filter((e) => e.startedAt && e.completedAt)
      .map((e) => e.completedAt!.getTime() - e.startedAt!.getTime());

    const durationMs =
      durations.length > 0 ? durations.reduce((sum, ms) => sum + ms, 0) : null;

    const report = await this.prisma.testSuiteReport.create({
      data: {
        projectId: executions[0].script.workItem.projectId,
        workItemId: this.sameValueOrNull(executions.map((e) => e.workItemId)),
        scriptId: this.sameValueOrNull(executions.map((e) => e.scriptId)),
        requestedById: params.requestedById,
        title:
          params.title ?? `Test Suite Report - ${new Date().toISOString()}`,
        status: this.resolveSuiteStatus({
          total,
          passed,
          failed,
          timedOut,
          canceled,
          running,
          queued,
        }),
        total,
        passed,
        failed,
        timedOut,
        canceled,
        running,
        queued,
        passRate,
        durationMs: durationMs ?? undefined,
        startedAt: this.minDate(executions.map((e) => e.startedAt)),
        completedAt: this.maxDate(executions.map((e) => e.completedAt)),
        summary: this.toPrismaJson({
          generatedFromExecutionIds: params.executionIds,
          failedExecutionIds: executions
            .filter((e) => e.status === 'FAILED' || e.status === 'TIMED_OUT')
            .map((e) => e.id),
        }),
        items: {
          create: executions.map((e) => ({
            executionId: e.id,
            scriptId: e.scriptId,
            testCaseId: e.testCaseId,
            workItemId: e.workItemId,
            status: e.status,
            durationMs:
              e.startedAt && e.completedAt
                ? e.completedAt.getTime() - e.startedAt.getTime()
                : null,
            errorMessage: e.errorMessage,
          })),
        },
      },
      include: { items: true },
    });

    await this.auditLogsService.create({
      actor: params.auditContext?.actor,
      action: AuditAction.TEST_SUITE_REPORT_CREATED,
      entityType: AuditEntityType.TEST_SUITE_REPORT,
      entityId: report.id,
      projectId: report.projectId,
      message: `${params.auditContext?.actor?.fullName ?? 'User'} created test suite report "${report.title}"`,
      severity:
        report.status === 'FAILED' ? AuditSeverity.WARNING : AuditSeverity.INFO,
      success: true,
      ipAddress: params.auditContext?.ipAddress,
      userAgent: params.auditContext?.userAgent,
      after: {
        id: report.id,
        projectId: report.projectId,
        workItemId: report.workItemId,
        scriptId: report.scriptId,
        requestedById: report.requestedById,
        title: report.title,
        status: report.status,
        total: report.total,
        passed: report.passed,
        failed: report.failed,
        timedOut: report.timedOut,
        canceled: report.canceled,
        passRate: report.passRate,
        durationMs: report.durationMs,
        createdAt: report.createdAt,
      },
    });

    return report;
  }

  // ─── Get ─────────────────────────────────────────────────────────────────────

  async getDefectReportByExecution(
    executionId: string,
    userId: string,
    userRole: Role,
  ) {
    const report = await this.prisma.defectReport.findUnique({
      where: { executionId },
      include: { project: { select: { id: true } } },
    });

    if (!report) return null;
    await this.ensureProjectAccess(report.project.id, userId, userRole);
    return report;
  }

  async getSuiteReport(reportId: string, userId: string, userRole: Role) {
    const report = await this.prisma.testSuiteReport.findUnique({
      where: { id: reportId },
      include: { items: true },
    });

    if (!report) throw new NotFoundException('Test suite report not found');
    await this.ensureProjectAccess(report.projectId, userId, userRole);
    return report;
  }

  // ─── PDF — now delegates to pdf-report-builder ───────────────────────────────

  async buildDefectReportPdf(
    executionId: string,
    userId: string,
    userRole: Role,
    auditContext?: AuditContext,
  ): Promise<Buffer> {
    const report = await this.getDefectReportByExecution(
      executionId,
      userId,
      userRole,
    );
    if (!report) throw new NotFoundException('Defect report not found');

    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.DEFECT_REPORT_PDF_DOWNLOADED,
      entityType: AuditEntityType.DEFECT_REPORT,
      entityId: report.id,
      projectId: report.projectId,
      message: `${auditContext?.actor?.fullName ?? 'User'} downloaded defect report PDF "${report.title}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: { executionId: report.executionId },
    });

    return buildDefectReportPdf(report); // ← professional builder
  }

  async buildSuiteReportPdf(
    reportId: string,
    userId: string,
    userRole: Role,
    auditContext?: AuditContext,
  ): Promise<Buffer> {
    const report = await this.getSuiteReport(reportId, userId, userRole);

    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.TEST_SUITE_REPORT_PDF_DOWNLOADED,
      entityType: AuditEntityType.TEST_SUITE_REPORT,
      entityId: report.id,
      projectId: report.projectId,
      message: `${auditContext?.actor?.fullName ?? 'User'} downloaded suite report PDF "${report.title}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    });

    return buildSuiteReportPdf(report); // ← professional builder
  }

  // ─── Suite reports by script ─────────────────────────────────────────────────

  async findSuiteReportsByScript(
    scriptId: string,
    userId: string,
    userRole: Role,
  ) {
    const script = await this.prisma.automationScript.findUnique({
      where: { id: scriptId },
      include: { workItem: { select: { projectId: true } } },
    });

    if (!script) throw new NotFoundException('Automation script not found');
    await this.ensureProjectAccess(script.workItem.projectId, userId, userRole);

    return this.prisma.testSuiteReport.findMany({
      where: { scriptId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private inferSeverity(execution: any): DefectSeverity {
    const text = [
      execution.errorMessage,
      execution.stderr,
      JSON.stringify(execution.logs ?? []),
    ]
      .filter(Boolean)
      .join('\n')
      .toLowerCase();

    if (execution.status === 'TIMED_OUT') return DefectSeverity.HIGH;
    if (text.includes('security') || text.includes('auth'))
      return DefectSeverity.CRITICAL;
    if (text.includes('assert') || text.includes('expected'))
      return DefectSeverity.HIGH;
    return DefectSeverity.MEDIUM;
  }

  private buildBugSummary(execution: any): string {
    return [
      `Automation execution failed for script "${execution.script.fileName}".`,
      `Test case: ${execution.script.testCase.title}.`,
      execution.targetUrl ? `Target URL: ${execution.targetUrl}.` : null,
      execution.browser ? `Browser: ${execution.browser}.` : null,
      execution.exitCode !== null && execution.exitCode !== undefined
        ? `Exit code: ${execution.exitCode}.`
        : null,
      execution.errorMessage ? `Error: ${execution.errorMessage}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private resolveSuiteStatus(stats: {
    total: number;
    passed: number;
    failed: number;
    timedOut: number;
    canceled: number;
    running: number;
    queued: number;
  }): TestSuiteReportStatus {
    if (stats.failed > 0 || stats.timedOut > 0)
      return TestSuiteReportStatus.FAILED;
    if (stats.canceled > 0 || stats.running > 0 || stats.queued > 0)
      return TestSuiteReportStatus.PARTIAL;
    if (stats.passed === stats.total) return TestSuiteReportStatus.PASSED;
    return TestSuiteReportStatus.PARTIAL;
  }

  private sameValueOrNull(values: string[]) {
    const unique = Array.from(new Set(values));
    return unique.length === 1 ? unique[0] : null;
  }

  private minDate(values: Array<Date | null>) {
    const dates = values.filter(Boolean) as Date[];
    return dates.length === 0
      ? null
      : new Date(Math.min(...dates.map((d) => d.getTime())));
  }

  private maxDate(values: Array<Date | null>) {
    const dates = values.filter(Boolean) as Date[];
    return dates.length === 0
      ? null
      : new Date(Math.max(...dates.map((d) => d.getTime())));
  }

  private truncate(value: string | null | undefined, max: number) {
    if (!value) return null;
    return value.length > max ? value.slice(0, max) : value;
  }

  private toPrismaJson(
    value: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (value === undefined) return undefined;
    if (value === null) return Prisma.JsonNull;
    return value as Prisma.InputJsonValue;
  }

  private async ensureProjectAccess(
    projectId: string,
    userId: string,
    userRole: Role,
  ) {
    if (userRole === Role.ADMIN) return;

    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this project');
    }

    if (
      membership.role !== ProjectMemberRole.OWNER &&
      membership.role !== ProjectMemberRole.TESTER
    ) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }
}
