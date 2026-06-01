import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { RagIndexingService } from './rag-indexing.service';

@Module({
  imports: [PrismaModule, AiModule],
  providers: [RagIndexingService],
  exports: [RagIndexingService],
})
export class RagModule {}
