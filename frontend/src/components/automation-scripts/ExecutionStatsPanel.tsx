'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    Clock,
    Loader2,
    RefreshCcw,
    Timer,
    TrendingUp,
    XCircle,
    Activity,
} from 'lucide-react';
import {
    AutomationScriptExecutionStats,
    getScriptExecutionStats,
} from '@/lib/script-execution.service';

type Props = {
    scriptId: string;
    refreshKey?: number;
};

function formatDuration(ms: number) {
    if (!ms) return '-';

    if (ms < 1000) {
        return `${ms}ms`;
    }

    const seconds = Math.round(ms / 1000);

    if (seconds < 60) {
        return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const restSeconds = seconds % 60;

    return `${minutes}m ${restSeconds}s`;
}

function safePercent(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(Math.round(value), 0), 100);
}

function formatDate(value?: string) {
    if (!value) return '-';
    return new Date(value).toLocaleString();
}

function StatTile({
                      label,
                      value,
                      hint,
                      icon,
                      tone = 'default',
                  }: {
    label: string;
    value: string | number;
    hint?: string;
    icon: React.ReactNode;
    tone?: 'default' | 'success' | 'danger' | 'warning' | 'info';
}) {
    const toneClass = {
        default: 'bg-white text-slate-700 ring-slate-200',
        success: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        danger: 'bg-red-50 text-red-700 ring-red-100',
        warning: 'bg-amber-50 text-amber-700 ring-amber-100',
        info: 'bg-[var(--cap-blue)]/8 text-[var(--cap-blue)] ring-[var(--cap-blue)]/10',
    }[tone];

    return (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        {label}
                    </p>
                    <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                        {value}
                    </p>
                </div>

                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${toneClass}`}>
                    {icon}
                </div>
            </div>

            {hint && <p className="mt-2 truncate text-xs text-slate-400">{hint}</p>}
        </div>
    );
}

function StatusSegment({
                           label,
                           value,
                           total,
                           className,
                       }: {
    label: string;
    value: number;
    total: number;
    className: string;
}) {
    const width = total > 0 ? `${Math.max((value / total) * 100, value > 0 ? 4 : 0)}%` : '0%';

    return (
        <div
            className={`h-full ${className}`}
            style={{ width }}
            title={`${label}: ${value}`}
        />
    );
}

function StatusBadge({ status }: { status?: string }) {
    const normalized = status || 'UNKNOWN';

    const cls =
        normalized === 'PASSED'
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
            : normalized === 'FAILED'
                ? 'bg-red-50 text-red-700 ring-red-100'
                : normalized === 'TIMED_OUT'
                    ? 'bg-amber-50 text-amber-700 ring-amber-100'
                    : normalized === 'RUNNING'
                        ? 'bg-blue-50 text-blue-700 ring-blue-100'
                        : 'bg-slate-100 text-slate-600 ring-slate-200';

    return (
        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ring-1 ${cls}`}>
            {normalized}
        </span>
    );
}

function EmptyAnalytics() {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                <BarChart3 className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">No execution analytics yet.</p>
            <p className="mt-1 text-sm text-slate-400">
                Run this automation script to start collecting pass rate, duration, and failure data.
            </p>
        </div>
    );
}

export function ExecutionStatsPanel({ scriptId, refreshKey = 0 }: Props) {
    const [stats, setStats] = useState<AutomationScriptExecutionStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadStats = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await getScriptExecutionStats(scriptId);
            setStats(data);
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                'Failed to load execution analytics.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadStats();
         
    }, [scriptId, refreshKey]);

    const analytics = useMemo(() => {
        if (!stats) return null;

        const failedTotal = stats.failed + stats.timedOut;
        const activeTotal = stats.running + stats.queued;
        const completedTotal = stats.passed + stats.failed + stats.timedOut;
        const passRate = safePercent(stats.passRate);
        const healthTone =
            stats.total === 0
                ? 'neutral'
                : passRate >= 80
                    ? 'good'
                    : passRate >= 50
                        ? 'warning'
                        : 'bad';

        return {
            failedTotal,
            activeTotal,
            completedTotal,
            passRate,
            healthTone,
        };
    }, [stats]);

    return (
        <section className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--cap-blue)]/0 via-[var(--cap-blue)] to-[var(--cap-blue)]/0" />

            <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/10">
                            <BarChart3 className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                                Execution Analytics
                            </p>
                            <h3 className="mt-0.5 text-base font-bold text-slate-900">
                                Run health summary
                            </h3>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                                Track pass rate, failures, active runs, duration, and the latest execution signal.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={loadStats}
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

                {error && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}

                {!error && !stats && loading && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--cap-blue)]" />
                        Loading execution analytics…
                    </div>
                )}

                {!error && stats && stats.total === 0 && (
                    <div className="mt-4">
                        <EmptyAnalytics />
                    </div>
                )}

                {stats && analytics && stats.total > 0 && (
                    <div className="mt-5 space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <StatTile
                                label="Total runs"
                                value={stats.total}
                                icon={<Activity className="h-4 w-4" />}
                                hint={`${analytics.completedTotal} completed · ${analytics.activeTotal} active`}
                                tone="info"
                            />

                            <StatTile
                                label="Pass rate"
                                value={`${analytics.passRate}%`}
                                icon={<CheckCircle2 className="h-4 w-4" />}
                                hint={`${stats.passed} passed executions`}
                                tone="success"
                            />

                            <StatTile
                                label="Issues"
                                value={analytics.failedTotal}
                                icon={<XCircle className="h-4 w-4" />}
                                hint={`${stats.failed} failed · ${stats.timedOut} timed out`}
                                tone={analytics.failedTotal > 0 ? 'danger' : 'default'}
                            />

                            <StatTile
                                label="Avg duration"
                                value={formatDuration(stats.averageDurationMs)}
                                icon={<Timer className="h-4 w-4" />}
                                hint="Completed executions"
                                tone="default"
                            />
                        </div>

                        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Status distribution</p>
                                        <p className="mt-0.5 text-xs text-slate-400">
                                            Quick breakdown of all recorded script runs.
                                        </p>
                                    </div>

                                    <span
                                        className={`inline-flex w-fit items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ring-1 ${
                                            analytics.healthTone === 'good'
                                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                                                : analytics.healthTone === 'warning'
                                                    ? 'bg-amber-50 text-amber-700 ring-amber-100'
                                                    : analytics.healthTone === 'bad'
                                                        ? 'bg-red-50 text-red-700 ring-red-100'
                                                        : 'bg-slate-100 text-slate-600 ring-slate-200'
                                        }`}
                                    >
                                        <TrendingUp className="h-3.5 w-3.5" />
                                        {analytics.passRate}% healthy
                                    </span>
                                </div>

                                <div className="mt-4 overflow-hidden rounded-full bg-slate-200 h-3 ring-1 ring-slate-200">
                                    <div className="flex h-full w-full">
                                        <StatusSegment label="Passed" value={stats.passed} total={stats.total} className="bg-emerald-500" />
                                        <StatusSegment label="Failed" value={stats.failed} total={stats.total} className="bg-red-500" />
                                        <StatusSegment label="Timed out" value={stats.timedOut} total={stats.total} className="bg-amber-500" />
                                        <StatusSegment label="Running" value={stats.running} total={stats.total} className="bg-blue-500" />
                                        <StatusSegment label="Queued" value={stats.queued} total={stats.total} className="bg-slate-400" />
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-2 sm:grid-cols-5">
                                    <LegendItem label="Passed" value={stats.passed} className="bg-emerald-500" />
                                    <LegendItem label="Failed" value={stats.failed} className="bg-red-500" />
                                    <LegendItem label="Timed out" value={stats.timedOut} className="bg-amber-500" />
                                    <LegendItem label="Running" value={stats.running} className="bg-blue-500" />
                                    <LegendItem label="Queued" value={stats.queued} className="bg-slate-400" />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                                <p className="text-sm font-semibold text-slate-900">Latest signal</p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    Most recent execution and failure status.
                                </p>

                                {stats.latestExecution ? (
                                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <StatusBadge status={stats.latestExecution.status} />
                                            <Clock className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <p className="mt-3 text-xs text-slate-400">Latest execution</p>
                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                            {formatDate(stats.latestExecution.createdAt)}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-400">
                                        No latest execution available.
                                    </div>
                                )}

                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                            Browser
                                        </p>
                                        <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                                            {stats.mostUsedBrowser || '-'}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                            Active
                                        </p>
                                        <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                                            {stats.running} running · {stats.queued} queued
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                        Latest failed run
                                    </p>
                                    {stats.latestFailedExecution ? (
                                        <div className="mt-2 flex items-center justify-between gap-3">
                                            <StatusBadge status={stats.latestFailedExecution.status} />
                                            <AlertTriangle className="h-4 w-4 text-red-500" />
                                        </div>
                                    ) : (
                                        <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-emerald-600">
                                            <CheckCircle2 className="h-4 w-4" />
                                            None detected
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

function LegendItem({
                        label,
                        value,
                        className,
                    }: {
    label: string;
    value: number;
    className: string;
}) {
    return (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
            <span className="flex items-center gap-2 text-slate-500">
                <span className={`h-2 w-2 rounded-full ${className}`} />
                {label}
            </span>
            <span className="font-bold text-slate-800">{value}</span>
        </div>
    );
}
