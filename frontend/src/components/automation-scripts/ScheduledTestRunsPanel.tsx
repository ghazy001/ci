'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CalendarClock,
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Clock,
    Globe,
    Loader2,
    Monitor,
    Pause,
    Play,
    Plus,
    RefreshCcw,
    Terminal,
    Trash2,
} from 'lucide-react';
import {
    CreateScheduledTestRunPayload,
    SchedulePreset,
    ScheduledTestRun,
    createScheduledTestRun,
    disableScheduledTestRun,
    getScheduledTestRunsByScript,
    pauseScheduledTestRun,
    resumeScheduledTestRun,
} from '@/lib/script-execution.service';

/* ─────────────────────────────────────────────────────────────
   Types & constants
──────────────────────────────────────────────────────────────── */

type Props = {
    scriptId: string;
    defaultTargetUrl?: string | null;
    defaultEnvironment?: string | null;
};

const DAY_OPTIONS = [
    { value: 'SUN', label: 'Sunday' },
    { value: 'MON', label: 'Monday' },
    { value: 'TUE', label: 'Tuesday' },
    { value: 'WED', label: 'Wednesday' },
    { value: 'THU', label: 'Thursday' },
    { value: 'FRI', label: 'Friday' },
    { value: 'SAT', label: 'Saturday' },
] as const;

const PRESET_LABELS: Record<SchedulePreset, string> = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    MONTHLY: 'Monthly',
    CUSTOM_CRON: 'Custom cron',
};

const INPUT_CLS =
    'h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[var(--cap-blue)]/40 focus:bg-white focus:ring-2 focus:ring-[var(--cap-blue)]/10';

const SELECT_CLS =
    'h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-[13px] text-slate-700 outline-none transition focus:border-[var(--cap-blue)]/40 focus:bg-white focus:ring-2 focus:ring-[var(--cap-blue)]/10';

/* ─────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────────── */

function formatDateTime(value?: string | null) {
    if (!value) return '—';

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

/* ─────────────────────────────────────────────────────────────
   Main component
──────────────────────────────────────────────────────────────── */

export function ScheduledTestRunsPanel({
    scriptId,
    defaultTargetUrl,
    defaultEnvironment,
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [schedules, setSchedules] = useState<ScheduledTestRun[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [preset, setPreset] = useState<SchedulePreset>('WEEKLY');
    const [dayOfWeek, setDayOfWeek] = useState<CreateScheduledTestRunPayload['dayOfWeek']>('FRI');
    const [dayOfMonth, setDayOfMonth] = useState(1);
    const [time, setTime] = useState('09:00');
    const [cronExpression, setCronExpression] = useState('*/5 * * * *');
    const [name, setName] = useState('Run login test every Friday');
    const [targetUrl, setTargetUrl] = useState(defaultTargetUrl ?? '');
    const [browser, setBrowser] = useState<CreateScheduledTestRunPayload['browser']>('CHROMIUM');
    const [environment, setEnvironment] = useState(defaultEnvironment ?? '');

    const summary = useMemo(() => {
        return schedules.reduce(
            (acc, schedule) => {
                acc.total += 1;
                if (schedule.status === 'ACTIVE') acc.active += 1;
                if (schedule.status === 'PAUSED') acc.paused += 1;
                if (schedule.status === 'DISABLED') acc.disabled += 1;
                return acc;
            },
            { total: 0, active: 0, paused: 0, disabled: 0 },
        );
    }, [schedules]);

    const loadSchedules = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await getScheduledTestRunsByScript(scriptId);
            setSchedules(data);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Failed to load scheduled test runs.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadSchedules();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scriptId]);

    const handleCreate = async () => {
        try {
            setSaving(true);
            setError(null);

            const payload: CreateScheduledTestRunPayload = {
                scriptId,
                name,
                preset,
                time,
                timezone: 'Africa/Tunis',
                targetUrl: targetUrl || undefined,
                browser,
                environment: environment || undefined,
            };

            if (preset === 'WEEKLY') payload.dayOfWeek = dayOfWeek;
            if (preset === 'MONTHLY') payload.dayOfMonth = dayOfMonth;
            if (preset === 'CUSTOM_CRON') payload.cronExpression = cronExpression;

            const created = await createScheduledTestRun(payload);
            setSchedules((prev) => [created, ...prev]);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Failed to create scheduled test run.');
        } finally {
            setSaving(false);
        }
    };

    const handlePause = async (id: string) => {
        const updated = await pauseScheduledTestRun(id);
        setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)));
    };

    const handleResume = async (id: string) => {
        const updated = await resumeScheduledTestRun(id);
        setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)));
    };

    const handleDisable = async (id: string) => {
        const updated = await disableScheduledTestRun(id);
        setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)));
    };

    return (
        <section className="relative overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_4px_0_rgb(0,0,0,0.05),0_4px_16px_0_rgb(0,0,0,0.04)]">
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--cap-blue)] to-transparent" />

            {/* ── Header ───────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/10">
                        <CalendarClock size={16} strokeWidth={1.9} />
                    </div>

                    <div>
                        <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-[var(--cap-blue)]">
                            Scheduler
                        </p>
                        <h3 className="mt-0.5 text-[14px] font-bold leading-tight tracking-[-0.01em] text-slate-900">
                            Scheduled test runs
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {schedules.length > 0 && (
                        <div className="hidden items-center gap-1.5 sm:flex">
                            <MiniStatBadge tone="success" label={`${summary.active} active`} />
                            {summary.paused > 0 && <MiniStatBadge tone="warning" label={`${summary.paused} paused`} />}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={loadSchedules}
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
                        onClick={() => setIsOpen((o) => !o)}
                        aria-label={isOpen ? 'Collapse scheduler' : 'Expand scheduler'}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow-sm active:scale-[0.97]"
                    >
                        {isOpen ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>
            </div>

            {/* ── Collapsible body ─────────────────────────────── */}
            {isOpen && (
                <div className="border-t border-slate-100">
                    {/* Sub-header */}
                    <div className="bg-slate-50/60 px-5 py-4">
                        <p className="mb-4 max-w-xl text-[12px] leading-relaxed text-slate-400">
                            Create recurring automation runs, review upcoming schedules, and pause or disable existing jobs.
                        </p>

                        {schedules.length > 0 && (
                            <div className="grid gap-2.5 sm:grid-cols-4">
                                <SummaryCard label="Schedules" value={summary.total} tone="neutral" />
                                <SummaryCard label="Active" value={summary.active} tone="success" />
                                <SummaryCard label="Paused" value={summary.paused} tone="warning" />
                                <SummaryCard label="Disabled" value={summary.disabled} tone="muted" />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="px-5 py-5">
                        {/* Main grid */}
                        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
                            {/* Calendar panel */}
                            <section className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <CalendarDays className="h-3.5 w-3.5 text-[var(--cap-blue)]" />
                                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                        Upcoming
                                    </p>
                                </div>

                                <MiniCalendar schedules={schedules} />
                            </section>

                            {/* Create form */}
                            <section className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4">
                                <div className="mb-4 flex items-center gap-2">
                                    <Plus className="h-3.5 w-3.5 text-[var(--cap-blue)]" />
                                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                        New schedule
                                    </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field label="Schedule name">
                                        <input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="My weekly smoke test"
                                            className={INPUT_CLS}
                                        />
                                    </Field>

                                    <Field label="Frequency">
                                        <select
                                            value={preset}
                                            onChange={(e) => setPreset(e.target.value as SchedulePreset)}
                                            className={SELECT_CLS}
                                        >
                                            {(Object.keys(PRESET_LABELS) as SchedulePreset[]).map((k) => (
                                                <option key={k} value={k}>
                                                    {PRESET_LABELS[k]}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>

                                    {preset === 'WEEKLY' && (
                                        <Field label="Day of week">
                                            <select
                                                value={dayOfWeek}
                                                onChange={(e) =>
                                                    setDayOfWeek(e.target.value as CreateScheduledTestRunPayload['dayOfWeek'])
                                                }
                                                className={SELECT_CLS}
                                            >
                                                {DAY_OPTIONS.map((d) => (
                                                    <option key={d.value} value={d.value}>
                                                        {d.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                    )}

                                    {preset === 'MONTHLY' && (
                                        <Field label="Day of month">
                                            <input
                                                type="number"
                                                min={1}
                                                max={31}
                                                value={dayOfMonth}
                                                onChange={(e) => setDayOfMonth(Number(e.target.value))}
                                                className={INPUT_CLS}
                                            />
                                        </Field>
                                    )}

                                    {preset !== 'CUSTOM_CRON' ? (
                                        <Field label="Time">
                                            <input
                                                type="time"
                                                value={time}
                                                onChange={(e) => setTime(e.target.value)}
                                                className={INPUT_CLS}
                                            />
                                        </Field>
                                    ) : (
                                        <Field label="Cron expression">
                                            <input
                                                value={cronExpression}
                                                onChange={(e) => setCronExpression(e.target.value)}
                                                placeholder="*/5 * * * *"
                                                className={`${INPUT_CLS} font-mono`}
                                            />
                                        </Field>
                                    )}

                                    <Field label="Target URL">
                                        <div className="relative">
                                            <Globe className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                            <input
                                                value={targetUrl}
                                                onChange={(e) => setTargetUrl(e.target.value)}
                                                placeholder="https://your-app.com/login"
                                                className={`${INPUT_CLS} pl-8`}
                                            />
                                        </div>
                                    </Field>

                                    <Field label="Browser">
                                        <div className="relative">
                                            <Monitor className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                            <select
                                                value={browser}
                                                onChange={(e) =>
                                                    setBrowser(e.target.value as CreateScheduledTestRunPayload['browser'])
                                                }
                                                className={`${SELECT_CLS} pl-8`}
                                            >
                                                <option value="CHROMIUM">Chromium</option>
                                                <option value="FIREFOX">Firefox</option>
                                                <option value="WEBKIT">WebKit</option>
                                                <option value="CHROME">Chrome</option>
                                                <option value="EDGE">Edge</option>
                                            </select>
                                        </div>
                                    </Field>

                                    <Field label="Environment">
                                        <input
                                            value={environment}
                                            onChange={(e) => setEnvironment(e.target.value)}
                                            placeholder="staging"
                                            className={INPUT_CLS}
                                        />
                                    </Field>
                                </div>

                                <div className="mt-4 flex justify-end border-t border-slate-200/70 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleCreate}
                                        disabled={saving || !name.trim()}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--cap-blue)] px-3.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Plus className="h-3.5 w-3.5" />
                                        )}
                                        Create schedule
                                    </button>
                                </div>
                            </section>
                        </div>

                        {/* Schedule list */}
                        <section className="mt-5">
                            <div className="mb-3 flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                    {schedules.length} schedule{schedules.length !== 1 ? 's' : ''}
                                </p>
                            </div>

                            {loading && schedules.length === 0 && (
                                <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-5 py-8 text-[13px] text-slate-400">
                                    <Loader2 className="h-4 w-4 animate-spin text-[var(--cap-blue)]" />
                                    Loading schedules…
                                </div>
                            )}

                            {!loading && schedules.length === 0 && (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-center">
                                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                                        <CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.8} />
                                    </div>
                                    <p className="text-[13px] font-semibold text-slate-800">No schedules yet</p>
                                    <p className="mt-1 text-[12px] text-slate-400">
                                        Create your first schedule above.
                                    </p>
                                </div>
                            )}

                            {schedules.length > 0 && (
                                <div className="overflow-hidden rounded-xl border border-slate-200/70">
                                    <div className="hidden grid-cols-[1fr_140px_140px_170px] gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 lg:grid">
                                        <span>Schedule</span>
                                        <span>Next run</span>
                                        <span>Last run</span>
                                        <span className="text-right">Actions</span>
                                    </div>

                                    <div className="divide-y divide-slate-100">
                                        {schedules.map((schedule) => (
                                            <ScheduleRow
                                                key={schedule.id}
                                                schedule={schedule}
                                                onPause={() => handlePause(schedule.id)}
                                                onResume={() => handleResume(schedule.id)}
                                                onDisable={() => handleDisable(schedule.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            )}
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
   Sub-components
──────────────────────────────────────────────────────────────── */

function SummaryCard({
    label,
    value,
    tone = 'neutral',
}: {
    label: string;
    value: number;
    tone?: 'neutral' | 'success' | 'warning' | 'muted';
}) {
    const valCls = {
        neutral: 'text-slate-900',
        success: 'text-emerald-600',
        warning: 'text-amber-600',
        muted: 'text-slate-500',
    }[tone];

    return (
        <div className="rounded-xl border border-slate-200/70 bg-white p-3.5 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
            <p className={`text-[1.5rem] font-bold tabular-nums leading-none ${valCls}`}>{value}</p>
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {label}
            </p>
        </div>
    );
}

function MiniStatBadge({ tone, label }: { tone: 'success' | 'warning'; label: string }) {
    const cls =
        tone === 'success'
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 before:bg-emerald-500'
            : 'bg-amber-50 text-amber-700 ring-amber-200 before:bg-amber-400';

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] ring-1 before:h-1.5 before:w-1.5 before:rounded-full ${cls}`}
        >
            {label}
        </span>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {label}
            </span>
            {children}
        </label>
    );
}

function StatusBadge({ status }: { status: ScheduledTestRun['status'] }) {
    const map = {
        ACTIVE: {
            dot: 'bg-emerald-500',
            badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
            pulse: true,
        },
        PAUSED: {
            dot: 'bg-amber-400',
            badge: 'bg-amber-50 text-amber-700 ring-amber-200',
            pulse: false,
        },
        DISABLED: {
            dot: 'bg-slate-300',
            badge: 'bg-slate-100 text-slate-500 ring-slate-200',
            pulse: false,
        },
    } as const;

    const cfg = map[status] ?? map.DISABLED;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] ring-1 ${cfg.badge}`}
        >
            <span className={`relative flex h-1.5 w-1.5 rounded-full ${cfg.dot}`}>
                {cfg.pulse && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
            </span>
            {status}
        </span>
    );
}

function CronChip({ expr }: { expr: string }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10.5px] font-medium text-slate-500">
            <Terminal className="h-2.5 w-2.5" />
            {expr}
        </span>
    );
}

function ScheduleRow({
    schedule,
    onPause,
    onResume,
    onDisable,
}: {
    schedule: ScheduledTestRun;
    onPause: () => void;
    onResume: () => void;
    onDisable: () => void;
}) {
    return (
        <div className="grid gap-3 px-4 py-3 transition hover:bg-slate-50/80 lg:grid-cols-[1fr_140px_140px_170px] lg:items-center">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={schedule.status} />
                    <CronChip expr={schedule.cronExpression} />
                </div>

                <p className="mt-1.5 truncate text-[13px] font-semibold text-slate-900">
                    {schedule.name}
                </p>

                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {schedule.browser && (
                        <MetaChip icon={<Monitor className="h-2.5 w-2.5" />} label={schedule.browser} />
                    )}

                    {schedule.environment && (
                        <MetaChip icon={<Globe className="h-2.5 w-2.5" />} label={schedule.environment} />
                    )}
                </div>
            </div>

            <div className="text-[11px] text-slate-500">
                <span className="lg:hidden text-[10.5px] uppercase tracking-wide text-slate-400">
                    Next:{' '}
                </span>
                <span className="font-semibold text-slate-700">
                    {formatDateTime(schedule.nextRunAt)}
                </span>
            </div>

            <div className="text-[11px] text-slate-500">
                <span className="lg:hidden text-[10.5px] uppercase tracking-wide text-slate-400">
                    Last:{' '}
                </span>
                <span className="font-semibold text-slate-700">
                    {formatDateTime(schedule.lastRunAt)}
                </span>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-1.5 lg:justify-end">
                {schedule.status === 'ACTIVE' ? (
                    <button
                        type="button"
                        onClick={onPause}
                        title="Pause schedule"
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-100 bg-amber-50 px-2.5 text-[11px] font-semibold text-amber-700 transition-all hover:bg-amber-100 active:scale-[0.97]"
                    >
                        <Pause className="h-3 w-3" />
                        Pause
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onResume}
                        disabled={schedule.status === 'DISABLED'}
                        title="Resume schedule"
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700 transition-all hover:bg-emerald-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Play className="h-3 w-3" />
                        Resume
                    </button>
                )}

                <button
                    type="button"
                    onClick={onDisable}
                    disabled={schedule.status === 'DISABLED'}
                    title="Disable schedule"
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-red-100 bg-red-50 px-2.5 text-[11px] font-semibold text-red-600 transition-all hover:bg-red-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Trash2 className="h-3 w-3" />
                    Disable
                </button>
            </div>
        </div>
    );
}

function MetaChip({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-500">
            {icon}
            {label}
        </span>
    );
}

function MiniCalendar({ schedules }: { schedules: ScheduledTestRun[] }) {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const monthName = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(viewYear, viewMonth, 1));

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

    const highlightedDays = useMemo<Set<number>>(() => {
        const days = new Set<number>();

        for (const s of schedules) {
            if (s.status === 'DISABLED') continue;

            const next = s.nextRunAt ? new Date(s.nextRunAt) : null;

            if (next && next.getFullYear() === viewYear && next.getMonth() === viewMonth) {
                days.add(next.getDate());
            }
        }

        return days;
    }, [schedules, viewYear, viewMonth]);

    const todayDay =
        today.getFullYear() === viewYear && today.getMonth() === viewMonth
            ? today.getDate()
            : null;

    const cells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    const prev = () => {
        if (viewMonth === 0) {
            setViewYear((y) => y - 1);
            setViewMonth(11);
        } else {
            setViewMonth((m) => m - 1);
        }
    };

    const next = () => {
        if (viewMonth === 11) {
            setViewYear((y) => y + 1);
            setViewMonth(0);
        } else {
            setViewMonth((m) => m + 1);
        }
    };

    return (
        <div className="select-none">
            <div className="mb-3 flex items-center justify-between">
                <button
                    type="button"
                    onClick={prev}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-all hover:border-slate-300 hover:text-slate-700 active:scale-[0.97]"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                <span className="text-[12px] font-semibold text-slate-700">
                    {monthName}
                </span>

                <button
                    type="button"
                    onClick={next}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-all hover:border-slate-300 hover:text-slate-700 active:scale-[0.97]"
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </div>

            <div className="mb-1 grid grid-cols-7 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <span
                        key={i}
                        className="py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
                    >
                        {d}
                    </span>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-y-0.5 text-center">
                {cells.map((day, i) => {
                    const isHighlighted = day !== null && highlightedDays.has(day);
                    const isToday = day !== null && day === todayDay;

                    return (
                        <div
                            key={i}
                            className={`relative flex h-7 w-full items-center justify-center rounded-lg text-[11px] font-medium transition
                                ${isToday ? 'bg-[var(--cap-blue)] text-white shadow-sm' : ''}
                                ${isHighlighted && !isToday ? 'bg-[var(--cap-blue)]/10 text-[var(--cap-blue)]' : ''}
                                ${!isHighlighted && !isToday && day !== null ? 'text-slate-500 hover:bg-slate-100' : ''}
                            `}
                        >
                            {day}

                            {isHighlighted && !isToday && (
                                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--cap-blue)]" />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-[var(--cap-blue)]" />
                    Today
                </span>

                <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-[var(--cap-blue)]/30" />
                    Scheduled
                </span>
            </div>
        </div>
    );
}