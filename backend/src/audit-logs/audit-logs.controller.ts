import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  Res,
  UseGuards,
  Body,
  Delete,
} from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogsService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.auditLogsService.getStats();
  }

  @Get('recent')
  getRecent(@Query('limit') limit?: string) {
    return this.auditLogsService.getRecent(limit ? Number(limit) : 10);
  }

  @Get('export/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(@Query() query: AuditLogQueryDto, @Res() res: Response) {
    const buffer = await this.auditLogsService.exportCsv(query);
    const fileName = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }

  @Get('export/excel')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportExcel(@Query() query: AuditLogQueryDto, @Res() res: Response) {
    const buffer = await this.auditLogsService.exportExcel(query);
    const fileName = `audit-logs-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }
  @Delete()
  deleteMany(@Body('ids') ids: string[]) {
    return this.auditLogsService.deleteMany(ids);
  }

  @Delete('clear')
  clearAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogsService.clearAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditLogsService.findOne(id);
  }
}
