import { Module } from '@nestjs/common';
import { AnalyticsAssistantController } from './analytics-assistant.controller';
import { AnalyticsAssistantService } from './analytics-assistant.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsAiClient } from './analytics-ai.client';
import { AnalyticsInsightService } from './analytics-insight.service';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsAssistantController],
  providers: [
    AnalyticsAssistantService,
    AnalyticsAiClient,
    AnalyticsInsightService,
  ],
})
export class AnalyticsAssistantModule {}
