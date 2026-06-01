"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    CheckCircle2,
    Download,
    Link2,
    Search,
    Sparkles,
    AlertCircle,
    ChevronDown,
    BookOpen,
    RefreshCw,
    Clock,
    ShieldCheck,
    Eye,
    Settings,
} from "lucide-react";
import {
    ImportJiraWorkItemPayload,
    JiraConnection,
    JiraIssuePreview,
    JiraIssueSearchItem,
} from "@/lib/types";
import { jiraService } from "@/lib/jira.service";

type Props = {
    projectId: string;
    onSubmit: (payload: ImportJiraWorkItemPayload) => Promise<void>;
    loading?: boolean;
};

export default function JiraImportForm({ projectId, onSubmit, loading }: Props) {
    const [externalRef, setExternalRef] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [projectKey, setProjectKey] = useState("");
    const [status, setStatus] = useState("");
    const [issueType, setIssueType] = useState("");

    const [connections, setConnections] = useState<JiraConnection[]>([]);
    const [selectedCloudId, setSelectedCloudId] = useState("");

    const [results, setResults] = useState<JiraIssueSearchItem[]>([]);
    const [preview, setPreview] = useState<JiraIssuePreview | null>(null);

    const [connectionsLoading, setConnectionsLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    const hasConnection = connections.length > 0;

    const selectedConnection = useMemo(() => {
        return (
            connections.find((c) => c.cloudId === selectedCloudId) ??
            connections[0] ??
            null
        );
    }, [connections, selectedCloudId]);

    const siteInitials = useMemo(() => {
        const name = selectedConnection?.siteName || selectedConnection?.siteUrl || "J";
        return name
            .split(/[\s.\-_]/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w: string) => w[0].toUpperCase())
            .join("");
    }, [selectedConnection]);

    const getErrorMessage = (err: unknown, fallback: string) => {
        if (typeof err === "object" && err !== null && "response" in err) {
            const response = (err as { response?: { data?: { message?: string | string[] } } }).response;
            const message = response?.data?.message;
            if (Array.isArray(message)) return message.join(", ");
            if (typeof message === "string") return message;
        }
        return fallback;
    };

    const resetSelectedIssue = () => {
        setResults([]);
        setPreview(null);
        setExternalRef("");
        setSearchTerm("");
        setSelectedIndex(-1);
        setIsDropdownOpen(false);
        setError(null);
    };

    useEffect(() => {
        const loadConnections = async () => {
            try {
                const data = await jiraService.getConnections();
                setConnections(data);
                if (data.length > 0) setSelectedCloudId(data[0].cloudId);
            } catch (err) {
                console.error("Failed to load Jira connections", err);
            } finally {
                setConnectionsLoading(false);
            }
        };
        loadConnections();
    }, []);

    useEffect(() => {
        if (!hasConnection || !selectedCloudId) return;
        if (searchTerm.trim().length < 2) {
            setResults([]);
            setSelectedIndex(-1);
            setIsDropdownOpen(false);
            return;
        }
        const timeout = setTimeout(async () => {
            try {
                setSearchLoading(true);
                setError(null);
                const data = await jiraService.searchIssues({
                    query: searchTerm,
                    cloudId: selectedCloudId,
                    projectKey: projectKey || undefined,
                    status: status || undefined,
                    issueType: issueType || undefined,
                });
                setResults(data.issues);
                setSelectedIndex(data.issues.length > 0 ? 0 : -1);
                setIsDropdownOpen(true);
            } catch (err: unknown) {
                setResults([]);
                setSelectedIndex(-1);
                setIsDropdownOpen(true);
                setError(getErrorMessage(err, "Failed to search Jira issues"));
            } finally {
                setSearchLoading(false);
            }
        }, 400);
        return () => clearTimeout(timeout);
    }, [searchTerm, hasConnection, selectedCloudId, projectKey, status, issueType]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleConnectionChange = (cloudId: string) => {
        setSelectedCloudId(cloudId);
        resetSelectedIssue();
    };

    const handleConnectJira = async () => {
        try {
            const returnTo = `/tester/projects/${projectId}/work-items/import-jira`;
            const url = await jiraService.getOAuthUrl(returnTo);
            window.location.href = url;
        } catch {
            setError("Failed to start Jira OAuth flow");
        }
    };

    const handleSelectIssue = async (issue: JiraIssueSearchItem) => {
        if (!selectedCloudId) { setError("Please select a Jira site first"); return; }
        try {
            setError(null);
            setPreviewLoading(true);
            const key = issue.key.trim().toUpperCase();
            setExternalRef(key);
            setSearchTerm(`${issue.key} — ${issue.summary}`);
            setIsDropdownOpen(false);
            const data = await jiraService.getIssuePreview(key, selectedCloudId);
            setPreview(data);
        } catch (err: unknown) {
            setPreview(null);
            setError(getErrorMessage(err, "Failed to fetch Jira issue preview"));
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleManualPreview = async () => {
        if (!externalRef.trim()) return;
        if (!selectedCloudId) { setError("Please select a Jira site first"); return; }
        try {
            setError(null);
            setPreviewLoading(true);
            const key = externalRef.trim().toUpperCase();
            const data = await jiraService.getIssuePreview(key, selectedCloudId);
            setExternalRef(key);
            setPreview(data);
        } catch (err: unknown) {
            setPreview(null);
            setError(getErrorMessage(err, "Failed to fetch Jira issue preview"));
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!externalRef.trim() || !preview) return;
        if (!selectedCloudId) { setError("Please select a Jira site first"); return; }
        await onSubmit({ projectId, externalRef: externalRef.trim().toUpperCase(), cloudId: selectedCloudId });
    };

    const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isDropdownOpen || results.length === 0) {
            if (e.key === "Enter" && selectedIndex === -1 && externalRef.trim()) {
                e.preventDefault();
                await handleManualPreview();
            }
            return;
        }
        if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((p) => (p < results.length - 1 ? p + 1 : 0)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((p) => (p > 0 ? p - 1 : results.length - 1)); }
        if (e.key === "Escape") { e.preventDefault(); setIsDropdownOpen(false); }
        if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex >= 0 && results[selectedIndex]) await handleSelectIssue(results[selectedIndex]);
            else if (externalRef.trim()) await handleManualPreview();
        }
    };

    const showResults = hasConnection && isDropdownOpen && searchTerm.trim().length >= 2 && results.length > 0;
    const showEmptyState = hasConnection && isDropdownOpen && !searchLoading && searchTerm.trim().length >= 2 && results.length === 0 && !error;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Jira Account ── */}
            <div className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] overflow-hidden">
                <div className="px-6 py-5">
                    <div className="flex items-start justify-between gap-4">

                        {/* Left — site identity */}
                        <div className="flex flex-col gap-4 min-w-0">
                            <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-50 flex items-center justify-center text-sm font-semibold text-blue-600 ring-1 ring-blue-100 select-none">
                                    {connectionsLoading ? "…" : siteInitials || "J"}
                                </div>

                                {/* Name + URL */}
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold text-slate-900 truncate">
                                            {connectionsLoading
                                                ? "Checking connection…"
                                                : selectedConnection?.siteName || selectedConnection?.siteUrl || "No account connected"}
                                        </p>
                                        {!connectionsLoading && hasConnection && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 ring-1 ring-emerald-100">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                Connected
                                            </span>
                                        )}
                                        {!connectionsLoading && !hasConnection && (
                                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 ring-1 ring-amber-100">
                                                Not connected
                                            </span>
                                        )}
                                    </div>
                                    {selectedConnection?.siteUrl && (
                                        <p className="text-xs text-slate-400 truncate mt-0.5">
                                            {selectedConnection.siteUrl}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Site selector */}
                            {hasConnection && connections.length > 0 && (
                                <div>
                                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                        Active site
                                    </label>
                                    <div className="relative w-64">
                                        <select
                                            value={selectedCloudId}
                                            onChange={(e) => handleConnectionChange(e.target.value)}
                                            className={`${inputCls} appearance-none pr-8`}
                                        >
                                            {connections.map((c) => (
                                                <option key={c.cloudId} value={c.cloudId}>
                                                    {c.siteName || c.siteUrl || c.cloudId}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown
                                            size={13}
                                            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right — actions */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={handleConnectJira}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--cap-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                                <RefreshCw size={13} />
                                {hasConnection ? "Reconnect" : "Connect Jira"}
                            </button>
                            {hasConnection && (
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition"
                                >
                                    <Settings size={11} />
                                    Manage connections
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer meta row */}
                {hasConnection && (
                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/70 px-6 py-3">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Clock size={11} />
                            Last synced just now
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <ShieldCheck size={11} />
                            OAuth 2.0 · read:jira-work
                        </div>
                    </div>
                )}
            </div>

            {/* ── Filter Issues ── */}
            <div className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
                <div className="border-b border-slate-100 px-6 py-4">
                    <p className="text-sm font-semibold text-slate-900">Filter issues</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                        Narrow search results by project, status, or issue type.
                    </p>
                </div>
                <div className="grid gap-4 p-6 md:grid-cols-3">
                    <Field label="Project key">
                        <input
                            value={projectKey}
                            onChange={(e) => setProjectKey(e.target.value.toUpperCase().replace(/\s/g, ""))}
                            placeholder="e.g. AUTH"
                            disabled={!hasConnection || !selectedCloudId}
                            className={inputCls}
                        />
                    </Field>
                    <Field label="Status">
                        <div className="relative">
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                disabled={!hasConnection || !selectedCloudId}
                                className={`${inputCls} appearance-none pr-8`}
                            >
                                <option value="">All statuses</option>
                                <option value="To Do">To Do</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Done">Done</option>
                            </select>
                            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </Field>
                    <Field label="Issue type">
                        <div className="relative">
                            <select
                                value={issueType}
                                onChange={(e) => setIssueType(e.target.value)}
                                disabled={!hasConnection || !selectedCloudId}
                                className={`${inputCls} appearance-none pr-8`}
                            >
                                <option value="">All types</option>
                                <option value="Story">Story</option>
                                <option value="Task">Task</option>
                                <option value="Bug">Bug</option>
                                <option value="Epic">Epic</option>
                            </select>
                            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </Field>
                </div>
            </div>

            {/* ── Search Issues ── */}
            <div className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
                <div className="border-b border-slate-100 px-6 py-4">
                    <p className="text-sm font-semibold text-slate-900">Search issues</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                        Type at least 2 characters to search by key, summary, or keyword.
                    </p>
                </div>
                <div className="space-y-5 p-6">
                    {/* Search input + dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <div className="relative">
                            <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={searchInputRef}
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); setError(null); }}
                                onFocus={() => { if (results.length > 0) setIsDropdownOpen(true); }}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Search by key, summary, or keyword…"
                                disabled={!hasConnection || !selectedCloudId}
                                className={`${inputCls} pl-9`}
                            />
                            {searchLoading && (
                                <span className="absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-[var(--cap-blue)] border-t-transparent" />
                            )}
                        </div>

                        {showResults && (
                            <div className="absolute z-20 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                {results.map((issue, index) => (
                                    <button
                                        key={issue.id}
                                        type="button"
                                        onClick={() => handleSelectIssue(issue)}
                                        className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3.5 text-left transition last:border-b-0 ${
                                            index === selectedIndex ? "bg-[var(--cap-blue)]/5" : "hover:bg-slate-50"
                                        }`}
                                    >
                                        <IssueKeyBadge issueKey={issue.key} />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-900">{issue.summary}</p>
                                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                {[issue.projectKey, issue.issueType, issue.status, issue.priority]
                                                    .filter(Boolean)
                                                    .map((tag, i) => (
                                                        <MetaTag key={i} label={tag as string} />
                                                    ))}
                                            </div>
                                            {issue.assignee && (
                                                <p className="mt-1 text-[11px] text-slate-400">Assignee: {issue.assignee}</p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {showEmptyState && (
                            <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-500 shadow-xl">
                                No issues found for this search.
                            </div>
                        )}
                    </div>

                    {/* Manual key entry */}
                    <Field label="Issue key" hint="Or enter a key directly, e.g. AUTH-123">
                        <div className="flex gap-2.5">
                            <div className="relative flex-1">
                                <Link2 size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={externalRef}
                                    onChange={(e) => { setExternalRef(e.target.value.toUpperCase().replace(/\s/g, "")); setError(null); }}
                                    placeholder="AUTH-123"
                                    disabled={!hasConnection || !selectedCloudId}
                                    className={`${inputCls} pl-9`}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleManualPreview}
                                disabled={!externalRef || !hasConnection || !selectedCloudId || previewLoading}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-[var(--cap-blue)]/30 hover:text-[var(--cap-blue)] disabled:opacity-50"
                            >
                                {previewLoading ? (
                                    <>
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--cap-blue)] border-t-transparent" />
                                        Loading…
                                    </>
                                ) : (
                                    <>
                                        <Eye size={13} />
                                        Preview
                                    </>
                                )}
                            </button>
                        </div>
                    </Field>
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    {error}
                </div>
            )}

            {/* ── Preview ── */}
            {preview && (
                <div className="rounded-2xl border border-[var(--cap-blue)]/20 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] overflow-hidden">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                <IssueKeyBadge issueKey={preview.issue.key} />
                                {[preview.issue.issueType, preview.issue.status, preview.issue.priority]
                                    .filter(Boolean)
                                    .map((tag, i) => (
                                        <MetaTag key={i} label={tag as string} />
                                    ))}
                            </div>
                            <h3 className="text-base font-semibold text-slate-900 leading-snug">
                                {preview.issue.summary}
                            </h3>
                            <p className="mt-1 text-xs text-slate-400">
                                {preview.site.siteName || preview.site.siteUrl}
                            </p>
                        </div>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                            <Sparkles size={15} />
                        </div>
                    </div>

                    <div className="space-y-5 p-6">
                        <div>
                            <PreviewLabel>Mapped title</PreviewLabel>
                            <p className="mt-1.5 text-sm font-medium text-slate-800">{preview.mapped.title}</p>
                        </div>

                        <div>
                            <PreviewLabel>Mapped description</PreviewLabel>
                            <pre className="mt-1.5 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                                {preview.mapped.description || "No description"}
                            </pre>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <PreviewList
                                label="Acceptance criteria"
                                icon={<CheckCircle2 size={12} />}
                                items={preview.mapped.acceptanceCriteria}
                                emptyText="None detected"
                                color="emerald"
                            />
                            <PreviewList
                                label="Business rules"
                                icon={<BookOpen size={12} />}
                                items={preview.mapped.businessRules}
                                emptyText="None detected"
                                color="sky"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Submit ── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                    The issue will be fetched from Jira and stored with its raw payload.
                </p>
                <button
                    type="submit"
                    disabled={loading || !hasConnection || !selectedCloudId || !preview || !externalRef}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--cap-blue)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(37,99,235,0.45)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Download size={14} />
                    {loading ? "Importing…" : "Import issue"}
                </button>
            </div>
        </form>
    );
}

/* ─────────────────────────────────────────
   Shared styles
───────────────────────────────────────── */

const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[var(--cap-blue)] focus:bg-white focus:ring-4 focus:ring-[var(--cap-blue)]/8 disabled:opacity-50";

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
            {children}
            {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
        </div>
    );
}

function PreviewLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
            {children}
        </p>
    );
}

function IssueKeyBadge({ issueKey }: { issueKey: string }) {
    return (
        <span className="shrink-0 rounded-md bg-[var(--cap-blue)]/8 px-2 py-0.5 text-[11px] font-bold text-[var(--cap-blue)]">
            {issueKey}
        </span>
    );
}

function MetaTag({ label }: { label: string }) {
    return (
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            {label}
        </span>
    );
}

const previewColorMap = {
    emerald: { num: "bg-emerald-100 text-emerald-700" },
    sky: { num: "bg-sky-100 text-sky-700" },
} as const;

function PreviewList({
                         label,
                         icon,
                         items,
                         emptyText,
                         color,
                     }: {
    label: string;
    icon: React.ReactNode;
    items: string[];
    emptyText: string;
    color: keyof typeof previewColorMap;
}) {
    return (
        <div>
            <div className="mb-2 flex items-center gap-1.5">
                <span className="text-slate-400">{icon}</span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
            </div>
            {items.length ? (
                <ul className="space-y-1.5">
                    {items.map((item, i) => (
                        <li
                            key={i}
                            className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                        >
                            <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${previewColorMap[color].num}`}>
                                {i + 1}
                            </span>
                            {item}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
                    {emptyText}
                </p>
            )}
        </div>
    );
}