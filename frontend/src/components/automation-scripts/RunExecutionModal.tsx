'use client';

import { useMemo, useState } from 'react';
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

export function RunExecutionModal({
                                      open,
                                      loading = false,
                                      onClose,
                                      onStart,
                                  }: Props) {
    const [targetUrl, setTargetUrl] = useState(
        process.env.NEXT_PUBLIC_DEFAULT_TARGET_URL || '',
    );
    const [browser, setBrowser] = useState<BrowserTarget>('CHROMIUM');
    const [environment, setEnvironment] = useState('local');
    const [variables, setVariables] = useState<VariableRow[]>([]);
    const [showVariables, setShowVariables] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validVariablesCount = useMemo(
        () => variables.filter((item) => item.key.trim()).length,
        [variables],
    );

    if (!open) return null;

    const addVariable = () => {
        setVariables((prev) => [...prev, { key: '', value: '' }]);
        setShowVariables(true);
    };

    const removeVariable = (index: number) => {
        setVariables((prev) => prev.filter((_, i) => i !== index));
    };

    const updateVariable = (
        index: number,
        field: keyof VariableRow,
        value: string,
    ) => {
        setVariables((prev) =>
            prev.map((item, i) =>
                i === index
                    ? {
                        ...item,
                        [field]: value,
                    }
                    : item,
            ),
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-2xl">
                <div className="relative border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--cap-blue)]/0 via-[var(--cap-blue)] to-[var(--cap-blue)]/0" />

                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/10">
                                <PlayCircle size={18} strokeWidth={1.8} />
                            </div>

                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                                    Live execution
                                </p>
                                <h3 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">
                                    Run automation script
                                </h3>
                                <p className="mt-1 max-w-lg text-sm leading-6 text-slate-500">
                                    Choose where the script should run. Add runtime variables only when the script needs credentials, tokens, or test data.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Close run execution modal"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">
                    <div className="space-y-5">
                        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200">
                                    <Globe2 className="h-4 w-4" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900">Target</h4>
                                    <p className="text-xs text-slate-400">The app URL your automation should test.</p>
                                </div>
                            </div>

                            <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Target URL
                </span>
                                <input
                                    value={targetUrl}
                                    onChange={(event) => setTargetUrl(event.target.value)}
                                    placeholder="http://host.docker.internal:3000"
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[var(--cap-blue)]/40 focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                />
                            </label>

                            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">
                                Docker runs usually need <code className="rounded bg-white/70 px-1 py-0.5 font-mono">host.docker.internal</code> instead of localhost.
                            </div>
                        </section>

                        <section className="grid gap-3 sm:grid-cols-2">
                            <label className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
                                <div className="mb-3 flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                        <Settings2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <span className="block text-sm font-semibold text-slate-900">Browser</span>
                                        <span className="text-xs text-slate-400">Execution engine</span>
                                    </div>
                                </div>

                                <select
                                    value={browser}
                                    onChange={(event) => setBrowser(event.target.value as BrowserTarget)}
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-[var(--cap-blue)]/40 focus:bg-white focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                >
                                    {browserOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
                                <div className="mb-3 flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                        <Server className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <span className="block text-sm font-semibold text-slate-900">Environment</span>
                                        <span className="text-xs text-slate-400">Run context</span>
                                    </div>
                                </div>

                                <select
                                    value={environment}
                                    onChange={(event) => setEnvironment(event.target.value)}
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-[var(--cap-blue)]/40 focus:bg-white focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                >
                                    {environmentOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                        <LockKeyhole className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-900">Runtime variables</h4>
                                        <p className="mt-0.5 text-xs leading-5 text-slate-400">
                                            Optional values such as EMAIL, PASSWORD, TOKEN, or TEST_USER.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {validVariablesCount > 0 && (
                                        <span className="rounded-lg bg-[var(--cap-blue)]/8 px-2.5 py-1 text-[11px] font-semibold text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/10">
                      {validVariablesCount} active
                    </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowVariables((value) => !value)}
                                        disabled={loading}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40"
                                    >
                                        {showVariables ? 'Hide' : 'Manage'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={addVariable}
                                        disabled={loading}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add
                                    </button>
                                </div>
                            </div>

                            {showVariables && (
                                <div className="mt-4">
                                    {variables.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs text-slate-400">
                                            No runtime variables added. Add one only if the script needs test credentials or dynamic values.
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
                                                        className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2 sm:grid-cols-[1fr_1fr_auto]"
                                                    >
                                                        <input
                                                            value={variable.key}
                                                            onChange={(event) =>
                                                                updateVariable(index, 'key', event.target.value)
                                                            }
                                                            placeholder="KEY"
                                                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[var(--cap-blue)]/40 focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                                        />

                                                        <input
                                                            value={variable.value}
                                                            onChange={(event) =>
                                                                updateVariable(index, 'value', event.target.value)
                                                            }
                                                            placeholder="value"
                                                            type={isSecret ? 'password' : 'text'}
                                                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[var(--cap-blue)]/40 focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={() => removeVariable(index)}
                                                            disabled={loading}
                                                            className="inline-flex h-10 items-center justify-center rounded-xl border border-red-100 bg-white px-3 text-red-500 transition hover:bg-red-50 disabled:opacity-40"
                                                            aria-label="Remove runtime variable"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {error && (
                            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p className="text-xs text-slate-400">
                        Execution starts immediately and the live console will open inside the script workspace.
                    </p>

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleStart}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--cap-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {loading ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                                <PlayCircle className="h-4 w-4" />
                            )}
                            Start execution
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
