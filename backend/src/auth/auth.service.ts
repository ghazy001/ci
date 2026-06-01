import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { AuditAction, AuditEntityType, AuditSeverity } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.type';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async login(
    loginDto: LoginDto,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      await this.auditLogsService.create({
        actorEmail: loginDto.email,
        action: AuditAction.LOGIN_FAILED,
        entityType: AuditEntityType.AUTH,
        message: `Failed login attempt for unknown email: ${loginDto.email}`,
        severity: AuditSeverity.WARNING,
        success: false,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: {
          reason: 'USER_NOT_FOUND',
        },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      await this.auditLogsService.create({
        actor: user,
        action: AuditAction.LOGIN_FAILED,
        entityType: AuditEntityType.AUTH,
        entityId: user.id,
        message: `Failed login attempt for deactivated account: ${user.email}`,
        severity: AuditSeverity.WARNING,
        success: false,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: {
          reason: 'ACCOUNT_DEACTIVATED',
        },
      });

      throw new ForbiddenException('Your account is deactivated');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      await this.auditLogsService.create({
        actor: user,
        action: AuditAction.LOGIN_FAILED,
        entityType: AuditEntityType.AUTH,
        entityId: user.id,
        message: `Failed login attempt for user: ${user.email}`,
        severity: AuditSeverity.WARNING,
        success: false,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: {
          reason: 'INVALID_PASSWORD',
        },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }

    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }

    const accessExpiresIn = (this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) ?? '15m') as StringValue;

    const refreshExpiresIn = (this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) ?? '7d') as StringValue;

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.usersService.saveRefreshTokenHash(user.id, refreshTokenHash);
    await this.usersService.updateLastLogin(user.id);

    await this.auditLogsService.create({
      actor: user,
      action: AuditAction.LOGIN,
      entityType: AuditEntityType.AUTH,
      entityId: user.id,
      message: `${user.fullName} logged in successfully`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
      },
      accessToken,
      refreshToken,
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  async logout(
    userId: string,
    context?: { ipAddress?: string; userAgent?: string; actor?: any },
  ) {
    await this.usersService.saveRefreshTokenHash(userId, null);

    await this.auditLogsService.create({
      actor: context?.actor,
      action: AuditAction.LOGOUT,
      entityType: AuditEntityType.AUTH,
      entityId: userId,
      message: `${context?.actor?.fullName ?? 'User'} logged out`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return { message: 'Logout successful' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    context?: { ipAddress?: string; userAgent?: string; actor?: any },
  ): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const fullUser = await this.usersService.findByEmail(user.email);

    if (!fullUser) {
      throw new NotFoundException('User not found');
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      fullUser.passwordHash,
    );

    if (!passwordMatches) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    });

    await this.auditLogsService.create({
      actor: context?.actor ?? user,
      action: AuditAction.PASSWORD_CHANGED,
      entityType: AuditEntityType.AUTH,
      entityId: userId,
      message: `${user.fullName} changed their password`,
      severity: AuditSeverity.INFO,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(
    email: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    // Do not reveal whether the email exists
    if (!user) {
      await this.auditLogsService.create({
        actorEmail: email,
        action: AuditAction.PASSWORD_RESET_REQUESTED,
        entityType: AuditEntityType.AUTH,
        message: `Password reset requested for unknown email: ${email}`,
        severity: AuditSeverity.WARNING,
        success: false,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: {
          reason: 'USER_NOT_FOUND',
        },
      });

      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;

    await this.mailService.sendPasswordResetEmail(
      user.email,
      user.fullName,
      resetUrl,
    );

    await this.auditLogsService.create({
      actor: user,
      action: AuditAction.PASSWORD_RESET_REQUESTED,
      entityType: AuditEntityType.AUTH,
      entityId: user.id,
      message: `Password reset requested for ${user.email}`,
      severity: AuditSeverity.WARNING,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ message: string }> {
    const users = await this.prisma.user.findMany({
      where: {
        passwordResetTokenHash: { not: null },
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    let matchedUser: (typeof users)[number] | null = null;

    for (const user of users) {
      if (!user.passwordResetTokenHash) continue;

      const isMatch = await bcrypt.compare(token, user.passwordResetTokenHash);

      if (isMatch) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: matchedUser.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    await this.auditLogsService.create({
      actor: matchedUser,
      action: AuditAction.PASSWORD_RESET_COMPLETED,
      entityType: AuditEntityType.AUTH,
      entityId: matchedUser.id,
      message: `Password reset completed for ${matchedUser.email}`,
      severity: AuditSeverity.WARNING,
      success: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return { message: 'Password reset successfully' };
  }
}
