// src/script-executions/script-executions.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, interval, switchMap, takeWhile } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScriptExecutionsService } from './script-executions.service';
import { RunAutomationScriptDto } from './dto/run-automation-script.dto';
import { ScriptExecutionReportsService } from './reports/script-execution-reports.service';
import { CreateTestSuiteReportDto } from './dto/create-test-suite-report.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ScriptExecutionsController {
  constructor(
    private readonly scriptExecutionsService: ScriptExecutionsService,
    private readonly scriptExecutionReportsService: ScriptExecutionReportsService,
  ) {}

  @Post('automation-scripts/:scriptId/executions')
  runScript(
    @Req() req: any,
    @Param('scriptId') scriptId: string,
    @Body() dto: RunAutomationScriptDto,
  ) {
    return this.scriptExecutionsService.runScript(
      scriptId,
      req.user.id,
      req.user.role,
      dto,
      {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Get('automation-scripts/:scriptId/executions')
  findByScript(@Req() req: any, @Param('scriptId') scriptId: string) {
    return this.scriptExecutionsService.findByScript(
      scriptId,
      req.user.id,
      req.user.role,
    );
  }

  @Get('script-executions/:executionId')
  findOne(@Req() req: any, @Param('executionId') executionId: string) {
    return this.scriptExecutionsService.findOne(
      executionId,
      req.user.id,
      req.user.role,
    );
  }

  @Post('script-executions/:executionId/cancel')
  cancelExecution(@Req() req: any, @Param('executionId') executionId: string) {
    return this.scriptExecutionsService.cancelExecution(
      executionId,
      req.user.id,
      req.user.role,
      {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Get('script-executions/:executionId/defect-report')
  getDefectReportByExecution(
    @Req() req: any,
    @Param('executionId') executionId: string,
  ) {
    return this.scriptExecutionReportsService.getDefectReportByExecution(
      executionId,
      req.user.id,
      req.user.role,
    );
  }

  @Post('script-executions/:executionId/defect-report')
  async createDefectReportForExecution(
    @Req() req: any,
    @Param('executionId') executionId: string,
  ) {
    await this.scriptExecutionsService.findOne(
      executionId,
      req.user.id,
      req.user.role,
    );

    return this.scriptExecutionReportsService.createDefectReportIfFailed(
      executionId,
      {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Get('script-executions/:executionId/defect-report/pdf')
  async downloadDefectReportPdf(
    @Req() req: any,
    @Param('executionId') executionId: string,
    @Res() res: Response,
  ) {
    const buffer =
      await this.scriptExecutionReportsService.buildDefectReportPdf(
        executionId,
        req.user.id,
        req.user.role,
        {
          actor: req.user,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="defect-report-${executionId}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Post('test-suite-reports')
  createTestSuiteReport(
    @Req() req: any,
    @Body() body: CreateTestSuiteReportDto,
  ) {
    return this.scriptExecutionReportsService.createSuiteReportFromExecutions({
      executionIds: body.executionIds,
      requestedById: req.user.id,
      userRole: req.user.role,
      title: body.title,
      auditContext: {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });
  }

  @Get('test-suite-reports/:reportId')
  getTestSuiteReport(@Req() req: any, @Param('reportId') reportId: string) {
    return this.scriptExecutionReportsService.getSuiteReport(
      reportId,
      req.user.id,
      req.user.role,
    );
  }

  @Get('test-suite-reports/:reportId/pdf')
  async downloadTestSuiteReportPdf(
    @Req() req: any,
    @Param('reportId') reportId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.scriptExecutionReportsService.buildSuiteReportPdf(
      reportId,
      req.user.id,
      req.user.role,
      {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="test-suite-report-${reportId}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Sse('script-executions/:executionId/events')
  streamExecutionEvents(
    @Req() req: any,
    @Param('executionId') executionId: string,
  ): Observable<MessageEvent> {
    return interval(1000).pipe(
      switchMap(async () => {
        const execution = await this.scriptExecutionsService.findOne(
          executionId,
          req.user.id,
          req.user.role,
        );

        return {
          data: execution,
        } as MessageEvent;
      }),
      takeWhile((event: MessageEvent) => {
        const status = event.data?.status;

        return status === 'QUEUED' || status === 'RUNNING';
      }, true),
    );
  }

  @Get('automation-scripts/:scriptId/test-suite-reports')
  findSuiteReportsByScript(
    @Req() req: any,
    @Param('scriptId') scriptId: string,
  ) {
    return this.scriptExecutionReportsService.findSuiteReportsByScript(
      scriptId,
      req.user.id,
      req.user.role,
    );
  }
}
