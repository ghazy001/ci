'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    CalendarClock,
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
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
    Zap,
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

/* ─────────────────────────────────────────────
   Types & constants
───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

/** Pill showing schedule status */
function StatusBadge({ status }: { status: ScheduledTestRun['status'] }) {
    const map = {
        ACTIVE: {
            dot: 'bg-emerald-500',
            badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
            pulse: true,
        },
        PAUSED: {
            dot: 'bg-amber-400',
            badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
            pulse: false,
        },
        DISABLED: {
            dot: 'bg-slate-300',
            badge: 'bg-slate-100 text-slate-400 ring-1 ring-slate-200',
            pulse: false,
        },
    } as const;

    const cfg = map[status] ?? map.DISABLED;

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest ${cfg.badge}`}>
            <span className={`relative flex h-1.5 w-1.5 rounded-full ${cfg.dot}`}>
                {cfg.pulse && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
            </span>
            {status}
        </span>
    );
}

/** Cron expression chip */
function CronChip({ expr }: { expr: string }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-500">
            <Terminal className="h-2.5 w-2.5" />
            {expr}
        </span>
    );
}

/** Mini calendar that highlights days where schedules run */
function MiniCalendar({ schedules }: { schedules: ScheduledTestRun[] }) {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
        new Date(viewYear, viewMonth, 1),
    );

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

    /* Build a set of dates (day numbers) that have a scheduled run in this month */
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

    const todayDay = today.getFullYear() === viewYear && today.getMonth() === viewMonth
        ? today.getDate()
        : null;

    const cells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    const prev = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    };

    const next = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    };

    return (
        <div className="select-none">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
                <button
                    type="button"
                    onClick={prev}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-semibold text-slate-700">{monthName}</span>
                <button
                    type="button"
                    onClick={next}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Day names */}
            <div className="mb-1 grid grid-cols-7 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <span key={i} className="py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {d}
                    </span>
                ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-0.5 text-center">
                {cells.map((day, i) => {
                    const isHighlighted = day !== null && highlightedDays.has(day);
                    const isToday = day !== null && day === todayDay;

                    return (
                        <div
                            key={i}
                            className={`relative flex h-7 w-full items-center justify-center rounded-lg text-[11px] font-medium transition
                                ${day === null ? '' : 'cursor-default'}
                                ${isToday ? 'bg-[var(--cap-blue)] text-white' : ''}
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

            {/* Legend */}
            <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-[var(--cap-blue)]" /> Today
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-[var(--cap-blue)]/30" /> Scheduled
                </span>
            </div>
        </div>
    );
}

/** Single form field wrapper */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {label}
            </span>
            {children}
        </label>
    );
}

const INPUT_CLS =
    'h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--cap-blue)]/40 focus:ring-2 focus:ring-[var(--cap-blue)]/10 placeholder:text-slate-300';

const SELECT_CLS =
    'h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--cap-blue)]/40 focus:ring-2 focus:ring-[var(--cap-blue)]/10 cursor-pointer';

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */

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

    /* Form state */
    const [preset, setPreset] = useState<SchedulePreset>('WEEKLY');
    const [dayOfWeek, setDayOfWeek] = useState<CreateScheduledTestRunPayload['dayOfWeek']>('FRI');
    const [dayOfMonth, setDayOfMonth] = useState(1);
    const [time, setTime] = useState('09:00');
    const [cronExpression, setCronExpression] = useState('*/5 * * * *');
    const [name, setName] = useState('Run login test every Friday');
    const [targetUrl, setTargetUrl] = useState(defaultTargetUrl ?? '');
    const [browser, setBrowser] = useState<CreateScheduledTestRunPayload['browser']>('CHROMIUM');
    const [environment, setEnvironment] = useState(defaultEnvironment ?? '');

    const activeCount = schedules.filter(s => s.status === 'ACTIVE').length;
    const pausedCount = schedules.filter(s => s.status === 'PAUSED').length;

    /* ── Data loading ── */
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
         
    }, [scriptId]);

    /* ── Actions ── */
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
            setSchedules(prev => [created, ...prev]);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Failed to create scheduled test run.');
        } finally {
            setSaving(false);
        }
    };

    const handlePause = async (id: string) => {
        const updated = await pauseScheduledTestRun(id);
        setSchedules(prev => prev.map(s => (s.id === id ? updated : s)));
    };

    const handleResume = async (id: string) => {
        const updated = await resumeScheduledTestRun(id);
        setSchedules(prev => prev.map(s => (s.id === id ? updated : s)));
    };

    const handleDisable = async (id: string) => {
        const updated = await disableScheduledTestRun(id);
        setSchedules(prev => prev.map(s => (s.id === id ? updated : s)));
    };

    /* ─────────────────────────────────────────
       Render
    ───────────────────────────────────────── */
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">

            {/* ── Top header bar — clickable toggle ── */}
            <button
                type="button"
                onClick={() => setIsOpen(o => !o)}
                className="w-full border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 text-left transition hover:bg-slate-50/80"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cap-blue)]/10 text-[var(--cap-blue)]">
                            <CalendarClock className="h-4.5 w-4.5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--cap-blue)]">
                                Scheduler
                            </p>
                            <h3 className="text-sm font-bold text-slate-900">
                                Scheduled test runs
                            </h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Stat chips — always visible even when collapsed */}
                        {schedules.length > 0 && (
                            <div className="hidden items-center gap-2 sm:flex">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    {activeCount} active
                                </span>
                                {pausedCount > 0 && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                        {pausedCount} paused
                                    </span>
                                )}
                            </div>
                        )}

                        <ChevronDown
                            className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        />
                    </div>
                </div>
            </button>

            {/* ── Collapsible body ── */}
            <div
                className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
                <div className="overflow-hidden">
                    <div className="p-5">
                        {/* ── Refresh button (only inside open panel) ── */}
                        <div className="mb-4 flex justify-end">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); loadSchedules(); }}
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:shadow-sm disabled:opacity-50"
                            >
                                {loading
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <RefreshCcw className="h-3.5 w-3.5" />}
                                Refresh
                            </button>
                        </div>
                        {/* ── Error banner ── */}
                        {error && (
                            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                                <Zap className="mt-0.5 h-4 w-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* ── Main grid: calendar + form ── */}
                        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">

                            {/* Calendar panel */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <CalendarDays className="h-3.5 w-3.5 text-[var(--cap-blue)]" />
                                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                Upcoming
                            </span>
                                </div>
                                <MiniCalendar schedules={schedules} />
                            </div>

                            {/* Create form */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                                <div className="mb-4 flex items-center gap-2">
                                    <Plus className="h-3.5 w-3.5 text-[var(--cap-blue)]" />
                                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                New schedule
                            </span>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field label="Schedule name">
                                        <input
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="My weekly smoke test"
                                            className={`${INPUT_CLS} sm:col-span-2`}
                                        />
                                    </Field>

                                    <Field label="Frequency">
                                        <select
                                            value={preset}
                                            onChange={e => setPreset(e.target.value as SchedulePreset)}
                                            className={SELECT_CLS}
                                        >
                                            {(Object.keys(PRESET_LABELS) as SchedulePreset[]).map(k => (
                                                <option key={k} value={k}>{PRESET_LABELS[k]}</option>
                                            ))}
                                        </select>
                                    </Field>

                                    {preset === 'WEEKLY' && (
                                        <Field label="Day of week">
                                            <select
                                                value={dayOfWeek}
                                                onChange={e => setDayOfWeek(e.target.value as CreateScheduledTestRunPayload['dayOfWeek'])}
                                                className={SELECT_CLS}
                                            >
                                                {DAY_OPTIONS.map(d => (
                                                    <option key={d.value} value={d.value}>{d.label}</option>
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
                                                onChange={e => setDayOfMonth(Number(e.target.value))}
                                                className={INPUT_CLS}
                                            />
                                        </Field>
                                    )}

                                    {preset !== 'CUSTOM_CRON' ? (
                                        <Field label="Time">
                                            <input
                                                type="time"
                                                value={time}
                                                onChange={e => setTime(e.target.value)}
                                                className={INPUT_CLS}
                                            />
                                        </Field>
                                    ) : (
                                        <Field label="Cron expression">
                                            <input
                                                value={cronExpression}
                                                onChange={e => setCronExpression(e.target.value)}
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
                                                onChange={e => setTargetUrl(e.target.value)}
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
                                                onChange={e => setBrowser(e.target.value as CreateScheduledTestRunPayload['browser'])}
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
                                            onChange={e => setEnvironment(e.target.value)}
                                            placeholder="staging"
                                            className={INPUT_CLS}
                                        />
                                    </Field>
                                </div>

                                <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleCreate}
                                        disabled={saving || !name.trim()}
                                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--cap-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {saving
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <Plus className="h-4 w-4" />}
                                        Create schedule
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── Schedule list ── */}
                        <div className="mt-4 space-y-2">
                            <div className="mb-1 flex items-center gap-2 px-0.5">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                            {schedules.length} schedule{schedules.length !== 1 ? 's' : ''}
                        </span>
                            </div>

                            {/* Loading skeleton */}
                            {loading && schedules.length === 0 && (
                                <div className="flex items-center gap-2.5 py-6 text-sm text-slate-400">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading schedules…
                                </div>
                            )}

                            {/* Empty state */}
                            {!loading && schedules.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 py-12 text-center">
                                    <CalendarDays className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                                    <p className="text-sm font-medium text-slate-400">No schedules yet</p>
                                    <p className="mt-1 text-xs text-slate-300">Create your first schedule above</p>
                                </div>
                            )}

                            {/* Schedule cards */}
                            {schedules.map((schedule) => {
                                const borderColor =
                                    schedule.status === 'ACTIVE'
                                        ? 'border-l-emerald-500'
                                        : schedule.status === 'PAUSED'
                                            ? 'border-l-amber-400'
                                            : 'border-l-slate-300';

                                return (
                                    <div
                                        key={schedule.id}
                                        className={`rounded-2xl border border-slate-200 border-l-[3px] bg-white p-4 transition hover:shadow-sm ${borderColor}`}
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                            {/* Left: info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <StatusBadge status={schedule.status} />
                                                    <CronChip expr={schedule.cronExpression} />
                                                </div>

                                                <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                                                    {schedule.name}
                                                </p>

                                                {/* Run times */}
                                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                                            <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                                <Clock className="h-3 w-3" />
                                                Next: <strong className="font-semibold text-slate-600">{formatDateTime(schedule.nextRunAt)}</strong>
                                            </span>
                                                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                                <RefreshCcw className="h-3 w-3" />
                                                Last: <strong className="font-semibold text-slate-600">{formatDateTime(schedule.lastRunAt)}</strong>
                                            </span>
                                                </div>

                                                {/* Meta tags */}
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {schedule.browser && (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                                                    <Monitor className="h-2.5 w-2.5" />
                                                            {schedule.browser}
                                                </span>
                                                    )}
                                                    {schedule.environment && (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                                                    <Globe className="h-2.5 w-2.5" />
                                                            {schedule.environment}
                                                </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right: actions */}
                                            <div className="flex shrink-0 items-center gap-2">
                                                {schedule.status === 'ACTIVE' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePause(schedule.id)}
                                                        title="Pause schedule"
                                                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                                                    >
                                                        <Pause className="h-3.5 w-3.5" />
                                                        Pause
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleResume(schedule.id)}
                                                        disabled={schedule.status === 'DISABLED'}
                                                        title="Resume schedule"
                                                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <Play className="h-3.5 w-3.5" />
                                                        Resume
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleDisable(schedule.id)}
                                                    disabled={schedule.status === 'DISABLED'}
                                                    title="Disable schedule"
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Disable
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}