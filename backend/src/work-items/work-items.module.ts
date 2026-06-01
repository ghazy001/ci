import { Module } from '@nestjs/common';
import { WorkItemsController } from './work-items.controller';
import { WorkItemsService } from './work-items.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JiraModule } from '../jira/jira.module';
import { JiraAiExtractionService } from './jira-ai-extraction.service';
import { RagModule } from '../rag/rag.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, JiraModule, RagModule, AuditLogsModule],
  controllers: [WorkItemsController],
  providers: [WorkItemsService, JiraAiExtractionService],
  exports: [WorkItemsService],
})
export class WorkItemsModule {}
