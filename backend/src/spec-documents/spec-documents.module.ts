import { Module } from '@nestjs/common';
import { SpecDocumentsController } from './spec-documents.controller';
import { SpecDocumentsService } from './spec-documents.service';
import { DocumentTextExtractorService } from './document-text-extractor.service';
import { SpecAiExtractionService } from './spec-ai-extraction.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, RagModule, AuditLogsModule],
  controllers: [SpecDocumentsController],
  providers: [
    SpecDocumentsService,
    DocumentTextExtractorService,
    SpecAiExtractionService,
  ],
  exports: [SpecDocumentsService],
})
export class SpecDocumentsModule {}
