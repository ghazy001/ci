import { Module } from '@nestjs/common';
import { AutomationScriptsController } from './automation-scripts.controller';
import { AutomationScriptsService } from './automation-scripts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiScriptGenerationClient } from './ai-script-generation.client';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [AutomationScriptsController],
  providers: [AutomationScriptsService, AiScriptGenerationClient],
  exports: [AutomationScriptsService],
})
export class AutomationScriptsModule {}
