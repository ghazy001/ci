import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AuditAction,
  AuditEntityType,
  AuditSeverity,
  AutomationScriptStatus,
  Prisma,
  ProjectMemberRole,
  Role,
  ScheduledTestRunStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ScriptExecutionsService } from '../script-executions/script-executions.service';
import {
  CreateScheduledTestRunDto,
  SchedulePreset,
} from './dto/create-scheduled-test-run.dto';
import { UpdateScheduledTestRunDto } from './dto/update-scheduled-test-run.dto';
import { CronExpressionParser } from 'cron-parser';

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
export class ScheduledTestRunsService {
  private readonly logger = new Logger(ScheduledTestRunsService.name);
  private readonly schedulerLock = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly scriptExecutionsService: ScriptExecutionsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ─── Sanitizer ───────────────────────────────────────────────────────────────

  private sanitizeScheduledRunForAudit(schedule: any) {
    return {
      id: schedule.id,
      projectId: schedule.projectId,
      workItemId: schedule.workItemId,
      scriptId: schedule.scriptId,
      createdById: schedule.createdById,
      name: schedule.name,
      status: schedule.status,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      targetUrl: schedule.targetUrl,
      browser: schedule.browser,
      environment: schedule.environment,
      lastRunAt: schedule.lastRunAt,
      nextRunAt: schedule.nextRunAt,
      lastExecutionId: schedule.lastExecutionId,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };
  }

  // ─── Create ──────────────────────────────────────────────────────────────────

  async create(
    dto: CreateScheduledTestRunDto,
    userId: string,
    userRole: Role,
    auditContext?: AuditContext,
  ) {
    const script = await this.prisma.automationScript.findUnique({
      where: { id: dto.scriptId },
      include: {
        workItem: {
          select: {
            id: true,
            projectId: true,
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
        'Only approved automation scripts can be scheduled',
      );
    }

    const cronExpression = this.buildCronExpression(dto);
    const timezone = dto.timezone ?? 'Africa/Tunis';
    const nextRunAt = this.computeNextRunAt(cronExpression, timezone);

    const schedule = await this.prisma.scheduledTestRun.create({
      data: {
        projectId: script.workItem.projectId,
        workItemId: script.workItem.id,
        scriptId: script.id,
        createdById: userId,

        name: dto.name,
        description: dto.description,

        cronExpression,
        timezone,
        nextRunAt,

        targetUrl: dto.targetUrl,
        browser: dto.browser,
        environment: dto.environment,
        variables: this.toPrismaJson(dto.variables ?? {}),
      },
    });

    // Step 9.11 — Log create
    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.SCHEDULED_RUN_CREATED,
      entityType: AuditEntityType.SCHEDULED_TEST_RUN,
      entityId: schedule.id,
      projectId: schedule.projectId,
      message: `${auditContext?.actor?.fullName ?? 'User'} created scheduled run "${schedule.name}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      after: this.sanitizeScheduledRunForAudit(schedule),
    });

    return schedule;
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

    if (!script) {
      throw new NotFoundException('Automation script not found');
    }

    await this.ensureProjectAccess(script.workItem.projectId, userId, userRole);

    return this.prisma.scheduledTestRun.findMany({
      where: { scriptId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, userRole: Role) {
    const scheduledRun = await this.prisma.scheduledTestRun.findUnique({
      where: { id },
    });

    if (!scheduledRun) {
      throw new NotFoundException('Scheduled test run not found');
    }

    await this.ensureProjectAccess(scheduledRun.projectId, userId, userRole);

    return scheduledRun;
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateScheduledTestRunDto,
    userId: string,
    userRole: Role,
    auditContext?: AuditContext,
  ) {
    const existing = await this.findOne(id, userId, userRole);

    // Step 9.11 — Capture before for update diff
    const before = await this.prisma.scheduledTestRun.findUnique({
      where: { id },
    });

    const schedule = await this.prisma.scheduledTestRun.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        cronExpression: dto.cronExpression,
        timezone: dto.timezone,
        targetUrl: dto.targetUrl,
        browser: dto.browser,
        environment: dto.environment,
        variables:
          dto.variables !== undefined
            ? this.toPrismaJson(dto.variables)
            : undefined,
        nextRunAt:
          dto.cronExpression || dto.timezone
            ? this.computeNextRunAt(
                dto.cronExpression ?? existing.cronExpression,
                dto.timezone ?? existing.timezone,
              )
            : existing.nextRunAt,
      },
    });

    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.SCHEDULED_RUN_UPDATED,
      entityType: AuditEntityType.SCHEDULED_TEST_RUN,
      entityId: schedule.id,
      projectId: schedule.projectId,
      message: `${auditContext?.actor?.fullName ?? 'User'} updated scheduled run "${schedule.name}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      before: before ? this.sanitizeScheduledRunForAudit(before) : null,
      after: this.sanitizeScheduledRunForAudit(schedule),
    });

    return schedule;
  }

  // ─── Pause ───────────────────────────────────────────────────────────────────

  async pause(
    id: string,
    userId: string,
    userRole: Role,
    auditContext?: AuditContext,
  ) {
    await this.findOne(id, userId, userRole);

    const schedule = await this.prisma.scheduledTestRun.update({
      where: { id },
      data: {
        status: ScheduledTestRunStatus.PAUSED,
      },
    });

    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.SCHEDULED_RUN_PAUSED,
      entityType: AuditEntityType.SCHEDULED_TEST_RUN,
      entityId: schedule.id,
      projectId: schedule.projectId,
      message: `${auditContext?.actor?.fullName ?? 'User'} paused scheduled run "${schedule.name}"`,
      severity: AuditSeverity.WARNING,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      after: this.sanitizeScheduledRunForAudit(schedule),
    });

    return schedule;
  }

  // ─── Resume ──────────────────────────────────────────────────────────────────

  async resume(
    id: string,
    userId: string,
    userRole: Role,
    auditContext?: AuditContext,
  ) {
    const scheduledRun = await this.findOne(id, userId, userRole);

    const schedule = await this.prisma.scheduledTestRun.update({
      where: { id },
      data: {
        status: ScheduledTestRunStatus.ACTIVE,
        nextRunAt: this.computeNextRunAt(
          scheduledRun.cronExpression,
          scheduledRun.timezone,
        ),
      },
    });

    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.SCHEDULED_RUN_RESUMED,
      entityType: AuditEntityType.SCHEDULED_TEST_RUN,
      entityId: schedule.id,
      projectId: schedule.projectId,
      message: `${auditContext?.actor?.fullName ?? 'User'} resumed scheduled run "${schedule.name}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      after: this.sanitizeScheduledRunForAudit(schedule),
    });

    return schedule;
  }

  // ─── Disable (remove) ────────────────────────────────────────────────────────

  async remove(
    id: string,
    userId: string,
    userRole: Role,
    auditContext?: AuditContext,
  ) {
    await this.findOne(id, userId, userRole);

    const schedule = await this.prisma.scheduledTestRun.update({
      where: { id },
      data: {
        status: ScheduledTestRunStatus.DISABLED,
      },
    });

    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.SCHEDULED_RUN_DISABLED,
      entityType: AuditEntityType.SCHEDULED_TEST_RUN,
      entityId: schedule.id,
      projectId: schedule.projectId,
      message: `${auditContext?.actor?.fullName ?? 'User'} disabled scheduled run "${schedule.name}"`,
      severity: AuditSeverity.WARNING,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      after: this.sanitizeScheduledRunForAudit(schedule),
    });

    return schedule;
  }

  // ─── Cron runner ─────────────────────────────────────────────────────────────

  /**
   * Poll every minute and run due schedules.
   * This is simpler and more database-friendly than registering dynamic cron jobs.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processDueSchedules() {
    const now = new Date();

    const dueSchedules = await this.prisma.scheduledTestRun.findMany({
      where: {
        status: ScheduledTestRunStatus.ACTIVE,
        nextRunAt: {
          lte: now,
        },
      },
      take: 20,
      orderBy: {
        nextRunAt: 'asc',
      },
      include: {
        createdBy: {
          select: {
            id: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    for (const schedule of dueSchedules) {
      if (this.schedulerLock.has(schedule.id)) {
        continue;
      }

      this.schedulerLock.add(schedule.id);

      try {
        if (!schedule.createdBy.isActive) {
          await this.prisma.scheduledTestRun.update({
            where: { id: schedule.id },
            data: {
              status: ScheduledTestRunStatus.PAUSED,
              lastRunAt: now,
              nextRunAt: null,
            },
          });

          continue;
        }

        // No auditContext for automated runs — actor will be undefined, which is acceptable
        const executionResult = await this.scriptExecutionsService.runScript(
          schedule.scriptId,
          schedule.createdById,
          schedule.createdBy.role,
          {
            targetUrl: schedule.targetUrl ?? undefined,
            browser: schedule.browser ?? undefined,
            environment: schedule.environment ?? undefined,
            variables:
              schedule.variables &&
              typeof schedule.variables === 'object' &&
              !Array.isArray(schedule.variables)
                ? (schedule.variables as Record<string, string>)
                : {},
          },
        );

        await this.prisma.scheduledTestRun.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: now,
            nextRunAt: this.computeNextRunAt(
              schedule.cronExpression,
              schedule.timezone,
            ),
            lastExecutionId: executionResult.execution.id,
          },
        });
      } catch (error) {
        this.logger.error(
          error instanceof Error
            ? `Scheduled run failed: ${error.message}`
            : 'Scheduled run failed',
        );

        await this.prisma.scheduledTestRun.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: now,
            nextRunAt: this.computeNextRunAt(
              schedule.cronExpression,
              schedule.timezone,
            ),
          },
        });
      } finally {
        this.schedulerLock.delete(schedule.id);
      }
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private buildCronExpression(dto: CreateScheduledTestRunDto): string {
    if (dto.preset === SchedulePreset.CUSTOM_CRON) {
      if (!dto.cronExpression) {
        throw new BadRequestException(
          'cronExpression is required for CUSTOM_CRON schedule',
        );
      }

      return dto.cronExpression;
    }

    const { hour, minute } = this.parseTime(dto.time);

    if (dto.preset === SchedulePreset.DAILY) {
      return `${minute} ${hour} * * *`;
    }

    if (dto.preset === SchedulePreset.WEEKLY) {
      if (!dto.dayOfWeek) {
        throw new BadRequestException(
          'dayOfWeek is required for WEEKLY schedule',
        );
      }

      const day = this.mapDayOfWeek(dto.dayOfWeek);

      return `${minute} ${hour} * * ${day}`;
    }

    if (dto.preset === SchedulePreset.MONTHLY) {
      if (!dto.dayOfMonth || dto.dayOfMonth < 1 || dto.dayOfMonth > 31) {
        throw new BadRequestException(
          'dayOfMonth must be between 1 and 31 for MONTHLY schedule',
        );
      }

      return `${minute} ${hour} ${dto.dayOfMonth} * *`;
    }

    throw new BadRequestException('Unsupported schedule preset');
  }

  private parseTime(value: string) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);

    if (!match) {
      throw new BadRequestException('time must use HH:mm format');
    }

    return {
      hour: Number(match[1]),
      minute: Number(match[2]),
    };
  }

  private mapDayOfWeek(value: string) {
    const days: Record<string, number> = {
      SUN: 0,
      MON: 1,
      TUE: 2,
      WED: 3,
      THU: 4,
      FRI: 5,
      SAT: 6,
    };

    return days[value];
  }

  private computeNextRunAt(cronExpression: string, timezone = 'Africa/Tunis') {
    try {
      const interval = CronExpressionParser.parse(cronExpression, {
        currentDate: new Date(),
        tz: timezone,
      });

      return interval.next().toDate();
    } catch {
      throw new BadRequestException('Invalid cron expression');
    }
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
    if (value === undefined) return undefined;
    if (value === null) return Prisma.JsonNull;

    return value as Prisma.InputJsonValue;
  }
}
