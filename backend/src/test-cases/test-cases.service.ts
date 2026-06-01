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
  Prisma,
  ProjectMemberRole,
  Role,
  TestCaseGenerationStatus,
  TestCaseStatus,
  WorkItemSource,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GenerateTestCasesDto } from './dto/generate-test-cases.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { ReviewTestCaseDto } from './dto/review-test-case.dto';
import { AiTestGenerationClient } from './ai-test-generation.client';
import { AiRagClient } from '../ai/ai-rag.client';

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
export class TestCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiTestGenerationClient: AiTestGenerationClient,
    private readonly aiRagClient: AiRagClient,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ─── Audit sanitizers ────────────────────────────────────────────────────────

  private sanitizeGenerationForAudit(generation: any) {
    return {
      id: generation.id,
      workItemId: generation.workItemId,
      requestedById: generation.requestedById,
      status: generation.status,
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

  private sanitizeTestCaseForAudit(testCase: any) {
    return {
      id: testCase.id,
      workItemId: testCase.workItemId,
      generationId: testCase.generationId,
      generatedById: testCase.generatedById,
      title: testCase.title,
      objective: testCase.objective,
      type: testCase.type,
      priority: testCase.priority,
      status: testCase.status,
      preconditions: testCase.preconditions,
      steps: testCase.steps,
      expectedResult: testCase.expectedResult,
      testData: testCase.testData,
      tags: testCase.tags,
      coverage: testCase.coverage,
      reviewNotes: testCase.reviewNotes,
      approvedAt: testCase.approvedAt,
      declinedAt: testCase.declinedAt,
      editedAt: testCase.editedAt,
      createdAt: testCase.createdAt,
      updatedAt: testCase.updatedAt,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────

  async generateForWorkItem(
    workItemId: string,
    userId: string,
    userRole: Role,
    dto: GenerateTestCasesDto,
    context?: AuditContext,
  ) {
    const workItem = await this.getAccessibleWorkItem(
      workItemId,
      userId,
      userRole,
    );

    const normalizedContent = workItem.normalizedContent;

    if (!normalizedContent) {
      throw new BadRequestException(
        'This work item does not contain normalized content',
      );
    }

    const options = {
      maxTestCases: dto.maxTestCases ?? 10,
      includePositiveTests: dto.includePositiveTests ?? true,
      includeNegativeTests: dto.includeNegativeTests ?? true,
      includeEdgeCases: dto.includeEdgeCases ?? true,
      includeSecurityTests: dto.includeSecurityTests ?? false,
      useRag: dto.useRag ?? false,
      language: dto.language ?? null,
    };

    /**
     * Change this when you make a meaningful prompt / AI pipeline update.
     * It is part of inputHash, so it prevents accidentally reusing old generations.
     */
    const promptVersion = 'test_case_generation_v1_async_celery';

    const inputHash = this.createInputHash({
      workItemId,
      normalizedContent,
      options,
      promptVersion,
    });

    const existingGeneration = await this.prisma.testCaseGeneration.findUnique({
      where: {
        workItemId_inputHash: {
          workItemId,
          inputHash,
        },
      },
      include: {
        testCases: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (existingGeneration) {
      /**
       * If the reused generation is still processing, try syncing it now.
       */
      const generation =
        existingGeneration.status === TestCaseGenerationStatus.PROCESSING
          ? await this.syncGenerationJob(
              existingGeneration.id,
              userId,
              userRole,
            )
          : existingGeneration;

      return {
        generation,
        testCases: generation?.testCases ?? [],
        reused: true,
        warnings: generation?.warnings ?? [],
      };
    }

    const generation = await this.prisma.testCaseGeneration.create({
      data: {
        workItemId,
        requestedById: userId,
        status: TestCaseGenerationStatus.PROCESSING,
        promptVersion,
        inputHash,
        options: this.toPrismaJson(options),
        startedAt: new Date(),
      },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.TEST_CASE_GENERATION_STARTED,
      entityType: AuditEntityType.TEST_CASE_GENERATION,
      entityId: generation.id,
      projectId: workItem.projectId,
      message: `${context?.actor?.fullName ?? 'User'} started AI test case generation for work item "${workItem.title}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      after: this.sanitizeGenerationForAudit(generation),
      metadata: {
        workItemId,
        options: dto,
      },
    });

    const requestId = randomUUID();

    let job: { jobId: string; status: string };

    try {
      job = await this.aiTestGenerationClient.createGenerationJob({
        requestId,
        tenantId: workItem.projectId,
        userId,
        workItemId,
        source: this.mapWorkItemSource(workItem.source),
        normalizedContent: normalizedContent as Record<string, any>,
        generationOptions: options,
      });
    } catch (error) {
      await this.prisma.testCaseGeneration.update({
        where: { id: generation.id },
        data: {
          status: TestCaseGenerationStatus.FAILED,
          completedAt: new Date(),
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Unknown AI generation job error',
        },
      });

      throw error;
    }

    const queuedGeneration = await this.prisma.testCaseGeneration.update({
      where: { id: generation.id },
      data: {
        status: TestCaseGenerationStatus.PROCESSING,
        aiTrace: this.toPrismaJson({
          requestId,
          jobId: job.jobId,
          jobStatus: job.status,
          mode: 'celery_async',
        }),
      },
      include: {
        testCases: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return {
      generation: queuedGeneration,
      testCases: [],
      reused: false,
      warnings: [],
    };
  }

  async findByWorkItem(workItemId: string, userId: string, userRole: Role) {
    await this.getAccessibleWorkItem(workItemId, userId, userRole);

    return this.prisma.testCase.findMany({
      where: { workItemId },
      orderBy: { createdAt: 'desc' },
      include: {
        generation: {
          select: {
            id: true,
            provider: true,
            model: true,
            promptVersion: true,
            generationMethod: true,
            confidence: true,
            status: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });
  }

  async findGenerationsByWorkItem(
    workItemId: string,
    userId: string,
    userRole: Role,
  ) {
    await this.getAccessibleWorkItem(workItemId, userId, userRole);

    const generations = await this.prisma.testCaseGeneration.findMany({
      where: { workItemId },
      orderBy: { createdAt: 'desc' },
      include: {
        testCases: {
          select: {
            id: true,
            title: true,
            type: true,
            priority: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'asc',
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

    /**
     * Light auto-sync for processing generations when history is opened.
     * No audit context passed — these are internal background syncs.
     */
    await Promise.allSettled(
      generations
        .filter((g) => g.status === TestCaseGenerationStatus.PROCESSING)
        .slice(0, 3)
        .map((g) => this.syncGenerationJob(g.id, userId, userRole)),
    );

    return this.prisma.testCaseGeneration.findMany({
      where: { workItemId },
      orderBy: { createdAt: 'desc' },
      include: {
        testCases: {
          select: {
            id: true,
            title: true,
            type: true,
            priority: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'asc',
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
  }

  async findLatestGenerationByWorkItem(
    workItemId: string,
    userId: string,
    userRole: Role,
  ) {
    await this.getAccessibleWorkItem(workItemId, userId, userRole);

    const latest = await this.prisma.testCaseGeneration.findFirst({
      where: { workItemId },
      orderBy: { createdAt: 'desc' },
      include: {
        testCases: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!latest) {
      return null;
    }

    if (latest.status === TestCaseGenerationStatus.PROCESSING) {
      // Internal auto-sync — no user-facing context
      return this.syncGenerationJob(latest.id, userId, userRole);
    }

    return latest;
  }

  async findGenerationOne(
    generationId: string,
    userId: string,
    userRole: Role,
  ) {
    const generation = await this.prisma.testCaseGeneration.findUnique({
      where: { id: generationId },
      include: {
        workItem: {
          select: {
            id: true,
            title: true,
            projectId: true,
            source: true,
            type: true,
            priority: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        testCases: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!generation) {
      throw new NotFoundException('Test case generation not found');
    }

    await this.ensureProjectAccess(
      generation.workItem.projectId,
      userId,
      userRole,
    );

    if (generation.status === TestCaseGenerationStatus.PROCESSING) {
      // Internal auto-sync — no user-facing context
      return this.syncGenerationJob(generation.id, userId, userRole);
    }

    return generation;
  }

  async syncGenerationJob(
    generationId: string,
    userId: string,
    userRole: Role,
    context?: AuditContext,
  ) {
    const generation = await this.prisma.testCaseGeneration.findUnique({
      where: { id: generationId },
      include: {
        workItem: {
          select: {
            id: true,
            projectId: true,
            title: true,
          },
        },
        testCases: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!generation) {
      throw new NotFoundException('Test case generation not found');
    }

    await this.ensureProjectAccess(
      generation.workItem.projectId,
      userId,
      userRole,
    );

    if (
      generation.status === TestCaseGenerationStatus.COMPLETED ||
      generation.status === TestCaseGenerationStatus.FAILED
    ) {
      return generation;
    }

    // ─── auto-timeout after 5 minutes ────────────────────────────────────────
    if (this.isGenerationTimedOut(generation)) {
      const timedOut = await this.prisma.testCaseGeneration.update({
        where: { id: generation.id },
        data: {
          status: TestCaseGenerationStatus.FAILED,
          completedAt: new Date(),
          errorMessage: 'AI generation timed out after 5 minutes',
          aiTrace: this.toPrismaJson({
            ...this.asPlainObject(generation.aiTrace),
            timedOutAt: new Date().toISOString(),
          }),
        },
        include: {
          testCases: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      await this.auditLogsService.create({
        actor: context?.actor,
        action: AuditAction.TEST_CASE_GENERATION_FAILED,
        entityType: AuditEntityType.TEST_CASE_GENERATION,
        entityId: timedOut.id,
        projectId: generation.workItem.projectId,
        message: `AI test case generation timed out for work item "${generation.workItem.title}"`,
        severity: AuditSeverity.WARNING,
        success: false,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        after: this.sanitizeGenerationForAudit(timedOut),
        metadata: {
          errorMessage: timedOut.errorMessage,
          reason: 'TIMEOUT',
        },
      });

      return timedOut;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const jobId = this.getAiJobIdFromGeneration(generation);

    if (!jobId) {
      return generation;
    }

    const jobStatus =
      await this.aiTestGenerationClient.getGenerationJobStatus(jobId);

    if (!jobStatus.ready) {
      return this.prisma.testCaseGeneration.update({
        where: { id: generation.id },
        data: {
          aiTrace: this.toPrismaJson({
            ...this.asPlainObject(generation.aiTrace),
            jobStatus: jobStatus.status,
            lastSyncedAt: new Date().toISOString(),
          }),
        },
        include: {
          testCases: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
    }

    if (jobStatus.successful && jobStatus.result) {
      return this.persistAiGenerationResult(
        generation.id,
        generation.workItem.id,
        userId,
        jobStatus.result,
        generation.workItem.projectId,
        generation.workItem.title,
        context,
      );
    }

    // Job finished but failed
    const failedGeneration = await this.prisma.testCaseGeneration.update({
      where: { id: generation.id },
      data: {
        status: TestCaseGenerationStatus.FAILED,
        completedAt: new Date(),
        errorMessage: jobStatus.error || 'AI generation job failed',
        aiTrace: this.toPrismaJson({
          ...this.asPlainObject(generation.aiTrace),
          jobStatus: jobStatus.status,
          lastSyncedAt: new Date().toISOString(),
        }),
      },
      include: {
        testCases: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.TEST_CASE_GENERATION_FAILED,
      entityType: AuditEntityType.TEST_CASE_GENERATION,
      entityId: failedGeneration.id,
      projectId: generation.workItem.projectId,
      message: `AI test case generation failed for work item "${generation.workItem.title}"`,
      severity: AuditSeverity.WARNING,
      success: false,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      after: this.sanitizeGenerationForAudit(failedGeneration),
      metadata: {
        errorMessage: failedGeneration.errorMessage,
      },
    });

    return failedGeneration;
  }

  async findOne(id: string, userId: string, userRole: Role) {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id },
      include: {
        workItem: {
          select: {
            id: true,
            projectId: true,
            title: true,
          },
        },
        generation: true,
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

    return testCase;
  }

  async update(
    id: string,
    userId: string,
    userRole: Role,
    dto: UpdateTestCaseDto,
    context?: AuditContext,
  ) {
    const existing = await this.findOne(id, userId, userRole);

    if (existing.status === TestCaseStatus.DECLINED) {
      throw new BadRequestException('Declined test cases cannot be edited');
    }

    const updated = await this.prisma.testCase.update({
      where: { id },
      data: {
        title: dto.title,
        objective: dto.objective,
        type: dto.type,
        priority: dto.priority,
        preconditions: this.toPrismaJson(dto.preconditions),
        steps: dto.steps,
        expectedResult: dto.expectedResult,
        testData: this.toPrismaJson(dto.testData),
        tags: this.toPrismaJson(dto.tags),
        coverage: this.toPrismaJson(dto.coverage),
        reviewNotes: dto.reviewNotes,
        status:
          existing.status === TestCaseStatus.APPROVED
            ? TestCaseStatus.APPROVED
            : TestCaseStatus.EDITED,
        editedAt: new Date(),
      },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.TEST_CASE_EDITED,
      entityType: AuditEntityType.TEST_CASE,
      entityId: updated.id,
      projectId: existing.workItem.projectId,
      message: `${context?.actor?.fullName ?? 'User'} edited test case "${updated.title}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      before: this.sanitizeTestCaseForAudit(existing),
      after: this.sanitizeTestCaseForAudit(updated),
    });

    return updated;
  }

  async approve(
    id: string,
    userId: string,
    userRole: Role,
    dto: ReviewTestCaseDto,
    context?: AuditContext,
  ) {
    const existing = await this.findOne(id, userId, userRole);

    const testCase = await this.prisma.testCase.update({
      where: { id },
      data: {
        status: TestCaseStatus.APPROVED,
        reviewNotes: dto.reviewNotes,
        approvedAt: new Date(),
      },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.TEST_CASE_APPROVED,
      entityType: AuditEntityType.TEST_CASE,
      entityId: testCase.id,
      projectId: existing.workItem.projectId,
      message: `${context?.actor?.fullName ?? 'User'} approved test case "${testCase.title}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      before: this.sanitizeTestCaseForAudit(existing),
      after: this.sanitizeTestCaseForAudit(testCase),
    });

    return testCase;
  }

  async decline(
    id: string,
    userId: string,
    userRole: Role,
    dto: ReviewTestCaseDto,
    context?: AuditContext,
  ) {
    const existing = await this.findOne(id, userId, userRole);

    const testCase = await this.prisma.testCase.update({
      where: { id },
      data: {
        status: TestCaseStatus.DECLINED,
        reviewNotes: dto.reviewNotes,
        declinedAt: new Date(),
      },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.TEST_CASE_DECLINED,
      entityType: AuditEntityType.TEST_CASE,
      entityId: testCase.id,
      projectId: existing.workItem.projectId,
      message: `${context?.actor?.fullName ?? 'User'} declined test case "${testCase.title}"`,
      severity: AuditSeverity.WARNING,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      before: this.sanitizeTestCaseForAudit(existing),
      after: this.sanitizeTestCaseForAudit(testCase),
    });

    return testCase;
  }

  // ─── retryGeneration ─────────────────────────────────────────────────────────

  async retryGeneration(
    generationId: string,
    userId: string,
    userRole: Role,
    context?: AuditContext,
  ) {
    const generation = await this.prisma.testCaseGeneration.findUnique({
      where: { id: generationId },
      include: {
        workItem: true,
        testCases: true,
      },
    });

    if (!generation) {
      throw new NotFoundException('Test case generation not found');
    }

    await this.ensureProjectAccess(
      generation.workItem.projectId,
      userId,
      userRole,
    );

    if (generation.status === TestCaseGenerationStatus.PROCESSING) {
      throw new BadRequestException(
        'This generation is still processing and cannot be retried yet',
      );
    }

    const normalizedContent = generation.workItem.normalizedContent;

    if (!normalizedContent) {
      throw new BadRequestException(
        'This work item does not contain normalized content',
      );
    }

    const options =
      generation.options && typeof generation.options === 'object'
        ? (generation.options as Record<string, any>)
        : {
            maxTestCases: 10,
            includePositiveTests: true,
            includeNegativeTests: true,
            includeEdgeCases: true,
            includeSecurityTests: false,
            useRag: false,
            language: null,
          };

    const retryPromptVersion = `${generation.promptVersion || 'test_case_generation_v1'}_retry_${Date.now()}`;

    const inputHash = this.createInputHash({
      workItemId: generation.workItemId,
      normalizedContent,
      options,
      promptVersion: retryPromptVersion,
      retryOf: generation.id,
    });

    const retryGeneration = await this.prisma.testCaseGeneration.create({
      data: {
        workItemId: generation.workItemId,
        requestedById: userId,
        status: TestCaseGenerationStatus.PROCESSING,
        promptVersion: retryPromptVersion,
        inputHash,
        options: this.toPrismaJson(options),
        startedAt: new Date(),
        aiTrace: this.toPrismaJson({
          retryOf: generation.id,
          mode: 'celery_async_retry',
        }),
      },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.TEST_CASE_GENERATION_STARTED,
      entityType: AuditEntityType.TEST_CASE_GENERATION,
      entityId: retryGeneration.id,
      projectId: generation.workItem.projectId,
      message: `${context?.actor?.fullName ?? 'User'} retried AI test case generation for work item "${generation.workItem.title}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      after: this.sanitizeGenerationForAudit(retryGeneration),
      metadata: {
        retryOf: generation.id,
        workItemId: generation.workItemId,
      },
    });

    const requestId = randomUUID();

    let job: { jobId: string; status: string };

    try {
      job = await this.aiTestGenerationClient.createGenerationJob({
        requestId,
        tenantId: generation.workItem.projectId,
        userId,
        workItemId: generation.workItemId,
        source: this.mapWorkItemSource(generation.workItem.source),
        normalizedContent: normalizedContent as Record<string, any>,
        generationOptions: {
          maxTestCases: Number(options.maxTestCases ?? 10),
          includePositiveTests: Boolean(options.includePositiveTests ?? true),
          includeNegativeTests: Boolean(options.includeNegativeTests ?? true),
          includeEdgeCases: Boolean(options.includeEdgeCases ?? true),
          includeSecurityTests: Boolean(options.includeSecurityTests ?? false),
          useRag: Boolean(options.useRag ?? false),
          language: options.language ?? null,
        },
      });
    } catch (error) {
      await this.prisma.testCaseGeneration.update({
        where: { id: retryGeneration.id },
        data: {
          status: TestCaseGenerationStatus.FAILED,
          completedAt: new Date(),
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Unknown AI generation retry error',
        },
      });

      throw error;
    }

    return this.prisma.testCaseGeneration.update({
      where: { id: retryGeneration.id },
      data: {
        status: TestCaseGenerationStatus.PROCESSING,
        aiTrace: this.toPrismaJson({
          retryOf: generation.id,
          requestId,
          jobId: job.jobId,
          jobStatus: job.status,
          mode: 'celery_async_retry',
        }),
      },
      include: {
        testCases: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  // ─── markGenerationFailed ─────────────────────────────────────────────────────

  async markGenerationFailed(
    generationId: string,
    userId: string,
    userRole: Role,
    context?: AuditContext,
  ) {
    const generation = await this.prisma.testCaseGeneration.findUnique({
      where: { id: generationId },
      include: {
        workItem: {
          select: {
            id: true,
            projectId: true,
            title: true,
          },
        },
        testCases: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!generation) {
      throw new NotFoundException('Test case generation not found');
    }

    await this.ensureProjectAccess(
      generation.workItem.projectId,
      userId,
      userRole,
    );

    if (generation.status !== TestCaseGenerationStatus.PROCESSING) {
      return generation;
    }

    const failed = await this.prisma.testCaseGeneration.update({
      where: { id: generation.id },
      data: {
        status: TestCaseGenerationStatus.FAILED,
        completedAt: new Date(),
        errorMessage: 'Generation was manually marked as failed after timeout',
        aiTrace: this.toPrismaJson({
          ...this.asPlainObject(generation.aiTrace),
          manuallyMarkedFailedAt: new Date().toISOString(),
        }),
      },
      include: {
        testCases: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.TEST_CASE_GENERATION_FAILED,
      entityType: AuditEntityType.TEST_CASE_GENERATION,
      entityId: failed.id,
      projectId: generation.workItem.projectId,
      message: `${context?.actor?.fullName ?? 'User'} manually marked test case generation as failed`,
      severity: AuditSeverity.WARNING,
      success: false,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      after: this.sanitizeGenerationForAudit(failed),
      metadata: {
        reason: 'MANUAL_MARK_FAILED',
      },
    });

    return failed;
  }

  // ─────────────────────────────────────────────────────────────────────────────

  async indexWorkItemForRag(
    workItemId: string,
    userId: string,
    userRole: Role,
  ) {
    const workItem = await this.getAccessibleWorkItem(
      workItemId,
      userId,
      userRole,
    );

    const content = this.buildRagContentFromWorkItem(workItem);

    if (!content.trim()) {
      throw new BadRequestException(
        'Work item has no content to index for RAG',
      );
    }

    const chunkId = `work-item-${workItem.id}`;

    const result = await this.aiRagClient.indexChunk({
      id: chunkId,
      projectId: workItem.projectId,
      sourceType: 'WORK_ITEM',
      sourceId: workItem.id,
      title: workItem.title,
      content,
      metadata: {
        workItemId: workItem.id,
        projectId: workItem.projectId,
        source: workItem.source,
        type: workItem.type,
        status: workItem.status,
        priority: workItem.priority,
        externalSystem: workItem.externalSystem,
        externalRef: workItem.externalRef,
        createdAt: workItem.createdAt.toISOString(),
        updatedAt: workItem.updatedAt.toISOString(),
      },
    });

    return {
      indexed: true,
      chunkId,
      workItemId: workItem.id,
      projectId: workItem.projectId,
      result,
    };
  }

  async searchRagForWorkItem(
    workItemId: string,
    userId: string,
    userRole: Role,
  ) {
    const workItem = await this.getAccessibleWorkItem(
      workItemId,
      userId,
      userRole,
    );

    const query = [
      workItem.title,
      workItem.description,
      Array.isArray(workItem.acceptanceCriteria)
        ? workItem.acceptanceCriteria.join('\n')
        : '',
      Array.isArray(workItem.businessRules)
        ? workItem.businessRules.join('\n')
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    if (!query.trim()) {
      throw new BadRequestException('Work item has no content to search with');
    }

    return this.aiRagClient.search({
      projectId: workItem.projectId,
      query,
      topK: 5,
    });
  }

  private async persistAiGenerationResult(
    generationId: string,
    workItemId: string,
    userId: string,
    aiResponse: any,
    projectId: string,
    workItemTitle: string,
    context?: AuditContext,
  ) {
    if (!aiResponse.testCases?.length) {
      await this.prisma.testCaseGeneration.update({
        where: { id: generationId },
        data: {
          status: TestCaseGenerationStatus.FAILED,
          completedAt: new Date(),
          errorMessage: 'AI service returned no test cases',
          provider: aiResponse.provider,
          model: aiResponse.model,
          promptVersion: aiResponse.promptVersion,
          generationMethod: aiResponse.generationMethod,
          warnings: this.toPrismaJson(aiResponse.warnings ?? []),
          confidence: aiResponse.confidence,
          aiTrace: this.toPrismaJson({
            requestId: aiResponse.requestId,
            provider: aiResponse.provider,
            model: aiResponse.model,
            promptVersion: aiResponse.promptVersion,
            generationMethod: aiResponse.generationMethod,
            warnings: aiResponse.warnings ?? [],
          }),
        },
      });

      throw new BadRequestException('AI service returned no test cases');
    }

    const existingCount = await this.prisma.testCase.count({
      where: { generationId },
    });

    if (existingCount > 0) {
      return this.prisma.testCaseGeneration.findUnique({
        where: { id: generationId },
        include: {
          testCases: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
    }

    await Promise.all(
      aiResponse.testCases.map((testCase: any) =>
        this.prisma.testCase.create({
          data: {
            workItemId,
            generationId,
            generatedById: userId,

            title: testCase.title,
            objective: testCase.objective ?? null,
            type: testCase.type,
            priority: testCase.priority,
            status: TestCaseStatus.GENERATED,

            preconditions: this.toPrismaJson(testCase.preconditions ?? []),
            steps: testCase.steps,
            expectedResult: testCase.expectedResult,
            testData: this.toPrismaJson(testCase.testData ?? {}),
            tags: this.toPrismaJson(testCase.tags ?? []),
            coverage: this.toPrismaJson(
              testCase.coverage ?? {
                acceptanceCriteria: [],
                businessRules: [],
              },
            ),

            aiTrace: this.toPrismaJson({
              clientGeneratedId: testCase.clientGeneratedId,
              provider: aiResponse.provider,
              model: aiResponse.model,
              promptVersion: aiResponse.promptVersion,
              generationMethod: aiResponse.generationMethod,
              confidence: testCase.confidence,
              requestId: aiResponse.requestId,
            }),
          },
        }),
      ),
    );

    const completed = await this.prisma.testCaseGeneration.update({
      where: { id: generationId },
      data: {
        status: TestCaseGenerationStatus.COMPLETED,
        completedAt: new Date(),
        provider: aiResponse.provider,
        model: aiResponse.model,
        promptVersion: aiResponse.promptVersion,
        generationMethod: aiResponse.generationMethod,
        confidence: aiResponse.confidence,
        warnings: this.toPrismaJson(aiResponse.warnings ?? []),
        aiTrace: this.toPrismaJson({
          requestId: aiResponse.requestId,
          provider: aiResponse.provider,
          model: aiResponse.model,
          promptVersion: aiResponse.promptVersion,
          generationMethod: aiResponse.generationMethod,
          warnings: aiResponse.warnings ?? [],
        }),
      },
      include: {
        testCases: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.TEST_CASE_GENERATION_COMPLETED,
      entityType: AuditEntityType.TEST_CASE_GENERATION,
      entityId: completed.id,
      projectId,
      message: `AI test case generation completed for work item "${workItemTitle}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      after: this.sanitizeGenerationForAudit(completed),
      metadata: {
        generatedTestCasesCount: completed.testCases?.length ?? 0,
      },
    });

    return completed;
  }

  private async getAccessibleWorkItem(
    workItemId: string,
    userId: string,
    userRole: Role,
  ) {
    const workItem = await this.prisma.workItem.findUnique({
      where: { id: workItemId },
    });

    if (!workItem) {
      throw new NotFoundException('Work item not found');
    }

    await this.ensureProjectAccess(workItem.projectId, userId, userRole);

    return workItem;
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

  private mapWorkItemSource(
    source: WorkItemSource,
  ): 'MANUAL' | 'JIRA' | 'SPEC_DOCUMENT' {
    if (source === WorkItemSource.JIRA) return 'JIRA';
    if (source === WorkItemSource.SPEC_DOCUMENT) return 'SPEC_DOCUMENT';

    return 'MANUAL';
  }

  private createInputHash(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

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

  // ─── timeout helper ───────────────────────────────────────────────────────────

  private isGenerationTimedOut(generation: {
    startedAt: Date | null;
    createdAt: Date;
  }): boolean {
    const startedAt = generation.startedAt ?? generation.createdAt;
    const timeoutMs = 5 * 60 * 1000; // 5 minutes

    return Date.now() - startedAt.getTime() > timeoutMs;
  }

  // ─────────────────────────────────────────────────────────────────────────────

  private buildRagContentFromWorkItem(workItem: any): string {
    const parts: string[] = [];

    if (workItem.title) {
      parts.push(`# ${workItem.title}`);
    }

    if (workItem.type) {
      parts.push(`Type: ${workItem.type}`);
    }

    if (workItem.priority) {
      parts.push(`Priority: ${workItem.priority}`);
    }

    if (workItem.description) {
      parts.push(`## Description\n${workItem.description}`);
    }

    if (
      Array.isArray(workItem.acceptanceCriteria) &&
      workItem.acceptanceCriteria.length > 0
    ) {
      parts.push(
        `## Acceptance Criteria\n${workItem.acceptanceCriteria
          .map((item: string) => `- ${item}`)
          .join('\n')}`,
      );
    }

    if (
      Array.isArray(workItem.businessRules) &&
      workItem.businessRules.length > 0
    ) {
      parts.push(
        `## Business Rules\n${workItem.businessRules
          .map((item: string) => `- ${item}`)
          .join('\n')}`,
      );
    }

    if (workItem.normalizedContent) {
      parts.push(
        `## Normalized Content\n${JSON.stringify(
          workItem.normalizedContent,
          null,
          2,
        )}`,
      );
    }

    if (workItem.source === 'SPEC_DOCUMENT' && workItem.metadata) {
      parts.push(
        `## Source Metadata\n${JSON.stringify(workItem.metadata, null, 2)}`,
      );
    }

    return parts.filter(Boolean).join('\n\n').trim();
  }
}
