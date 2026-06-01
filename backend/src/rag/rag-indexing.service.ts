import { Injectable, Logger } from '@nestjs/common';
import { WorkItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiRagClient } from '../ai/ai-rag.client';

@Injectable()
export class RagIndexingService {
  private readonly logger = new Logger(RagIndexingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRagClient: AiRagClient,
  ) {}

  async indexWorkItemById(workItemId: string) {
    const workItem = await this.prisma.workItem.findUnique({
      where: { id: workItemId },
    });

    if (!workItem) {
      this.logger.warn(`Cannot index missing work item ${workItemId}`);
      return null;
    }

    return this.indexWorkItem(workItem);
  }

  async indexWorkItem(workItem: WorkItem) {
    const content = this.buildRagContentFromWorkItem(workItem);

    if (!content.trim()) {
      this.logger.warn(`Work item ${workItem.id} has no content to index`);
      return null;
    }

    const chunkId = `work-item-${workItem.id}`;

    return this.aiRagClient.indexChunk({
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
        externalCloudId: (workItem as any).externalCloudId ?? null,
        createdAt: workItem.createdAt.toISOString(),
        updatedAt: workItem.updatedAt.toISOString(),
      },
    });
  }

  async indexWorkItemBestEffort(workItemId: string) {
    try {
      await this.indexWorkItemById(workItemId);
      this.logger.log(`Indexed work item ${workItemId} for RAG`);
    } catch (error: any) {
      this.logger.warn(
        `RAG indexing failed for work item ${workItemId}: ${
          error?.message || 'unknown error'
        }`,
      );
    }
  }

  async indexWorkItemsBestEffort(workItemIds: string[]) {
    await Promise.allSettled(
      workItemIds.map((id) => this.indexWorkItemBestEffort(id)),
    );
  }

  private buildRagContentFromWorkItem(workItem: WorkItem): string {
    const parts: string[] = [];

    if (workItem.title) {
      parts.push(`# ${workItem.title}`);
    }

    if (workItem.type) {
      parts.push(`Type: ${workItem.type}`);
    }

    if (workItem.source) {
      parts.push(`Source: ${workItem.source}`);
    }

    if (workItem.priority) {
      parts.push(`Priority: ${workItem.priority}`);
    }

    if (workItem.description) {
      parts.push(`## Description\n${workItem.description}`);
    }

    const acceptanceCriteria = this.asStringArray(workItem.acceptanceCriteria);

    if (acceptanceCriteria.length > 0) {
      parts.push(
        `## Acceptance Criteria\n${acceptanceCriteria
          .map((item) => `- ${item}`)
          .join('\n')}`,
      );
    }

    const businessRules = this.asStringArray(workItem.businessRules);

    if (businessRules.length > 0) {
      parts.push(
        `## Business Rules\n${businessRules
          .map((item) => `- ${item}`)
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

    if (workItem.metadata) {
      parts.push(`## Metadata\n${JSON.stringify(workItem.metadata, null, 2)}`);
    }

    return parts.join('\n\n').trim();
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return value
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
