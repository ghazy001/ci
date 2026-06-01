import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateScheduledTestRunDto } from './dto/create-scheduled-test-run.dto';
import { UpdateScheduledTestRunDto } from './dto/update-scheduled-test-run.dto';
import { ScheduledTestRunsService } from './scheduled-test-runs.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class ScheduledTestRunsController {
  constructor(
    private readonly scheduledTestRunsService: ScheduledTestRunsService,
  ) {}

  @Post('scheduled-test-runs')
  create(@Req() req: any, @Body() dto: CreateScheduledTestRunDto) {
    return this.scheduledTestRunsService.create(
      dto,
      req.user.id,
      req.user.role,
      {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Get('automation-scripts/:scriptId/scheduled-test-runs')
  findByScript(@Req() req: any, @Param('scriptId') scriptId: string) {
    return this.scheduledTestRunsService.findByScript(
      scriptId,
      req.user.id,
      req.user.role,
    );
  }

  @Get('scheduled-test-runs/:id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.scheduledTestRunsService.findOne(
      id,
      req.user.id,
      req.user.role,
    );
  }

  @Patch('scheduled-test-runs/:id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateScheduledTestRunDto,
  ) {
    return this.scheduledTestRunsService.update(
      id,
      dto,
      req.user.id,
      req.user.role,
      {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Post('scheduled-test-runs/:id/pause')
  pause(@Req() req: any, @Param('id') id: string) {
    return this.scheduledTestRunsService.pause(id, req.user.id, req.user.role, {
      actor: req.user,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('scheduled-test-runs/:id/resume')
  resume(@Req() req: any, @Param('id') id: string) {
    return this.scheduledTestRunsService.resume(
      id,
      req.user.id,
      req.user.role,
      {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Post('scheduled-test-runs/:id/disable')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.scheduledTestRunsService.remove(
      id,
      req.user.id,
      req.user.role,
      {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }
}
