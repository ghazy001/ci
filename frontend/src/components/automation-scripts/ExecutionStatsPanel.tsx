'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    Loader2,
    RefreshCcw,
    Timer,
    TrendingUp,
    XCircle,
} from 'lucide-react';
import {
    AutomationScriptExecutionStats,
    getScriptExecutionStats,
} from '@/lib/script-execution.service';

type Props = {
    scriptId: string;
    refreshKey?: number;
};

/* ─────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────────── */

function formatDuration(ms: number) {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const restSeconds = seconds % 60;
    return `${minutes}m ${restSeconds}s`;
}

function safePercent(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(Math.round(value), 0), 100);
}

function formatDate(value?: string) {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}

/* ─────────────────────────────────────────────────────────────
   Sub-components
──────────────────────────────────────────────────────────────── */

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
    const iconCls = {
        default: 'bg-slate-50 text-slate-500 ring-slate-200',
        success: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
        danger:  'bg-red-50 text-red-600 ring-red-100',
        warning: 'bg-amber-50 text-amber-600 ring-amber-100',
        info:    'bg-[var(--cap-blue)]/8 text-[var(--cap-blue)] ring-[var(--cap-blue)]/10',
    }[tone];

    return (
        <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        {label}
                    </p>
                    <p className="mt-2 text-[1.75rem] font-bold tabular-nums leading-none tracking-tight text-slate-900">
                        {value}
                    </p>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${iconCls}`}>
                    {icon}
                </div>
            </div>
            {hint && (
                <p className="mt-2.5 truncate text-[11px] text-slate-400">{hint}</p>
            )}
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
            className={`h-full transition-all ${className}`}
            style={{ width }}
            title={`${label}: ${value}`}
        />
    );
}

function StatusBadge({ status }: { status?: string }) {
    const normalized = status || 'UNKNOWN';
    const cls =
        normalized === 'PASSED'    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
        normalized === 'FAILED'    ? 'bg-red-50 text-red-700 ring-red-200' :
        normalized === 'TIMED_OUT' ? 'bg-amber-50 text-amber-700 ring-amber-200' :
        normalized === 'RUNNING'   ? 'bg-blue-50 text-blue-700 ring-blue-200' :
                                     'bg-slate-100 text-slate-600 ring-slate-200';
    return (
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] ring-1 ${cls}`}>
            {normalized}
        </span>
    );
}

function LegendItem({ label, value, className }: { label: string; value: number; className: string }) {
    return (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs">
            <span className="flex items-center gap-1.5 text-slate-500">
                <span className={`h-2 w-2 shrink-0 rounded-full ${className}`} />
                {label}
            </span>
            <span className="font-bold tabular-nums text-slate-800">{value}</span>
        </div>
    );
}

function EmptyAnalytics() {
    return (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                <BarChart3 className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </div>
            <p className="mt-3 text-[13px] font-semibold text-slate-800">No execution analytics yet.</p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
                Run this automation script to start collecting pass rate, duration, and failure data.
            </p>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Main component
──────────────────────────────────────────────────────────────── */

export function ExecutionStatsPanel({ scriptId, refreshKey = 0 }: Props) {
    const [stats, setStats] = useState<AutomationScriptExecutionStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState(true);

    const loadStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getScriptExecutionStats(scriptId);
            setStats(data);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to load execution analytics.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scriptId, refreshKey]);

    const analytics = useMemo(() => {
        if (!stats) return null;
        const failedTotal   = stats.failed + stats.timedOut;
        const activeTotal   = stats.running + stats.queued;
        const completedTotal = stats.passed + stats.failed + stats.timedOut;
        const passRate      = safePercent(stats.passRate);
        const healthTone    =
            stats.total === 0 ? 'neutral' :
            passRate >= 80    ? 'good'    :
            passRate >= 50    ? 'warning' :
                                'bad';
        return { failedTotal, activeTotal, completedTotal, passRate, healthTone };
    }, [stats]);

    const hasData = !!stats && stats.total > 0;

    return (
        <section className="relative overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_4px_0_rgb(0,0,0,0.05),0_4px_16px_0_rgb(0,0,0,0.04)]">
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--cap-blue)] to-transparent" />

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/10">
                        <BarChart3 size={16} strokeWidth={1.9} />
                    </div>
                    <div>
                        <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-[var(--cap-blue)]">
                            Execution Analytics
                        </p>
                        <h3 className="mt-0.5 text-[14px] font-bold leading-tight tracking-[-0.01em] text-slate-900">
                            Run health summary
                        </h3>
                    </div>
                </div>

                {/* Header actions */}
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={loadStats}
                        disabled={loading}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow-sm active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <RefreshCcw className="h-3.5 w-3.5" />
                        )}
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={() => setCollapsed((v) => !v)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow-sm active:scale-[0.97]"
                        aria-label={collapsed ? 'Expand analytics' : 'Collapse analytics'}
                    >
                        {collapsed
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronUp className="h-3.5 w-3.5" />
                        }
                    </button>
                </div>
            </div>

            {/* ── Collapsible body ────────────────────────────────── */}
            {!collapsed && (
                <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                    <p className="mb-4 max-w-xl text-[12px] leading-relaxed text-slate-400">
                        Track pass rate, failures, active runs, duration, and the latest execution signal.
                    </p>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Loading skeleton */}
                    {!error && !stats && loading && (
                        <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-[13px] text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin text-[var(--cap-blue)]" />
                            Loading execution analytics…
                        </div>
                    )}

                    {/* Empty state */}
                    {!error && stats && stats.total === 0 && <EmptyAnalytics />}

                    {/* Data */}
                    {stats && analytics && hasData && (
                        <div className="space-y-4">
                            {/* ── Stat tiles ─────────────────────────────── */}
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <StatTile
                                    label="Total runs"
                                    value={stats.total}
                                    icon={<Activity className="h-[15px] w-[15px]" />}
                                    hint={`${analytics.completedTotal} completed · ${analytics.activeTotal} active`}
                                    tone="info"
                                />
                                <StatTile
                                    label="Pass rate"
                                    value={`${analytics.passRate}%`}
                                    icon={<CheckCircle2 className="h-[15px] w-[15px]" />}
                                    hint={`${stats.passed} passed executions`}
                                    tone="success"
                                />
                                <StatTile
                                    label="Issues"
                                    value={analytics.failedTotal}
                                    icon={<XCircle className="h-[15px] w-[15px]" />}
                                    hint={`${stats.failed} failed · ${stats.timedOut} timed out`}
                                    tone={analytics.failedTotal > 0 ? 'danger' : 'default'}
                                />
                                <StatTile
                                    label="Avg duration"
                                    value={formatDuration(stats.averageDurationMs)}
                                    icon={<Timer className="h-[15px] w-[15px]" />}
                                    hint="Completed executions"
                                    tone="default"
                                />
                            </div>

                            {/* ── Distribution + Signal ─────────────────── */}
                            <div className="grid gap-3.5 xl:grid-cols-[1.15fr_0.85fr]">

                                {/* Distribution card */}
                                <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-[13px] font-semibold text-slate-900">Status distribution</p>
                                            <p className="mt-0.5 text-[11px] text-slate-400">
                                                Breakdown of all recorded script runs.
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ring-1 ${
                                                analytics.healthTone === 'good'    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
                                                analytics.healthTone === 'warning' ? 'bg-amber-50 text-amber-700 ring-amber-200'   :
                                                analytics.healthTone === 'bad'     ? 'bg-red-50 text-red-700 ring-red-200'         :
                                                                                     'bg-slate-100 text-slate-600 ring-slate-200'
                                            }`}
                                        >
                                            <TrendingUp className="h-3 w-3" />
                                            {analytics.passRate}% healthy
                                        </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200 ring-1 ring-slate-200">
                                        <div className="flex h-full w-full">
                                            <StatusSegment label="Passed"   value={stats.passed}   total={stats.total} className="bg-emerald-500" />
                                            <StatusSegment label="Failed"   value={stats.failed}   total={stats.total} className="bg-red-500" />
                                            <StatusSegment label="Timed out" value={stats.timedOut} total={stats.total} className="bg-amber-500" />
                                            <StatusSegment label="Running"  value={stats.running}  total={stats.total} className="bg-blue-500" />
                                            <StatusSegment label="Queued"   value={stats.queued}   total={stats.total} className="bg-slate-400" />
                                        </div>
                                    </div>

                                    {/* Legend */}
                                    <div className="mt-3.5 grid gap-2 sm:grid-cols-5">
                                        <LegendItem label="Passed"    value={stats.passed}   className="bg-emerald-500" />
                                        <LegendItem label="Failed"    value={stats.failed}   className="bg-red-500" />
                                        <LegendItem label="Timed out" value={stats.timedOut} className="bg-amber-500" />
                                        <LegendItem label="Running"   value={stats.running}  className="bg-blue-500" />
                                        <LegendItem label="Queued"    value={stats.queued}   className="bg-slate-400" />
                                    </div>
                                </div>

                                {/* Latest signal card */}
                                <div className="rounded-xl border border-slate-200/70 bg-white p-4">
                                    <p className="text-[13px] font-semibold text-slate-900">Latest signal</p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        Most recent execution and failure status.
                                    </p>

                                    {stats.latestExecution ? (
                                        <div className="mt-3.5 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <StatusBadge status={stats.latestExecution.status} />
                                                <Clock className="h-[15px] w-[15px] text-slate-400" />
                                            </div>
                                            <p className="mt-2.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                                Latest execution
                                            </p>
                                            <p className="mt-1 text-[13px] font-semibold text-slate-800">
                                                {formatDate(stats.latestExecution.createdAt)}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="mt-3.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-[13px] text-slate-400">
                                            No latest execution available.
                                        </div>
                                    )}

                                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                                        <MiniInfoTile label="Browser" value={stats.mostUsedBrowser || '—'} />
                                        <MiniInfoTile label="Active" value={`${stats.running}r · ${stats.queued}q`} />
                                    </div>

                                    <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                                        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                            Latest failed run
                                        </p>
                                        {stats.latestFailedExecution ? (
                                            <div className="mt-2 flex items-center justify-between gap-3">
                                                <StatusBadge status={stats.latestFailedExecution.status} />
                                                <AlertTriangle className="h-[15px] w-[15px] text-red-500" />
                                            </div>
                                        ) : (
                                            <div className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600">
                                                <CheckCircle2 className="h-[15px] w-[15px]" />
                                                None detected
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
   MiniInfoTile — small label/value pair used in the signal card
──────────────────────────────────────────────────────────────── */
function MiniInfoTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className="mt-1 truncate text-[13px] font-semibold text-slate-800">{value}</p>
        </div>
    );
}