import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';
import { AuditAction, AuditEntityType, AuditSeverity } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type SafeUser = Omit<User, 'passwordHash' | 'refreshTokenHash'>;

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
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    context?: AuditContext,
  ): Promise<SafeUser> {
    const normalizedEmail = createUserDto.email.toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: createUserDto.fullName,
        email: normalizedEmail,
        passwordHash,
        role: createUserDto.role,
        mustChangePassword: true,
      },
    });

    // Send email only for TESTER users
    if (createUserDto.role === 'TESTER') {
      try {
        await this.mailService.sendUserCredentialsEmail(
          user.email,
          user.fullName,
          user.email,
          createUserDto.password,
        );
      } catch (error) {
        console.error('Failed to send user credentials email:', error);
      }
    }

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.USER_CREATED,
      entityType: AuditEntityType.USER,
      entityId: user.id,
      message: `${context?.actor?.fullName ?? 'Admin'} created user ${user.email}`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      after: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });

    return this.excludeSensitive(user);
  }

  async findAll(): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.excludeSensitive(user));
  }

  async findById(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.excludeSensitive(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    context?: AuditContext,
  ): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const before = existing;

    const data: Prisma.UserUpdateInput = {};

    if (updateUserDto.fullName !== undefined) {
      data.fullName = updateUserDto.fullName;
    }

    if (updateUserDto.email !== undefined) {
      const normalizedEmail = updateUserDto.email.toLowerCase();

      const emailOwner = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (emailOwner && emailOwner.id !== id) {
        throw new BadRequestException('Email already exists');
      }

      data.email = normalizedEmail;
    }

    if (updateUserDto.role !== undefined) {
      data.role = updateUserDto.role;
    }

    if (updateUserDto.isActive !== undefined) {
      data.isActive = updateUserDto.isActive;
    }

    if (updateUserDto.password) {
      data.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      data.mustChangePassword = true;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.USER_UPDATED,
      entityType: AuditEntityType.USER,
      entityId: updated.id,
      message: `${context?.actor?.fullName ?? 'Admin'} updated user ${updated.email}`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      before: {
        id: before.id,
        fullName: before.fullName,
        email: before.email,
        role: before.role,
        isActive: before.isActive,
      },
      after: {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
      },
    });

    return this.excludeSensitive(updated);
  }

  async activate(id: string, context?: AuditContext): Promise<SafeUser> {
    const before = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!before) {
      throw new NotFoundException('User not found');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.USER_ACTIVATED,
      entityType: AuditEntityType.USER,
      entityId: user.id,
      message: `${context?.actor?.fullName ?? 'Admin'} activated user ${user.email}`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      before: {
        id: before.id,
        email: before.email,
        isActive: before.isActive,
      },
      after: {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
      },
    });

    return this.excludeSensitive(user);
  }

  async deactivate(id: string, context?: AuditContext): Promise<SafeUser> {
    const before = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!before) {
      throw new NotFoundException('User not found');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.USER_DEACTIVATED,
      entityType: AuditEntityType.USER,
      entityId: user.id,
      message: `${context?.actor?.fullName ?? 'Admin'} deactivated user ${user.email}`,
      severity: AuditSeverity.WARNING,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      before: {
        id: before.id,
        email: before.email,
        isActive: before.isActive,
      },
      after: {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
      },
    });

    return this.excludeSensitive(user);
  }

  async saveRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  private excludeSensitive(user: User): SafeUser {
    const { passwordHash, refreshTokenHash, ...safeUser } = user;
    return safeUser;
  }

  async delete(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        createdProjects: true,
        WorkItem: true,
        projectMembers: true,
        JiraConnection: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.createdProjects.length > 0) {
      throw new BadRequestException(
        'Cannot delete user because they created projects. Reassign or delete those projects first.',
      );
    }

    if (user.WorkItem.length > 0) {
      throw new BadRequestException(
        'Cannot delete user because they created work items. Reassign or delete those work items first.',
      );
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  async updateProfile(
    userId: string,
    dto: { fullName?: string; email?: string },
  ): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.fullName !== undefined) {
      data.fullName = dto.fullName;
    }

    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.toLowerCase();

      const emailOwner = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (emailOwner && emailOwner.id !== userId) {
        throw new BadRequestException('Email already exists');
      }

      data.email = normalizedEmail;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.excludeSensitive(updated);
  }

  async updateProfilePicture(
    userId: string,
    profilePicture: string,
  ): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { profilePicture },
    });

    return this.excludeSensitive(updated);
  }

  async findAllbyRole(role?: string) {
    return this.prisma.user.findMany({
      where: role ? { role: role as any } : {},
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        mustChangePassword: true,
        profilePicture: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
