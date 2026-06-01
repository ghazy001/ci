import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AutomationScriptsService } from './automation-scripts.service';
import { GenerateAutomationScriptDto } from './dto/generate-automation-script.dto';
import { UpdateAutomationScriptDto } from './dto/update-automation-script.dto';
import { ReviewAutomationScriptDto } from './dto/review-automation-script.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class AutomationScriptsController {
  constructor(
    private readonly automationScriptsService: AutomationScriptsService,
  ) {}

  @Post('test-cases/:testCaseId/automation-scripts/generate')
  generateForTestCase(
    @Req() req: any,
    @Param('testCaseId') testCaseId: string,
    @Body() dto: GenerateAutomationScriptDto,
  ) {
    return this.automationScriptsService.generateForTestCase(
      testCaseId,
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

  @Get('test-cases/:testCaseId/automation-scripts')
  findByTestCase(@Req() req: any, @Param('testCaseId') testCaseId: string) {
    return this.automationScriptsService.findByTestCase(
      testCaseId,
      req.user.id,
      req.user.role,
    );
  }

  @Get('automation-script-generations/:generationId')
  findGenerationOne(
    @Req() req: any,
    @Param('generationId') generationId: string,
  ) {
    return this.automationScriptsService.findGenerationOne(
      generationId,
      req.user.id,
      req.user.role,
    );
  }

  @Get('automation-scripts/:scriptId')
  findOne(@Req() req: any, @Param('scriptId') scriptId: string) {
    return this.automationScriptsService.findOne(
      scriptId,
      req.user.id,
      req.user.role,
    );
  }

  @Patch('automation-scripts/:scriptId')
  update(
    @Req() req: any,
    @Param('scriptId') scriptId: string,
    @Body() dto: UpdateAutomationScriptDto,
  ) {
    return this.automationScriptsService.update(
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

  @Post('automation-scripts/:scriptId/approve')
  approve(
    @Req() req: any,
    @Param('scriptId') scriptId: string,
    @Body() dto: ReviewAutomationScriptDto,
  ) {
    return this.automationScriptsService.approve(
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

  @Post('automation-scripts/:scriptId/decline')
  decline(
    @Req() req: any,
    @Param('scriptId') scriptId: string,
    @Body() dto: ReviewAutomationScriptDto,
  ) {
    return this.automationScriptsService.decline(
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

  @Post('automation-scripts/:scriptId/remove')
  remove(@Req() req: any, @Param('scriptId') scriptId: string) {
    return this.automationScriptsService.remove(
      scriptId,
      req.user.id,
      req.user.role,
      {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Get('automation-scripts/:scriptId/download')
  @Header('Content-Type', 'text/plain')
  async download(@Req() req: any, @Param('scriptId') scriptId: string) {
    return this.automationScriptsService.download(
      scriptId,
      req.user.id,
      req.user.role,
      {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Get('test-cases/:testCaseId/automation-script-generations/latest')
  findLatestGenerationByTestCase(
    @Req() req: any,
    @Param('testCaseId') testCaseId: string,
  ) {
    return this.automationScriptsService.findLatestGenerationByTestCase(
      testCaseId,
      req.user.id,
      req.user.role,
      {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Post('automation-script-generations/:generationId/sync')
  syncGenerationJob(
    @Req() req: any,
    @Param('generationId') generationId: string,
  ) {
    return this.automationScriptsService.syncGenerationJob(
      generationId,
      req.user.id,
      req.user.role,
      {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Post('automation-script-generations/:generationId/retry')
  retryGeneration(
    @Req() req: any,
    @Param('generationId') generationId: string,
  ) {
    return this.automationScriptsService.retryGeneration(
      generationId,
      req.user.id,
      req.user.role,
      {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Post('automation-script-generations/:generationId/mark-failed')
  markGenerationFailed(
    @Req() req: any,
    @Param('generationId') generationId: string,
  ) {
    return this.automationScriptsService.markGenerationFailed(
      generationId,
      req.user.id,
      req.user.role,
      {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @Get('automation-scripts/:scriptId/execution-stats')
  getExecutionStats(@Param('scriptId') scriptId: string, @Req() req: any) {
    return this.automationScriptsService.getExecutionStats(scriptId, req.user);
  }
}
