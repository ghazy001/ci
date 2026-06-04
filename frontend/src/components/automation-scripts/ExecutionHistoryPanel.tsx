'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    Download,
    Eye,
    FileText,
    History,
    Loader2,
    RefreshCcw,
    Search,
    Square,
    X,
    XCircle,
} from 'lucide-react';
import {
    AutomationScriptExecution,
    DefectReport,
    TestSuiteReport,
    createDefectReportForExecution,
    createTestSuiteReport,
    downloadDefectReportPdf,
    downloadTestSuiteReportPdf,
    getDefectReportByExecution,
    getScriptExecutions,
    getTestSuiteReportsByScript,
} from '@/lib/script-execution.service';

type Props = {
    scriptId: string;
    refreshKey?: number;
    onSelect?: (execution: AutomationScriptExecution) => void;
};

type StatusFilter = 'ALL' | AutomationScriptExecution['status'];

/* ─────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────────── */

const statusLabel: Record<string, string> = {
    QUEUED:    'Queued',
    RUNNING:   'Running',
    PASSED:    'Passed',
    FAILED:    'Failed',
    TIMED_OUT: 'Timed out',
    CANCELED:  'Canceled',
};

function getStatusIcon(status: AutomationScriptExecution['status']) {
    if (status === 'PASSED')    return <CheckCircle2 className="h-3 w-3" />;
    if (status === 'FAILED')    return <XCircle       className="h-3 w-3" />;
    if (status === 'TIMED_OUT') return <AlertTriangle className="h-3 w-3" />;
    if (status === 'CANCELED')  return <Square        className="h-3 w-3" />;
    if (status === 'RUNNING')   return <Loader2       className="h-3 w-3 animate-spin" />;
    return                             <Clock         className="h-3 w-3" />;
}

function getStatusClass(status: AutomationScriptExecution['status']) {
    if (status === 'PASSED')    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    if (status === 'FAILED')    return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    if (status === 'TIMED_OUT') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    if (status === 'RUNNING')   return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
    if (status === 'CANCELED')  return 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';
    return 'bg-slate-50 text-slate-500 ring-1 ring-slate-200';
}

function getStatusDotClass(status: AutomationScriptExecution['status']) {
    if (status === 'PASSED')    return 'bg-emerald-500';
    if (status === 'FAILED')    return 'bg-red-500';
    if (status === 'TIMED_OUT') return 'bg-amber-500';
    if (status === 'RUNNING')   return 'bg-blue-500 animate-pulse';
    if (status === 'CANCELED')  return 'bg-slate-400';
    return 'bg-slate-300';
}

function formatDate(value?: string | null) {
    if (!value) return '—';
    return new Intl.DateTimeFormat(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(value));
}

function formatDuration(startedAt?: string | null, completedAt?: string | null) {
    if (!startedAt) return '—';
    const start  = new Date(startedAt).getTime();
    const end    = completedAt ? new Date(completedAt).getTime() : Date.now();
    const diffMs = Math.max(0, end - start);
    if (diffMs < 1000) return `${diffMs}ms`;
    const seconds = Math.round(diffMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
}

function getArtifactCount(execution: AutomationScriptExecution) {
    return Array.isArray(execution.artifacts) ? execution.artifacts.length : 0;
}

function canHaveDefectReport(execution: AutomationScriptExecution) {
    return execution.status === 'FAILED' || execution.status === 'TIMED_OUT';
}

function canBeIncludedInSuiteReport(execution: AutomationScriptExecution) {
    return ['PASSED', 'FAILED', 'TIMED_OUT', 'CANCELED'].includes(execution.status);
}

/* ─────────────────────────────────────────────────────────────
   Main component
──────────────────────────────────────────────────────────────── */

export function ExecutionHistoryPanel({ scriptId, refreshKey = 0, onSelect }: Props) {
    const [executions,           setExecutions]           = useState<AutomationScriptExecution[]>([]);
    const [loading,              setLoading]              = useState(false);
    const [error,                setError]                = useState<string | null>(null);
    const [statusFilter,         setStatusFilter]         = useState<StatusFilter>('ALL');
    const [query,                setQuery]                = useState('');
    const [collapsed,            setCollapsed]            = useState(true);

    const [selectedExecutionIds, setSelectedExecutionIds] = useState<string[]>([]);
    const [selectedDefectReport, setSelectedDefectReport] = useState<DefectReport | null>(null);
    const [createdSuiteReport,   setCreatedSuiteReport]   = useState<TestSuiteReport | null>(null);
    const [reportLoading,        setReportLoading]        = useState(false);
    const [reportError,          setReportError]          = useState<string | null>(null);
    const [suiteReports,         setSuiteReports]         = useState<TestSuiteReport[]>([]);

    const loadExecutions = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getScriptExecutions(scriptId);
            setExecutions(data);
            setSelectedExecutionIds((cur) =>
                cur.filter((id) => data.some((e) => e.id === id && canBeIncludedInSuiteReport(e)))
            );
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to load execution history.');
        } finally {
            setLoading(false);
        }
    };

    const loadSuiteReports = async () => {
        try {
            const data = await getTestSuiteReportsByScript(scriptId);
            setSuiteReports(data);
        } catch (err: any) {
            setReportError(err?.response?.data?.message || 'Failed to load saved suite reports.');
        }
    };

    useEffect(() => {
        void loadExecutions();
        void loadSuiteReports();
         
    }, [scriptId, refreshKey]);

    const summary = useMemo(() => executions.reduce(
        (acc, e) => {
            acc.total += 1;
            if (e.status === 'PASSED')                             acc.passed  += 1;
            if (e.status === 'FAILED' || e.status === 'TIMED_OUT') acc.failed  += 1;
            if (e.status === 'RUNNING' || e.status === 'QUEUED')   acc.running += 1;
            return acc;
        },
        { total: 0, passed: 0, failed: 0, running: 0 }
    ), [executions]);

    const passRate = summary.total > 0
        ? Math.round((summary.passed / summary.total) * 100)
        : null;

    const filteredExecutions = useMemo(() => {
        const q = query.trim().toLowerCase();
        return executions.filter((e) => {
            if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
            if (!q) return true;
            return [e.status, e.browser, e.environment, e.targetUrl, e.command]
                .filter(Boolean).join(' ').toLowerCase().includes(q);
        });
    }, [executions, query, statusFilter]);

    const latestExecution = executions[0];

    const allSelectableIds = filteredExecutions
        .filter(canBeIncludedInSuiteReport)
        .map((e) => e.id);

    const allSelected =
        allSelectableIds.length > 0 &&
        allSelectableIds.every((id) => selectedExecutionIds.includes(id));

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedExecutionIds((cur) => cur.filter((id) => !allSelectableIds.includes(id)));
        } else {
            setSelectedExecutionIds((cur) => [...new Set([...cur, ...allSelectableIds])]);
        }
    };

    const toggleSelection = (id: string) =>
        setSelectedExecutionIds((cur) =>
            cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
        );

    const handleViewDefectReport = async (execution: AutomationScriptExecution) => {
        try {
            setReportLoading(true);
            setReportError(null);
            let report = await getDefectReportByExecution(execution.id);
            if (!report) report = await createDefectReportForExecution(execution.id);
            if (!report) { setReportError('No bug report available for this execution.'); return; }
            setSelectedDefectReport(report);
        } catch (err: any) {
            setReportError(err?.response?.data?.message || 'Failed to load bug report.');
        } finally {
            setReportLoading(false);
        }
    };

    const handleDownloadDefectPdf = async (executionId: string) => {
        try {
            setReportLoading(true); setReportError(null);
            await downloadDefectReportPdf(executionId);
        } catch (err: any) {
            setReportError(err?.response?.data?.message || 'Failed to download bug report PDF.');
        } finally {
            setReportLoading(false);
        }
    };

    const handleCreateSuiteReport = async () => {
        try {
            setReportLoading(true); setReportError(null);
            const report = await createTestSuiteReport({
                executionIds: selectedExecutionIds,
                title: 'Automation Test Suite Report',
            });
            setCreatedSuiteReport(report);
            setSuiteReports((cur) => [report, ...cur]);
            setSelectedExecutionIds([]);
        } catch (err: any) {
            setReportError(err?.response?.data?.message || 'Failed to create test suite report.');
        } finally {
            setReportLoading(false);
        }
    };

    const handleDownloadSuitePdf = async (reportId: string) => {
        try {
            setReportLoading(true); setReportError(null);
            await downloadTestSuiteReportPdf(reportId);
        } catch (err: any) {
            setReportError(err?.response?.data?.message || 'Failed to download test suite report PDF.');
        } finally {
            setReportLoading(false);
        }
    };

    return (
        <>
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">

                {/* ── Header ───────────────────────────────────────── */}
                <div className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="flex items-center gap-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/10 text-[var(--cap-blue)]">
                            <History size={17} strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-semibold leading-tight text-slate-900">
                                Execution History
                            </h3>
                            <p className="mt-0.5 text-[11.5px] text-slate-400">
                                Recent automation runs
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCreateSuiteReport}
                            disabled={reportLoading || selectedExecutionIds.length === 0}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--cap-blue)] px-3.5 text-[12px] font-semibold text-white transition hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {reportLoading
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <FileText className="h-3.5 w-3.5" />
                            }
                            Suite Report
                            {selectedExecutionIds.length > 0 && (
                                <span className="ml-0.5 rounded-md bg-white/25 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                                    {selectedExecutionIds.length}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={loadExecutions}
                            disabled={loading}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800 hover:shadow-sm active:scale-[0.97] disabled:opacity-50"
                            aria-label="Refresh"
                        >
                            {loading
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <RefreshCcw className="h-3.5 w-3.5" />
                            }
                        </button>
                        <button
                            type="button"
                            onClick={() => setCollapsed((v) => !v)}
                            aria-label={collapsed ? 'Expand history' : 'Collapse history'}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800 hover:shadow-sm active:scale-[0.97]"
                        >
                            {collapsed
                                ? <ChevronDown className="h-3.5 w-3.5" />
                                : <ChevronUp   className="h-3.5 w-3.5" />
                            }
                        </button>
                    </div>
                </div>

                {/* ── Collapsible body ─────────────────────────────── */}
                {!collapsed && (
                    <div className="border-t border-slate-100">

                        {/* ── Summary strip ──────────────────────────── */}
                        {executions.length > 0 && (
                            <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 sm:grid-cols-4">
                                <SummaryCell
                                    label="Total runs"
                                    value={summary.total}
                                    tone="neutral"
                                />
                                <SummaryCell
                                    label="Passed"
                                    value={summary.passed}
                                    tone="success"
                                    sub={passRate !== null ? `${passRate}% pass rate` : undefined}
                                />
                                <SummaryCell
                                    label="Failed"
                                    value={summary.failed}
                                    tone="danger"
                                />
                                <SummaryCell
                                    label="Active"
                                    value={summary.running}
                                    tone="info"
                                />
                            </div>
                        )}

                        {/* ── Alerts ─────────────────────────────────── */}
                        {(error || reportError) && (
                            <div className="space-y-2 border-b border-slate-100 px-6 py-3">
                                {error && (
                                    <Alert variant="danger" message={error} onDismiss={() => setError(null)} />
                                )}
                                {reportError && (
                                    <Alert variant="warning" message={reportError} onDismiss={() => setReportError(null)} />
                                )}
                            </div>
                        )}

                        {/* ── Selection banner ───────────────────────── */}
                        {selectedExecutionIds.length > 0 && (
                            <div className="flex items-center justify-between gap-3 border-b border-[var(--cap-blue)]/10 bg-[var(--cap-blue)]/5 px-6 py-2.5">
                                <p className="text-[12.5px] text-slate-600">
                                    <span className="font-semibold text-[var(--cap-blue)]">{selectedExecutionIds.length}</span>
                                    {' '}execution{selectedExecutionIds.length === 1 ? '' : 's'} selected for suite report
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setSelectedExecutionIds([])}
                                    className="inline-flex items-center gap-1 text-[11.5px] font-medium text-slate-400 transition hover:text-slate-700"
                                >
                                    <X className="h-3 w-3" /> Clear
                                </button>
                            </div>
                        )}

                        {/* ── Created suite report banner ────────────── */}
                        {createdSuiteReport && (
                            <div className="mx-6 my-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-semibold text-emerald-900">Suite report created</p>
                                            <p className="mt-0.5 text-[11.5px] text-emerald-700">
                                                {createdSuiteReport.status} · Pass rate {createdSuiteReport.passRate}% · {createdSuiteReport.total} total
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadSuitePdf(createdSuiteReport.id)}
                                        disabled={reportLoading}
                                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-[12px] font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.97] disabled:opacity-50"
                                    >
                                        {reportLoading
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <Download className="h-3.5 w-3.5" />
                                        }
                                        Download PDF
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Saved suite reports ────────────────────── */}
                        {suiteReports.length > 0 && (
                            <div className="border-b border-slate-100 px-6 py-4">
                                <p className="mb-1 text-[12.5px] font-semibold text-slate-800">Saved suite reports</p>
                                <p className="mb-3 text-[11.5px] text-slate-400">
                                    Previously generated reports for this script
                                </p>
                                <div className="space-y-2">
                                    {suiteReports.slice(0, 3).map((report) => (
                                        <div
                                            key={report.id}
                                            className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div>
                                                <p className="text-[12.5px] font-semibold text-slate-800">{report.title}</p>
                                                <p className="mt-0.5 text-[11px] text-slate-400">
                                                    {report.status} · Pass rate {report.passRate}% · {report.total} total · {formatDate(report.createdAt)}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadSuitePdf(report.id)}
                                                disabled={reportLoading}
                                                className="inline-flex h-7 w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 active:scale-[0.97] disabled:opacity-50"
                                            >
                                                {reportLoading
                                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                                    : <Download className="h-3 w-3" />
                                                }
                                                PDF
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Loading ────────────────────────────────── */}
                        {loading && executions.length === 0 && !error && (
                            <div className="flex items-center justify-center gap-3 py-14 text-[13px] text-slate-400">
                                <Loader2 className="h-4 w-4 animate-spin text-[var(--cap-blue)]" />
                                Loading execution history…
                            </div>
                        )}

                        {/* ── Empty state ────────────────────────────── */}
                        {!loading && executions.length === 0 && !error && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                    <History className="h-5 w-5" strokeWidth={1.6} />
                                </div>
                                <p className="text-[13.5px] font-semibold text-slate-800">No runs yet</p>
                                <p className="mt-1.5 max-w-xs text-[12px] text-slate-400">
                                    Run this approved script to create the first execution record.
                                </p>
                            </div>
                        )}

                        {/* ── Execution list ──────────────────────────── */}
                        {executions.length > 0 && (
                            <div className="px-6 pb-6">

                                {/* ── Latest run highlight ─────────── */}
                                {latestExecution && (
                                    <div className="my-5">
                                        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                            Latest run
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => onSelect?.(latestExecution)}
                                            className="group flex w-full items-start gap-4 rounded-2xl border border-[var(--cap-blue)]/15 bg-gradient-to-br from-[var(--cap-blue)]/[0.04] to-[var(--cap-blue)]/[0.02] p-4 text-left transition hover:border-[var(--cap-blue)]/25 hover:from-[var(--cap-blue)]/[0.06] hover:to-[var(--cap-blue)]/[0.04] active:scale-[0.995]"
                                        >
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-slate-400 shadow-sm ring-1 ring-slate-200/80">
                                                <div className={`h-2.5 w-2.5 rounded-full ${getStatusDotClass(latestExecution.status)}`} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <StatusBadge status={latestExecution.status} />
                                                    <span className="text-[11px] text-slate-400">
                                                        {latestExecution.browser || 'Default browser'} · {latestExecution.environment || 'Default env'}
                                                    </span>
                                                </div>
                                                <p className="mt-2 truncate text-[13px] font-medium text-slate-800">
                                                    {latestExecution.targetUrl || 'No target URL provided'}
                                                </p>
                                                <div className="mt-1.5 flex items-center gap-3 text-[11.5px] text-slate-400">
                                                    <span><Clock className="mb-0.5 inline h-3 w-3" /> {formatDuration(latestExecution.startedAt, latestExecution.completedAt)}</span>
                                                    <span>{formatDate(latestExecution.createdAt)}</span>
                                                </div>
                                            </div>
                                            <span className="inline-flex shrink-0 items-center gap-1 self-center rounded-lg border border-[var(--cap-blue)]/20 bg-white/70 px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--cap-blue)] transition group-hover:bg-white/90">
                                                View <Eye className="h-3 w-3" />
                                            </span>
                                        </button>
                                    </div>
                                )}

                                {/* ── Filter bar ───────────────────── */}
                                <div className="mb-3 flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
                                    <label className="relative flex-1">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            placeholder="Search URL, browser, environment…"
                                            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-9 text-[12.5px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[var(--cap-blue)]/40 focus:bg-white focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                        />
                                        {query && (
                                            <button
                                                type="button"
                                                onClick={() => setQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                                        className="h-9 rounded-xl border border-slate-200 bg-slate-50/60 px-3 pr-8 text-[12.5px] text-slate-700 outline-none transition focus:border-[var(--cap-blue)]/40 focus:bg-white focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                    >
                                        <option value="ALL">All statuses</option>
                                        <option value="PASSED">Passed</option>
                                        <option value="FAILED">Failed</option>
                                        <option value="RUNNING">Running</option>
                                        <option value="QUEUED">Queued</option>
                                        <option value="TIMED_OUT">Timed out</option>
                                        <option value="CANCELED">Canceled</option>
                                    </select>
                                </div>

                                {/* ── Results count ────────────────── */}
                                <p className="mb-2 text-[11px] text-slate-400">
                                    {filteredExecutions.length} of {executions.length} run{executions.length !== 1 ? 's' : ''}
                                    {query || statusFilter !== 'ALL' ? ' (filtered)' : ''}
                                </p>

                                {filteredExecutions.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-center">
                                        <p className="text-[13px] font-medium text-slate-500">No executions match your filters</p>
                                        <p className="mt-1 text-[11.5px] text-slate-400">
                                            Try clearing the search or changing the status filter
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-hidden rounded-xl border border-slate-200/80">
                                        {/* ── Table ────────────────────── */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[640px] border-collapse">
                                                <thead>
                                                <tr className="bg-slate-50/80">
                                                    <th className="w-10 border-b border-slate-100 px-4 py-3 text-left">
                                                        <input
                                                            type="checkbox"
                                                            checked={allSelected}
                                                            onChange={toggleSelectAll}
                                                            className="h-3.5 w-3.5 rounded border-slate-300 accent-[var(--cap-blue)]"
                                                            aria-label="Select all visible executions"
                                                        />
                                                    </th>
                                                    <th className="border-b border-slate-100 px-4 py-3 text-left">
                                                        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">Run</span>
                                                    </th>
                                                    <th className="w-28 border-b border-slate-100 px-4 py-3 text-left">
                                                        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">Duration</span>
                                                    </th>
                                                    <th className="w-24 border-b border-slate-100 px-4 py-3 text-center">
                                                        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">Files</span>
                                                    </th>
                                                    <th className="w-36 border-b border-slate-100 px-4 py-3 text-left">
                                                        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">Created</span>
                                                    </th>
                                                    <th className="w-44 border-b border-slate-100 px-4 py-3 text-right">
                                                        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">Actions</span>
                                                    </th>
                                                </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100/80">
                                                {filteredExecutions.map((execution) => (
                                                    <ExecutionRow
                                                        key={execution.id}
                                                        execution={execution}
                                                        selected={selectedExecutionIds.includes(execution.id)}
                                                        onToggleSelected={() => toggleSelection(execution.id)}
                                                        onSelect={() => onSelect?.(execution)}
                                                        onViewDefectReport={() => handleViewDefectReport(execution)}
                                                        onDownloadDefectPdf={() => handleDownloadDefectPdf(execution.id)}
                                                        reportLoading={reportLoading}
                                                    />
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* ── Defect report modal ──────────────────────────────── */}
            {selectedDefectReport && (
                <DefectReportModal
                    report={selectedDefectReport}
                    loading={reportLoading}
                    onClose={() => setSelectedDefectReport(null)}
                    onDownloadPdf={() => handleDownloadDefectPdf(selectedDefectReport.executionId)}
                />
            )}
        </>
    );
}

/* ─────────────────────────────────────────────────────────────
   SummaryCell
──────────────────────────────────────────────────────────────── */

function SummaryCell({ label, value, tone = 'neutral', sub }: {
    label: string;
    value: number;
    tone?: 'neutral' | 'success' | 'danger' | 'info';
    sub?: string;
}) {
    const valCls = {
        neutral: 'text-slate-900',
        success: 'text-emerald-600',
        danger:  'text-red-600',
        info:    'text-blue-600',
    }[tone];

    return (
        <div className="flex flex-col justify-center px-6 py-4">
            <p className={`text-[22px] font-bold tabular-nums leading-none tracking-tight ${valCls}`}>
                {value}
            </p>
            <p className="mt-1.5 text-[11px] font-medium text-slate-400">{label}</p>
            {sub && (
                <p className="mt-0.5 text-[10.5px] text-slate-300">{sub}</p>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Alert
──────────────────────────────────────────────────────────────── */

function Alert({ variant, message, onDismiss }: {
    variant: 'danger' | 'warning';
    message: string;
    onDismiss?: () => void;
}) {
    const cls = variant === 'danger'
        ? 'border-red-100 bg-red-50 text-red-700'
        : 'border-amber-100 bg-amber-50 text-amber-700';

    return (
        <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 ${cls}`}>
            <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p className="text-[12.5px] leading-relaxed">{message}</p>
            </div>
            {onDismiss && (
                <button type="button" onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100">
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   ExecutionRow — table row
──────────────────────────────────────────────────────────────── */

function ExecutionRow({
                          execution, selected, onToggleSelected, onSelect,
                          onViewDefectReport, onDownloadDefectPdf, reportLoading,
                      }: {
    execution: AutomationScriptExecution;
    selected: boolean;
    onToggleSelected: () => void;
    onSelect: () => void;
    onViewDefectReport: () => void;
    onDownloadDefectPdf: () => void;
    reportLoading: boolean;
}) {
    const artifactsCount = getArtifactCount(execution);
    const reportable     = canBeIncludedInSuiteReport(execution);
    const hasDefect      = canHaveDefectReport(execution);

    return (
        <tr
            className={`group transition-colors ${
                selected
                    ? 'bg-[var(--cap-blue)]/[0.03]'
                    : 'hover:bg-slate-50/70'
            }`}
        >
            {/* Checkbox */}
            <td className="w-10 px-4 py-3.5 align-middle">
                {reportable ? (
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={onToggleSelected}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5 rounded border-slate-300 accent-[var(--cap-blue)]"
                        aria-label="Select execution for suite report"
                    />
                ) : (
                    <span className="block h-3.5 w-3.5" />
                )}
            </td>

            {/* Run info */}
            <td className="px-4 py-3.5 align-middle">
                <button type="button" onClick={onSelect} className="min-w-0 text-left">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={execution.status} />
                        <MetaPill label={execution.browser || 'Default'} />
                        <MetaPill label={execution.environment || 'Default env'} />
                    </div>
                    <p className="mt-1.5 max-w-sm truncate text-[11.5px] text-slate-400 transition group-hover:text-slate-500">
                        {execution.targetUrl || 'No target URL'}
                    </p>
                </button>
            </td>

            {/* Duration */}
            <td className="w-28 px-4 py-3.5 align-middle">
                <span className="text-[12.5px] font-medium tabular-nums text-slate-700">
                    {formatDuration(execution.startedAt, execution.completedAt)}
                </span>
            </td>

            {/* Artifacts */}
            <td className="w-24 px-4 py-3.5 text-center align-middle">
                {artifactsCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--cap-blue)]/8 px-2.5 py-1 text-[11px] font-semibold text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/15">
                        <Download className="h-2.5 w-2.5" />
                        {artifactsCount}
                    </span>
                ) : (
                    <span className="text-[12px] text-slate-300">—</span>
                )}
            </td>

            {/* Date */}
            <td className="w-36 px-4 py-3.5 align-middle">
                <span className="text-[11.5px] tabular-nums text-slate-500">
                    {formatDate(execution.createdAt)}
                </span>
            </td>

            {/* Actions */}
            <td className="w-44 px-4 py-3.5 align-middle">
                <div className="flex items-center justify-end gap-1.5">
                    {hasDefect && (
                        <>
                            <button
                                type="button"
                                onClick={onViewDefectReport}
                                disabled={reportLoading}
                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2.5 text-[11px] font-medium text-red-700 transition hover:bg-red-100 active:scale-[0.97] disabled:opacity-50"
                            >
                                <AlertTriangle className="h-3 w-3" />
                                Bug
                            </button>
                            <button
                                type="button"
                                onClick={onDownloadDefectPdf}
                                disabled={reportLoading}
                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 active:scale-[0.97] disabled:opacity-50"
                            >
                                <Download className="h-3 w-3" />
                                PDF
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={onSelect}
                        className="inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[11px] font-medium text-[var(--cap-blue)] transition hover:bg-[var(--cap-blue)]/8 active:scale-[0.97]"
                    >
                        Details <Eye className="h-3 w-3" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

/* ─────────────────────────────────────────────────────────────
   DefectReportModal
──────────────────────────────────────────────────────────────── */

function DefectReportModal({ report, loading, onClose, onDownloadPdf }: {
    report: DefectReport;
    loading: boolean;
    onClose: () => void;
    onDownloadPdf: () => void;
}) {
    return (
            <div
                role="button"
                tabIndex={0}
                aria-label="Close modal"
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
                 onClick={(e) => {
                                    if (e.target === e.currentTarget) {
                                     onClose();
                                    }
                                }}
                onKeyDown={(e) => {
                        if (e.key === "Escape") {
                        onClose();
                        return;
                        }

                        if (
                        e.target === e.currentTarget &&
                        (e.key === "Enter" || e.key === " ")
                        ) {
                        e.preventDefault();
                        onClose();
                        }
                }}
            >
            <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">

                {/* Modal header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div className="flex items-start gap-3.5">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <AlertTriangle size={17} strokeWidth={2} />
                        </div>
                        <div>
                            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-red-500">
                                Defect Report
                            </p>
                            <h2 className="mt-0.5 text-[16px] font-semibold leading-snug text-slate-900">
                                {report.title}
                            </h2>
                            <div className="mt-1.5 flex items-center gap-1.5">
                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-600">
                                    {report.status}
                                </span>
                                <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[10.5px] font-medium text-red-700">
                                    {report.severity}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 active:scale-[0.97]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Modal body — scrollable */}
                <div className="max-h-[calc(90vh-130px)] overflow-y-auto">
                    <div className="space-y-5 px-6 py-5">

                        <ModalSection title="Summary">
                            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">
                                {report.summary || '—'}
                            </p>
                        </ModalSection>

                        <ModalSection title="Failure reason">
                            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">
                                {report.failureReason || '—'}
                            </p>
                        </ModalSection>

                        <div className="grid gap-2.5 sm:grid-cols-2">
                            <InfoItem label="Environment" value={report.environment || '—'} />
                            <InfoItem label="Browser"     value={report.browser     || '—'} />
                            <InfoItem label="Target URL"  value={report.targetUrl   || '—'} />
                            <InfoItem
                                label="Exit code"
                                value={report.exitCode === null || report.exitCode === undefined ? '—' : String(report.exitCode)}
                            />
                        </div>

                        <ModalSection title="Command">
                            <CodeBlock content={report.command || '—'} maxHeight="h-32" />
                        </ModalSection>

                        <ModalSection title="STDERR excerpt">
                            <CodeBlock content={report.stderrExcerpt || '—'} maxHeight="h-52" tone="error" />
                        </ModalSection>

                        <ModalSection title="STDOUT excerpt">
                            <CodeBlock content={report.stdoutExcerpt || '—'} maxHeight="h-52" />
                        </ModalSection>

                    </div>
                </div>

                {/* Modal footer */}
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
                    <p className="text-[11px] text-slate-400">
                        Execution ID: <span className="font-mono">{report.executionId}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 hover:border-slate-300 active:scale-[0.97]"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={onDownloadPdf}
                            disabled={loading}
                            className="inline-flex h-9 items-center gap-2 rounded-xl bg-red-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.97] disabled:opacity-50"
                        >
                            {loading
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Download className="h-4 w-4" />
                            }
                            Download PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Primitives
──────────────────────────────────────────────────────────────── */

function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h3 className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {title}
            </h3>
            {children}
        </section>
    );
}

function CodeBlock({ content, maxHeight, tone }: {
    content: string;
    maxHeight?: string;
    tone?: 'error';
}) {
    return (
        <pre className={`overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-[11.5px] leading-relaxed ${maxHeight ?? ''} ${tone === 'error' ? 'text-red-300' : 'text-slate-200'}`}>
            {content}
        </pre>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-slate-400">{label}</p>
            <p className="mt-1 break-all text-[12.5px] font-medium text-slate-800">{value}</p>
        </div>
    );
}

function MetaPill({ label }: { label: string }) {
    return (
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-500">
            {label}
        </span>
    );
}

function StatusBadge({ status }: { status: AutomationScriptExecution['status'] }) {
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10.5px] font-semibold ${getStatusClass(status)}`}>
            {getStatusIcon(status)}
            {statusLabel[status] || status}
        </span>
    );
}