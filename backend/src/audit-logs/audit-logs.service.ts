import { Injectable } from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { Workbook } from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogInput } from './types/create-audit-log.input';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAuditLogInput) {
    const actor = input.actor;

    return this.prisma.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? input.actorEmail ?? null,
        actorName: actor?.fullName ?? input.actorName ?? null,
        actorRole: actor?.role ?? input.actorRole ?? null,

        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,

        projectId: input.projectId ?? null,

        message: input.message,
        severity: input.severity ?? 'INFO',

        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,

        success: input.success ?? true,

        before:
          input.before === undefined
            ? Prisma.JsonNull
            : (input.before as Prisma.InputJsonValue),

        after:
          input.after === undefined
            ? Prisma.JsonNull
            : (input.after as Prisma.InputJsonValue),

        metadata:
          input.metadata === undefined
            ? Prisma.JsonNull
            : (input.metadata as Prisma.InputJsonValue),
      },
    });
  }

  private buildWhere(query: AuditLogQueryDto): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.actorId) {
      where.actorId = query.actorId;
    }

    if (query.projectId) {
      where.projectId = query.projectId;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.severity) {
      where.severity = query.severity;
    }

    if (query.success !== undefined && query.success !== '') {
      where.success = query.success === 'true';
    }

    if (query.from || query.to) {
      where.createdAt = {};

      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }

      if (query.to) {
        const toDate = new Date(query.to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    if (query.search) {
      where.OR = [
        { message: { contains: query.search, mode: 'insensitive' } },
        { actorEmail: { contains: query.search, mode: 'insensitive' } },
        { actorName: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findAll(query: AuditLogQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhere(query);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalToday,
      failedToday,
      criticalToday,
      loginFailedToday,
      recentCritical,
    ] = await Promise.all([
      this.prisma.auditLog.count({
        where: {
          createdAt: {
            gte: todayStart,
          },
        },
      }),

      this.prisma.auditLog.count({
        where: {
          success: false,
          createdAt: {
            gte: todayStart,
          },
        },
      }),

      this.prisma.auditLog.count({
        where: {
          severity: 'CRITICAL',
          createdAt: {
            gte: todayStart,
          },
        },
      }),

      this.prisma.auditLog.count({
        where: {
          action: AuditAction.LOGIN_FAILED,
          createdAt: {
            gte: todayStart,
          },
        },
      }),

      this.prisma.auditLog.findMany({
        where: {
          severity: 'CRITICAL',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      }),
    ]);

    return {
      totalToday,
      failedToday,
      criticalToday,
      loginFailedToday,
      recentCritical,
    };
  }

  async getRecent(limit = 10) {
    return this.prisma.auditLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  private async getExportRows(query: AuditLogQueryDto) {
    const where = this.buildWhere(query);

    return this.prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  private safeJson(value: unknown) {
    if (value === null || value === undefined) return '';

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private csvEscape(value: unknown) {
    const raw = value === null || value === undefined ? '' : String(value);
    const escaped = raw.replace(/"/g, '""');

    return `"${escaped}"`;
  }

  async exportCsv(query: AuditLogQueryDto) {
    const logs = await this.getExportRows(query);

    const headers = [
      'ID',
      'Created At',
      'Actor Name',
      'Actor Email',
      'Actor Role',
      'Action',
      'Entity Type',
      'Entity ID',
      'Project ID',
      'Status',
      'Severity',
      'Message',
      'IP Address',
      'User Agent',
      'Before',
      'After',
      'Metadata',
    ];

    const rows = logs.map((log) => [
      log.id,
      log.createdAt.toISOString(),
      log.actorName || log.actor?.fullName || 'System',
      log.actorEmail || log.actor?.email || '',
      log.actorRole || log.actor?.role || '',
      log.action,
      log.entityType,
      log.entityId || '',
      log.projectId || '',
      log.success ? 'Success' : 'Failed',
      log.severity,
      log.message,
      log.ipAddress || '',
      log.userAgent || '',
      this.safeJson(log.before),
      this.safeJson(log.after),
      this.safeJson(log.metadata),
    ]);

    const csv = [
      headers.map((header) => this.csvEscape(header)).join(','),
      ...rows.map((row) => row.map((cell) => this.csvEscape(cell)).join(',')),
    ].join('\n');

    return Buffer.from('\uFEFF' + csv, 'utf8');
  }

  async exportExcel(query: AuditLogQueryDto) {
    const logs = await this.getExportRows(query);

    const workbook = new Workbook();
    workbook.creator = 'Audit Logs Module';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Audit Logs', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 28 },
      { header: 'Created At', key: 'createdAt', width: 24 },
      { header: 'Actor Name', key: 'actorName', width: 24 },
      { header: 'Actor Email', key: 'actorEmail', width: 30 },
      { header: 'Actor Role', key: 'actorRole', width: 16 },
      { header: 'Action', key: 'action', width: 34 },
      { header: 'Entity Type', key: 'entityType', width: 24 },
      { header: 'Entity ID', key: 'entityId', width: 28 },
      { header: 'Project ID', key: 'projectId', width: 28 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Severity', key: 'severity', width: 14 },
      { header: 'Message', key: 'message', width: 60 },
      { header: 'IP Address', key: 'ipAddress', width: 18 },
      { header: 'User Agent', key: 'userAgent', width: 50 },
      { header: 'Before', key: 'before', width: 50 },
      { header: 'After', key: 'after', width: 50 },
      { header: 'Metadata', key: 'metadata', width: 50 },
    ];

    logs.forEach((log) => {
      worksheet.addRow({
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        actorName: log.actorName || log.actor?.fullName || 'System',
        actorEmail: log.actorEmail || log.actor?.email || '',
        actorRole: log.actorRole || log.actor?.role || '',
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId || '',
        projectId: log.projectId || '',
        status: log.success ? 'Success' : 'Failed',
        severity: log.severity,
        message: log.message,
        ipAddress: log.ipAddress || '',
        userAgent: log.userAgent || '',
        before: this.safeJson(log.before),
        after: this.safeJson(log.after),
        metadata: this.safeJson(log.metadata),
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.height = 24;
    headerRow.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' },
    };
    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        cell.alignment = {
          vertical: 'top',
          wrapText: true,
        };
      });

      if (rowNumber > 1) {
        const statusCell = row.getCell('status');
        const severityCell = row.getCell('severity');

        if (statusCell.value === 'Failed') {
          statusCell.font = { bold: true, color: { argb: 'FFB91C1C' } };
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' },
          };
        } else {
          statusCell.font = { bold: true, color: { argb: 'FF047857' } };
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD1FAE5' },
          };
        }

        if (severityCell.value === 'CRITICAL') {
          severityCell.font = { bold: true, color: { argb: 'FFB91C1C' } };
        } else if (severityCell.value === 'WARNING') {
          severityCell.font = { bold: true, color: { argb: 'FFB45309' } };
        } else {
          severityCell.font = { bold: true, color: { argb: 'FF1D4ED8' } };
        }
      }
    });

    worksheet.autoFilter = {
      from: 'A1',
      to: 'Q1',
    };

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
  async deleteMany(ids: string[]) {
    if (!ids.length) {
      return {
        count: 0,
      };
    }

    return this.prisma.auditLog.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  async clearAll(query: AuditLogQueryDto) {
    const where = this.buildWhere(query);

    return this.prisma.auditLog.deleteMany({
      where,
    });
  }
}
