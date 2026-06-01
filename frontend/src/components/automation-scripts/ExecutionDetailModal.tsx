'use client';

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
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    }

    if (status === 'FAILED') {
        return <XCircle className="h-4 w-4 text-red-600" />;
    }

    if (status === 'TIMED_OUT') {
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    }

    if (status === 'CANCELED') {
        return <Square className="h-4 w-4 text-slate-500" />;
    }

    if (status === 'RUNNING') {
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    }

    return <Clock className="h-4 w-4 text-slate-500" />;
}

function getStatusClass(status?: AutomationScriptExecution['status']) {
    if (status === 'PASSED') {
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }

    if (status === 'FAILED') {
        return 'border-red-200 bg-red-50 text-red-700';
    }

    if (status === 'TIMED_OUT') {
        return 'border-amber-200 bg-amber-50 text-amber-700';
    }

    if (status === 'RUNNING') {
        return 'border-blue-200 bg-blue-50 text-blue-700';
    }

    if (status === 'CANCELED') {
        return 'border-slate-200 bg-slate-100 text-slate-600';
    }

    return 'border-slate-200 bg-slate-50 text-slate-700';
}

function formatDate(value?: string | null) {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleString();
}

function formatDuration(startedAt?: string | null, completedAt?: string | null) {
    if (!startedAt) {
        return '-';
    }

    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();

    const diffMs = Math.max(0, end - start);

    if (diffMs < 1000) {
        return `${diffMs}ms`;
    }

    const seconds = Math.round(diffMs / 1000);

    if (seconds < 60) {
        return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const restSeconds = seconds % 60;

    return `${minutes}m ${restSeconds}s`;
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {label}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                {value}
            </p>
        </div>
    );
}

export function ExecutionDetailModal({ execution, open, onClose }: Props) {
    if (!open || !execution) {
        return null;
    }

    const artifacts = Array.isArray(execution.artifacts)
        ? execution.artifacts
        : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">
                                Execution Details
                            </h3>

                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                                    execution.status,
                                )}`}
                            >
                                {getStatusIcon(execution.status)}
                                {execution.status}
                            </span>
                        </div>

                        <p className="mt-1 truncate text-xs text-slate-500">
                            {execution.id}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="overflow-auto px-5 py-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <InfoCard label="Framework" value={execution.framework || '-'} />
                        <InfoCard label="Browser" value={execution.browser || 'Default'} />
                        <InfoCard label="Environment" value={execution.environment || 'Default'} />
                        <InfoCard
                            label="Exit Code"
                            value={
                                execution.exitCode === null ||
                                execution.exitCode === undefined
                                    ? '-'
                                    : String(execution.exitCode)
                            }
                        />
                        <InfoCard
                            label="Duration"
                            value={formatDuration(
                                execution.startedAt,
                                execution.completedAt,
                            )}
                        />
                        <InfoCard label="Created" value={formatDate(execution.createdAt)} />
                        <InfoCard label="Started" value={formatDate(execution.startedAt)} />
                        <InfoCard label="Completed" value={formatDate(execution.completedAt)} />
                    </div>

                    {execution.targetUrl && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Target URL
                            </p>
                            <p className="mt-1 break-all text-sm text-slate-700">
                                {execution.targetUrl}
                            </p>
                        </div>
                    )}

                    {execution.command && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Command
                            </p>
                            <p className="mt-1 break-all font-mono text-xs text-slate-700">
                                {execution.command}
                            </p>
                        </div>
                    )}

                    {execution.errorMessage && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {execution.errorMessage}
                        </div>
                    )}

                    {artifacts.length > 0 && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Artifacts
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {artifacts.map((artifact, index) => {
                                    const apiUrl =
                                        process.env.NEXT_PUBLIC_API_URL ?? '';
                                    const href = `${apiUrl}${artifact.url}`;

                                    return (
                                        <a
                                            key={`${artifact.url}-${index}`}
                                            href={href}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            {artifact.type}
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="mt-4 rounded-xl bg-slate-950 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-300">
                            <Terminal className="h-4 w-4" />
                            Execution Logs
                        </div>

                        <div className="max-h-72 overflow-auto font-mono text-xs leading-relaxed text-slate-100">
                            {execution.logs?.length ? (
                                execution.logs.map((log, index) => (
                                    <div
                                        key={`${log.timestamp}-${index}`}
                                        className="py-0.5"
                                    >
                                        <span className="text-slate-500">
                                            [
                                            {new Date(
                                                log.timestamp,
                                            ).toLocaleTimeString()}
                                            ]
                                        </span>{' '}
                                        <span>{log.message}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-400">
                                    No logs available.
                                </p>
                            )}

                            {execution.stdout && (
                                <pre className="mt-3 whitespace-pre-wrap border-t border-slate-800 pt-3 text-slate-200">
                                    {execution.stdout}
                                </pre>
                            )}

                            {execution.stderr && (
                                <pre className="mt-3 whitespace-pre-wrap border-t border-slate-800 pt-3 text-red-300">
                                    {execution.stderr}
                                </pre>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}