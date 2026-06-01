"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ChevronLeft,
    FileText,
    Trash2,
    ExternalLink,
    CalendarDays,
    AlertCircle,
    ShieldAlert,
    ChevronDown,
    CheckCircle2,
    BookOpen,
    Sparkles,
} from "lucide-react";

import { workItemService } from "@/lib/work-item.service";
import { getStoredUser } from "@/lib/auth";
import type { User, WorkItem } from "@/lib/types";

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
const statusStyles: Record<string, string> = {
    PROCESSING: "bg-amber-50 text-amber-600 ring-amber-100",
    DONE: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    OPEN: "bg-sky-50 text-sky-600 ring-sky-100",
};

const priorityStyles: Record<string, string> = {
    HIGH: "bg-red-50 text-red-600 ring-red-100",
    MEDIUM: "bg-amber-50 text-amber-600 ring-amber-100",
    LOW: "bg-slate-100 text-slate-500 ring-slate-200",
};

function badge(
    map: Record<string, string>,
    key: string,
    fallback = "bg-slate-100 text-slate-500 ring-slate-200"
) {
    return map[key] ?? fallback;
}

const renderUnknown = (value: unknown): string => {
    if (value == null) return "—";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);

    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return "Unable to display value";
    }
};

function formatMetadataLabel(key: string) {
    return key
        .replace(/[_-]/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function TesterWorkItemDetailsPage() {
    const params = useParams();
    const router = useRouter();

    const projectId = params.id as string;
    const workItemId = params.workItemId as string;

    const [user, setUser] = useState<User | null>(null);
    const [userReady, setUserReady] = useState(false);
    const [workItem, setWorkItem] = useState<WorkItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const storedUser = getStoredUser();
        setUser(storedUser);
        setUserReady(true);
    }, []);

    useEffect(() => {
        if (!userReady || !user || user.role !== "TESTER" || !workItemId) return;

        const load = async () => {
            try {
                setLoading(true);
                setError("");

                const data = await workItemService.getById(workItemId);
                setWorkItem(data);
            } catch (err: any) {
                setError(err?.response?.data?.message || "Failed to load work item");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [userReady, user, workItemId]);

    const handleDelete = async () => {
        if (!workItem || !window.confirm("Delete this work item?")) return;

        try {
            setDeleting(true);
            setError("");

            await workItemService.delete(workItem.id);
            router.push(`/tester/projects/${projectId}/work-items`);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to delete work item");
            setDeleting(false);
        }
    };

    /* ── Guard states ── */
    if (!userReady) {
        return (
            <FullPageState>
                <Spinner text="Loading workspace…" />
            </FullPageState>
        );
    }

    if (!user || user.role !== "TESTER") {
        return (
            <FullPageState>
                <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-white p-5 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                        <ShieldAlert size={18} />
                    </div>

                    <div>
                        <p className="font-semibold text-slate-900">Access Denied</p>
                        <p className="mt-0.5 text-sm text-slate-500">
                            You don&apos;t have permission to view this page.
                        </p>
                    </div>
                </div>
            </FullPageState>
        );
    }

    if (loading) {
        return (
            <FullPageState>
                <Spinner text="Loading work item…" />
            </FullPageState>
        );
    }

    if ((error && !workItem) || !workItem) {
        return (
            <FullPageState>
                <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-600">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    {error || "Work item not found."}
                </div>
            </FullPageState>
        );
    }

    /* ── Main ── */
    return (
        <div className="min-h-screen bg-[linear-gradient(160deg,#f8fbff_0%,#eef5ff_100%)]">
            <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
                {/* ── Header ── */}
                <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white px-7 py-6 shadow-[0_1px_3px_0_rgb(0,0,0,0.04),0_4px_16px_0_rgb(0,0,0,0.04)]">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--cap-blue)]/0 via-[var(--cap-blue)] to-[var(--cap-blue)]/0" />

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                <FileText size={18} strokeWidth={1.8} />
                            </div>

                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                                    Work Item Details
                                </p>

                                <h1 className="mt-0.5 max-w-2xl text-2xl font-bold tracking-tight text-slate-900">
                                    {workItem.title}
                                </h1>

                                <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-400">
                                    {workItem.description?.trim() ||
                                        "No description provided for this work item."}
                                </p>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            <Link
                                href={`/tester/projects/${projectId}/work-items`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 hover:shadow-sm"
                            >
                                <ChevronLeft size={15} />
                                Back
                            </Link>

                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 hover:shadow-sm disabled:opacity-50"
                            >
                                <Trash2 size={14} />
                                {deleting ? "Deleting…" : "Delete"}
                            </button>
                        </div>
                    </div>
                </section>

                {/* ── Error banner ── */}
                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        {error}
                    </div>
                )}

                {/* ── Status badges row ── */}
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ring-1 ${badge(
                            statusStyles,
                            workItem.status
                        )}`}
                    >
                        {workItem.status}
                    </span>

                    {workItem.priority && (
                        <span
                            className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ring-1 ${badge(
                                priorityStyles,
                                workItem.priority
                            )}`}
                        >
                            {workItem.priority}
                        </span>
                    )}

                    <span className="inline-flex rounded-lg bg-[var(--cap-blue)]/8 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/15">
                        {workItem.type}
                    </span>

                    <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200">
                        {workItem.source}
                    </span>
                </div>

                {/* ── Main content grid ── */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left column — description + lists */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Description */}
                        <Card label="Content" title="Description" icon={<FileText size={16} />}>
                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                                    {workItem.description?.trim() || "No description provided."}
                                </p>
                            </div>
                        </Card>

                        {/* Acceptance criteria + business rules side by side */}
                        <div className="grid gap-6 sm:grid-cols-2">
                            <Card
                                label="Requirements"
                                title="Acceptance Criteria"
                                icon={<CheckCircle2 size={16} />}
                            >
                                {workItem.acceptanceCriteria?.length ? (
                                    <ul className="space-y-2">
                                        {workItem.acceptanceCriteria.map((c, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                                            >
                                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-600">
                                                    {i + 1}
                                                </span>
                                                <span className="min-w-0 break-words">{c}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Empty text="No acceptance criteria defined." />
                                )}
                            </Card>

                            <Card label="Rules" title="Business Rules" icon={<BookOpen size={16} />}>
                                {workItem.businessRules?.length ? (
                                    <ul className="space-y-2">
                                        {workItem.businessRules.map((r, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                                            >
                                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[9px] font-bold text-sky-600">
                                                    {i + 1}
                                                </span>
                                                <span className="min-w-0 break-words">{r}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Empty text="No business rules defined." />
                                )}
                            </Card>
                        </div>

                        {/* Integration banner — Jira */}
                        {workItem.source === "JIRA" && (
                            <div className="flex items-start gap-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                                    <ExternalLink size={16} />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600">
                                        Integration
                                    </p>
                                    <p className="mt-0.5 font-semibold text-slate-900">
                                        Imported from Jira
                                    </p>
                                    <p className="mt-0.5 text-sm text-slate-500">
                                        This work item was imported from Jira.
                                    </p>

                                    {workItem.externalRef && (
                                        <p className="mt-1.5 break-words text-sm font-medium text-slate-700">
                                            Ref: {workItem.externalRef}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Integration banner — Spec doc */}
                        {workItem.source === "SPEC_DOCUMENT" && (
                            <div className="flex items-start gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                                    <FileText size={16} />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
                                            Specification
                                        </p>

                                        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 ring-1 ring-indigo-100">
                                            <BookOpen size={11} />
                                            AI Generated
                                        </span>
                                    </div>

                                    <p className="mt-0.5 font-semibold text-slate-900">
                                        Extracted from Specification Document
                                    </p>

                                    <p className="mt-0.5 text-sm text-slate-500">
                                        This work item was generated from a cahier de spécifications using AI.
                                    </p>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {workItem.externalSystem && (
                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-indigo-100">
                                                <FileText size={12} className="text-indigo-500" />
                                                {workItem.externalSystem}
                                            </span>
                                        )}

                                        {workItem.externalRef && (
                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-indigo-100">
                                                <ExternalLink size={12} className="text-indigo-500" />
                                                Ref: {workItem.externalRef}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right column — metadata + timeline */}
                    <div className="space-y-6">
                        {/* Metadata */}
                        <Card label="Metadata" title="Work Item Info" icon={<AlertCircle size={16} />}>
                            <div className="space-y-2">
                                <MetaRow label="ID" value={workItem.id} mono />
                                <MetaRow label="Project ID" value={workItem.projectId} mono />
                                <MetaRow
                                    label="External System"
                                    value={workItem.externalSystem || "—"}
                                />
                                <MetaRow label="External Ref" value={workItem.externalRef || "—"} />
                            </div>
                        </Card>

                        {/* Timeline */}
                        <Card label="Dates" title="Timeline" icon={<CalendarDays size={16} />}>
                            <div className="space-y-2">
                                <TimelineRow label="Created" date={workItem.createdAt} />
                                <TimelineRow label="Updated" date={workItem.updatedAt} />
                            </div>
                        </Card>
                    </div>
                </div>

                {/* ── Test Cases shortcut ── */}
                <Card label="QA Workspace" title="AI Test Cases" icon={<Sparkles size={16} />}>
                    <div className="flex flex-col gap-4 rounded-xl border border-purple-100 bg-purple-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="font-semibold text-slate-900">
                                Manage generated test cases
                            </p>

                            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                                Open the dedicated QA workspace to generate, review, approve,
                                filter, and automate test cases for this work item.
                            </p>
                        </div>

                        <Link
                            href={`/tester/projects/${projectId}/work-items/${workItemId}/test-cases`}
                            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
                        >
                            Open Test Cases
                        </Link>
                    </div>
                </Card>

                {/* ── Collapsible debug blocks ── */}
                {workItem.rawPayload != null && (
                    <CollapsibleBlock
                        label="Debug Data"
                        title="Raw Payload"
                        content={workItem.rawPayload}
                    />
                )}

                {workItem.normalizedContent != null && (
                    <CollapsibleBlock
                        label="Processed Data"
                        title="Normalized Content"
                        content={workItem.normalizedContent}
                    />
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */

function FullPageState({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[linear-gradient(160deg,#f8fbff_0%,#eef5ff_100%)]">
            <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
        </div>
    );
}

function Spinner({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-6 text-sm text-slate-400 shadow-sm">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--cap-blue)] border-t-transparent" />
            {text}
        </div>
    );
}

function Card({
                  label,
                  title,
                  icon,
                  children,
              }: {
    label: string;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                    {icon}
                </div>

                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                        {label}
                    </p>
                    <p className="text-sm font-bold text-slate-900">{title}</p>
                </div>
            </div>

            <div className="p-5">{children}</div>
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center text-sm text-slate-400">
            {text}
        </div>
    );
}

function MetaRow({
                     label,
                     value,
                     mono = false,
                 }: {
    label: string;
    value: string | number | null | undefined;
    mono?: boolean;
}) {
    return (
        <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p
                className={`mt-1 break-all text-sm font-medium text-slate-800 ${
                    mono ? "font-mono text-xs" : ""
                }`}
            >
                {value ?? "—"}
            </p>
        </div>
    );
}

function TimelineRow({ label, date }: { label: string; date: string }) {
    return (
        <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <CalendarDays size={14} className="mt-0.5 shrink-0 text-slate-400" />

            <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {label}
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">
                    {new Date(date).toLocaleString()}
                </p>
            </div>
        </div>
    );
}

function SpecDocumentMetadata({
                                  metadata,
                                  externalRef,
                                  externalSystem,
                              }: {
    metadata: unknown;
    externalRef?: string | null;
    externalSystem?: string | null;
}) {
    const parsed =
        metadata && typeof metadata === "object" && !Array.isArray(metadata)
            ? (metadata as Record<string, unknown>)
            : null;

    const rows = parsed
        ? Object.entries(parsed).filter(([, value]) => value != null && value !== "")
        : [];

    if (!metadata && !externalRef && !externalSystem) {
        return (
            <div className="p-5">
                <Empty text="No source metadata available." />
            </div>
        );
    }

    return (
        <div className="space-y-4 p-5">
            {(externalSystem || externalRef) && (
                <div className="grid gap-3 sm:grid-cols-2">
                    {externalSystem && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                External System
                            </p>
                            <p className="mt-1 break-words text-sm font-medium text-slate-800">
                                {externalSystem}
                            </p>
                        </div>
                    )}

                    {externalRef && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Reference
                            </p>
                            <p className="mt-1 break-words font-mono text-xs font-medium text-slate-800">
                                {externalRef}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {parsed ? (
                <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Document Metadata
                    </p>

                    {rows.length ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {rows.map(([key, value]) => (
                                <div
                                    key={key}
                                    className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                                >
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                        {formatMetadataLabel(key)}
                                    </p>

                                    <p className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-800">
                                        {renderUnknown(value)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Empty text="No document metadata available." />
                    )}
                </div>
            ) : metadata != null ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Source
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                        {renderUnknown(metadata)}
                    </p>
                </div>
            ) : null}
        </div>
    );
}

function CollapsibleBlock({
                              label,
                              title,
                              content,
                          }: {
    label: string;
    title: string;
    content: unknown;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-slate-50/60"
            >
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                        {label}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{title}</p>
                </div>

                <ChevronDown
                    size={16}
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                    }`}
                />
            </button>

            {open && (
                <div className="border-t border-slate-100 px-6 pb-6 pt-5">
                    <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-5 text-xs leading-6 text-slate-100">
                        {renderUnknown(content)}
                    </pre>
                </div>
            )}
        </div>
    );
}