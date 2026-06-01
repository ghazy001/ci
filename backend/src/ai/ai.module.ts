import { Module } from '@nestjs/common';
import { AiRagClient } from './ai-rag.client';

@Module({
  providers: [AiRagClient],
  exports: [AiRagClient],
})
export class AiModule {}
