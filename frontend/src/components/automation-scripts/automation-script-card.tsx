"use client";

import { useEffect, useRef, useState } from "react";
import {
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    Code2,
    Download,
    FileCode2,
    Info,
    Loader2,
    MoreHorizontal,
    Pencil,
    PlayCircle,
    Save,
    Square,
    TerminalSquare,
    Trash2,
    TriangleAlert,
    X,
    XCircle,
} from "lucide-react";

import { automationScriptService } from "@/lib/automation-script.service";
import { AutomationScript } from "@/lib/types";
import {
    AutomationScriptExecution,
    cancelScriptExecution,
    getScriptExecution,
    listenToExecutionEvents,
    RunAutomationScriptPayload,
    runAutomationScriptLive,
} from "@/lib/script-execution.service";
import { ExecutionDetailModal } from "./ExecutionDetailModal";
import { ExecutionHistoryPanel } from "./ExecutionHistoryPanel";
import { ExecutionStatsPanel } from "./ExecutionStatsPanel";
import { LiveExecutionPanel } from "./LiveExecutionPanel";
import { RunExecutionModal } from "./RunExecutionModal";
import { ScheduledTestRunsPanel } from "./ScheduledTestRunsPanel";

type Props = {
    script: AutomationScript;
    onChanged: (script: AutomationScript) => void;
    onRemoved: (script: AutomationScript) => void;
};

type DetailTab = "code" | "runs" | "notes";

export default function AutomationScriptCard({
                                                 script,
                                                 onChanged,
                                                 onRemoved,
                                             }: Props) {
    const [editing, setEditing] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<DetailTab>("code");
    const [codeExpanded, setCodeExpanded] = useState(false);
    const [actionsOpen, setActionsOpen] = useState(false);

    const [fileName, setFileName] = useState(script.fileName);
    const [code, setCode] = useState(script.code);
    const [explanation, setExplanation] = useState(script.explanation || "");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [liveExecution, setLiveExecution] =
        useState<AutomationScriptExecution | null>(null);
    const [runningLive, setRunningLive] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);

    const [runModalOpen, setRunModalOpen] = useState(false);
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
    const [selectedExecution, setSelectedExecution] =
        useState<AutomationScriptExecution | null>(null);

    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, []);

    const wrap = async (fn: () => Promise<void>) => {
        try {
            setBusy(true);
            setError(null);
            await fn();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Something went wrong.");
        } finally {
            setBusy(false);
        }
    };

    const save = () =>
        wrap(async () => {
            const updated = await automationScriptService.update(script.id, {
                fileName,
                code,
                explanation,
            });

            onChanged(updated);
            setEditing(false);
        });

    const approve = () =>
        wrap(async () => {
            onChanged(await automationScriptService.approve(script.id));
            setActionsOpen(false);
        });

    const decline = () =>
        wrap(async () => {
            onChanged(await automationScriptService.decline(script.id));
            setActionsOpen(false);
        });

    const remove = () =>
        wrap(async () => {
            onRemoved(await automationScriptService.remove(script.id));
            setActionsOpen(false);
        });

    const download = () => {
        const url = URL.createObjectURL(
            new Blob([script.code], { type: "text/plain;charset=utf-8" })
        );

        Object.assign(document.createElement("a"), {
            href: url,
            download: script.fileName,
        }).click();

        URL.revokeObjectURL(url);
        setActionsOpen(false);
    };

    const openDetails = (tab: DetailTab = "code") => {
        setDetailsOpen(true);
        setActiveTab(tab);
    };

    const handleRunLive = async (payload: RunAutomationScriptPayload) => {
        try {
            setError(null);
            setRunningLive(true);
            openDetails("runs");

            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }

            const response = await runAutomationScriptLive(script.id, payload);

            setLiveExecution(response.execution);
            setRunModalOpen(false);

            eventSourceRef.current = listenToExecutionEvents(
                response.execution.id,
                async (execution) => {
                    setLiveExecution(execution);

                    const isFinal =
                        execution.status !== "QUEUED" && execution.status !== "RUNNING";

                    if (isFinal) {
                        setTimeout(async () => {
                            const finalExecution = await getScriptExecution(execution.id);

                            setLiveExecution(finalExecution);
                            setRunningLive(false);
                            setHistoryRefreshKey((value) => value + 1);

                            if (eventSourceRef.current) {
                                eventSourceRef.current.close();
                                eventSourceRef.current = null;
                            }
                        }, 500);
                    }
                },
                () => {
                    setRunningLive(false);
                    setError("Live execution stream disconnected.");
                }
            );
        } catch (err: any) {
            setRunningLive(false);
            setError(err?.response?.data?.message || "Failed to start live execution.");
        }
    };

    const handleCancelLiveExecution = async () => {
        if (!liveExecution) return;

        try {
            const updated = await cancelScriptExecution(liveExecution.id);

            setLiveExecution(updated);
            setRunningLive(false);
            setHistoryRefreshKey((value) => value + 1);

            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to cancel execution.");
        }
    };

    const isRemoved = script.status === "REMOVED";
    const isApproved = script.status === "APPROVED";
    const isDeclined = script.status === "DECLINED";
    const lineCount = script.code.split("\n").length;
    const hasWarnings = (script.warnings?.length || 0) > 0;
    const hasSetupNotes = (script.setupNotes?.length || 0) > 0;
    const hasNotes = Boolean(script.explanation) || hasSetupNotes || hasWarnings;

    return (
        <div
            className={`overflow-hidden rounded-2xl border bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] transition ${
                isRemoved
                    ? "border-slate-100 opacity-60"
                    : "border-slate-200/70 hover:border-[var(--cap-blue)]/20 hover:shadow-md"
            }`}
        >
            {/* Compact summary. This is the only part users see by default. */}
            <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/10">
                            <FileCode2 size={18} strokeWidth={1.8} />
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                {editing ? (
                                    <input
                                        value={fileName}
                                        onChange={(event) => setFileName(event.target.value)}
                                        className="min-w-[240px] rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-slate-800 outline-none transition focus:border-[var(--cap-blue)]/40 focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                    />
                                ) : (
                                    <h4 className="truncate font-mono text-sm font-bold text-slate-900">
                                        {script.fileName}
                                    </h4>
                                )}

                                <StatusPill status={script.status} />
                                {liveExecution && <ExecutionStatusPill status={liveExecution.status} />}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                <Pill>{script.framework}</Pill>
                                <Pill>{script.language}</Pill>
                                <Pill>{lineCount} lines</Pill>
                                {hasWarnings && <WarningMiniPill count={script.warnings?.length ?? 0} />}
                            </div>

                            {!editing && script.explanation && (
                                <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-500">
                                    {script.explanation}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <button
                            type="button"
                            onClick={() => setRunModalOpen(true)}
                            disabled={busy || runningLive || isRemoved || !isApproved}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--cap-blue)] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                            title={isApproved ? "Configure and run" : "Approve script before running"}
                        >
                            {runningLive ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <PlayCircle className="h-3.5 w-3.5" />
                            )}
                            Run
                        </button>

                        {!isApproved && !isRemoved && (
                            <button
                                type="button"
                                onClick={approve}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approve
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                if (detailsOpen) {
                                    setDetailsOpen(false);
                                    setEditing(false);
                                } else {
                                    openDetails("code");
                                }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        >
                            {detailsOpen ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                            )}
                            {detailsOpen ? "Close" : "Open"}
                        </button>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setActionsOpen((value) => !value)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                                aria-label="More script actions"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {actionsOpen && (
                                <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                                    <MenuButton
                                        icon={<Pencil className="h-3.5 w-3.5" />}
                                        disabled={busy || isRemoved}
                                        onClick={() => {
                                            openDetails("code");
                                            setEditing(true);
                                            setActionsOpen(false);
                                        }}
                                    >
                                        Edit script
                                    </MenuButton>

                                    <MenuButton
                                        icon={<Download className="h-3.5 w-3.5" />}
                                        onClick={download}
                                    >
                                        Download
                                    </MenuButton>

                                    <MenuButton
                                        icon={<TerminalSquare className="h-3.5 w-3.5" />}
                                        onClick={() => {
                                            openDetails("runs");
                                            setActionsOpen(false);
                                        }}
                                    >
                                        View runs
                                    </MenuButton>

                                    {hasNotes && (
                                        <MenuButton
                                            icon={<Info className="h-3.5 w-3.5" />}
                                            onClick={() => {
                                                openDetails("notes");
                                                setActionsOpen(false);
                                            }}
                                        >
                                            View notes
                                        </MenuButton>
                                    )}

                                    <div className="my-1 h-px bg-slate-100" />

                                    <MenuButton
                                        icon={<XCircle className="h-3.5 w-3.5" />}
                                        disabled={busy || isDeclined || isRemoved}
                                        tone="danger"
                                        onClick={decline}
                                    >
                                        Decline
                                    </MenuButton>

                                    <MenuButton
                                        icon={<Trash2 className="h-3.5 w-3.5" />}
                                        disabled={busy}
                                        tone="danger"
                                        onClick={remove}
                                    >
                                        Remove
                                    </MenuButton>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                        {error}
                    </div>
                )}
            </div>

            {detailsOpen && (
                <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                    <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                            <TabButton
                                active={activeTab === "code"}
                                icon={<Code2 className="h-3.5 w-3.5" />}
                                onClick={() => setActiveTab("code")}
                            >
                                Code
                            </TabButton>
                            <TabButton
                                active={activeTab === "runs"}
                                icon={<TerminalSquare className="h-3.5 w-3.5" />}
                                onClick={() => setActiveTab("runs")}
                            >
                                Runs
                            </TabButton>
                            <TabButton
                                active={activeTab === "notes"}
                                icon={<Info className="h-3.5 w-3.5" />}
                                onClick={() => setActiveTab("notes")}
                            >
                                Notes
                            </TabButton>
                        </div>

                        {editing ? (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={save}
                                    disabled={busy}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black disabled:opacity-50"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    Save changes
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditing(false);
                                        setFileName(script.fileName);
                                        setCode(script.code);
                                        setExplanation(script.explanation || "");
                                    }}
                                    disabled={busy}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400">
                                Details are separated into tabs so only one task is visible at a time.
                            </p>
                        )}
                    </div>

                    {activeTab === "code" && (
                        <div className="space-y-4">
                            {editing && (
                                <div>
                                    <FieldLabel>Explanation</FieldLabel>
                                    <textarea
                                        value={explanation}
                                        onChange={(event) => setExplanation(event.target.value)}
                                        rows={3}
                                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[var(--cap-blue)]/40 focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                    />
                                </div>
                            )}

                            {editing ? (
                                <div>
                                    <FieldLabel>Code</FieldLabel>
                                    <textarea
                                        value={code}
                                        onChange={(event) => setCode(event.target.value)}
                                        rows={18}
                                        className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-xs leading-relaxed text-slate-100 outline-none transition focus:border-[var(--cap-blue)] focus:ring-2 focus:ring-[var(--cap-blue)]/20"
                                    />
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                                    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2">
                    <span className="truncate font-mono text-[11px] text-slate-400">
                      {script.fileName}
                    </span>

                                        <button
                                            type="button"
                                            onClick={() => setCodeExpanded((value) => !value)}
                                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 transition hover:text-white"
                                        >
                                            {codeExpanded ? (
                                                <ChevronUp className="h-3 w-3" />
                                            ) : (
                                                <ChevronDown className="h-3 w-3" />
                                            )}
                                            {codeExpanded ? "Collapse" : "Expand"}
                                        </button>
                                    </div>

                                    <pre
                                        className={`overflow-auto px-4 py-3 text-xs leading-relaxed text-slate-100 ${
                                            codeExpanded ? "max-h-none" : "max-h-72"
                                        }`}
                                    >
                    <code>{script.code}</code>
                  </pre>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "runs" && (
                        <div className="space-y-4">
                            <LiveExecutionPanel
                                execution={liveExecution}
                                onCancel={handleCancelLiveExecution}
                            />

                            <ScheduledTestRunsPanel scriptId={script.id} />

                            <ExecutionStatsPanel
                                scriptId={script.id}
                                refreshKey={historyRefreshKey}
                            />

                            <ExecutionHistoryPanel
                                scriptId={script.id}
                                refreshKey={historyRefreshKey}
                                onSelect={(execution) => setSelectedExecution(execution)}
                            />
                        </div>
                    )}

                    {activeTab === "notes" && (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {hasNotes || editing ? (
                                <>
                                    {(script.explanation || editing) && (
                                        <NoteBlock title="Explanation" icon={<Info className="h-4 w-4" />}>
                                            {editing ? (
                                                <textarea
                                                    value={explanation}
                                                    onChange={(event) => setExplanation(event.target.value)}
                                                    rows={4}
                                                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[var(--cap-blue)]/40 focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                                />
                                            ) : (
                                                <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
                                                    {script.explanation || "—"}
                                                </p>
                                            )}
                                        </NoteBlock>
                                    )}

                                    {script.setupNotes && script.setupNotes.length > 0 && (
                                        <NoteBlock title="Setup notes" icon={<Info className="h-4 w-4" />}>
                                            <BulletList items={script.setupNotes} />
                                        </NoteBlock>
                                    )}

                                    {script.warnings && script.warnings.length > 0 && (
                                        <NoteBlock
                                            title="Warnings"
                                            icon={<TriangleAlert className="h-4 w-4" />}
                                            tone="warning"
                                        >
                                            <BulletList items={script.warnings} />
                                        </NoteBlock>
                                    )}
                                </>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400 lg:col-span-2">
                                    No notes, setup instructions, or warnings for this script.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <RunExecutionModal
                open={runModalOpen}
                loading={runningLive}
                onClose={() => {
                    if (!runningLive) setRunModalOpen(false);
                }}
                onStart={handleRunLive}
            />

            <ExecutionDetailModal
                open={!!selectedExecution}
                execution={selectedExecution}
                onClose={() => setSelectedExecution(null)}
            />
        </div>
    );
}

function TabButton({
                       active,
                       icon,
                       children,
                       onClick,
                   }: {
    active: boolean;
    icon: React.ReactNode;
    children: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                active
                    ? "bg-[var(--cap-blue)] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
        >
            {icon}
            {children}
        </button>
    );
}

function MenuButton({
                        icon,
                        children,
                        disabled,
                        tone = "default",
                        onClick,
                    }: {
    icon: React.ReactNode;
    children: React.ReactNode;
    disabled?: boolean;
    tone?: "default" | "danger";
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                tone === "danger"
                    ? "text-red-600 hover:bg-red-50"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
        >
            {icon}
            {children}
        </button>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {children}
        </p>
    );
}

function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
      {children}
    </span>
    );
}

function WarningMiniPill({ count }: { count: number }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      <TriangleAlert className="h-3 w-3" />
            {count} warning{count === 1 ? "" : "s"}
    </span>
    );
}

function StatusPill({ status }: { status: AutomationScript["status"] }) {
    const styles: Record<string, string> = {
        APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        DECLINED: "bg-red-50 text-red-700 ring-red-100",
        EDITED: "bg-blue-50 text-blue-700 ring-blue-100",
        REMOVED: "bg-slate-100 text-slate-400 ring-slate-200",
        GENERATED: "bg-amber-50 text-amber-700 ring-amber-100",
    };

    const dots: Record<string, string> = {
        APPROVED: "bg-emerald-500",
        DECLINED: "bg-red-500",
        EDITED: "bg-blue-500",
        REMOVED: "bg-slate-400",
        GENERATED: "bg-amber-500",
    };

    const cls = styles[status] ?? "bg-amber-50 text-amber-700 ring-amber-100";
    const dot = dots[status] ?? "bg-amber-500";
    const label = status.charAt(0) + status.slice(1).toLowerCase();

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ring-1 ${cls}`}
        >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {label}
    </span>
    );
}

function ExecutionStatusPill({
                                 status,
                             }: {
    status: AutomationScriptExecution["status"];
}) {
    const styles: Record<string, string> = {
        QUEUED: "bg-slate-50 text-slate-600 ring-slate-200",
        RUNNING: "bg-blue-50 text-blue-700 ring-blue-100",
        PASSED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        FAILED: "bg-red-50 text-red-700 ring-red-100",
        TIMED_OUT: "bg-amber-50 text-amber-700 ring-amber-100",
        CANCELED: "bg-slate-100 text-slate-500 ring-slate-200",
    };

    const icon =
        status === "RUNNING" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
        ) : status === "PASSED" ? (
            <CheckCircle2 className="h-3 w-3" />
        ) : status === "FAILED" ? (
            <XCircle className="h-3 w-3" />
        ) : status === "TIMED_OUT" ? (
            <TriangleAlert className="h-3 w-3" />
        ) : status === "CANCELED" ? (
            <Square className="h-3 w-3" />
        ) : (
            <Clock className="h-3 w-3" />
        );

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ring-1 ${
                styles[status] ?? styles.QUEUED
            }`}
        >
      {icon}
            {status}
    </span>
    );
}

function NoteBlock({
                       title,
                       icon,
                       children,
                       tone = "default",
                   }: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    tone?: "default" | "warning";
}) {
    const toneClass =
        tone === "warning"
            ? "border-amber-100 bg-amber-50 text-amber-700"
            : "border-slate-200 bg-white text-slate-600";

    return (
        <div className={`rounded-2xl border p-4 ${toneClass}`}>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]">
                {icon}
                {title}
            </div>
            {children}
        </div>
    );
}

function BulletList({ items }: { items: string[] }) {
    return (
        <ul className="space-y-2 text-sm leading-6">
            {items.map((item, index) => (
                <li key={`${item}-${index}`} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}
