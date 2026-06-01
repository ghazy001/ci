import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { ImportJiraWorkItemDto } from './dto/import-jira-work-item.dto';
import { NormalizedJiraContent, WorkItemMapper } from './work-items.mapper';
import {
  AuditAction,
  AuditEntityType,
  AuditSeverity,
  Role,
  WorkItemSource,
  WorkItemStatus,
  WorkItemType,
} from '@prisma/client';
import { JiraService } from '../jira/jira.service';
import { JiraAiExtractionService } from './jira-ai-extraction.service';
import { RagIndexingService } from '../rag/rag-indexing.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

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
export class WorkItemsService {
  private readonly logger = new Logger(WorkItemsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jiraService: JiraService,
    private readonly jiraAiExtractionService: JiraAiExtractionService,
    private readonly ragIndexingService: RagIndexingService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private async ensureProjectAccess(
    userId: string,
    userRole: Role,
    projectId: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (userRole === Role.ADMIN) {
      return project;
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
      throw new ForbiddenException('You are not assigned to this project');
    }

    return project;
  }

  private asPlainObject(value: unknown): Record<string, any> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, any>;
    }

    return {};
  }

  private sanitizeWorkItemForAudit(workItem: any) {
    return {
      id: workItem.id,
      projectId: workItem.projectId,
      createdById: workItem.createdById,
      type: workItem.type,
      source: workItem.source,
      status: workItem.status,
      title: workItem.title,
      description: workItem.description,
      acceptanceCriteria: workItem.acceptanceCriteria,
      businessRules: workItem.businessRules,
      priority: workItem.priority,
      externalSystem: workItem.externalSystem,
      externalCloudId: workItem.externalCloudId,
      externalRef: workItem.externalRef,
      normalizedContent: workItem.normalizedContent,
      metadata: workItem.metadata,
      createdAt: workItem.createdAt,
      updatedAt: workItem.updatedAt,
    };
  }

  // Ai fall back reasons and conditions to be triggered by the extraction <3

  private getAiFallbackReasons(mapped: NormalizedJiraContent): string[] {
    const reasons: string[] = [];

    // Keep your original variables for notes and structured count
    const notesLength = mapped.extraSections.notes.join('\n').length;
    const notesHaveMultiline = mapped.extraSections.notes.some((note) =>
      note.includes('\n'),
    );
    const structuredCount =
      mapped.acceptanceCriteria.length +
      mapped.businessRules.length +
      mapped.extraSections.tasks.length +
      mapped.extraSections.testCases.length +
      mapped.extraSections.definitionOfDone.length;

    // ==================== NEW / IMPROVED CHECKS ====================

    // 1. Trigger AI if confidence is not almost perfect
    if (mapped.extractionMeta.confidence < 0.86) {
      reasons.push('low_confidence');
    }

    // 2. Description is still too long after parsing (your SCRUM-9 case)
    if (mapped.description.length > 350) {
      reasons.push('description_too_long');
    }

    // 3. Common "dump" phrases left in description (exactly your case!)
    const descLower = mapped.description.toLowerCase();
    if (
      descLower.includes('important things') ||
      descLower.includes("don't forget") ||
      descLower.includes('notes from') ||
      descLower.includes('also don') ||
      descLower.endsWith(':')
    ) {
      reasons.push('description_has_dump_phrase');
    }

    // ==================== YOUR ORIGINAL CHECKS (kept + improved) ====================

    // No clear sections at all
    if (
      mapped.acceptanceCriteria.length === 0 &&
      mapped.businessRules.length === 0
    ) {
      reasons.push('no_clear_sections');
    }

    // Too much still left in description (more realistic numbers)
    if (
      mapped.description.length > 700 &&
      mapped.acceptanceCriteria.length <= 3 &&
      mapped.businessRules.length === 0
    ) {
      reasons.push('too_much_in_description');
    }

    // Too much in notes
    if (
      mapped.businessRules.length === 0 &&
      (notesLength > 250 || notesHaveMultiline)
    ) {
      reasons.push('too_much_in_notes');
    }

    // Not enough structured sections overall
    if (structuredCount <= 3) {
      reasons.push('ambiguous_extraction');
    }

    // Remove duplicates and return
    return Array.from(new Set(reasons));
  }

  async createManual(
    userId: string,
    userRole: Role,
    dto: CreateWorkItemDto,
    context?: AuditContext,
  ) {
    await this.ensureProjectAccess(userId, userRole, dto.projectId);

    const created = await this.prisma.workItem.create({
      data: {
        projectId: dto.projectId,
        createdById: userId,
        type: dto.type as WorkItemType,
        source: WorkItemSource.MANUAL,
        status: WorkItemStatus.DRAFT,
        title: dto.title,
        description: dto.description,
        acceptanceCriteria: dto.acceptanceCriteria ?? [],
        businessRules: dto.businessRules ?? [],
        priority: dto.priority,
        normalizedContent: {
          type: dto.type,
          title: dto.title,
          description: dto.description ?? '',
          acceptanceCriteria: dto.acceptanceCriteria ?? [],
          businessRules: dto.businessRules ?? [],
          priority: dto.priority ?? null,
        },
      },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.WORK_ITEM_CREATED,
      entityType: AuditEntityType.WORK_ITEM,
      entityId: created.id,
      projectId: created.projectId,
      message: `${context?.actor?.fullName ?? 'User'} created work item "${created.title}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      after: this.sanitizeWorkItemForAudit(created),
    });

    void this.ragIndexingService.indexWorkItemBestEffort(created.id);

    return created;
  }

  async importFromJira(
    userId: string,
    userRole: Role,
    dto: ImportJiraWorkItemDto,
    context?: AuditContext,
  ) {
    await this.ensureProjectAccess(userId, userRole, dto.projectId);

    const existing = await this.prisma.workItem.findFirst({
      where: {
        projectId: dto.projectId,
        externalSystem: 'JIRA',
        externalCloudId: dto.cloudId,
        externalRef: dto.externalRef.trim().toUpperCase(),
      },
    });

    if (existing) {
      throw new BadRequestException(
        'This Jira issue is already imported from this Jira site',
      );
    }

    const normalizedIssueKey = dto.externalRef.trim().toUpperCase();

    const { connection, issue } = await this.jiraService.getIssueByKey(
      userId,
      normalizedIssueKey,
      dto.cloudId,
    );

    let mapped = WorkItemMapper.fromJiraIssue(issue);

    const fallbackReasons = this.getAiFallbackReasons(mapped);

    if (
      fallbackReasons.length > 0 &&
      this.jiraAiExtractionService.isEnabled()
    ) {
      try {
        mapped = await this.jiraAiExtractionService.refineIssueExtraction(
          issue,
          mapped,
          fallbackReasons,
        );
      } catch (error: any) {
        this.logger.warn(
          `AI fallback skipped for ${normalizedIssueKey}: ${
            error?.message || 'unknown error'
          }`,
        );
      }
    }

    const created = await this.prisma.workItem.create({
      data: {
        projectId: dto.projectId,
        createdById: userId,

        type: mapped.type,
        source: WorkItemSource.JIRA,
        status: WorkItemStatus.DRAFT,

        title: mapped.title,
        description: mapped.description,
        acceptanceCriteria: mapped.acceptanceCriteria,
        businessRules: mapped.businessRules,
        priority: mapped.priority,

        externalSystem: 'JIRA',
        externalCloudId: connection.cloudId,
        externalRef: normalizedIssueKey,

        rawPayload: issue,
        normalizedContent: {
          ...mapped,
          jira: {
            cloudId: connection.cloudId,
            siteName: connection.siteName,
            siteUrl: connection.siteUrl,
            issueId: issue.id,
            issueKey: normalizedIssueKey,
          },
        },

        metadata: {
          importedFrom: 'jira',
          importedAt: new Date().toISOString(),
          cloudId: connection.cloudId,
          siteName: connection.siteName,
          siteUrl: connection.siteUrl,
          issueId: issue.id,
          issueKey: normalizedIssueKey,
        },
      },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.WORK_ITEM_IMPORTED_JIRA,
      entityType: AuditEntityType.JIRA,
      entityId: created.id,
      projectId: created.projectId,
      message: `${context?.actor?.fullName ?? 'User'} imported Jira issue ${created.externalRef ?? dto.externalRef} as work item "${created.title}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      after: this.sanitizeWorkItemForAudit(created),
      metadata: {
        externalSystem: created.externalSystem,
        externalCloudId: created.externalCloudId,
        externalRef: created.externalRef,
      },
    });

    void this.ragIndexingService.indexWorkItemBestEffort(created.id);

    return created;
  }

  async findAll(projectId: string, userId: string, userRole: Role) {
    await this.ensureProjectAccess(userId, userRole, projectId);

    return this.prisma.workItem.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, userRole: Role) {
    const item = await this.prisma.workItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Work item not found');
    }

    await this.ensureProjectAccess(userId, userRole, item.projectId);

    return item;
  }

  async update(
    id: string,
    userId: string,
    userRole: Role,
    dto: UpdateWorkItemDto,
    context?: AuditContext,
  ) {
    const item = await this.findOne(id, userId, userRole);
    const currentNormalized = this.asPlainObject(item.normalizedContent);

    const nextTitle = dto.title ?? item.title;
    const nextDescription = dto.description ?? item.description ?? '';
    const nextAcceptanceCriteria =
      dto.acceptanceCriteria ?? (item.acceptanceCriteria as any[]) ?? [];
    const nextBusinessRules =
      dto.businessRules ?? (item.businessRules as any[]) ?? [];
    const nextPriority = dto.priority ?? item.priority ?? null;

    const updated = await this.prisma.workItem.update({
      where: { id },
      data: {
        type: dto.type ? (dto.type as WorkItemType) : undefined,
        title: dto.title,
        description: dto.description,
        acceptanceCriteria: dto.acceptanceCriteria,
        businessRules: dto.businessRules,
        priority: dto.priority,
        normalizedContent: {
          ...currentNormalized,
          title: nextTitle,
          description: nextDescription,
          acceptanceCriteria: nextAcceptanceCriteria,
          businessRules: nextBusinessRules,
          priority: nextPriority,
        },
      },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.WORK_ITEM_UPDATED,
      entityType: AuditEntityType.WORK_ITEM,
      entityId: updated.id,
      projectId: updated.projectId,
      message: `${context?.actor?.fullName ?? 'User'} updated work item "${updated.title}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      before: this.sanitizeWorkItemForAudit(item),
      after: this.sanitizeWorkItemForAudit(updated),
    });

    void this.ragIndexingService.indexWorkItemBestEffort(updated.id);

    return updated;
  }

  async remove(
    id: string,
    userId: string,
    userRole: Role,
    context?: AuditContext,
  ) {
    const item = await this.findOne(id, userId, userRole);

    const deleted = await this.prisma.workItem.delete({
      where: { id: item.id },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.WORK_ITEM_DELETED,
      entityType: AuditEntityType.WORK_ITEM,
      entityId: deleted.id,
      projectId: deleted.projectId,
      message: `${context?.actor?.fullName ?? 'User'} deleted work item "${deleted.title}"`,
      severity: AuditSeverity.WARNING,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      before: this.sanitizeWorkItemForAudit(item),
    });

    return deleted;
  }
}
