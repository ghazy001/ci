import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ScriptExecutionsController } from './script-executions.controller';
import { ScriptExecutionsService } from './script-executions.service';
import { ScriptRunnerService } from './runner/script-runner.service';
import { ScriptExecutionReportsService } from './reports/script-execution-reports.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [ScriptExecutionsController],
  providers: [
    ScriptExecutionsService,
    ScriptRunnerService,
    ScriptExecutionReportsService,
  ],
  exports: [ScriptExecutionsService],
})
export class ScriptExecutionsModule {}
