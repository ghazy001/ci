'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
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

const statusLabel: Record<string, string> = {
    QUEUED: 'Queued',
    RUNNING: 'Running',
    PASSED: 'Passed',
    FAILED: 'Failed',
    TIMED_OUT: 'Timed out',
    CANCELED: 'Canceled',
};

function getStatusIcon(status: AutomationScriptExecution['status']) {
    if (status === 'PASSED') {
        return <CheckCircle2 className="h-3.5 w-3.5" />;
    }

    if (status === 'FAILED') {
        return <XCircle className="h-3.5 w-3.5" />;
    }

    if (status === 'TIMED_OUT') {
        return <AlertTriangle className="h-3.5 w-3.5" />;
    }

    if (status === 'CANCELED') {
        return <Square className="h-3.5 w-3.5" />;
    }

    if (status === 'RUNNING') {
        return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    }

    return <Clock className="h-3.5 w-3.5" />;
}

function getStatusClass(status: AutomationScriptExecution['status']) {
    if (status === 'PASSED') {
        return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
    }

    if (status === 'FAILED') {
        return 'bg-red-50 text-red-700 ring-red-100';
    }

    if (status === 'TIMED_OUT') {
        return 'bg-amber-50 text-amber-700 ring-amber-100';
    }

    if (status === 'RUNNING') {
        return 'bg-blue-50 text-blue-700 ring-blue-100';
    }

    if (status === 'CANCELED') {
        return 'bg-slate-100 text-slate-500 ring-slate-200';
    }

    return 'bg-slate-50 text-slate-600 ring-slate-200';
}

function formatDate(value?: string | null) {
    if (!value) return '-';

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function formatDuration(startedAt?: string | null, completedAt?: string | null) {
    if (!startedAt) return '-';

    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const diffMs = Math.max(0, end - start);

    if (diffMs < 1000) return `${diffMs}ms`;

    const seconds = Math.round(diffMs / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const restSeconds = seconds % 60;

    return `${minutes}m ${restSeconds}s`;
}

function getArtifactCount(execution: AutomationScriptExecution) {
    return Array.isArray(execution.artifacts) ? execution.artifacts.length : 0;
}

function canHaveDefectReport(execution: AutomationScriptExecution) {
    return execution.status === 'FAILED' || execution.status === 'TIMED_OUT';
}

function canBeIncludedInSuiteReport(execution: AutomationScriptExecution) {
    return (
        execution.status === 'PASSED' ||
        execution.status === 'FAILED' ||
        execution.status === 'TIMED_OUT' ||
        execution.status === 'CANCELED'
    );
}

export function ExecutionHistoryPanel({
                                          scriptId,
                                          refreshKey = 0,
                                          onSelect,
                                      }: Props) {
    const [executions, setExecutions] = useState<AutomationScriptExecution[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [query, setQuery] = useState('');

    const [selectedExecutionIds, setSelectedExecutionIds] = useState<string[]>([]);
    const [selectedDefectReport, setSelectedDefectReport] =
        useState<DefectReport | null>(null);
    const [createdSuiteReport, setCreatedSuiteReport] =
        useState<TestSuiteReport | null>(null);

    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);

    const [suiteReports, setSuiteReports] = useState<TestSuiteReport[]>([]);

    const loadExecutions = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await getScriptExecutions(scriptId);
            setExecutions(data);

            setSelectedExecutionIds((current) =>
                current.filter((id) =>
                    data.some(
                        (execution) =>
                            execution.id === id &&
                            canBeIncludedInSuiteReport(execution),
                    ),
                ),
            );
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                'Failed to load execution history.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadExecutions();
        void loadSuiteReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scriptId, refreshKey]);

    const summary = useMemo(() => {
        return executions.reduce(
            (acc, execution) => {
                acc.total += 1;

                if (execution.status === 'PASSED') acc.passed += 1;
                if (execution.status === 'FAILED') acc.failed += 1;
                if (execution.status === 'TIMED_OUT') acc.failed += 1;
                if (execution.status === 'RUNNING' || execution.status === 'QUEUED') {
                    acc.running += 1;
                }

                return acc;
            },
            { total: 0, passed: 0, failed: 0, running: 0 },
        );
    }, [executions]);

    const filteredExecutions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return executions.filter((execution) => {
            if (statusFilter !== 'ALL' && execution.status !== statusFilter) {
                return false;
            }

            if (!normalizedQuery) {
                return true;
            }

            return [
                execution.status,
                execution.browser,
                execution.environment,
                execution.targetUrl,
                execution.command,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(normalizedQuery);
        });
    }, [executions, query, statusFilter]);

    const latestExecution = executions[0];

    const toggleExecutionSelection = (executionId: string) => {
        setSelectedExecutionIds((current) => {
            if (current.includes(executionId)) {
                return current.filter((id) => id !== executionId);
            }

            return [...current, executionId];
        });
    };

    const handleViewDefectReport = async (execution: AutomationScriptExecution) => {
        try {
            setReportLoading(true);
            setReportError(null);

            let report = await getDefectReportByExecution(execution.id);

            if (!report) {
                report = await createDefectReportForExecution(execution.id);
            }

            if (!report) {
                setReportError('No bug report is available for this execution.');
                return;
            }

            setSelectedDefectReport(report);
        } catch (err: any) {
            setReportError(
                err?.response?.data?.message ||
                'Failed to load bug report.',
            );
        } finally {
            setReportLoading(false);
        }
    };

    const handleDownloadDefectPdf = async (executionId: string) => {
        try {
            setReportLoading(true);
            setReportError(null);

            await downloadDefectReportPdf(executionId);
        } catch (err: any) {
            setReportError(
                err?.response?.data?.message ||
                'Failed to download bug report PDF.',
            );
        } finally {
            setReportLoading(false);
        }
    };

    const handleCreateSuiteReport = async () => {
        try {
            setReportLoading(true);
            setReportError(null);

            const report = await createTestSuiteReport({
                executionIds: selectedExecutionIds,
                title: 'Automation Test Suite Report',
            });

            setCreatedSuiteReport(report);
            setSuiteReports((current) => [report, ...current]);
            setSelectedExecutionIds([]);
        } catch (err: any) {
            setReportError(
                err?.response?.data?.message ||
                'Failed to create test suite report.',
            );
        } finally {
            setReportLoading(false);
        }
    };

    const handleDownloadSuitePdf = async (reportId: string) => {
        try {
            setReportLoading(true);
            setReportError(null);

            await downloadTestSuiteReportPdf(reportId);
        } catch (err: any) {
            setReportError(
                err?.response?.data?.message ||
                'Failed to download test suite report PDF.',
            );
        } finally {
            setReportLoading(false);
        }
    };

    const loadSuiteReports = async () => {
        try {
            const data = await getTestSuiteReportsByScript(scriptId);
            setSuiteReports(data);
        } catch (err: any) {
            setReportError(
                err?.response?.data?.message ||
                'Failed to load saved suite reports.',
            );
        }
    };


    return (
        <>
            <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
                <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/10">
                                <History className="h-4 w-4" />
                            </div>

                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                                    Execution History
                                </p>
                                <h3 className="mt-0.5 text-base font-bold text-slate-900">
                                    Recent automation runs
                                </h3>
                                <p className="mt-1 text-sm leading-6 text-slate-400">
                                    Review previous runs, check failures, generate bug reports, and export suite reports.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCreateSuiteReport}
                                disabled={reportLoading || selectedExecutionIds.length === 0}
                                className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-[var(--cap-blue)] px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {reportLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <FileText className="h-3.5 w-3.5" />
                                )}
                                Generate Suite Report
                            </button>

                            <button
                                type="button"
                                onClick={loadExecutions}
                                disabled={loading}
                                className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <RefreshCcw className="h-3.5 w-3.5" />
                                )}
                                Refresh
                            </button>
                        </div>
                    </div>

                    {executions.length > 0 && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-4">
                            <SummaryCard label="Runs" value={summary.total} />
                            <SummaryCard label="Passed" value={summary.passed} tone="success" />
                            <SummaryCard label="Failed" value={summary.failed} tone="danger" />
                            <SummaryCard label="Active" value={summary.running} tone="info" />
                        </div>
                    )}

                    {selectedExecutionIds.length > 0 && (
                        <div className="mt-4 rounded-2xl border border-[var(--cap-blue)]/15 bg-white px-4 py-3 text-sm text-slate-600">
                            <span className="font-semibold text-slate-900">
                                {selectedExecutionIds.length}
                            </span>{' '}
                            execution(s) selected for suite report.
                        </div>
                    )}

                    {createdSuiteReport && (
                        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-bold text-emerald-800">
                                        Suite report created
                                    </p>
                                    <p className="mt-1 text-xs text-emerald-700">
                                        {createdSuiteReport.status} · Pass rate {createdSuiteReport.passRate}% · Total {createdSuiteReport.total}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleDownloadSuitePdf(createdSuiteReport.id)}
                                    disabled={reportLoading}
                                    className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {reportLoading ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Download className="h-3.5 w-3.5" />
                                    )}
                                    Download Suite PDF
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {suiteReports.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-slate-900">
                                    Saved suite reports
                                </p>
                                <p className="text-xs text-slate-400">
                                    Download previous generated reports for this script.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {suiteReports.slice(0, 3).map((report) => (
                                <div
                                    key={report.id}
                                    className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            {report.title}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {report.status} · Pass rate {report.passRate}% · Total{' '}
                                            {report.total} · {formatDate(report.createdAt)}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleDownloadSuitePdf(report.id)}
                                        disabled={reportLoading}
                                        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {reportLoading ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Download className="h-3.5 w-3.5" />
                                        )}
                                        PDF
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="m-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}

                {reportError && (
                    <div className="m-4 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {reportError}
                    </div>
                )}

                {loading && executions.length === 0 && !error && (
                    <div className="flex items-center gap-3 px-5 py-8 text-sm text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--cap-blue)]" />
                        Loading execution history…
                    </div>
                )}

                {!loading && executions.length === 0 && !error && (
                    <div className="px-5 py-10 text-center">
                        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <History className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800">
                            No runs yet
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                            Run this approved script to create the first execution record.
                        </p>
                    </div>
                )}

                {executions.length > 0 && (
                    <div className="p-4 sm:p-5">
                        {latestExecution && (
                            <button
                                type="button"
                                onClick={() => onSelect?.(latestExecution)}
                                className="mb-4 flex w-full flex-col gap-3 rounded-2xl border border-[var(--cap-blue)]/15 bg-[var(--cap-blue)]/5 p-4 text-left transition hover:bg-[var(--cap-blue)]/8 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <StatusBadge status={latestExecution.status} />
                                        <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/10">
                                            Latest run
                                        </span>
                                    </div>
                                    <p className="mt-2 truncate text-sm font-medium text-slate-900">
                                        {latestExecution.targetUrl || 'No target URL provided'}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {latestExecution.browser || 'Default browser'} · {latestExecution.environment || 'Default environment'}
                                    </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                                    <span>
                                        {formatDuration(latestExecution.startedAt, latestExecution.completedAt)}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[var(--cap-blue)]">
                                        View
                                        <Eye className="h-3.5 w-3.5" />
                                    </span>
                                </div>
                            </button>
                        )}

                        <div className="mb-3 grid gap-3 lg:grid-cols-[1fr_180px]">
                            <label className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Search URL, browser, environment, command…"
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[var(--cap-blue)]/40 focus:bg-white focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                />
                            </label>

                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-[var(--cap-blue)]/40 focus:bg-white focus:ring-2 focus:ring-[var(--cap-blue)]/10"
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

                        {filteredExecutions.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center text-sm text-slate-400">
                                No executions match your filters.
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                                <div className="hidden grid-cols-[44px_1fr_120px_120px_120px_190px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 lg:grid">
                                    <span>Select</span>
                                    <span>Run</span>
                                    <span>Duration</span>
                                    <span>Artifacts</span>
                                    <span>Created</span>
                                    <span className="text-right">Actions</span>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {filteredExecutions.map((execution) => (
                                        <ExecutionRow
                                            key={execution.id}
                                            execution={execution}
                                            selected={selectedExecutionIds.includes(execution.id)}
                                            onToggleSelected={() => toggleExecutionSelection(execution.id)}
                                            onSelect={() => onSelect?.(execution)}
                                            onViewDefectReport={() => handleViewDefectReport(execution)}
                                            onDownloadDefectPdf={() => handleDownloadDefectPdf(execution.id)}
                                            reportLoading={reportLoading}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {selectedDefectReport && (
                <DefectReportModal
                    report={selectedDefectReport}
                    loading={reportLoading}
                    onClose={() => setSelectedDefectReport(null)}
                    onDownloadPdf={() =>
                        handleDownloadDefectPdf(selectedDefectReport.executionId)
                    }
                />
            )}
        </>
    );
}

function SummaryCard({
                         label,
                         value,
                         tone = 'neutral',
                     }: {
    label: string;
    value: number;
    tone?: 'neutral' | 'success' | 'danger' | 'info';
}) {
    const toneClass = {
        neutral: 'text-slate-900',
        success: 'text-emerald-600',
        danger: 'text-red-600',
        info: 'text-blue-600',
    }[tone];

    return (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
            <p className={`text-xl font-bold ${toneClass}`}>{value}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {label}
            </p>
        </div>
    );
}

function ExecutionRow({
                          execution,
                          selected,
                          onToggleSelected,
                          onSelect,
                          onViewDefectReport,
                          onDownloadDefectPdf,
                          reportLoading,
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
    const reportable = canBeIncludedInSuiteReport(execution);
    const hasDefectReport = canHaveDefectReport(execution);

    return (
        <div className="grid w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 lg:grid-cols-[44px_1fr_120px_120px_120px_190px] lg:items-center">
            <div>
                {reportable ? (
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={onToggleSelected}
                        onClick={(event) => event.stopPropagation()}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--cap-blue)] focus:ring-[var(--cap-blue)]"
                        aria-label="Select execution for suite report"
                    />
                ) : (
                    <span className="text-slate-300">—</span>
                )}
            </div>

            <button
                type="button"
                onClick={onSelect}
                className="min-w-0 text-left"
            >
                <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={execution.status} />
                    <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        {execution.browser || 'Default browser'}
                    </span>
                    <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        {execution.environment || 'Default env'}
                    </span>
                </div>

                <p className="mt-2 truncate text-xs text-slate-500">
                    {execution.targetUrl || 'No target URL'}
                </p>
            </button>

            <div className="text-xs text-slate-500">
                <span className="lg:hidden">Duration: </span>
                <strong className="font-semibold text-slate-700">
                    {formatDuration(execution.startedAt, execution.completedAt)}
                </strong>
            </div>

            <div className="text-xs text-slate-500">
                {artifactsCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--cap-blue)]/8 px-2 py-1 font-semibold text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/10">
                        <Download className="h-3 w-3" />
                        {artifactsCount}
                    </span>
                ) : (
                    <span className="text-slate-400">—</span>
                )}
            </div>

            <div className="text-xs text-slate-500">
                {formatDate(execution.createdAt)}
            </div>

            <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                {hasDefectReport && (
                    <>
                        <button
                            type="button"
                            onClick={onViewDefectReport}
                            disabled={reportLoading}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Bug
                        </button>

                        <button
                            type="button"
                            onClick={onDownloadDefectPdf}
                            disabled={reportLoading}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Download className="h-3.5 w-3.5" />
                            PDF
                        </button>
                    </>
                )}

                <button
                    type="button"
                    onClick={onSelect}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--cap-blue)] transition hover:bg-[var(--cap-blue)]/8"
                >
                    Details
                    <Eye className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}

function DefectReportModal({
                               report,
                               loading,
                               onClose,
                               onDownloadPdf,
                           }: {
    report: DefectReport;
    loading: boolean;
    onClose: () => void;
    onDownloadPdf: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-600">
                            Defect / Bug Report
                        </p>
                        <h2 className="mt-1 text-lg font-bold text-slate-900">
                            {report.title}
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                            {report.status} · {report.severity}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-5 px-5 py-5 text-sm">
                    <section>
                        <h3 className="font-semibold text-slate-900">Summary</h3>
                        <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-600">
                            {report.summary || '-'}
                        </p>
                    </section>

                    <section>
                        <h3 className="font-semibold text-slate-900">Failure reason</h3>
                        <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-600">
                            {report.failureReason || '-'}
                        </p>
                    </section>

                    <section className="grid gap-3 sm:grid-cols-2">
                        <InfoItem label="Environment" value={report.environment || '-'} />
                        <InfoItem label="Browser" value={report.browser || '-'} />
                        <InfoItem label="Target URL" value={report.targetUrl || '-'} />
                        <InfoItem
                            label="Exit code"
                            value={
                                report.exitCode === null || report.exitCode === undefined
                                    ? '-'
                                    : String(report.exitCode)
                            }
                        />
                    </section>

                    <section>
                        <h3 className="font-semibold text-slate-900">Command</h3>
                        <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                            {report.command || '-'}
                        </pre>
                    </section>

                    <section>
                        <h3 className="font-semibold text-slate-900">STDERR excerpt</h3>
                        <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                            {report.stderrExcerpt || '-'}
                        </pre>
                    </section>

                    <section>
                        <h3 className="font-semibold text-slate-900">STDOUT excerpt</h3>
                        <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                            {report.stdoutExcerpt || '-'}
                        </pre>
                    </section>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        Close
                    </button>

                    <button
                        type="button"
                        onClick={onDownloadPdf}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {label}
            </p>
            <p className="mt-1 break-words text-sm font-medium text-slate-700">
                {value}
            </p>
        </div>
    );
}

function StatusBadge({ status }: { status: AutomationScriptExecution['status'] }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ring-1 ${getStatusClass(status)}`}
        >
            {getStatusIcon(status)}
            {statusLabel[status] || status}
        </span>
    );
}