import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntityType, AuditSeverity } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';

type AuditContext = {
  actor?: {
    id: string;
    email: string;
    fullName: string;
    role: any;
  };
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    currentUserId: string,
    context?: AuditContext,
  ) {
    const existing = await this.prisma.project.findUnique({
      where: { name: createProjectDto.name },
    });

    if (existing) {
      throw new BadRequestException('Project name already exists');
    }

    const project = await this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        description: createProjectDto.description,
        createdById: currentUserId,
        members: {
          create: {
            userId: currentUserId,
            role: 'OWNER',
          },
        },
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, role: true },
            },
          },
        },
      },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.PROJECT_CREATED,
      entityType: AuditEntityType.PROJECT,
      entityId: project.id,
      projectId: project.id,
      message: `${context?.actor?.fullName ?? 'Admin'} created project "${project.name}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      after: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdById: project.createdById,
      },
    });

    return project;
  }

  async findAll(currentUserId: string, currentUserRole: string) {
    if (currentUserRole === 'ADMIN') {
      return this.prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, fullName: true, email: true, role: true },
              },
            },
          },
        },
      });
    }

    return this.prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: currentUserId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, role: true },
            },
          },
        },
      },
    });
  }

  async findOne(
    projectId: string,
    currentUserId: string,
    currentUserRole: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, role: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (currentUserRole === 'ADMIN') {
      return project;
    }

    const isMember = project.members.some(
      (member) => member.userId === currentUserId,
    );

    if (!isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  async update(
    projectId: string,
    dto: UpdateProjectDto,
    context?: AuditContext,
  ) {
    const before = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!before) {
      throw new NotFoundException('Project not found');
    }

    if (dto.name && dto.name !== before.name) {
      const existing = await this.prisma.project.findUnique({
        where: { name: dto.name },
      });

      if (existing) {
        throw new BadRequestException('Project name already exists');
      }
    }

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: dto,
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.PROJECT_UPDATED,
      entityType: AuditEntityType.PROJECT,
      entityId: project.id,
      projectId: project.id,
      message: `${context?.actor?.fullName ?? 'Admin'} updated project "${project.name}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      before: {
        id: before.id,
        name: before.name,
        description: before.description,
      },
      after: {
        id: project.id,
        name: project.name,
        description: project.description,
      },
    });

    return project;
  }

  async remove(projectId: string, context?: AuditContext) {
    const before = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!before) {
      throw new NotFoundException('Project not found');
    }

    const deletedProject = await this.prisma.project.delete({
      where: { id: projectId },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.PROJECT_DELETED,
      entityType: AuditEntityType.PROJECT,
      entityId: deletedProject.id,
      projectId: deletedProject.id,
      message: `${context?.actor?.fullName ?? 'Admin'} deleted project "${deletedProject.name}"`,
      severity: AuditSeverity.CRITICAL,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      before: {
        id: before.id,
        name: before.name,
        description: before.description,
        createdById: before.createdById,
      },
    });

    return { message: 'Project deleted successfully' };
  }

  async addMember(
    projectId: string,
    dto: AddProjectMemberDto,
    context?: AuditContext,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: dto.userId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already assigned to this project');
    }

    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: dto.userId,
        role: dto.role,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.PROJECT_MEMBER_ADDED,
      entityType: AuditEntityType.PROJECT_MEMBER,
      entityId: member.id,
      projectId,
      message: `${context?.actor?.fullName ?? 'Admin'} added ${user.email} to project "${project.name}"`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      after: {
        id: member.id,
        projectId,
        userId: dto.userId,
        role: member.role,
        userEmail: user.email,
        projectName: project.name,
      },
    });

    return member;
  }

  async removeMember(
    projectId: string,
    userId: string,
    context?: AuditContext,
  ) {
    const memberBefore = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!memberBefore) {
      throw new NotFoundException('Project member not found');
    }

    const removedMember = await this.prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.PROJECT_MEMBER_REMOVED,
      entityType: AuditEntityType.PROJECT_MEMBER,
      entityId: removedMember.id,
      projectId,
      message: `${context?.actor?.fullName ?? 'Admin'} removed ${memberBefore.user.email} from project "${memberBefore.project.name}"`,
      severity: AuditSeverity.WARNING,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      before: {
        id: memberBefore.id,
        projectId: memberBefore.projectId,
        userId: memberBefore.userId,
        role: memberBefore.role,
        userEmail: memberBefore.user.email,
        projectName: memberBefore.project.name,
      },
    });

    return { message: 'Member removed successfully' };
  }

  async getProjectMembers(
    projectId: string,
    currentUserId: string,
    currentUserRole: string,
  ) {
    await this.findOne(projectId, currentUserId, currentUserRole);

    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }
}
