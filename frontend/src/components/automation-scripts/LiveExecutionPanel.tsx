'use client';

import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Download,
    Loader2,
    PlayCircle,
    Square,
    Terminal,
    XCircle,
} from 'lucide-react';
import {
    AutomationScriptExecution,
    cancelScriptExecution,
} from '@/lib/script-execution.service';

type Props = {
    execution: AutomationScriptExecution | null;
    onCancel?: (execution: AutomationScriptExecution) => void;
};

function getStatusIcon(status?: string) {
    if (status === 'PASSED') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    if (status === 'FAILED') return <XCircle className="h-4 w-4 text-red-600" />;
    if (status === 'TIMED_OUT') return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    if (status === 'CANCELED') return <Square className="h-4 w-4 text-slate-500" />;
    if (status === 'RUNNING') return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;

    return <Clock className="h-4 w-4 text-slate-500" />;
}

function getStatusClass(status?: string) {
    if (status === 'PASSED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (status === 'FAILED') return 'border-red-200 bg-red-50 text-red-700';
    if (status === 'TIMED_OUT') return 'border-amber-200 bg-amber-50 text-amber-700';
    if (status === 'RUNNING') return 'border-blue-200 bg-blue-50 text-blue-700';

    return 'border-slate-200 bg-slate-50 text-slate-700';
}

export function LiveExecutionPanel({ execution, onCancel }: Props) {
    if (!execution) return null;

    const isActive =
        execution.status === 'QUEUED' || execution.status === 'RUNNING';

    const artifacts = Array.isArray(execution.artifacts)
        ? execution.artifacts
        : [];

    const handleCancel = async () => {
        if (!execution.id) return;

        const updated = await cancelScriptExecution(execution.id);

        if (onCancel) {
            onCancel(updated);
        }
    };

    return (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <PlayCircle className="h-4 w-4 text-slate-500" />
                        <h4 className="text-sm font-semibold text-slate-900">
                            Live Execution
                        </h4>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                        Execution ID: {execution.id}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                            execution.status,
                        )}`}
                    >
                        {getStatusIcon(execution.status)}
                        {execution.status}
                    </span>

                    {isActive && (
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">Browser</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                        {execution.browser ?? 'Default'}
                    </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">Environment</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                        {execution.environment ?? 'Default'}
                    </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">Exit Code</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                        {execution.exitCode ?? '-'}
                    </p>
                </div>
            </div>

            {execution.targetUrl && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">Target URL</p>
                    <p className="mt-1 break-all text-sm text-slate-800">
                        {execution.targetUrl}
                    </p>
                </div>
            )}

            {execution.errorMessage && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {execution.errorMessage}
                </div>
            )}

            {artifacts.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Artifacts
                    </p>

                    <div className="flex flex-wrap gap-2">
                        {artifacts.map((artifact, index) => {
                            const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
                            const href = `${apiUrl}${artifact.url}`;

                            return (
                                <a
                                    key={`${artifact.url}-${index}`}
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
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
                    Live Logs
                </div>

                <div className="max-h-56 overflow-auto font-mono text-xs text-slate-100">
                    {execution.logs?.length ? (
                        execution.logs.map((log, index) => (
                            <div key={`${log.timestamp}-${index}`} className="py-0.5">
                                <span className="text-slate-500">
                                    [{new Date(log.timestamp).toLocaleTimeString()}]
                                </span>{' '}
                                <span>{log.message}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-400">Waiting for logs...</p>
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
    );
}