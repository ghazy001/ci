import { Module } from '@nestjs/common';
import { TestCasesController } from './test-cases.controller';
import { TestCasesService } from './test-cases.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiTestGenerationClient } from './ai-test-generation.client';
import { AiRagClient } from '../ai/ai-rag.client';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [TestCasesController],
  providers: [TestCasesService, AiTestGenerationClient, AiRagClient],
  exports: [TestCasesService],
})
export class TestCasesModule {}
