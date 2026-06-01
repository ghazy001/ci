"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    CheckSquare,
    Download,
    Eye,
    FileSpreadsheet,
    Filter,
    Loader2,
    RefreshCcw,
    Search,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    XCircle,
} from "lucide-react";
import {
    clearAuditLogs,
    deleteAuditLogs,
    exportAuditLogsCsv,
    exportAuditLogsExcel,
    getAuditLog,
    getAuditLogs,
    getAuditLogStats,
    type AuditLogFilters,
} from "@/lib/audit-logs.service";
import type {
    AuditAction,
    AuditEntityType,
    AuditLog,
    AuditLogStats,
    AuditSeverity,
} from "@/lib/types";

const ACTION_OPTIONS: AuditAction[] = [
    "LOGIN",
    "LOGOUT",
    "LOGIN_FAILED",
    "USER_CREATED",
    "USER_UPDATED",
    "USER_ACTIVATED",
    "USER_DEACTIVATED",
    "PASSWORD_CHANGED",
    "PASSWORD_RESET_REQUESTED",
    "PASSWORD_RESET_COMPLETED",
    "PROFILE_UPDATED",
    "PROJECT_CREATED",
    "PROJECT_UPDATED",
    "PROJECT_DELETED",
    "PROJECT_MEMBER_ADDED",
    "PROJECT_MEMBER_REMOVED",
    "WORK_ITEM_CREATED",
    "WORK_ITEM_UPDATED",
    "WORK_ITEM_DELETED",
    "WORK_ITEM_IMPORTED_JIRA",
    "WORK_ITEM_IMPORTED_SPEC_DOCUMENT",
    "TEST_CASE_GENERATION_STARTED",
    "TEST_CASE_GENERATION_COMPLETED",
    "TEST_CASE_GENERATION_FAILED",
    "TEST_CASE_APPROVED",
    "TEST_CASE_DECLINED",
    "TEST_CASE_EDITED",
    "AUTOMATION_SCRIPT_GENERATION_STARTED",
    "AUTOMATION_SCRIPT_GENERATION_COMPLETED",
    "AUTOMATION_SCRIPT_GENERATION_FAILED",
    "AUTOMATION_SCRIPT_APPROVED",
    "AUTOMATION_SCRIPT_DECLINED",
    "AUTOMATION_SCRIPT_EDITED",
    "AUTOMATION_SCRIPT_REMOVED",
    "AUTOMATION_SCRIPT_DOWNLOADED",
    "SCRIPT_EXECUTION_STARTED",
    "SCRIPT_EXECUTION_PASSED",
    "SCRIPT_EXECUTION_FAILED",
    "SCRIPT_EXECUTION_TIMED_OUT",
    "SCRIPT_EXECUTION_CANCELED",
    "DEFECT_REPORT_CREATED",
    "DEFECT_REPORT_UPDATED",
    "DEFECT_REPORT_PDF_DOWNLOADED",
    "TEST_SUITE_REPORT_CREATED",
    "TEST_SUITE_REPORT_PDF_DOWNLOADED",
    "SCHEDULED_RUN_CREATED",
    "SCHEDULED_RUN_UPDATED",
    "SCHEDULED_RUN_PAUSED",
    "SCHEDULED_RUN_RESUMED",
    "SCHEDULED_RUN_DISABLED",
    "ANALYTICS_QUESTION_ASKED",
];

const ENTITY_OPTIONS: AuditEntityType[] = [
    "AUTH",
    "USER",
    "PROJECT",
    "PROJECT_MEMBER",
    "WORK_ITEM",
    "JIRA",
    "SPEC_DOCUMENT",
    "TEST_CASE",
    "TEST_CASE_GENERATION",
    "AUTOMATION_SCRIPT",
    "AUTOMATION_SCRIPT_GENERATION",
    "SCRIPT_EXECUTION",
    "DEFECT_REPORT",
    "TEST_SUITE_REPORT",
    "SCHEDULED_TEST_RUN",
    "ANALYTICS_ASSISTANT",
];

const SEVERITY_OPTIONS: AuditSeverity[] = ["INFO", "WARNING", "CRITICAL"];

function formatLabel(value: string) {
    return value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function severityClass(severity: AuditSeverity) {
    if (severity === "CRITICAL") {
        return "bg-red-50 text-red-700 ring-red-200";
    }

    if (severity === "WARNING") {
        return "bg-amber-50 text-amber-700 ring-amber-200";
    }

    return "bg-blue-50 text-blue-700 ring-blue-200";
}

function statusClass(success: boolean) {
    return success
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : "bg-red-50 text-red-700 ring-red-200";
}

function downloadBlob(blob: Blob, fileName: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
    if (value === null || value === undefined) return null;

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-sm font-semibold text-slate-800">
                {title}
            </p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-700">
                {typeof value === "string"
                    ? value
                    : JSON.stringify(value, null, 2)}
            </pre>
        </div>
    );
}

function AuditDetailsModal({
                               log,
                               loading,
                               onClose,
                           }: {
    log: AuditLog | null;
    loading: boolean;
    onClose: () => void;
}) {
    if (!log && !loading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-slate-200 p-6">
                    <div>
                        <p className="text-sm font-medium text-slate-500">
                            Audit Event Details
                        </p>
                        <h2 className="mt-1 text-2xl font-bold text-slate-950">
                            {loading ? "Loading..." : formatLabel(log!.action)}
                        </h2>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
                        type="button"
                    >
                        <XCircle size={20} />
                    </button>
                </div>

                {loading && (
                    <div className="p-6 text-sm text-slate-500">
                        Loading audit log details...
                    </div>
                )}

                {log && !loading && (
                    <div className="max-h-[calc(90vh-100px)] overflow-y-auto p-6">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase text-slate-500">
                                    Actor
                                </p>
                                <p className="mt-2 font-semibold text-slate-900">
                                    {log.actorName ||
                                        log.actor?.fullName ||
                                        "System"}
                                </p>
                                <p className="text-sm text-slate-500">
                                    {log.actorEmail ||
                                        log.actor?.email ||
                                        "No email"}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase text-slate-500">
                                    Entity
                                </p>
                                <p className="mt-2 font-semibold text-slate-900">
                                    {formatLabel(log.entityType)}
                                </p>
                                <p className="truncate text-sm text-slate-500">
                                    {log.entityId || "No entity id"}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase text-slate-500">
                                    Time
                                </p>
                                <p className="mt-2 font-semibold text-slate-900">
                                    {formatDate(log.createdAt)}
                                </p>
                                <p className="text-sm text-slate-500">
                                    IP: {log.ipAddress || "Unknown"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 p-4">
                                <p className="text-xs font-semibold uppercase text-slate-500">
                                    Status
                                </p>
                                <span
                                    className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass(
                                        log.success,
                                    )}`}
                                >
                                    {log.success ? (
                                        <CheckCircle2 size={13} />
                                    ) : (
                                        <XCircle size={13} />
                                    )}
                                    {log.success ? "Success" : "Failed"}
                                </span>
                            </div>

                            <div className="rounded-2xl border border-slate-200 p-4">
                                <p className="text-xs font-semibold uppercase text-slate-500">
                                    Severity
                                </p>
                                <span
                                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${severityClass(
                                        log.severity,
                                    )}`}
                                >
                                    {formatLabel(log.severity)}
                                </span>
                            </div>

                            <div className="rounded-2xl border border-slate-200 p-4">
                                <p className="text-xs font-semibold uppercase text-slate-500">
                                    Project ID
                                </p>
                                <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                                    {log.projectId || "No project scope"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                            <p className="text-sm font-semibold text-slate-800">
                                Message
                            </p>
                            <p className="mt-2 text-slate-600">{log.message}</p>
                        </div>

                        <div className="mt-6 grid gap-4 lg:grid-cols-2">
                            <JsonBlock title="Before" value={log.before} />
                            <JsonBlock title="After" value={log.after} />
                            <JsonBlock title="Metadata" value={log.metadata} />
                            <JsonBlock
                                title="User Agent"
                                value={log.userAgent}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ConfirmDeleteModal({
                                action,
                                selectedCount,
                                total,
                                activeFiltersCount,
                                deleting,
                                onCancel,
                                onConfirm,
                            }: {
    action: "selected" | "clear";
    selectedCount: number;
    total: number;
    activeFiltersCount: number;
    deleting: "selected" | "clear" | null;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const isSelectedDelete = action === "selected";
    const deleteCount = isSelectedDelete ? selectedCount : total;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                        <Trash2 size={24} />
                    </div>

                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
                            Dangerous action
                        </p>

                        <h2 className="mt-1 text-2xl font-bold text-slate-950">
                            {isSelectedDelete
                                ? "Delete selected audit logs?"
                                : activeFiltersCount > 0
                                    ? "Clear matching audit logs?"
                                    : "Clear all audit logs?"}
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            {isSelectedDelete
                                ? `You are about to permanently delete ${deleteCount} selected audit log${
                                    deleteCount === 1 ? "" : "s"
                                }.`
                                : `You are about to permanently delete ${deleteCount} audit log${
                                    deleteCount === 1 ? "" : "s"
                                } ${
                                    activeFiltersCount > 0
                                        ? "matching the current filters"
                                        : "from the system"
                                }.`}
                        </p>

                        {action === "clear" && activeFiltersCount > 0 && (
                            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                This action respects your active filters. Only
                                matching audit logs will be deleted.
                            </div>
                        )}

                        {action === "clear" && activeFiltersCount === 0 && (
                            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                                No filters are active. This will delete all audit
                                logs.
                            </div>
                        )}

                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                            This cannot be undone. Export the logs first if you
                            need a backup.
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        onClick={onCancel}
                        disabled={deleting !== null}
                        className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={deleting !== null}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                    >
                        {deleting ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Trash2 size={16} />
                        )}
                        {deleting ? "Deleting..." : "Confirm Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminAuditLogsPage() {
    const [stats, setStats] = useState<AuditLogStats | null>(null);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const [exporting, setExporting] = useState<"csv" | "excel" | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deleting, setDeleting] = useState<"selected" | "clear" | null>(null);
    const [confirmAction, setConfirmAction] = useState<
        "selected" | "clear" | null
    >(null);

    const [filters, setFilters] = useState<AuditLogFilters>({
        search: "",
        action: "",
        entityType: "",
        severity: "",
        success: "",
        from: "",
        to: "",
        page: 1,
        limit: 20,
    });

    const activeFiltersCount = useMemo(() => {
        return [
            filters.search,
            filters.action,
            filters.entityType,
            filters.severity,
            filters.success,
            filters.from,
            filters.to,
        ].filter(Boolean).length;
    }, [filters]);

    const allVisibleSelected =
        logs.length > 0 && logs.every((log) => selectedIds.includes(log.id));

    async function loadData(nextFilters = filters) {
        setLoading(true);
        setError(null);

        try {
            const [statsData, logsData] = await Promise.all([
                getAuditLogStats(),
                getAuditLogs(nextFilters),
            ]);

            setStats(statsData);
            setLogs(logsData.data);
            setTotalPages(logsData.totalPages || 1);
            setTotal(logsData.total);

            setSelectedIds((current) =>
                current.filter((id) =>
                    logsData.data.some((log) => log.id === id),
                ),
            );
        } catch (err) {
            console.error(err);
            setError("Failed to load audit logs.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function updateFilter<K extends keyof AuditLogFilters>(
        key: K,
        value: AuditLogFilters[K],
    ) {
        setFilters((current) => ({
            ...current,
            [key]: value,
            page: 1,
        }));
    }

    async function applyFilters() {
        const nextFilters = {
            ...filters,
            page: 1,
        };

        setSelectedIds([]);
        setFilters(nextFilters);
        await loadData(nextFilters);
    }

    async function resetFilters() {
        const cleanFilters: AuditLogFilters = {
            search: "",
            action: "",
            entityType: "",
            severity: "",
            success: "",
            from: "",
            to: "",
            page: 1,
            limit: 20,
        };

        setSelectedIds([]);
        setFilters(cleanFilters);
        await loadData(cleanFilters);
    }

    async function goToPage(page: number) {
        if (page < 1 || page > totalPages) return;

        const nextFilters = {
            ...filters,
            page,
        };

        setSelectedIds([]);
        setFilters(nextFilters);
        await loadData(nextFilters);
    }

    async function openDetails(id: string) {
        setDetailsLoading(true);
        setSelectedLog(null);

        try {
            const data = await getAuditLog(id);
            setSelectedLog(data);
        } catch (err) {
            console.error(err);
        } finally {
            setDetailsLoading(false);
        }
    }

    function toggleSelectAllVisible() {
        if (allVisibleSelected) {
            setSelectedIds([]);
            return;
        }

        setSelectedIds(logs.map((log) => log.id));
    }

    function toggleSelectOne(id: string) {
        setSelectedIds((current) => {
            if (current.includes(id)) {
                return current.filter((selectedId) => selectedId !== id);
            }

            return [...current, id];
        });
    }

    async function handleExportCsv() {
        setExporting("csv");
        setError(null);

        try {
            const blob = await exportAuditLogsCsv(filters);
            const fileName = `audit-logs-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;

            downloadBlob(blob, fileName);
        } catch (err) {
            console.error(err);
            setError("Failed to export audit logs as CSV.");
        } finally {
            setExporting(null);
        }
    }

    async function handleExportExcel() {
        setExporting("excel");
        setError(null);

        try {
            const blob = await exportAuditLogsExcel(filters);
            const fileName = `audit-logs-${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`;

            downloadBlob(blob, fileName);
        } catch (err) {
            console.error(err);
            setError("Failed to export audit logs as Excel.");
        } finally {
            setExporting(null);
        }
    }

    async function handleDeleteSelected() {
        if (!selectedIds.length) return;

        setDeleting("selected");
        setError(null);

        try {
            await deleteAuditLogs(selectedIds);

            const nextFilters = {
                ...filters,
                page: 1,
            };

            setSelectedIds([]);
            setConfirmAction(null);
            setFilters(nextFilters);
            await loadData(nextFilters);
        } catch (err) {
            console.error(err);
            setError("Failed to delete selected audit logs.");
        } finally {
            setDeleting(null);
        }
    }

    async function handleClearAll() {
        setDeleting("clear");
        setError(null);

        try {
            const nextFilters = {
                ...filters,
                page: 1,
            };

            await clearAuditLogs(filters);

            setSelectedIds([]);
            setConfirmAction(null);
            setFilters(nextFilters);
            await loadData(nextFilters);
        } catch (err) {
            console.error(err);
            setError("Failed to clear audit logs.");
        } finally {
            setDeleting(null);
        }
    }

    return (
        <>
            <div className="space-y-6">
                <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-4xl">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                                Audit & Activity Logs
                            </h1>
                            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                                Track authentication, users, projects, WorkItems, AI
                                generation, automation executions, reports, and
                                scheduled runs from one focused view.
                            </p>
                        </div>

                        <button
                            onClick={() => loadData()}
                            disabled={loading}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                            type="button"
                        >
                            <RefreshCcw
                                size={16}
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-500">
                                Events Today
                            </p>
                            <Activity className="text-blue-600" size={22} />
                        </div>
                        <p className="mt-4 text-3xl font-bold text-slate-950">
                            {stats?.totalToday ?? 0}
                        </p>
                    </div>

                    <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-500">
                                Failed Today
                            </p>
                            <AlertTriangle
                                className="text-amber-600"
                                size={22}
                            />
                        </div>
                        <p className="mt-4 text-3xl font-bold text-slate-950">
                            {stats?.failedToday ?? 0}
                        </p>
                    </div>

                    <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-500">
                                Critical Today
                            </p>
                            <ShieldAlert className="text-red-600" size={22} />
                        </div>
                        <p className="mt-4 text-3xl font-bold text-slate-950">
                            {stats?.criticalToday ?? 0}
                        </p>
                    </div>

                    <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-500">
                                Failed Logins
                            </p>
                            <ShieldCheck className="text-slate-700" size={22} />
                        </div>
                        <p className="mt-4 text-3xl font-bold text-slate-950">
                            {stats?.loginFailedToday ?? 0}
                        </p>
                    </div>
                </div>

                <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-slate-500" />
                            <h2 className="text-lg font-bold text-slate-950">
                                Filters
                            </h2>
                            {activeFiltersCount > 0 && (
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                    {activeFiltersCount} active
                                </span>
                            )}
                        </div>

                        <button
                            onClick={resetFilters}
                            className="text-sm font-semibold text-slate-500 hover:text-slate-950"
                            type="button"
                        >
                            Reset
                        </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
                        <div className="md:col-span-2 xl:col-span-4">
                            <label className="text-sm font-medium text-slate-600">
                                Search
                            </label>
                            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 px-4">
                                <Search size={17} className="text-slate-400" />
                                <input
                                    value={filters.search}
                                    onChange={(e) =>
                                        updateFilter("search", e.target.value)
                                    }
                                    placeholder="Search message, user, entity id..."
                                    className="h-11 w-full bg-transparent text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="xl:col-span-2">
                            <label className="text-sm font-medium text-slate-600">
                                Action
                            </label>
                            <select
                                value={filters.action}
                                onChange={(e) =>
                                    updateFilter(
                                        "action",
                                        e.target.value as AuditAction | "",
                                    )
                                }
                                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none"
                            >
                                <option value="">All actions</option>
                                {ACTION_OPTIONS.map((action) => (
                                    <option key={action} value={action}>
                                        {formatLabel(action)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="xl:col-span-2">
                            <label className="text-sm font-medium text-slate-600">
                                Entity
                            </label>
                            <select
                                value={filters.entityType}
                                onChange={(e) =>
                                    updateFilter(
                                        "entityType",
                                        e.target.value as AuditEntityType | "",
                                    )
                                }
                                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none"
                            >
                                <option value="">All entities</option>
                                {ENTITY_OPTIONS.map((entity) => (
                                    <option key={entity} value={entity}>
                                        {formatLabel(entity)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="xl:col-span-2">
                            <label className="text-sm font-medium text-slate-600">
                                Severity
                            </label>
                            <select
                                value={filters.severity}
                                onChange={(e) =>
                                    updateFilter(
                                        "severity",
                                        e.target.value as AuditSeverity | "",
                                    )
                                }
                                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none"
                            >
                                <option value="">All severities</option>
                                {SEVERITY_OPTIONS.map((severity) => (
                                    <option key={severity} value={severity}>
                                        {formatLabel(severity)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="xl:col-span-2">
                            <label className="text-sm font-medium text-slate-600">
                                Status
                            </label>
                            <select
                                value={filters.success}
                                onChange={(e) =>
                                    updateFilter(
                                        "success",
                                        e.target.value as
                                            | "true"
                                            | "false"
                                            | "",
                                    )
                                }
                                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none"
                            >
                                <option value="">All statuses</option>
                                <option value="true">Success</option>
                                <option value="false">Failed</option>
                            </select>
                        </div>

                        <div className="xl:col-span-2">
                            <label className="text-sm font-medium text-slate-600">
                                From
                            </label>
                            <input
                                type="date"
                                value={filters.from}
                                onChange={(e) =>
                                    updateFilter("from", e.target.value)
                                }
                                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none"
                            />
                        </div>

                        <div className="xl:col-span-2">
                            <label className="text-sm font-medium text-slate-600">
                                To
                            </label>
                            <input
                                type="date"
                                value={filters.to}
                                onChange={(e) =>
                                    updateFilter("to", e.target.value)
                                }
                                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none"
                            />
                        </div>

                        <div className="flex items-end md:col-span-2 xl:col-span-2">
                            <button
                                onClick={applyFilters}
                                className="h-11 w-full rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
                                type="button"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-100">
                    <div className="flex flex-col justify-between gap-5 border-b border-slate-100 p-6 xl:flex-row xl:items-center">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-lg font-bold text-slate-950">
                                    Activity Timeline
                                </h2>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                    {total} event{total === 1 ? "" : "s"}
                                </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-500">
                                Review matching activity, open full details, or export the current filtered result.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleExportCsv}
                                disabled={loading || exporting !== null}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                type="button"
                            >
                                {exporting === "csv" ? (
                                    <Loader2
                                        size={15}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Download size={15} />
                                )}
                                CSV
                            </button>

                            <button
                                onClick={handleExportExcel}
                                disabled={loading || exporting !== null}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                type="button"
                            >
                                {exporting === "excel" ? (
                                    <Loader2
                                        size={15}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <FileSpreadsheet size={15} />
                                )}
                                Excel
                            </button>

                            <button
                                onClick={() => setConfirmAction("selected")}
                                disabled={
                                    selectedIds.length === 0 ||
                                    loading ||
                                    deleting !== null
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                type="button"
                            >
                                <Trash2 size={15} />
                                Delete Selected
                                {selectedIds.length > 0 && (
                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs">
                                        {selectedIds.length}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setConfirmAction("clear")}
                                disabled={loading || deleting !== null || total === 0}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                type="button"
                            >
                                <Trash2 size={15} />
                                {activeFiltersCount > 0
                                    ? "Clear Matching"
                                    : "Clear All"}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1120px] table-fixed text-left">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="w-[110px] px-6 py-4">
                                    <button
                                        onClick={toggleSelectAllVisible}
                                        disabled={logs.length === 0 || loading}
                                        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                        type="button"
                                    >
                                        <CheckSquare size={16} />
                                        Select
                                    </button>
                                </th>
                                <th className="w-[170px] px-6 py-4">Time</th>
                                <th className="w-[230px] px-6 py-4">Actor</th>
                                <th className="w-[190px] px-6 py-4">Action</th>
                                <th className="w-[150px] px-6 py-4">Entity</th>
                                <th className="w-[120px] px-6 py-4">Status</th>
                                <th className="w-[120px] px-6 py-4">Severity</th>
                                <th className="px-6 py-4">Message</th>
                                <th className="w-[120px] px-6 py-4 text-right">
                                    Details
                                </th>
                            </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-6 py-10 text-center text-slate-500"
                                    >
                                        Loading audit logs...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-6 py-10 text-center text-slate-500"
                                    >
                                        No audit logs found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr
                                        key={log.id}
                                        className={`align-top hover:bg-slate-50/70 ${
                                            selectedIds.includes(log.id)
                                                ? "bg-blue-50/40"
                                                : ""
                                        }`}
                                    >
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(
                                                    log.id,
                                                )}
                                                onChange={() =>
                                                    toggleSelectOne(log.id)
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>

                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                                            {formatDate(log.createdAt)}
                                        </td>

                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-900">
                                                {log.actorName ||
                                                    log.actor?.fullName ||
                                                    "System"}
                                            </p>
                                            <p className="truncate text-sm text-slate-500">
                                                {log.actorEmail ||
                                                    log.actor?.email ||
                                                    "No email"}
                                            </p>
                                        </td>

                                        <td className="px-6 py-4">
                                                <span className="inline-flex max-w-full rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                    <span className="truncate">{formatLabel(log.action)}</span>
                                                </span>
                                        </td>

                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <span className="block truncate">
                                                {formatLabel(log.entityType)}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass(
                                                        log.success,
                                                    )}`}
                                                >
                                                    {log.success ? (
                                                        <CheckCircle2 size={13} />
                                                    ) : (
                                                        <XCircle size={13} />
                                                    )}
                                                    {log.success
                                                        ? "Success"
                                                        : "Failed"}
                                                </span>
                                        </td>

                                        <td className="px-6 py-4">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${severityClass(
                                                        log.severity,
                                                    )}`}
                                                >
                                                    {formatLabel(log.severity)}
                                                </span>
                                        </td>

                                        <td className="max-w-md px-6 py-4 text-sm text-slate-600">
                                            <p className="line-clamp-2">
                                                {log.message}
                                            </p>
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() =>
                                                    openDetails(log.id)
                                                }
                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                                type="button"
                                            >
                                                <Eye size={15} />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 p-6 md:flex-row">
                        <div>
                            <p className="text-sm text-slate-500">
                                Page {filters.page ?? 1} of {totalPages}
                            </p>
                            {selectedIds.length > 0 && (
                                <p className="mt-1 text-xs font-medium text-blue-600">
                                    {selectedIds.length} selected on this page
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() =>
                                    goToPage((filters.page ?? 1) - 1)
                                }
                                disabled={(filters.page ?? 1) <= 1 || loading}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                type="button"
                            >
                                Previous
                            </button>

                            <button
                                onClick={() =>
                                    goToPage((filters.page ?? 1) + 1)
                                }
                                disabled={
                                    (filters.page ?? 1) >= totalPages || loading
                                }
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                type="button"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {confirmAction && (
                <ConfirmDeleteModal
                    action={confirmAction}
                    selectedCount={selectedIds.length}
                    total={total}
                    activeFiltersCount={activeFiltersCount}
                    deleting={deleting}
                    onCancel={() => setConfirmAction(null)}
                    onConfirm={
                        confirmAction === "selected"
                            ? handleDeleteSelected
                            : handleClearAll
                    }
                />
            )}

            <AuditDetailsModal
                log={selectedLog}
                loading={detailsLoading}
                onClose={() => {
                    setSelectedLog(null);
                    setDetailsLoading(false);
                }}
            />
        </>
    );
}