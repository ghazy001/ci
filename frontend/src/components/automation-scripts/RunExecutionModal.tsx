'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertCircle,
    Globe2,
    LockKeyhole,
    PlayCircle,
    Plus,
    Server,
    Settings2,
    Trash2,
    X,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { RunAutomationScriptPayload } from '@/lib/script-execution.service';

type BrowserTarget = 'CHROMIUM' | 'FIREFOX' | 'WEBKIT' | 'CHROME' | 'EDGE';

type VariableRow = {
    key: string;
    value: string;
};

type Props = {
    open: boolean;
    loading?: boolean;
    onClose: () => void;
    onStart: (payload: RunAutomationScriptPayload) => void | Promise<void>;
};

const browserOptions: Array<{ label: string; value: BrowserTarget }> = [
    { label: 'Chromium', value: 'CHROMIUM' },
    { label: 'Firefox', value: 'FIREFOX' },
    { label: 'WebKit', value: 'WEBKIT' },
];

const environmentOptions = [
    { label: 'Local', value: 'local' },
    { label: 'Staging', value: 'staging' },
    { label: 'Production', value: 'production' },
    { label: 'Custom', value: 'custom' },
];

export function RunExecutionModal({ open, loading = false, onClose, onStart }: Props) {
    const [mounted, setMounted] = useState(false);

    const [targetUrl, setTargetUrl] = useState(
        process.env.NEXT_PUBLIC_DEFAULT_TARGET_URL || '',
    );
    const [browser, setBrowser] = useState<BrowserTarget>('CHROMIUM');
    const [environment, setEnvironment] = useState('local');
    const [variables, setVariables] = useState<VariableRow[]>([]);
    const [showVariables, setShowVariables] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    useEffect(() => {
        if (!open || loading) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, loading, onClose]);

    const validVariablesCount = useMemo(
        () => variables.filter((item) => item.key.trim()).length,
        [variables],
    );

    if (!mounted || !open) return null;

    const addVariable = () => {
        setVariables((prev) => [...prev, { key: '', value: '' }]);
        setShowVariables(true);
    };

    const removeVariable = (index: number) => {
        setVariables((prev) => prev.filter((_, i) => i !== index));
    };

    const updateVariable = (index: number, field: keyof VariableRow, value: string) => {
        setVariables((prev) =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
        );
    };

    const buildVariables = () => {
        const result: Record<string, string> = {};
        for (const item of variables) {
            const key = item.key.trim();
            if (!key) continue;
            result[key] = item.value;
        }
        return result;
    };

    const handleStart = async () => {
        setError(null);
        if (!targetUrl.trim()) {
            setError('Target URL is required.');
            return;
        }
        try {
            new URL(targetUrl);
        } catch {
            setError('Target URL must be a valid URL.');
            return;
        }
        await onStart({
            targetUrl: targetUrl.trim(),
            browser,
            environment: environment.trim() || 'local',
            variables: buildVariables(),
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
                onClick={!loading ? onClose : undefined}
            />

            {/* Modal */}
            <div className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">

                {/* Top accent bar */}
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-400 via-[var(--cap-blue)] to-blue-600 rounded-t-2xl" />

                {/* Header */}
                <div className="relative shrink-0 px-6 pt-7 pb-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            {/* Icon badge */}
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)] text-white shadow-lg shadow-[var(--cap-blue)]/30">
                                <PlayCircle size={20} strokeWidth={1.75} />
                            </div>

                            <div>
                                <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--cap-blue)]">
                                    Live execution
                                </p>
                                <h3 className="mt-0.5 text-[18px] font-bold tracking-tight text-slate-900">
                                    Run automation script
                                </h3>
                                <p className="mt-1 max-w-md text-[13px] leading-relaxed text-slate-500">
                                    Configure where the script runs. Add runtime variables only when the script needs credentials, tokens, or test data.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-shrink-0 mt-0.5 rounded-lg p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Divider */}
                <div className="mx-6 h-px bg-slate-100" />

                {/* Body */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-3">

                    {/* Target URL */}
                    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3.5 flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 shadow-sm">
                                <Globe2 className="h-3.5 w-3.5" />
                            </div>
                            <div>
                                <h4 className="text-[13px] font-semibold text-slate-800 leading-none">Target</h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">The app URL your automation should test.</p>
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-widest text-slate-400">
                                Target URL
                            </label>
                            <input
                                value={targetUrl}
                                onChange={(e) => setTargetUrl(e.target.value)}
                                placeholder="http://host.docker.internal:3000"
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] text-slate-800 outline-none shadow-sm transition-all placeholder:text-slate-400 focus:border-[var(--cap-blue)]/50 focus:ring-2 focus:ring-[var(--cap-blue)]/10 focus:shadow-none"
                            />
                        </div>

                        <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                            <span className="mt-px text-blue-400">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
                                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                            </span>
                            <p className="text-[11.5px] leading-relaxed text-blue-700">
                                Docker runs usually need{' '}
                                <code className="rounded bg-white/80 px-1 py-0.5 font-mono text-[11px] border border-blue-100">
                                    host.docker.internal
                                </code>{' '}
                                instead of localhost.
                            </p>
                        </div>
                    </section>

                    {/* Browser + Environment */}
                    <section className="grid gap-3 sm:grid-cols-2">
                        {/* Browser */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="mb-3 flex items-center gap-2.5">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                                    <Settings2 className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                    <span className="block text-[13px] font-semibold text-slate-800 leading-none">Browser</span>
                                    <span className="text-[11px] text-slate-400">Execution engine</span>
                                </div>
                            </div>
                            <div className="relative">
                                <select
                                    value={browser}
                                    onChange={(e) => setBrowser(e.target.value as BrowserTarget)}
                                    className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-3.5 pr-9 text-[13px] text-slate-700 outline-none transition-all focus:border-[var(--cap-blue)]/50 focus:bg-white focus:ring-2 focus:ring-[var(--cap-blue)]/10 cursor-pointer"
                                >
                                    {browserOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        {/* Environment */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="mb-3 flex items-center gap-2.5">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                                    <Server className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                    <span className="block text-[13px] font-semibold text-slate-800 leading-none">Environment</span>
                                    <span className="text-[11px] text-slate-400">Run context</span>
                                </div>
                            </div>
                            <div className="relative">
                                <select
                                    value={environment}
                                    onChange={(e) => setEnvironment(e.target.value)}
                                    className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-3.5 pr-9 text-[13px] text-slate-700 outline-none transition-all focus:border-[var(--cap-blue)]/50 focus:bg-white focus:ring-2 focus:ring-[var(--cap-blue)]/10 cursor-pointer"
                                >
                                    {environmentOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                    </section>

                    {/* Runtime variables */}
                    <section className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-2.5">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                                    <LockKeyhole className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                    <h4 className="text-[13px] font-semibold text-slate-800 leading-none">Runtime variables</h4>
                                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                                        EMAIL, PASSWORD, TOKEN, or TEST_USER.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-shrink-0 items-center gap-2">
                                {validVariablesCount > 0 && (
                                    <span className="rounded-lg bg-[var(--cap-blue)]/8 px-2 py-1 text-[11px] font-semibold text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/15">
                                        {validVariablesCount} active
                                    </span>
                                )}

                                {/* Manage toggle */}
                                <button
                                    type="button"
                                    onClick={() => setShowVariables((v) => !v)}
                                    disabled={loading}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95 disabled:opacity-40"
                                >
                                    {showVariables
                                        ? <><ChevronUp className="h-3 w-3" /> Hide</>
                                        : <><ChevronDown className="h-3 w-3" /> Manage</>
                                    }
                                </button>

                                {/* Add variable */}
                                <button
                                    type="button"
                                    onClick={addVariable}
                                    disabled={loading}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95 disabled:opacity-40"
                                >
                                    <Plus className="h-3 w-3" />
                                    Add
                                </button>
                            </div>
                        </div>

                        {showVariables && (
                            <div className="mt-4">
                                {variables.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-[12px] leading-relaxed text-slate-400">
                                        No variables yet. Add one when the script needs credentials or dynamic values.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {variables.map((variable, index) => {
                                            const isSecret =
                                                variable.key.toLowerCase().includes('password') ||
                                                variable.key.toLowerCase().includes('token') ||
                                                variable.key.toLowerCase().includes('secret');

                                            return (
                                                <div
                                                    key={index}
                                                    className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-2 sm:grid-cols-[1fr_1fr_auto]"
                                                >
                                                    <input
                                                        value={variable.key}
                                                        onChange={(e) => updateVariable(index, 'key', e.target.value)}
                                                        placeholder="KEY"
                                                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-mono text-[12px] text-slate-700 outline-none shadow-sm transition-all placeholder:text-slate-400 focus:border-[var(--cap-blue)]/50 focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                                    />
                                                    <input
                                                        value={variable.value}
                                                        onChange={(e) => updateVariable(index, 'value', e.target.value)}
                                                        placeholder="value"
                                                        type={isSecret ? 'password' : 'text'}
                                                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-mono text-[12px] text-slate-700 outline-none shadow-sm transition-all placeholder:text-slate-400 focus:border-[var(--cap-blue)]/50 focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeVariable(index)}
                                                        disabled={loading}
                                                        className="inline-flex h-9 items-center justify-center rounded-lg border border-red-100 bg-white px-3 text-red-400 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-40"
                                                        aria-label="Remove variable"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                            <span className="text-[13px] font-medium leading-relaxed text-red-700">{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4">
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[11.5px] leading-relaxed text-slate-400 max-w-sm">
                            Execution starts immediately and opens the live console inside the script workspace.
                        </p>

                        <div className="flex items-center gap-2.5">
                            {/* Cancel */}
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-[13px] font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Cancel
                            </button>

                            {/* Start execution — the hero button */}
                            <button
                                type="button"
                                onClick={handleStart}
                                disabled={loading}
                                className={[
                                    'relative h-10 overflow-hidden rounded-xl px-5 text-[13px] font-semibold text-white',
                                    'bg-[var(--cap-blue)]',
                                    'shadow-[0_1px_2px_rgba(0,0,0,0.15),0_4px_16px_color-mix(in_srgb,var(--cap-blue)_35%,transparent)]',
                                    'transition-all duration-150',
                                    'hover:brightness-105 hover:shadow-[0_2px_4px_rgba(0,0,0,0.15),0_6px_20px_color-mix(in_srgb,var(--cap-blue)_45%,transparent)]',
                                    'active:scale-[0.97] active:brightness-95 active:shadow-none',
                                    'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:brightness-100',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cap-blue)] focus-visible:ring-offset-2',
                                ].join(' ')}
                            >
                                <span className="inline-flex items-center gap-2">
                                    {loading ? (
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.75px] border-white/30 border-t-white" />
                                    ) : (
                                        <PlayCircle className="h-3.5 w-3.5 shrink-0" />
                                    )}
                                    <span>{loading ? 'Starting…' : 'Start'}</span>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}