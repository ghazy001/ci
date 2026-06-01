import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { StatsModule } from './stats/stats.module';
import { ProjectsModule } from './projects/projects.module';
import { WorkItemsModule } from './work-items/work-items.module';
import { JiraModule } from './jira/jira.module';
import { SpecDocumentsModule } from './spec-documents/spec-documents.module';
import { TestCasesModule } from './test-cases/test-cases.module';
import { RagModule } from './rag/rag.module';
import { AutomationScriptsModule } from './automation-scripts/automation-scripts.module';
import { AnalyticsAssistantModule } from './analytics-assistant/analytics-assistant.module';
import { ScriptExecutionsModule } from './script-executions/script-executions.module';
import { ScheduledTestRunsModule } from './scheduled-test-runs/scheduled-test-runs.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    StatsModule,
    ProjectsModule,
    WorkItemsModule,
    JiraModule,
    SpecDocumentsModule,
    TestCasesModule,
    RagModule,
    AutomationScriptsModule,
    AnalyticsAssistantModule,
    ScriptExecutionsModule,
    ScheduledTestRunsModule,
    AuditLogsModule,
  ],
})
export class AppModule {}
