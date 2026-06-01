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
  Role,
  WorkItemSource,
  WorkItemStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentTextExtractorService } from './document-text-extractor.service';
import { SpecAiExtractionService } from './spec-ai-extraction.service';
import { ImportSpecWorkItemsDto } from './dto/import-spec-work-items.dto';
import { DEFAULT_SPEC_AI_MODEL, isValidSpecAiModel } from './spec-ai-models';
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
export class SpecDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentTextExtractor: DocumentTextExtractorService,
    private readonly specAiExtractionService: SpecAiExtractionService,
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

  async preview(
    userId: string,
    userRole: Role,
    projectId: string,
    file: Express.Multer.File,
    model?: string,
  ) {
    if (!projectId?.trim()) {
      throw new BadRequestException('projectId is required');
    }

    await this.ensureProjectAccess(userId, userRole, projectId);

    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (model && !isValidSpecAiModel(model)) {
      throw new BadRequestException('Invalid AI extraction model');
    }

    const extractedText = await this.documentTextExtractor.extract(file);

    if (!extractedText || extractedText.length < 80) {
      throw new BadRequestException(
        'No readable text detected. The document may be scanned or empty.',
      );
    }

    if (!this.specAiExtractionService.isEnabled()) {
      throw new BadRequestException('AI extraction is not configured');
    }

    const extraction = await this.specAiExtractionService.extractWorkItems({
      fileName: file.originalname,
      mimeType: file.mimetype,
      documentText: extractedText,
      model,
    });

    return {
      file: {
        name: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      extraction: {
        textLength: extractedText.length,
        workItemsCount: extraction.workItems.length,
        model: extraction.model,
      },
      workItems: extraction.workItems,
    };
  }

  async importWorkItems(
    userId: string,
    userRole: Role,
    dto: ImportSpecWorkItemsDto,
    context?: AuditContext,
  ) {
    await this.ensureProjectAccess(userId, userRole, dto.projectId);

    if (!dto.workItems?.length) {
      throw new BadRequestException('No work items selected for import');
    }

    const extractionModel = isValidSpecAiModel(dto.extractionModel)
      ? dto.extractionModel
      : DEFAULT_SPEC_AI_MODEL;

    const createdItems = await this.prisma.$transaction(
      dto.workItems.map((item) =>
        this.prisma.workItem.create({
          data: {
            projectId: dto.projectId,
            createdById: userId,

            type: item.type,
            source: WorkItemSource.SPEC_DOCUMENT,
            status: WorkItemStatus.DRAFT,

            title: item.title,
            description: item.description ?? '',
            acceptanceCriteria: item.acceptanceCriteria ?? [],
            businessRules: item.businessRules ?? [],
            priority: item.priority ?? null,

            externalSystem: 'SPEC_DOCUMENT',
            externalRef: null,

            rawPayload: {
              importedFrom: 'spec_document',
              fileName: dto.fileName ?? null,
              sourceSection: item.sourceSection ?? null,
              confidence: item.confidence,
              model: extractionModel,
            },

            normalizedContent: {
              title: item.title,
              type: item.type,
              description: item.description ?? '',
              acceptanceCriteria: item.acceptanceCriteria ?? [],
              businessRules: item.businessRules ?? [],
              priority: item.priority ?? null,
              sourceDocument: {
                fileName: dto.fileName ?? null,
                sourceSection: item.sourceSection ?? null,
              },
              extractionMeta: {
                method: 'document_ai',
                confidence: item.confidence,
                model: extractionModel,
              },
            },

            metadata: {
              importedFrom: 'spec_document',
              importedAt: new Date().toISOString(),
              fileName: dto.fileName ?? null,
              sourceSection: item.sourceSection ?? null,
              confidence: item.confidence,
              model: extractionModel,
            },
          },
        }),
      ),
    );

    // Log each imported work item individually for full traceability
    await Promise.all(
      createdItems.map((workItem) =>
        this.auditLogsService.create({
          actor: context?.actor,
          action: AuditAction.WORK_ITEM_IMPORTED_SPEC_DOCUMENT,
          entityType: AuditEntityType.SPEC_DOCUMENT,
          entityId: workItem.id,
          projectId: workItem.projectId,
          message: `${context?.actor?.fullName ?? 'User'} imported specification work item "${workItem.title}"`,
          severity: AuditSeverity.INFO,
          success: true,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
          after: {
            id: workItem.id,
            projectId: workItem.projectId,
            type: workItem.type,
            source: workItem.source,
            status: workItem.status,
            title: workItem.title,
            priority: workItem.priority,
            metadata: workItem.metadata,
          },
          metadata: {
            fileName: dto.fileName ?? null,
            extractionModel,
            confidence: (workItem.metadata as any)?.confidence ?? null,
            sourceSection: (workItem.metadata as any)?.sourceSection ?? null,
          },
        }),
      ),
    );

    void this.ragIndexingService.indexWorkItemsBestEffort(
      createdItems.map((item) => item.id),
    );

    return {
      count: createdItems.length,
      workItems: createdItems,
    };
  }
}
