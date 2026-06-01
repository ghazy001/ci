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
  AutomationScriptGenerationStatus,
  AutomationScriptStatus,
  Prisma,
  ProjectMemberRole,
  Role,
  TestCaseStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GenerateAutomationScriptDto } from './dto/generate-automation-script.dto';
import { UpdateAutomationScriptDto } from './dto/update-automation-script.dto';
import { ReviewAutomationScriptDto } from './dto/review-automation-script.dto';
import { AiScriptGenerationClient } from './ai-script-generation.client';

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
export class AutomationScriptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiScriptGenerationClient: AiScriptGenerationClient,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ─── Sanitizers ────────────────────────────────────────────────────────────

  private sanitizeScriptGenerationForAudit(generation: any) {
    return {
      id: generation.id,
      testCaseId: generation.testCaseId,
      workItemId: generation.workItemId,
      requestedById: generation.requestedById,
      status: generation.status,
      framework: generation.framework,
      browser: generation.browser,
      targetUrl: generation.targetUrl,
      environment: generation.environment,
      provider: generation.provider,
      model: generation.model,
      promptVersion: generation.promptVersion,
      generationMethod: generation.generationMethod,
      confidence: generation.confidence,
      createdAt: generation.createdAt,
      startedAt: generation.startedAt,
      completedAt: generation.completedAt,
      errorMessage: generation.errorMessage,
    };
  }

  private sanitizeAutomationScriptForAudit(script: any) {
    return {
      id: script.id,
      generationId: script.generationId,
      testCaseId: script.testCaseId,
      workItemId: script.workItemId,
      generatedById: script.generatedById,
      status: script.status,
      framework: script.framework,
      fileName: script.fileName,
      language: script.language,
      explanation: script.explanation,
      dependencies: script.dependencies,
      setupNotes: script.setupNotes,
      selectorsUsed: script.selectorsUsed,
      warnings: script.warnings,
      reviewNotes: script.reviewNotes,
      approvedAt: script.approvedAt,
      declinedAt: script.declinedAt,
      editedAt: script.editedAt,
      removedAt: script.removedAt,
      createdAt: script.createdAt,
      updatedAt: script.updatedAt,
    };
  }

  // ─── Generate ───────────────────────────────────────────────────────────────

  async generateForTestCase(
    testCaseId: string,
    userId: string,
    userRole: Role,
    dto: GenerateAutomationScriptDto,
    auditContext?: AuditContext,
  ) {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id: testCaseId },
      include: {
        workItem: true,
      },
    });

    if (!testCase) {
      throw new NotFoundException('Test case not found');
    }

    await this.ensureProjectAccess(
      testCase.workItem.projectId,
      userId,
      userRole,
    );

    if (testCase.status !== TestCaseStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved test cases can be used to generate automation scripts',
      );
    }

    const context = {
      framework: dto.framework,
      targetUrl: dto.targetUrl,
      browser: dto.browser ?? null,
      environment: dto.environment ?? null,
      selectorsStrategy: dto.selectorsStrategy ?? 'AUTO',
      auth: {
        required: dto.authRequired ?? false,
        role: dto.authRole ?? null,
        instructions: dto.authInstructions ?? null,
      },
      extraInstructions: dto.extraInstructions ?? null,
      variables: dto.variables ?? {},
    };

    const generation = await this.prisma.automationScriptGeneration.create({
      data: {
        testCaseId: testCase.id,
        workItemId: testCase.workItemId,
        requestedById: userId,

        status: AutomationScriptGenerationStatus.PROCESSING,

        framework: dto.framework,
        browser: dto.browser,
        targetUrl: dto.targetUrl,
        environment: dto.environment,

        context: this.toPrismaJson(context),
        startedAt: new Date(),
      },
    });

    // Step 8.4 — Log generation started
    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.AUTOMATION_SCRIPT_GENERATION_STARTED,
      entityType: AuditEntityType.AUTOMATION_SCRIPT_GENERATION,
      entityId: generation.id,
      projectId: testCase.workItem.projectId,
      message: `${auditContext?.actor?.fullName ?? 'User'} started automation script generation for test case "${testCase.title}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      after: this.sanitizeScriptGenerationForAudit(generation),
      metadata: {
        testCaseId,
        workItemId: testCase.workItemId,
        framework: dto.framework,
        browser: dto.browser,
        targetUrl: dto.targetUrl,
        environment: dto.environment,
      },
    });

    const requestId = randomUUID();

    let job: { jobId: string; status: string };

    try {
      job = await this.aiScriptGenerationClient.createGenerationJob({
        requestId,
        tenantId: testCase.workItem.projectId,
        userId,

        testCaseId: testCase.id,
        workItemId: testCase.workItemId,

        testCase: {
          id: testCase.id,
          title: testCase.title,
          objective: testCase.objective,
          type: testCase.type,
          priority: testCase.priority,
          preconditions: testCase.preconditions,
          steps: testCase.steps,
          expectedResult: testCase.expectedResult,
          testData: testCase.testData,
          coverage: testCase.coverage,
        },

        workItem: {
          id: testCase.workItem.id,
          type: testCase.workItem.type,
          source: testCase.workItem.source,
          title: testCase.workItem.title,
          description: testCase.workItem.description,
          acceptanceCriteria: testCase.workItem.acceptanceCriteria,
          businessRules: testCase.workItem.businessRules,
          priority: testCase.workItem.priority,
          normalizedContent: testCase.workItem.normalizedContent,
        },

        generationContext: context,
      });
    } catch (error) {
      await this.prisma.automationScriptGeneration.update({
        where: { id: generation.id },
        data: {
          status: AutomationScriptGenerationStatus.FAILED,
          completedAt: new Date(),
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Unknown AI automation script generation job error',
        },
      });

      throw error;
    }

    const queuedGeneration =
      await this.prisma.automationScriptGeneration.update({
        where: { id: generation.id },
        data: {
          status: AutomationScriptGenerationStatus.PROCESSING,
          aiTrace: this.toPrismaJson({
            requestId,
            jobId: job.jobId,
            jobStatus: job.status,
            mode: 'celery_async_script_generation',
          }),
        },
        include: {
          scripts: true,
        },
      });

    return {
      generation: queuedGeneration,
      script: null,
    };
  }

  // ─── Find ───────────────────────────────────────────────────────────────────

  async findByTestCase(testCaseId: string, userId: string, userRole: Role) {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id: testCaseId },
      include: {
        workItem: {
          select: {
            projectId: true,
          },
        },
      },
    });

    if (!testCase) {
      throw new NotFoundException('Test case not found');
    }

    await this.ensureProjectAccess(
      testCase.workItem.projectId,
      userId,
      userRole,
    );

    return this.prisma.automationScript.findMany({
      where: {
        testCaseId,
        status: {
          not: AutomationScriptStatus.REMOVED,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        generation: {
          select: {
            id: true,
            status: true,
            targetUrl: true,
            environment: true,
            browser: true,
            provider: true,
            model: true,
            confidence: true,
            generationMethod: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });
  }

  async findGenerationOne(
    generationId: string,
    userId: string,
    userRole: Role,
  ) {
    const generation = await this.prisma.automationScriptGeneration.findUnique({
      where: { id: generationId },
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
            status: true,
          },
        },
        scripts: true,
      },
    });

    if (!generation) {
      throw new NotFoundException('Automation script generation not found');
    }

    await this.ensureProjectAccess(
      generation.workItem.projectId,
      userId,
      userRole,
    );

    if (generation.status === AutomationScriptGenerationStatus.PROCESSING) {
      return this.syncGenerationJob(generation.id, userId, userRole);
    }

    return generation;
  }

  async findOne(scriptId: string, userId: string, userRole: Role) {
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
        generation: true,
      },
    });

    if (!script || script.status === AutomationScriptStatus.REMOVED) {
      throw new NotFoundException('Automation script not found');
    }

    await this.ensureProjectAccess(script.workItem.projectId, userId, userRole);

    return script;
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  async update(
    scriptId: string,
    userId: string,
    userRole: Role,
    dto: UpdateAutomationScriptDto,
    auditContext?: AuditContext,
  ) {
    const existing = await this.findOne(scriptId, userId, userRole);

    if (existing.status === AutomationScriptStatus.REMOVED) {
      throw new BadRequestException('Removed scripts cannot be edited');
    }

    const before = await this.prisma.automationScript.findUnique({
      where: { id: scriptId },
      include: {
        workItem: {
          select: { projectId: true },
        },
      },
    });

    const script = await this.prisma.automationScript.update({
      where: { id: scriptId },
      data: {
        fileName: dto.fileName,
        code: dto.code,
        explanation: dto.explanation,
        reviewNotes: dto.reviewNotes,
        status:
          existing.status === AutomationScriptStatus.APPROVED
            ? AutomationScriptStatus.APPROVED
            : AutomationScriptStatus.EDITED,
        editedAt: new Date(),
      },
      include: {
        workItem: {
          select: { projectId: true },
        },
      },
    });

    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.AUTOMATION_SCRIPT_EDITED,
      entityType: AuditEntityType.AUTOMATION_SCRIPT,
      entityId: script.id,
      projectId: script.workItem.projectId,
      message: `${auditContext?.actor?.fullName ?? 'User'} edited automation script "${script.fileName}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      before: before ? this.sanitizeAutomationScriptForAudit(before) : null,
      after: this.sanitizeAutomationScriptForAudit(script),
      metadata: {
        codeChanged: dto.code !== undefined,
      },
    });

    return script;
  }

  // ─── Approve ────────────────────────────────────────────────────────────────

  async approve(
    scriptId: string,
    userId: string,
    userRole: Role,
    dto: ReviewAutomationScriptDto,
    auditContext?: AuditContext,
  ) {
    await this.findOne(scriptId, userId, userRole);

    const before = await this.prisma.automationScript.findUnique({
      where: { id: scriptId },
      include: {
        workItem: {
          select: { projectId: true },
        },
      },
    });

    const script = await this.prisma.automationScript.update({
      where: { id: scriptId },
      data: {
        status: AutomationScriptStatus.APPROVED,
        reviewNotes: dto.reviewNotes,
        approvedAt: new Date(),
      },
      include: {
        workItem: {
          select: { projectId: true },
        },
      },
    });

    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.AUTOMATION_SCRIPT_APPROVED,
      entityType: AuditEntityType.AUTOMATION_SCRIPT,
      entityId: script.id,
      projectId: script.workItem.projectId,
      message: `${auditContext?.actor?.fullName ?? 'User'} approved automation script "${script.fileName}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      before: before ? this.sanitizeAutomationScriptForAudit(before) : null,
      after: this.sanitizeAutomationScriptForAudit(script),
    });

    return script;
  }

  // ─── Decline ────────────────────────────────────────────────────────────────

  async decline(
    scriptId: string,
    userId: string,
    userRole: Role,
    dto: ReviewAutomationScriptDto,
    auditContext?: AuditContext,
  ) {
    await this.findOne(scriptId, userId, userRole);

    const before = await this.prisma.automationScript.findUnique({
      where: { id: scriptId },
      include: {
        workItem: {
          select: { projectId: true },
        },
      },
    });

    const script = await this.prisma.automationScript.update({
      where: { id: scriptId },
      data: {
        status: AutomationScriptStatus.DECLINED,
        reviewNotes: dto.reviewNotes,
        declinedAt: new Date(),
      },
      include: {
        workItem: {
          select: { projectId: true },
        },
      },
    });

    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.AUTOMATION_SCRIPT_DECLINED,
      entityType: AuditEntityType.AUTOMATION_SCRIPT,
      entityId: script.id,
      projectId: script.workItem.projectId,
      message: `${auditContext?.actor?.fullName ?? 'User'} declined automation script "${script.fileName}"`,
      severity: AuditSeverity.WARNING,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      before: before ? this.sanitizeAutomationScriptForAudit(before) : null,
      after: this.sanitizeAutomationScriptForAudit(script),
    });

    return script;
  }

  // ─── Remove ─────────────────────────────────────────────────────────────────

  async remove(
    scriptId: string,
    userId: string,
    userRole: Role,
    auditContext?: AuditContext,
  ) {
    await this.findOne(scriptId, userId, userRole);

    const before = await this.prisma.automationScript.findUnique({
      where: { id: scriptId },
      include: {
        workItem: {
          select: { projectId: true },
        },
      },
    });

    const script = await this.prisma.automationScript.update({
      where: { id: scriptId },
      data: {
        status: AutomationScriptStatus.REMOVED,
        removedAt: new Date(),
      },
      include: {
        workItem: {
          select: { projectId: true },
        },
      },
    });

    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.AUTOMATION_SCRIPT_REMOVED,
      entityType: AuditEntityType.AUTOMATION_SCRIPT,
      entityId: script.id,
      projectId: script.workItem.projectId,
      message: `${auditContext?.actor?.fullName ?? 'User'} removed automation script "${script.fileName}"`,
      severity: AuditSeverity.WARNING,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      before: before ? this.sanitizeAutomationScriptForAudit(before) : null,
      after: this.sanitizeAutomationScriptForAudit(script),
    });

    return script;
  }

  // ─── Download ───────────────────────────────────────────────────────────────

  async download(
    scriptId: string,
    userId: string,
    userRole: Role,
    auditContext?: AuditContext,
  ) {
    const script = await this.prisma.automationScript.findUnique({
      where: { id: scriptId },
      include: {
        workItem: {
          select: { projectId: true },
        },
        testCase: {
          select: { id: true, title: true },
        },
        generation: true,
      },
    });

    if (!script || script.status === AutomationScriptStatus.REMOVED) {
      throw new NotFoundException('Automation script not found');
    }

    await this.ensureProjectAccess(script.workItem.projectId, userId, userRole);

    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.AUTOMATION_SCRIPT_DOWNLOADED,
      entityType: AuditEntityType.AUTOMATION_SCRIPT,
      entityId: script.id,
      projectId: script.workItem.projectId,
      message: `${auditContext?.actor?.fullName ?? 'User'} downloaded automation script "${script.fileName}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: {
        fileName: script.fileName,
        framework: script.framework,
        language: script.language,
      },
    });

    return script.code;
  }

  // ─── Sync generation job ────────────────────────────────────────────────────

  async syncGenerationJob(
    generationId: string,
    userId: string,
    userRole: Role,
    auditContext?: AuditContext,
  ) {
    const generation = await this.prisma.automationScriptGeneration.findUnique({
      where: { id: generationId },
      include: {
        workItem: {
          select: {
            id: true,
            projectId: true,
          },
        },
        scripts: true,
      },
    });

    if (!generation) {
      throw new NotFoundException('Automation script generation not found');
    }

    await this.ensureProjectAccess(
      generation.workItem.projectId,
      userId,
      userRole,
    );

    if (
      generation.status === AutomationScriptGenerationStatus.COMPLETED ||
      generation.status === AutomationScriptGenerationStatus.FAILED
    ) {
      return generation;
    }

    if (this.isGenerationTimedOut(generation)) {
      const updated = await this.prisma.automationScriptGeneration.update({
        where: { id: generation.id },
        data: {
          status: AutomationScriptGenerationStatus.FAILED,
          completedAt: new Date(),
          errorMessage:
            'Automation script generation timed out after 5 minutes',
          aiTrace: this.toPrismaJson({
            ...this.asPlainObject(generation.aiTrace),
            timedOutAt: new Date().toISOString(),
          }),
        },
        include: {
          workItem: { select: { id: true, projectId: true, title: true } },
          testCase: { select: { id: true, title: true } },
          scripts: true,
        },
      });

      // Step 8.5 — Log FAILED on timeout (status changed from PROCESSING)
      await this.auditLogsService.create({
        actor: auditContext?.actor,
        action: AuditAction.AUTOMATION_SCRIPT_GENERATION_FAILED,
        entityType: AuditEntityType.AUTOMATION_SCRIPT_GENERATION,
        entityId: updated.id,
        projectId: updated.workItem.projectId,
        message: `Automation script generation failed for test case "${updated.testCase.title}"`,
        severity: AuditSeverity.WARNING,
        success: false,
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent,
        after: this.sanitizeScriptGenerationForAudit(updated),
        metadata: { errorMessage: updated.errorMessage },
      });

      return updated;
    }

    const jobId = this.getAiJobIdFromGeneration(generation);

    if (!jobId) {
      return generation;
    }

    const jobStatus =
      await this.aiScriptGenerationClient.getGenerationJobStatus(jobId);

    if (!jobStatus.ready) {
      return this.prisma.automationScriptGeneration.update({
        where: { id: generation.id },
        data: {
          aiTrace: this.toPrismaJson({
            ...this.asPlainObject(generation.aiTrace),
            jobStatus: jobStatus.status,
            lastSyncedAt: new Date().toISOString(),
          }),
        },
        include: {
          scripts: true,
        },
      });
    }

    if (jobStatus.successful && jobStatus.result) {
      return this.persistAiScriptGenerationResult(
        generation.id,
        userId,
        jobStatus.result,
        auditContext,
      );
    }

    // Job finished but failed
    const failedGeneration =
      await this.prisma.automationScriptGeneration.update({
        where: { id: generation.id },
        data: {
          status: AutomationScriptGenerationStatus.FAILED,
          completedAt: new Date(),
          errorMessage:
            jobStatus.error || 'AI automation script generation job failed',
          aiTrace: this.toPrismaJson({
            ...this.asPlainObject(generation.aiTrace),
            jobStatus: jobStatus.status,
            lastSyncedAt: new Date().toISOString(),
          }),
        },
        include: {
          workItem: { select: { id: true, projectId: true, title: true } },
          testCase: { select: { id: true, title: true } },
          scripts: true,
        },
      });

    // Step 8.5 — Log FAILED (status changed from PROCESSING)
    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.AUTOMATION_SCRIPT_GENERATION_FAILED,
      entityType: AuditEntityType.AUTOMATION_SCRIPT_GENERATION,
      entityId: failedGeneration.id,
      projectId: failedGeneration.workItem.projectId,
      message: `Automation script generation failed for test case "${failedGeneration.testCase.title}"`,
      severity: AuditSeverity.WARNING,
      success: false,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      after: this.sanitizeScriptGenerationForAudit(failedGeneration),
      metadata: { errorMessage: failedGeneration.errorMessage },
    });

    return failedGeneration;
  }

  // ─── Latest generation by test case ────────────────────────────────────────

  async findLatestGenerationByTestCase(
    testCaseId: string,
    userId: string,
    userRole: Role,
    auditContext?: AuditContext,
  ) {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id: testCaseId },
      include: {
        workItem: {
          select: {
            projectId: true,
          },
        },
      },
    });

    if (!testCase) {
      throw new NotFoundException('Test case not found');
    }

    await this.ensureProjectAccess(
      testCase.workItem.projectId,
      userId,
      userRole,
    );

    const latest = await this.prisma.automationScriptGeneration.findFirst({
      where: { testCaseId },
      orderBy: { createdAt: 'desc' },
      include: {
        scripts: true,
      },
    });

    if (!latest) {
      return null;
    }

    if (latest.status === AutomationScriptGenerationStatus.PROCESSING) {
      return this.syncGenerationJob(latest.id, userId, userRole, auditContext);
    }

    return latest;
  }

  // ─── Persist AI result ──────────────────────────────────────────────────────

  private async persistAiScriptGenerationResult(
    generationId: string,
    userId: string,
    aiResponse: any,
    auditContext?: AuditContext,
  ) {
    if (!aiResponse?.script?.code) {
      await this.prisma.automationScriptGeneration.update({
        where: { id: generationId },
        data: {
          status: AutomationScriptGenerationStatus.FAILED,
          completedAt: new Date(),
          errorMessage: 'AI service returned no automation script',
          provider: aiResponse?.provider,
          model: aiResponse?.model,
          promptVersion: aiResponse?.promptVersion,
          generationMethod: aiResponse?.generationMethod,
          warnings: this.toPrismaJson(aiResponse?.warnings ?? []),
          confidence: aiResponse?.confidence,
          aiTrace: this.toPrismaJson({
            requestId: aiResponse?.requestId,
            provider: aiResponse?.provider,
            model: aiResponse?.model,
            promptVersion: aiResponse?.promptVersion,
            generationMethod: aiResponse?.generationMethod,
            warnings: aiResponse?.warnings ?? [],
          }),
        },
      });

      throw new BadRequestException('AI service returned no automation script');
    }

    const generation = await this.prisma.automationScriptGeneration.findUnique({
      where: { id: generationId },
      include: {
        scripts: true,
      },
    });

    if (!generation) {
      throw new NotFoundException('Automation script generation not found');
    }

    if (generation.scripts.length > 0) {
      return this.prisma.automationScriptGeneration.findUnique({
        where: { id: generationId },
        include: {
          scripts: true,
        },
      });
    }

    await this.prisma.automationScript.create({
      data: {
        generationId,
        testCaseId: generation.testCaseId,
        workItemId: generation.workItemId,
        generatedById: userId,

        status: AutomationScriptStatus.GENERATED,
        framework: generation.framework,

        fileName: aiResponse.script.fileName,
        language: aiResponse.script.language,
        code: aiResponse.script.code,
        explanation: aiResponse.script.explanation ?? null,

        dependencies: this.toPrismaJson(aiResponse.script.dependencies ?? []),
        setupNotes: this.toPrismaJson(aiResponse.script.setupNotes ?? []),
        selectorsUsed: this.toPrismaJson(aiResponse.script.selectorsUsed ?? []),
        warnings: this.toPrismaJson(aiResponse.script.warnings ?? []),

        aiTrace: this.toPrismaJson({
          requestId: aiResponse.requestId,
          provider: aiResponse.provider,
          model: aiResponse.model,
          promptVersion: aiResponse.promptVersion,
          generationMethod: aiResponse.generationMethod,
          confidence: aiResponse.confidence,
        }),
      },
    });

    const completed = await this.prisma.automationScriptGeneration.update({
      where: { id: generationId },
      data: {
        status: AutomationScriptGenerationStatus.COMPLETED,
        completedAt: new Date(),

        pageInspection: this.toPrismaJson(aiResponse.pageInspection ?? null),
        warnings: this.toPrismaJson(aiResponse.warnings ?? []),

        provider: aiResponse.provider,
        model: aiResponse.model,
        promptVersion: aiResponse.promptVersion,
        generationMethod: aiResponse.generationMethod,
        confidence: aiResponse.confidence,

        aiTrace: this.toPrismaJson({
          requestId: aiResponse.requestId,
          provider: aiResponse.provider,
          model: aiResponse.model,
          promptVersion: aiResponse.promptVersion,
          generationMethod: aiResponse.generationMethod,
          confidence: aiResponse.confidence,
          warnings: aiResponse.warnings ?? [],
        }),
      },
      include: {
        workItem: { select: { id: true, projectId: true, title: true } },
        testCase: { select: { id: true, title: true } },
        scripts: true,
      },
    });

    // Step 8.5 — Log COMPLETED (status changed from PROCESSING)
    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.AUTOMATION_SCRIPT_GENERATION_COMPLETED,
      entityType: AuditEntityType.AUTOMATION_SCRIPT_GENERATION,
      entityId: completed.id,
      projectId: completed.workItem.projectId,
      message: `Automation script generation completed for test case "${completed.testCase.title}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      after: this.sanitizeScriptGenerationForAudit(completed),
      metadata: {
        generatedScriptsCount: completed.scripts?.length ?? 0,
      },
    });

    return completed;
  }

  // ─── Retry generation ───────────────────────────────────────────────────────

  async retryGeneration(
    generationId: string,
    userId: string,
    userRole: Role,
    auditContext?: AuditContext,
  ) {
    const generation = await this.prisma.automationScriptGeneration.findUnique({
      where: { id: generationId },
      include: {
        testCase: true,
        workItem: true,
        scripts: true,
      },
    });

    if (!generation) {
      throw new NotFoundException('Automation script generation not found');
    }

    await this.ensureProjectAccess(
      generation.workItem.projectId,
      userId,
      userRole,
    );

    if (generation.status === AutomationScriptGenerationStatus.PROCESSING) {
      throw new BadRequestException(
        'This automation script generation is still processing and cannot be retried yet',
      );
    }

    if (generation.testCase.status !== TestCaseStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved test cases can be used to generate automation scripts',
      );
    }

    const context =
      generation.context &&
      typeof generation.context === 'object' &&
      !Array.isArray(generation.context)
        ? (generation.context as Record<string, any>)
        : {
            framework: generation.framework,
            targetUrl: generation.targetUrl,
            browser: generation.browser ?? null,
            environment: generation.environment ?? null,
            selectorsStrategy: 'AUTO',
            auth: {
              required: false,
              role: null,
              instructions: null,
            },
            extraInstructions: null,
            variables: {},
          };

    const retryGeneration = await this.prisma.automationScriptGeneration.create(
      {
        data: {
          testCaseId: generation.testCaseId,
          workItemId: generation.workItemId,
          requestedById: userId,

          status: AutomationScriptGenerationStatus.PROCESSING,

          framework: generation.framework,
          browser: generation.browser,
          targetUrl: generation.targetUrl,
          environment: generation.environment,

          context: this.toPrismaJson(context),
          startedAt: new Date(),

          aiTrace: this.toPrismaJson({
            retryOf: generation.id,
            mode: 'celery_async_script_generation_retry',
          }),
        },
      },
    );

    // Log retry started
    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.AUTOMATION_SCRIPT_GENERATION_STARTED,
      entityType: AuditEntityType.AUTOMATION_SCRIPT_GENERATION,
      entityId: retryGeneration.id,
      projectId: generation.workItem.projectId,
      message: `${auditContext?.actor?.fullName ?? 'User'} retried automation script generation for test case "${generation.testCase.title}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      after: this.sanitizeScriptGenerationForAudit(retryGeneration),
      metadata: {
        retryOf: generation.id,
        testCaseId: generation.testCaseId,
        workItemId: generation.workItemId,
        framework: generation.framework,
      },
    });

    const requestId = randomUUID();

    let job: { jobId: string; status: string };

    try {
      job = await this.aiScriptGenerationClient.createGenerationJob({
        requestId,
        tenantId: generation.workItem.projectId,
        userId,

        testCaseId: generation.testCase.id,
        workItemId: generation.workItemId,

        testCase: {
          id: generation.testCase.id,
          title: generation.testCase.title,
          objective: generation.testCase.objective,
          type: generation.testCase.type,
          priority: generation.testCase.priority,
          preconditions: generation.testCase.preconditions,
          steps: generation.testCase.steps,
          expectedResult: generation.testCase.expectedResult,
          testData: generation.testCase.testData,
          coverage: generation.testCase.coverage,
        },

        workItem: {
          id: generation.workItem.id,
          type: generation.workItem.type,
          source: generation.workItem.source,
          title: generation.workItem.title,
          description: generation.workItem.description,
          acceptanceCriteria: generation.workItem.acceptanceCriteria,
          businessRules: generation.workItem.businessRules,
          priority: generation.workItem.priority,
          normalizedContent: generation.workItem.normalizedContent,
        },

        generationContext: {
          framework: generation.framework,
          targetUrl: generation.targetUrl,
          browser: generation.browser ?? null,
          environment: generation.environment ?? null,
          selectorsStrategy: context.selectorsStrategy ?? 'AUTO',
          auth: context.auth ?? {
            required: false,
            role: null,
            instructions: null,
          },
          extraInstructions: context.extraInstructions ?? null,
          variables: context.variables ?? {},
        },
      });
    } catch (error) {
      await this.prisma.automationScriptGeneration.update({
        where: { id: retryGeneration.id },
        data: {
          status: AutomationScriptGenerationStatus.FAILED,
          completedAt: new Date(),
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Unknown automation script retry error',
        },
      });

      throw error;
    }

    return this.prisma.automationScriptGeneration.update({
      where: { id: retryGeneration.id },
      data: {
        status: AutomationScriptGenerationStatus.PROCESSING,
        aiTrace: this.toPrismaJson({
          retryOf: generation.id,
          requestId,
          jobId: job.jobId,
          jobStatus: job.status,
          mode: 'celery_async_script_generation_retry',
        }),
      },
      include: {
        scripts: true,
      },
    });
  }

  // ─── Mark generation failed ─────────────────────────────────────────────────

  async markGenerationFailed(
    generationId: string,
    userId: string,
    userRole: Role,
    auditContext?: AuditContext,
  ) {
    const generation = await this.prisma.automationScriptGeneration.findUnique({
      where: { id: generationId },
      include: {
        workItem: {
          select: {
            id: true,
            projectId: true,
          },
        },
        scripts: true,
      },
    });

    if (!generation) {
      throw new NotFoundException('Automation script generation not found');
    }

    await this.ensureProjectAccess(
      generation.workItem.projectId,
      userId,
      userRole,
    );

    if (generation.status !== AutomationScriptGenerationStatus.PROCESSING) {
      return generation;
    }

    const updated = await this.prisma.automationScriptGeneration.update({
      where: { id: generation.id },
      data: {
        status: AutomationScriptGenerationStatus.FAILED,
        completedAt: new Date(),
        errorMessage:
          'Automation script generation was manually marked as failed after timeout',
        aiTrace: this.toPrismaJson({
          ...this.asPlainObject(generation.aiTrace),
          manuallyMarkedFailedAt: new Date().toISOString(),
        }),
      },
      include: {
        workItem: { select: { id: true, projectId: true, title: true } },
        testCase: { select: { id: true, title: true } },
        scripts: true,
      },
    });

    // Step 8.5 — Log FAILED (status changed from PROCESSING)
    await this.auditLogsService.create({
      actor: auditContext?.actor,
      action: AuditAction.AUTOMATION_SCRIPT_GENERATION_FAILED,
      entityType: AuditEntityType.AUTOMATION_SCRIPT_GENERATION,
      entityId: updated.id,
      projectId: updated.workItem.projectId,
      message: `Automation script generation failed for test case "${updated.testCase.title}"`,
      severity: AuditSeverity.WARNING,
      success: false,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      after: this.sanitizeScriptGenerationForAudit(updated),
      metadata: { errorMessage: updated.errorMessage },
    });

    return updated;
  }

  // ─── Execution stats ────────────────────────────────────────────────────────

  async getExecutionStats(scriptId: string, user: any) {
    const script = await this.prisma.automationScript.findUnique({
      where: { id: scriptId },
      include: {
        testCase: {
          include: {
            workItem: {
              include: {
                project: {
                  include: {
                    members: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!script) {
      throw new NotFoundException('Automation script not found');
    }

    const project = script.testCase.workItem.project;

    if (user.role !== 'ADMIN') {
      const isMember = project.members.some(
        (member) => member.userId === user.id,
      );

      if (!isMember) {
        throw new ForbiddenException('You do not have access to this script');
      }
    }

    const executions = await this.prisma.automationScriptExecution.findMany({
      where: {
        scriptId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = executions.length;

    const passed = executions.filter((item) => item.status === 'PASSED').length;
    const failed = executions.filter((item) => item.status === 'FAILED').length;
    const timedOut = executions.filter(
      (item) => item.status === 'TIMED_OUT',
    ).length;
    const canceled = executions.filter(
      (item) => item.status === 'CANCELED',
    ).length;
    const running = executions.filter(
      (item) => item.status === 'RUNNING',
    ).length;
    const queued = executions.filter((item) => item.status === 'QUEUED').length;

    const completedExecutions = executions.filter(
      (item) => item.startedAt && item.completedAt,
    );

    const durations = completedExecutions.map((item) => {
      return item.completedAt!.getTime() - item.startedAt!.getTime();
    });

    const averageDurationMs =
      durations.length > 0
        ? Math.round(
            durations.reduce((sum, duration) => sum + duration, 0) /
              durations.length,
          )
        : 0;

    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    const latestExecution = executions[0] ?? null;

    const latestFailedExecution =
      executions.find(
        (item) => item.status === 'FAILED' || item.status === 'TIMED_OUT',
      ) ?? null;

    const browserCounts = executions.reduce<Record<string, number>>(
      (acc, item) => {
        const key = item.browser || 'DEFAULT';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {},
    );

    const mostUsedBrowser =
      Object.entries(browserCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      total,
      passed,
      failed,
      timedOut,
      canceled,
      running,
      queued,
      passRate,
      averageDurationMs,
      mostUsedBrowser,
      latestExecution: latestExecution
        ? {
            id: latestExecution.id,
            status: latestExecution.status,
            createdAt: latestExecution.createdAt,
            completedAt: latestExecution.completedAt,
          }
        : null,
      latestFailedExecution: latestFailedExecution
        ? {
            id: latestFailedExecution.id,
            status: latestFailedExecution.status,
            errorMessage: latestFailedExecution.errorMessage,
            createdAt: latestFailedExecution.createdAt,
            completedAt: latestFailedExecution.completedAt,
          }
        : null,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private getAiJobIdFromGeneration(generation: any): string | null {
    const aiTrace = generation.aiTrace;

    if (!aiTrace || typeof aiTrace !== 'object' || Array.isArray(aiTrace)) {
      return null;
    }

    const jobId = (aiTrace as Record<string, any>).jobId;

    return typeof jobId === 'string' && jobId.trim() ? jobId : null;
  }

  private asPlainObject(value: unknown): Record<string, any> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, any>;
    }

    return {};
  }

  private isGenerationTimedOut(generation: {
    startedAt: Date | null;
    createdAt: Date;
  }): boolean {
    const startedAt = generation.startedAt ?? generation.createdAt;
    const timeoutMs = 5 * 60 * 1000;

    return Date.now() - startedAt.getTime() > timeoutMs;
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
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }
}
