'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Download,
    Loader2,
    Square,
    Terminal,
    X,
    XCircle,
} from 'lucide-react';
import { AutomationScriptExecution } from '@/lib/script-execution.service';

type Props = {
    execution: AutomationScriptExecution | null;
    open: boolean;
    onClose: () => void;
};

function getStatusIcon(status?: AutomationScriptExecution['status']) {
    if (status === 'PASSED') {
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
    }

    if (status === 'FAILED') {
        return <XCircle className="h-3.5 w-3.5 text-red-600" />;
    }

    if (status === 'TIMED_OUT') {
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />;
    }

    if (status === 'CANCELED') {
        return <Square className="h-3.5 w-3.5 text-slate-500" />;
    }

    if (status === 'RUNNING') {
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />;
    }

    return <Clock className="h-3.5 w-3.5 text-slate-500" />;
}

function getStatusClass(status?: AutomationScriptExecution['status']) {
    if (status === 'PASSED') {
        return 'border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
    }

    if (status === 'FAILED') {
        return 'border-red-200 bg-red-50 text-red-700 ring-1 ring-red-100';
    }

    if (status === 'TIMED_OUT') {
        return 'border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-amber-100';
    }

    if (status === 'RUNNING') {
        return 'border-blue-200 bg-blue-50 text-blue-700 ring-1 ring-blue-100';
    }

    if (status === 'CANCELED') {
        return 'border-slate-200 bg-slate-100 text-slate-600 ring-1 ring-slate-100';
    }

    return 'border-slate-200 bg-slate-50 text-slate-700 ring-1 ring-slate-100';
}

function formatDate(value?: string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}

function formatDuration(startedAt?: string | null, completedAt?: string | null) {
    if (!startedAt) return '—';

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

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="group rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_6px_rgba(0,0,0,0.07)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {label}
            </p>
            <p className="mt-1.5 truncate text-[13px] font-semibold leading-snug text-slate-800">
                {value}
            </p>
        </div>
    );
}

export function ExecutionDetailModal({ execution, open, onClose }: Props) {
    const [mounted, setMounted] = useState(false);

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
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose]);

    if (!mounted || !open || !execution) return null;

    const artifacts = Array.isArray(execution.artifacts) ? execution.artifacts : [];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6">
            {/* Backdrop */}
           <button
                type="button"
                aria-label="Close modal"
                className="absolute inset-0 border-0 bg-slate-950/60 p-0 backdrop-blur-[2px]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
                {/* Header */}
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="text-[15px] font-bold tracking-tight text-slate-900">
                                Execution Details
                            </h3>

                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${getStatusClass(
                                    execution.status,
                                )}`}
                            >
                                {getStatusIcon(execution.status)}
                                {execution.status}
                            </span>
                        </div>

                        <p className="mt-1 truncate font-mono text-[11px] tracking-tight text-slate-400">
                            {execution.id}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:bg-slate-200"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
                    {/* Info grid */}
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                        <InfoCard label="Framework" value={execution.framework || '—'} />
                        <InfoCard label="Browser" value={execution.browser || 'Default'} />
                        <InfoCard label="Environment" value={execution.environment || 'Default'} />
                        <InfoCard
                            label="Exit Code"
                            value={
                                execution.exitCode === null || execution.exitCode === undefined
                                    ? '—'
                                    : String(execution.exitCode)
                            }
                        />
                        <InfoCard
                            label="Duration"
                            value={formatDuration(execution.startedAt, execution.completedAt)}
                        />
                        <InfoCard label="Created" value={formatDate(execution.createdAt)} />
                        <InfoCard label="Started" value={formatDate(execution.startedAt)} />
                        <InfoCard label="Completed" value={formatDate(execution.completedAt)} />
                    </div>

                    {/* Target URL */}
                    {execution.targetUrl && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Target URL
                            </p>
                            <p className="mt-1.5 break-all text-[13px] font-medium leading-relaxed text-slate-700">
                                {execution.targetUrl}
                            </p>
                        </div>
                    )}

                    {/* Command */}
                    {execution.command && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Command
                            </p>
                            <p className="mt-1.5 break-all font-mono text-[12px] leading-relaxed text-slate-700">
                                {execution.command}
                            </p>
                        </div>
                    )}

                    {/* Error message */}
                    {execution.errorMessage && (
                        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
                            <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                            <p className="text-[13px] font-medium leading-relaxed text-red-700">
                                {execution.errorMessage}
                            </p>
                        </div>
                    )}

                    {/* Artifacts */}
                    {artifacts.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Artifacts
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {artifacts.map((artifact, index) => {
                                    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
                                    const href = `${apiUrl}${artifact.url}`;

                                    return (
                                        <a
                                            key={`${artifact.url}-${index}`}
                                            href={href}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:border-slate-300 hover:bg-white hover:text-slate-800 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] active:scale-[0.98]"
                                        >
                                            <Download className="h-3 w-3 text-slate-400" />
                                            {artifact.type}
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Logs terminal */}
                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                            </div>

                            <div className="ml-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                                <Terminal className="h-3.5 w-3.5" />
                                Execution Logs
                            </div>
                        </div>

                        <div className="max-h-72 overflow-y-auto overscroll-contain px-4 py-3 font-mono text-[11.5px] leading-[1.7] text-slate-100">
                            {execution.logs?.length ? (
                                execution.logs.map((log, index) => (
                                    <div key={`${log.timestamp}-${index}`} className="flex gap-2">
                                        <span className="flex-shrink-0 select-none text-slate-600">
                                            [{new Date(log.timestamp).toLocaleTimeString()}]
                                        </span>
                                        <span className="text-slate-200">{log.message}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="italic text-slate-500">No logs available.</p>
                            )}

                            {execution.stdout && (
                                <pre className="mt-3 whitespace-pre-wrap border-t border-slate-800/80 pt-3 text-slate-200">
                                    {execution.stdout}
                                </pre>
                            )}

                            {execution.stderr && (
                                <pre className="mt-3 whitespace-pre-wrap border-t border-slate-800/80 pt-3 text-red-400">
                                    {execution.stderr}
                                </pre>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-[13px] font-semibold text-slate-600 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] active:scale-[0.98] active:shadow-none"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}