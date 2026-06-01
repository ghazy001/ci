import { Module } from '@nestjs/common';
import { JiraController } from './jira.controller';
import { JiraAuthService } from './jira-auth.service';
import { JiraService } from './jira.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [JiraController],
  providers: [JiraAuthService, JiraService],
  exports: [JiraAuthService, JiraService],
})
export class JiraModule {}
