import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { ScriptExecutionsModule } from '../script-executions/script-executions.module';
import { ScheduledTestRunsController } from './scheduled-test-runs.controller';
import { ScheduledTestRunsService } from './scheduled-test-runs.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    PrismaModule,
    ScriptExecutionsModule,
    ScheduleModule.forRoot(),
    AuditLogsModule,
  ],
  controllers: [ScheduledTestRunsController],
  providers: [ScheduledTestRunsService],
  exports: [ScheduledTestRunsService],
})
export class ScheduledTestRunsModule {}
