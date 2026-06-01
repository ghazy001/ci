import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkItemsService } from './work-items.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { ImportJiraWorkItemDto } from './dto/import-jira-work-item.dto';

@UseGuards(JwtAuthGuard)
@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Post()
  createManual(@Req() req: any, @Body() dto: CreateWorkItemDto) {
    return this.workItemsService.createManual(req.user.id, req.user.role, dto, {
      actor: req.user,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('import/jira')
  importFromJira(@Req() req: any, @Body() dto: ImportJiraWorkItemDto) {
    return this.workItemsService.importFromJira(
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

  @Get()
  findAll(@Req() req: any, @Query('projectId') projectId: string) {
    return this.workItemsService.findAll(projectId, req.user.id, req.user.role);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.workItemsService.findOne(id, req.user.id, req.user.role);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWorkItemDto,
  ) {
    return this.workItemsService.update(id, req.user.id, req.user.role, dto, {
      actor: req.user,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.workItemsService.remove(id, req.user.id, req.user.role, {
      actor: req.user,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
