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
import { TestCasesService } from './test-cases.service';
import { GenerateTestCasesDto } from './dto/generate-test-cases.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { ReviewTestCaseDto } from './dto/review-test-case.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class TestCasesController {
  constructor(private readonly testCasesService: TestCasesService) {}

  @Post('work-items/:workItemId/test-cases/generate')
  generateForWorkItem(
    @Req() req: any,
    @Param('workItemId') workItemId: string,
    @Body() dto: GenerateTestCasesDto,
  ) {
    return this.testCasesService.generateForWorkItem(
      workItemId,
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

  @Get('work-items/:workItemId/test-cases')
  findByWorkItem(@Req() req: any, @Param('workItemId') workItemId: string) {
    return this.testCasesService.findByWorkItem(
      workItemId,
      req.user.id,
      req.user.role,
    );
  }

  @Get('test-cases/:id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.testCasesService.findOne(id, req.user.id, req.user.role);
  }

  @Patch('test-cases/:id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTestCaseDto,
  ) {
    return this.testCasesService.update(id, req.user.id, req.user.role, dto, {
      actor: req.user,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('test-cases/:id/approve')
  approve(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewTestCaseDto,
  ) {
    return this.testCasesService.approve(id, req.user.id, req.user.role, dto, {
      actor: req.user,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('test-cases/:id/decline')
  decline(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewTestCaseDto,
  ) {
    return this.testCasesService.decline(id, req.user.id, req.user.role, dto, {
      actor: req.user,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('work-items/:workItemId/test-case-generations')
  findGenerationsByWorkItem(
    @Req() req: any,
    @Param('workItemId') workItemId: string,
  ) {
    return this.testCasesService.findGenerationsByWorkItem(
      workItemId,
      req.user.id,
      req.user.role,
    );
  }

  @Get('work-items/:workItemId/test-case-generations/latest')
  findLatestGenerationByWorkItem(
    @Req() req: any,
    @Param('workItemId') workItemId: string,
  ) {
    return this.testCasesService.findLatestGenerationByWorkItem(
      workItemId,
      req.user.id,
      req.user.role,
    );
  }

  @Get('test-case-generations/:generationId')
  findGenerationOne(
    @Req() req: any,
    @Param('generationId') generationId: string,
  ) {
    return this.testCasesService.findGenerationOne(
      generationId,
      req.user.id,
      req.user.role,
    );
  }

  @Post('test-case-generations/:generationId/retry')
  retryGeneration(
    @Req() req: any,
    @Param('generationId') generationId: string,
  ) {
    return this.testCasesService.retryGeneration(
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

  @Post('test-case-generations/:generationId/mark-failed')
  markGenerationFailed(
    @Req() req: any,
    @Param('generationId') generationId: string,
  ) {
    return this.testCasesService.markGenerationFailed(
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

  @Post('work-items/:workItemId/rag/index')
  indexWorkItemForRag(
    @Req() req: any,
    @Param('workItemId') workItemId: string,
  ) {
    return this.testCasesService.indexWorkItemForRag(
      workItemId,
      req.user.id,
      req.user.role,
    );
  }

  @Get('work-items/:workItemId/rag/search')
  searchRagForWorkItem(
    @Req() req: any,
    @Param('workItemId') workItemId: string,
  ) {
    return this.testCasesService.searchRagForWorkItem(
      workItemId,
      req.user.id,
      req.user.role,
    );
  }
}
