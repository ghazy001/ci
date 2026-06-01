// src/script-executions/script-executions.service.ts

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntityType,
  AuditSeverity,
  AutomationScriptExecutionStatus,
  AutomationScriptStatus,
  Prisma,
  ProjectMemberRole,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RunAutomationScriptDto } from './dto/run-automation-script.dto';
import { ScriptRunnerService } from './runner/script-runner.service';

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
export class ScriptExecutionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scriptRunnerService: ScriptRunnerService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ─── Sanitizer ──────────────────────────────────────────────────────────────

  private sanitizeExecutionForAudit(execution: any) {
    return {
      id: execution.id,
      scriptId: execution.scriptId,
      testCaseId: execution.testCaseId,
      workItemId: execution.workItemId,
      requestedById: execution.requestedById,
      status: execution.status,
      framework: execution.framework,
      browser: execution.browser,
      targetUrl: execution.targetUrl,
      environment: execution.environment,
      command: execution.command,
      exitCode: execution.exitCode,
      errorMessage: execution.errorMessage,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      createdAt: execution.createdAt,
      updatedAt: execution.updatedAt,
    };
  }

  // ─── Run ─────────────────────────────────────────────────────────────────────

  async runScript(
    scriptId: string,
    userId: string,
    userRole: Role,
    dto: RunAutomationScriptDto,
    auditContext?: AuditContext,
  ) {
    const script = await this.prisma.automationScript.findUnique({
      where: { id: scriptId },
      include: {
        workItem: {
          select: {
            id: true,
            projectId: true,
            title: true,
          },
        },
        testCase: {
          select: {
            id: true,
            title: true,
          },
        },
        generation: {
          select: {
            targetUrl: true,
            browser: true,
            environment: true,
          },
        },
      },
    });

    if (!script || script.status === AutomationScriptStatus.REMOVED) {
      throw new NotFoundException('Automation script not found');
    }

    await this.ensureProjectAccess(script.workItem.projectId, userId, userRole);

    if (script.status !== AutomationScriptStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved automation scripts can be executed',
      );
    }

    const execution = await this.prisma.automationScriptExecution.create({
      data: {
        scriptId: script.id,
        testCaseId: script.testCaseId,
        workItemId: script.workItemId,
        requestedById: userId,

        status: AutomationScriptExecutionStatus.QUEUED,
        framework: script.framework,

        browser: dto.browser ?? script.generation.browser,
        targetUrl: dto.targetUrl ?? script.generation.targetUrl,
        environment: dto.environment ?? script.generation.environment,
        variables: this.toPrismaJson(dto.variables ?? {}),

        logs: this.toPrismaJson([
          {
            level: 'info',
            message: 'Execution queued',
            timestamp: new Date().toISOString(),
          },
        ]),
      },
      include: {
        script: {
          select: {
            id: true,
            fileName: true,
            framework: true,
            status: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Step 9.4 — Log execution started
    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.SCRIPT_EXECUTION_STARTED,
      entityType: AuditEntityType.SCRIPT_EXECUTION,
      entityId: execution.id,
      projectId: script.workItem.projectId,
      message: `${auditContext?.actor?.fullName ?? 'User'} started execution for script "${script.fileName}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      after: this.sanitizeExecutionForAudit(execution),
      metadata: {
        scriptId,
        framework: execution.framework,
        browser: execution.browser,
        targetUrl: execution.targetUrl,
        environment: execution.environment,
      },
    });

    void this.scriptRunnerService.execute({
      executionId: execution.id,
      scriptId: script.id,
      framework: script.framework,
      fileName: script.fileName,
      code: script.code,
      browser: execution.browser,
      targetUrl: execution.targetUrl,
      environment: execution.environment,
      variables: dto.variables ?? {},
    });

    return {
      execution,
      queued: true,
      message:
        'Execution has been queued. Runner integration will be connected in the next step.',
    };
  }

  // ─── Find ────────────────────────────────────────────────────────────────────

  async findByScript(scriptId: string, userId: string, userRole: Role) {
    const script = await this.prisma.automationScript.findUnique({
      where: { id: scriptId },
      include: {
        workItem: {
          select: {
            projectId: true,
          },
        },
      },
    });

    if (!script || script.status === AutomationScriptStatus.REMOVED) {
      throw new NotFoundException('Automation script not found');
    }

    await this.ensureProjectAccess(script.workItem.projectId, userId, userRole);

    return this.prisma.automationScriptExecution.findMany({
      where: { scriptId },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(executionId: string, userId: string, userRole: Role) {
    const execution = await this.prisma.automationScriptExecution.findUnique({
      where: { id: executionId },
      include: {
        script: {
          select: {
            id: true,
            fileName: true,
            code: true,
            framework: true,
            status: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException('Script execution not found');
    }

    const workItem = await this.prisma.workItem.findUnique({
      where: { id: execution.workItemId },
      select: {
        projectId: true,
      },
    });

    if (!workItem) {
      throw new NotFoundException('Related work item not found');
    }

    await this.ensureProjectAccess(workItem.projectId, userId, userRole);

    return execution;
  }

  // ─── Cancel ──────────────────────────────────────────────────────────────────

  async cancelExecution(
    executionId: string,
    userId: string,
    userRole: Role,
    auditContext?: AuditContext,
  ) {
    const execution = await this.findOne(executionId, userId, userRole);

    if (
      execution.status !== AutomationScriptExecutionStatus.QUEUED &&
      execution.status !== AutomationScriptExecutionStatus.RUNNING
    ) {
      throw new BadRequestException(
        'Only queued or running executions can be canceled',
      );
    }

    // Fetch projectId for audit log
    const workItem = await this.prisma.workItem.findUnique({
      where: { id: execution.workItemId },
      select: { projectId: true },
    });

    const updated = await this.prisma.automationScriptExecution.update({
      where: { id: executionId },
      data: {
        status: AutomationScriptExecutionStatus.CANCELED,
        completedAt: new Date(),
        logs: this.toPrismaJson([
          ...this.asArray(execution.logs),
          {
            level: 'warning',
            message: 'Execution canceled by user',
            timestamp: new Date().toISOString(),
          },
        ]),
      },
    });

    // Step 9.5 — Log CANCELED (status changed from QUEUED/RUNNING)
    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.SCRIPT_EXECUTION_CANCELED,
      entityType: AuditEntityType.SCRIPT_EXECUTION,
      entityId: updated.id,
      projectId: workItem?.projectId ?? execution.workItemId,
      message: `Script execution canceled for execution ${updated.id}`,
      severity: AuditSeverity.WARNING,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      after: this.sanitizeExecutionForAudit(updated),
      metadata: {
        durationMs:
          execution.startedAt && updated.completedAt
            ? updated.completedAt.getTime() -
              new Date(execution.startedAt).getTime()
            : null,
        exitCode: updated.exitCode,
        errorMessage: updated.errorMessage,
      },
    });

    return updated;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

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

    if (
      membership.role !== ProjectMemberRole.OWNER &&
      membership.role !== ProjectMemberRole.TESTER
    ) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private toPrismaJson(
    value: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private asArray(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
  }
}
