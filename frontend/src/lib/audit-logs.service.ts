import { api } from "./api";
import type {
    AuditAction,
    AuditEntityType,
    AuditLog,
    AuditLogsResponse,
    AuditLogStats,
    AuditSeverity,
} from "./types";

export type AuditLogFilters = {
    search?: string;
    actorId?: string;
    projectId?: string;
    action?: AuditAction | "";
    entityType?: AuditEntityType | "";
    severity?: AuditSeverity | "";
    success?: "true" | "false" | "";
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
};

function cleanParams<T extends Record<string, unknown>>(params: T) {
    return Object.fromEntries(
        Object.entries(params).filter(([, value]) => {
            return value !== "" && value !== undefined && value !== null;
        })
    );
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
    const { data } = await api.get<AuditLogsResponse>("/audit-logs", {
        params: cleanParams({
            search: filters.search,
            actorId: filters.actorId,
            projectId: filters.projectId,
            action: filters.action,
            entityType: filters.entityType,
            severity: filters.severity,
            success: filters.success,
            from: filters.from,
            to: filters.to,
            page: filters.page,
            limit: filters.limit,
        }),
    });

    return data;
}

export async function getAuditLogStats() {
    const { data } = await api.get<AuditLogStats>("/audit-logs/stats");
    return data;
}

export async function getAuditLog(id: string) {
    const { data } = await api.get<AuditLog>(`/audit-logs/${id}`);
    return data;
}
export async function exportAuditLogsCsv(filters: AuditLogFilters = {}) {
    const { data } = await api.get<Blob>("/audit-logs/export/csv", {
        params: cleanParams({
            search: filters.search,
            actorId: filters.actorId,
            projectId: filters.projectId,
            action: filters.action,
            entityType: filters.entityType,
            severity: filters.severity,
            success: filters.success,
            from: filters.from,
            to: filters.to,
        }),
        responseType: "blob",
    });

    return data;
}

export async function exportAuditLogsExcel(filters: AuditLogFilters = {}) {
    const { data } = await api.get<Blob>("/audit-logs/export/excel", {
        params: cleanParams({
            search: filters.search,
            actorId: filters.actorId,
            projectId: filters.projectId,
            action: filters.action,
            entityType: filters.entityType,
            severity: filters.severity,
            success: filters.success,
            from: filters.from,
            to: filters.to,
        }),
        responseType: "blob",
    });

    return data;
}
export async function deleteAuditLogs(ids: string[]) {
    const { data } = await api.delete<{ count: number }>("/audit-logs", {
        data: {
            ids,
        },
    });

    return data;
}

export async function clearAuditLogs(filters: AuditLogFilters = {}) {
    const { data } = await api.delete<{ count: number }>("/audit-logs/clear", {
        params: cleanParams({
            search: filters.search,
            actorId: filters.actorId,
            projectId: filters.projectId,
            action: filters.action,
            entityType: filters.entityType,
            severity: filters.severity,
            success: filters.success,
            from: filters.from,
            to: filters.to,
        }),
    });

    return data;
}