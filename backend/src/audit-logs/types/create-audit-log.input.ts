import {
  AuditAction,
  AuditEntityType,
  AuditSeverity,
  Role,
} from '@prisma/client';

export type AuditActor = {
  id?: string;
  email?: string;
  fullName?: string;
  role?: Role;
};

export type CreateAuditLogInput = {
  actor?: AuditActor | null;

  actorEmail?: string | null;
  actorName?: string | null;
  actorRole?: Role | null;

  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;

  projectId?: string | null;

  message: string;
  severity?: AuditSeverity;

  ipAddress?: string | null;
  userAgent?: string | null;

  success?: boolean;

  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};
