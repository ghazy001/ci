"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    CheckSquare,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    FileSpreadsheet,
    Filter,
    Loader2,
    RefreshCcw,
    Search,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
    Trash2,
    X,
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
    "LOGIN","LOGOUT","LOGIN_FAILED","USER_CREATED","USER_UPDATED","USER_ACTIVATED",
    "USER_DEACTIVATED","PASSWORD_CHANGED","PASSWORD_RESET_REQUESTED","PASSWORD_RESET_COMPLETED",
    "PROFILE_UPDATED","PROJECT_CREATED","PROJECT_UPDATED","PROJECT_DELETED",
    "PROJECT_MEMBER_ADDED","PROJECT_MEMBER_REMOVED","WORK_ITEM_CREATED","WORK_ITEM_UPDATED",
    "WORK_ITEM_DELETED","WORK_ITEM_IMPORTED_JIRA","WORK_ITEM_IMPORTED_SPEC_DOCUMENT",
    "TEST_CASE_GENERATION_STARTED","TEST_CASE_GENERATION_COMPLETED","TEST_CASE_GENERATION_FAILED",
    "TEST_CASE_APPROVED","TEST_CASE_DECLINED","TEST_CASE_EDITED",
    "AUTOMATION_SCRIPT_GENERATION_STARTED","AUTOMATION_SCRIPT_GENERATION_COMPLETED",
    "AUTOMATION_SCRIPT_GENERATION_FAILED","AUTOMATION_SCRIPT_APPROVED","AUTOMATION_SCRIPT_DECLINED",
    "AUTOMATION_SCRIPT_EDITED","AUTOMATION_SCRIPT_REMOVED","AUTOMATION_SCRIPT_DOWNLOADED",
    "SCRIPT_EXECUTION_STARTED","SCRIPT_EXECUTION_PASSED","SCRIPT_EXECUTION_FAILED",
    "SCRIPT_EXECUTION_TIMED_OUT","SCRIPT_EXECUTION_CANCELED","DEFECT_REPORT_CREATED",
    "DEFECT_REPORT_UPDATED","DEFECT_REPORT_PDF_DOWNLOADED","TEST_SUITE_REPORT_CREATED",
    "TEST_SUITE_REPORT_PDF_DOWNLOADED","SCHEDULED_RUN_CREATED","SCHEDULED_RUN_UPDATED",
    "SCHEDULED_RUN_PAUSED","SCHEDULED_RUN_RESUMED","SCHEDULED_RUN_DISABLED","ANALYTICS_QUESTION_ASKED",
];

const ENTITY_OPTIONS: AuditEntityType[] = [
    "AUTH","USER","PROJECT","PROJECT_MEMBER","WORK_ITEM","JIRA","SPEC_DOCUMENT","TEST_CASE",
    "TEST_CASE_GENERATION","AUTOMATION_SCRIPT","AUTOMATION_SCRIPT_GENERATION","SCRIPT_EXECUTION",
    "DEFECT_REPORT","TEST_SUITE_REPORT","SCHEDULED_TEST_RUN","ANALYTICS_ASSISTANT",
];

const SEVERITY_OPTIONS: AuditSeverity[] = ["INFO", "WARNING", "CRITICAL"];

function formatLabel(value: string) {
    return value.toLowerCase().split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatDateCompact(value: string) {
    const d = new Date(value);
    return {
        date: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(d),
        time: new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", hour12: true }).format(d),
    };
}

function severityConfig(severity: AuditSeverity) {
    if (severity === "CRITICAL") return { cls: "bg-red-50 text-red-700 ring-1 ring-red-200", dot: "bg-red-500" };
    if (severity === "WARNING") return { cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", dot: "bg-amber-500" };
    return { cls: "bg-sky-50 text-sky-700 ring-1 ring-sky-200", dot: "bg-sky-500" };
}

function statusConfig(success: boolean) {
    return success
        ? { cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500" }
        : { cls: "bg-red-50 text-red-700 ring-1 ring-red-200", dot: "bg-red-500" };
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

/* ── Stat Card ─────────────────────────────────────────────────────── */
function StatCard({
                      label, value, icon: Icon, iconColor, accent,
                  }: {
    label: string; value: number | undefined; icon: React.ElementType; iconColor: string; accent: string;
}) {
    return (
        <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md">
            <div className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} />
            <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <div className={`rounded-xl p-2 ${iconColor} bg-opacity-10`}>
                    <Icon size={18} className={iconColor} />
                </div>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value ?? 0}</p>
        </div>
    );
}

/* ── Filter Select ──────────────────────────────────────────────────── */
function FilterSelect({
                          label, value, onChange, children,
                      }: {
    label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 outline-none ring-0 transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center" }}
            >
                {children}
            </select>
        </div>
    );
}

/* ── JSON Block ─────────────────────────────────────────────────────── */
function JsonBlock({ title, value }: { title: string; value: unknown }) {
    if (value === null || value === undefined) return null;
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50">
            <div className="border-b border-slate-200 px-4 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
            </div>
            <pre className="max-h-60 overflow-auto p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap break-words">
                {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
            </pre>
        </div>
    );
}

/* ── Audit Details Modal ────────────────────────────────────────────── */
function AuditDetailsModal({ log, loading, onClose }: { log: AuditLog | null; loading: boolean; onClose: () => void }) {
    if (!log && !loading) return null;

    const sev = log ? severityConfig(log.severity) : null;
    const sta = log ? statusConfig(log.success) : null;

    return (
        <div
                role="button"
                tabIndex={0}
                aria-label="Close modal"
                className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center"
                onClick={onClose}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onClose();
                    }
                }}
        >
            <div
             role="dialog"
             aria-modal="true"
             className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-slate-200 p-2">
                            <Eye size={16} className="text-slate-600" />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Audit Event</p>
                            <h2 className="text-base font-bold text-slate-900">
                                {loading ? "Loading…" : formatLabel(log!.action)}
                            </h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" type="button">
                        <X size={18} />
                    </button>
                </div>

                {loading && (
                    <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-400">
                        <Loader2 size={18} className="animate-spin" />
                        Loading audit details…
                    </div>
                )}

                {log && !loading && (
                    <div className="max-h-[calc(92vh-72px)] overflow-y-auto p-6 space-y-5">
                        {/* Top meta row */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {[
                                { label: "Actor", primary: log.actorName || log.actor?.fullName || "System", secondary: log.actorEmail || log.actor?.email || "—" },
                                { label: "Entity", primary: formatLabel(log.entityType), secondary: log.entityId || "—" },
                                { label: "Timestamp", primary: formatDate(log.createdAt), secondary: `IP: ${log.ipAddress || "Unknown"}` },
                                { label: "Project", primary: log.projectId || "No project scope", secondary: "" },
                            ].map(({ label, primary, secondary }) => (
                                <div key={label} className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                                    <p className="mt-1.5 truncate text-sm font-semibold text-slate-900">{primary}</p>
                                    {secondary && <p className="truncate text-xs text-slate-500">{secondary}</p>}
                                </div>
                            ))}
                        </div>

                        {/* Status + Severity */}
                        <div className="flex flex-wrap gap-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${sta!.cls}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${sta!.dot}`} />
                                {log.success ? "Success" : "Failed"}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${sev!.cls}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${sev!.dot}`} />
                                {formatLabel(log.severity)}
                            </span>
                        </div>

                        {/* Message */}
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Message</p>
                            <p className="text-sm leading-relaxed text-slate-700">{log.message}</p>
                        </div>

                        {/* JSON blocks */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <JsonBlock title="Before" value={log.before} />
                            <JsonBlock title="After" value={log.after} />
                            <JsonBlock title="Metadata" value={log.metadata} />
                            <JsonBlock title="User Agent" value={log.userAgent} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Confirm Delete Modal ───────────────────────────────────────────── */
function ConfirmDeleteModal({
                                action, selectedCount, total, activeFiltersCount, deleting, onCancel, onConfirm,
                            }: {
    action: "selected" | "clear"; selectedCount: number; total: number; activeFiltersCount: number;
    deleting: "selected" | "clear" | null; onCancel: () => void; onConfirm: () => void;
}) {
    const isSelected = action === "selected";
    const count = isSelected ? selectedCount : total;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                <div className="flex items-start gap-4">
                    <div className="shrink-0 rounded-2xl bg-red-100 p-3">
                        <Trash2 size={22} className="text-red-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">Irreversible action</p>
                        <h2 className="mt-1 text-lg font-bold text-slate-900">
                            {isSelected ? "Delete selected logs?" : activeFiltersCount > 0 ? "Clear matching logs?" : "Clear all logs?"}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                            {isSelected
                                ? `Permanently deleting ${count} selected audit log${count === 1 ? "" : "s"}.`
                                : `Permanently deleting ${count} audit log${count === 1 ? "" : "s"} ${activeFiltersCount > 0 ? "matching the current filters" : "from the system"}.`}
                        </p>

                        {action === "clear" && activeFiltersCount > 0 && (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                                Only logs matching your active filters will be removed.
                            </div>
                        )}
                        {action === "clear" && activeFiltersCount === 0 && (
                            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                                No filters active — this will wipe <strong>all</strong> audit logs.
                            </div>
                        )}
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                            This cannot be undone. Export first if you need a backup.
                        </div>
                    </div>
                </div>

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button onClick={onCancel} disabled={deleting !== null} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50" type="button">
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={deleting !== null} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50" type="button">
                        {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        {deleting ? "Deleting…" : "Confirm Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Main Page ──────────────────────────────────────────────────────── */
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
    const [confirmAction, setConfirmAction] = useState<"selected" | "clear" | null>(null);

    const [filters, setFilters] = useState<AuditLogFilters>({
        search: "", action: "", entityType: "", severity: "", success: "", from: "", to: "", page: 1, limit: 20,
    });

    const activeFiltersCount = useMemo(() => {
        return [filters.search, filters.action, filters.entityType, filters.severity, filters.success, filters.from, filters.to].filter(Boolean).length;
    }, [filters]);

    const allVisibleSelected = logs.length > 0 && logs.every((log) => selectedIds.includes(log.id));
    const someSelected = selectedIds.length > 0 && !allVisibleSelected;

    async function loadData(nextFilters = filters) {
        setLoading(true);
        setError(null);
        try {
            const [statsData, logsData] = await Promise.all([getAuditLogStats(), getAuditLogs(nextFilters)]);
            setStats(statsData);
            setLogs(logsData.data);
            setTotalPages(logsData.totalPages || 1);
            setTotal(logsData.total);
            setSelectedIds((cur) => cur.filter((id) => logsData.data.some((log) => log.id === id)));
        } catch (err) {
            console.error(err);
            setError("Failed to load audit logs.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void loadData(); }, []);  

    function updateFilter<K extends keyof AuditLogFilters>(key: K, value: AuditLogFilters[K]) {
        setFilters((cur) => ({ ...cur, [key]: value, page: 1 }));
    }

    async function applyFilters() {
        const next = { ...filters, page: 1 };
        setSelectedIds([]);
        setFilters(next);
        await loadData(next);
    }

    async function resetFilters() {
        const clean: AuditLogFilters = { search: "", action: "", entityType: "", severity: "", success: "", from: "", to: "", page: 1, limit: 20 };
        setSelectedIds([]);
        setFilters(clean);
        await loadData(clean);
    }

    async function goToPage(page: number) {
        if (page < 1 || page > totalPages) return;
        const next = { ...filters, page };
        setSelectedIds([]);
        setFilters(next);
        await loadData(next);
    }

    async function openDetails(id: string) {
        setDetailsLoading(true);
        setSelectedLog(null);
        try {
            const data = await getAuditLog(id);
            setSelectedLog(data);
        } catch (err) { console.error(err); }
        finally { setDetailsLoading(false); }
    }

    function toggleSelectAll() {
        setSelectedIds(allVisibleSelected ? [] : logs.map((l) => l.id));
    }

    function toggleSelectOne(id: string) {
        setSelectedIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
    }

    async function handleExportCsv() {
        setExporting("csv"); setError(null);
        try {
            const blob = await exportAuditLogsCsv(filters);
            downloadBlob(blob, `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
        } catch { setError("Failed to export as CSV."); }
        finally { setExporting(null); }
    }

    async function handleExportExcel() {
        setExporting("excel"); setError(null);
        try {
            const blob = await exportAuditLogsExcel(filters);
            downloadBlob(blob, `audit-logs-${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch { setError("Failed to export as Excel."); }
        finally { setExporting(null); }
    }

    async function handleDeleteSelected() {
        if (!selectedIds.length) return;
        setDeleting("selected"); setError(null);
        try {
            await deleteAuditLogs(selectedIds);
            const next = { ...filters, page: 1 };
            setSelectedIds([]); setConfirmAction(null); setFilters(next);
            await loadData(next);
        } catch { setError("Failed to delete selected logs."); }
        finally { setDeleting(null); }
    }

    async function handleClearAll() {
        setDeleting("clear"); setError(null);
        try {
            await clearAuditLogs(filters);
            const next = { ...filters, page: 1 };
            setSelectedIds([]); setConfirmAction(null); setFilters(next);
            await loadData(next);
        } catch { setError("Failed to clear audit logs."); }
        finally { setDeleting(null); }
    }

    const currentPage = filters.page ?? 1;

    return (
        <>
            <div className="space-y-5">

                {/* ── Page Header ── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit & Activity Logs</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Track auth, users, projects, work items, AI generation, executions and reports.
                        </p>
                    </div>
                    <button
                        onClick={() => loadData()}
                        disabled={loading}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                    >
                        <RefreshCcw size={15} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>

                {/* ── Error Banner ── */}
                {error && (
                    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        <XCircle size={16} className="shrink-0" />
                        {error}
                    </div>
                )}

                {/* ── Stat Cards ── */}
                <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Events Today" value={stats?.totalToday} icon={Activity} iconColor="text-blue-600" accent="bg-blue-500" />
                    <StatCard label="Failed Today" value={stats?.failedToday} icon={AlertTriangle} iconColor="text-amber-500" accent="bg-amber-500" />
                    <StatCard label="Critical Today" value={stats?.criticalToday} icon={ShieldAlert} iconColor="text-red-600" accent="bg-red-500" />
                    <StatCard label="Failed Logins" value={stats?.loginFailedToday} icon={ShieldCheck} iconColor="text-slate-600" accent="bg-slate-400" />
                </div>

                {/* ── Filters Panel ── */}
                <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center gap-2.5">
                            <SlidersHorizontal size={16} className="text-slate-400" />
                            <span className="text-sm font-bold text-slate-900">Filters</span>
                            {activeFiltersCount > 0 && (
                                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </div>
                        {activeFiltersCount > 0 && (
                            <button onClick={resetFilters} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-slate-700" type="button">
                                <X size={13} />
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className="p-5">
                        {/* Row 1: Search + dropdowns */}
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                            {/* Search — spans 2 cols on xl */}
                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Search</label>
                                <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                                    <Search size={15} className="shrink-0 text-slate-400" />
                                    <input
                                        value={filters.search}
                                        onChange={(e) => updateFilter("search", e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                                        placeholder="Message, user, entity ID…"
                                        className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                                    />
                                    {filters.search && (
                                        <button onClick={() => updateFilter("search", "")} className="shrink-0 text-slate-300 hover:text-slate-500" type="button">
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <FilterSelect label="Action" value={filters.action ?? ""} onChange={(v) => updateFilter("action", v as AuditAction | "")}>                                <option value="">All actions</option>
                                {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{formatLabel(a)}</option>)}
                            </FilterSelect>

                            <FilterSelect label="Entity" value={filters.entityType ?? ""} onChange={(v) => updateFilter("entityType", v as AuditEntityType | "")}>
                                <option value="">All entities</option>
                                {ENTITY_OPTIONS.map((e) => <option key={e} value={e}>{formatLabel(e)}</option>)}
                            </FilterSelect>

                            <FilterSelect label="Severity" value={filters.severity ?? ""} onChange={(v) => updateFilter("severity", v as AuditSeverity | "")}>
                                <option value="">All severities</option>
                                {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{formatLabel(s)}</option>)}
                            </FilterSelect>

                            <FilterSelect label="Status"    value={filters.success ?? ""} onChange={(v) => updateFilter("success", v as "true" | "false" | "")}>
                                <option value="">All statuses</option>
                                <option value="true">Success</option>
                                <option value="false">Failed</option>
                            </FilterSelect>
                        </div>

                        {/* Row 2: Date range + Apply */}
                        <div className="mt-3 flex flex-wrap items-end gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">From</label>
                                <input
                                    type="date"
                                    value={filters.from}
                                    onChange={(e) => updateFilter("from", e.target.value)}
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">To</label>
                                <input
                                    type="date"
                                    value={filters.to}
                                    onChange={(e) => updateFilter("to", e.target.value)}
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                            <button
                                onClick={applyFilters}
                                className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
                                type="button"
                            >
                                <Filter size={14} />
                                Apply Filters
                            </button>
                            {activeFiltersCount > 0 && (
                                <button
                                    onClick={resetFilters}
                                    className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                    type="button"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Table Card ── */}
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">

                    {/* Toolbar */}
                    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-sm font-bold text-slate-900">Activity Timeline</h2>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                                {total.toLocaleString()} event{total === 1 ? "" : "s"}
                            </span>
                            {selectedIds.length > 0 && (
                                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                                    {selectedIds.length} selected
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Exports */}
                            <button
                                onClick={handleExportCsv}
                                disabled={loading || exporting !== null}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                type="button"
                            >
                                {exporting === "csv" ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                                CSV
                            </button>
                            <button
                                onClick={handleExportExcel}
                                disabled={loading || exporting !== null}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                type="button"
                            >
                                {exporting === "excel" ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
                                Excel
                            </button>

                            {/* Separator */}
                            <div className="h-5 w-px bg-slate-200" />

                            {/* Delete actions */}
                            <button
                                onClick={() => setConfirmAction("selected")}
                                disabled={selectedIds.length === 0 || loading || deleting !== null}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                type="button"
                            >
                                <Trash2 size={13} />
                                Delete Selected
                            </button>
                            <button
                                onClick={() => setConfirmAction("clear")}
                                disabled={loading || deleting !== null || total === 0}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                type="button"
                            >
                                <Trash2 size={13} />
                                {activeFiltersCount > 0 ? "Clear Matching" : "Clear All"}
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[960px] text-left text-sm">
                            <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80">
                                <th className="w-12 px-4 py-3">
                                    <button
                                        onClick={toggleSelectAll}
                                        disabled={logs.length === 0 || loading}
                                        className="flex items-center justify-center rounded-md text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                                        type="button"
                                        title={allVisibleSelected ? "Deselect all" : "Select all"}
                                    >
                                        <CheckSquare size={16} className={allVisibleSelected ? "text-blue-600" : someSelected ? "text-blue-400" : ""} />
                                    </button>
                                </th>
                                <th className="w-36 px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Time</th>
                                <th className="w-48 px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Actor</th>
                                <th className="w-44 px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Action</th>
                                <th className="w-36 px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Entity</th>
                                <th className="w-24 px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                                <th className="w-24 px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Severity</th>
                                <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Message</th>
                                <th className="w-20 px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">View</th>
                            </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <Loader2 size={22} className="animate-spin" />
                                            <span className="text-sm">Loading audit logs…</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <Filter size={22} className="opacity-40" />
                                            <span className="text-sm">No audit logs found.</span>
                                            {activeFiltersCount > 0 && (
                                                <button onClick={resetFilters} className="mt-1 text-xs font-semibold text-blue-600 hover:underline" type="button">
                                                    Clear filters
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const isSelected = selectedIds.includes(log.id);
                                    const { date, time } = formatDateCompact(log.createdAt);
                                    const sev = severityConfig(log.severity);
                                    const sta = statusConfig(log.success);

                                    return (
                                        <tr
                                            key={log.id}
                                            className={`group transition-colors ${isSelected ? "bg-blue-50/60" : "hover:bg-slate-50/60"}`}
                                        >
                                            {/* Checkbox */}
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectOne(log.id)}
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                                                />
                                            </td>

                                            {/* Time */}
                                            <td className="px-3 py-3">
                                                <span className="block text-sm font-medium text-slate-700">{date}</span>
                                                <span className="block text-xs text-slate-400">{time}</span>
                                            </td>

                                            {/* Actor */}
                                            <td className="px-3 py-3">
                                                    <span className="block max-w-[11rem] truncate text-sm font-semibold text-slate-800">
                                                        {log.actorName || log.actor?.fullName || "System"}
                                                    </span>
                                                <span className="block max-w-[11rem] truncate text-xs text-slate-400">
                                                        {log.actorEmail || log.actor?.email || "—"}
                                                    </span>
                                            </td>

                                            {/* Action */}
                                            <td className="px-3 py-3">
                                                    <span className="inline-block max-w-[10rem] truncate rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                                        {formatLabel(log.action)}
                                                    </span>
                                            </td>

                                            {/* Entity */}
                                            <td className="px-3 py-3">
                                                    <span className="block max-w-[8rem] truncate text-xs font-medium text-slate-600">
                                                        {formatLabel(log.entityType)}
                                                    </span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-3 py-3">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${sta.cls}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${sta.dot}`} />
                                                        {log.success ? "Success" : "Failed"}
                                                    </span>
                                            </td>

                                            {/* Severity */}
                                            <td className="px-3 py-3">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${sev.cls}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
                                                        {formatLabel(log.severity)}
                                                    </span>
                                            </td>

                                            {/* Message */}
                                            <td className="px-3 py-3">
                                                <p className="line-clamp-2 max-w-xs text-xs leading-relaxed text-slate-600">
                                                    {log.message}
                                                </p>
                                            </td>

                                            {/* View */}
                                            <td className="px-3 py-3 text-right">
                                                <button
                                                    onClick={() => openDetails(log.id)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-slate-50 focus:opacity-100"
                                                    type="button"
                                                >
                                                    <Eye size={13} />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row">
                        <div className="flex items-center gap-4">
                            <p className="text-xs text-slate-400">
                                Page <span className="font-semibold text-slate-700">{currentPage}</span> of{" "}
                                <span className="font-semibold text-slate-700">{totalPages}</span>
                            </p>
                            {selectedIds.length > 0 && (
                                <span className="text-xs font-medium text-blue-600">
                                    {selectedIds.length} selected on this page
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage <= 1 || loading}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                type="button"
                            >
                                <ChevronLeft size={14} />
                                Previous
                            </button>

                            {/* Page number pills */}
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                                if (page < 1 || page > totalPages) return null;
                                return (
                                    <button
                                        key={page}
                                        onClick={() => goToPage(page)}
                                        disabled={loading}
                                        className={`h-8 w-8 rounded-lg text-xs font-semibold transition ${
                                            page === currentPage
                                                ? "bg-slate-900 text-white"
                                                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        } disabled:cursor-not-allowed`}
                                        type="button"
                                    >
                                        {page}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage >= totalPages || loading}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                type="button"
                            >
                                Next
                                <ChevronRight size={14} />
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
                    onConfirm={confirmAction === "selected" ? handleDeleteSelected : handleClearAll}
                />
            )}

            <AuditDetailsModal
                log={selectedLog}
                loading={detailsLoading}
                onClose={() => { setSelectedLog(null); setDetailsLoading(false); }}
            />
        </>
    );
}