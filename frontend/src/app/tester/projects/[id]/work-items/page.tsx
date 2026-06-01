"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    ChevronLeft,
    FileText,
    FolderOpenDot,
    Import,
    Plus,
    ShieldAlert,
    AlertCircle,
    Pencil,
    Trash2,
    Eye,
    Lock,
    Search,
    SlidersHorizontal,
    X,
} from "lucide-react";

import { workItemService } from "@/lib/work-item.service";
import { getStoredUser } from "@/lib/auth";
import type { User, WorkItem } from "@/lib/types";

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */

const statusStyles: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-500 ring-slate-200",
    READY_FOR_AI: "bg-blue-50 text-blue-600 ring-blue-100",
    PROCESSING: "bg-amber-50 text-amber-600 ring-amber-100",
    ANALYZED: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    FAILED: "bg-red-50 text-red-600 ring-red-100",
};

const priorityStyles: Record<string, string> = {
    CRITICAL: "bg-rose-50 text-rose-700 ring-rose-100",
    HIGH:     "bg-red-50 text-red-600 ring-red-100",
    MEDIUM:   "bg-amber-50 text-amber-600 ring-amber-100",
    LOW:      "bg-emerald-50 text-emerald-600 ring-emerald-100",
};

function statusClass(status: string) {
    return statusStyles[status] ?? "bg-slate-100 text-slate-500 ring-slate-200";
}

function normalizeP(priority?: string | null) {
    const upper = priority?.toUpperCase();
    return upper === "HIGHEST" ? "HIGH" : upper;
}

function priorityClass(priority: string) {
    return priorityStyles[normalizeP(priority) ?? ""] ?? "bg-slate-100 text-slate-500 ring-slate-200";
}

function getPriorityWeight(priority?: string | null) {
    switch (priority?.toUpperCase()) {
        case "CRITICAL": return 5;
        case "HIGHEST":
        case "HIGH":     return 4;
        case "MEDIUM":   return 3;
        case "LOW":      return 2;
        default:         return 0;
    }
}

function getErrorMessage(error: unknown, fallback: string) {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response;
        return response?.data?.message || fallback;
    }
    return fallback;
}

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */

export default function TesterProjectWorkItemsPage() {
    const params = useParams();
    const projectId = params.id as string;

    const [user, setUser] = useState<User | null>(null);
    const [userReady, setUserReady] = useState(false);
    const [workItems, setWorkItems] = useState<WorkItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [sourceFilter, setSourceFilter] = useState("ALL");
    const [priorityFilter, setPriorityFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState("newest");

    useEffect(() => {
        const storedUser = getStoredUser();
        setUser(storedUser);
        setUserReady(true);
    }, []);

    useEffect(() => {
        if (!userReady || !user || user.role !== "TESTER" || !projectId) return;

        const loadWorkItems = async () => {
            try {
                setLoading(true);
                setError("");
                const data = await workItemService.getByProject(projectId);
                setWorkItems(data);
            } catch (err: unknown) {
                setError(getErrorMessage(err, "Failed to load work items"));
            } finally {
                setLoading(false);
            }
        };

        loadWorkItems();
    }, [userReady, user, projectId]);

    const filteredWorkItems = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        const filtered = workItems.filter((item) => {
            const matchesSearch =
                !normalizedSearch ||
                item.title.toLowerCase().includes(normalizedSearch) ||
                item.description?.toLowerCase().includes(normalizedSearch) ||
                item.externalRef?.toLowerCase().includes(normalizedSearch) ||
                item.type.toLowerCase().includes(normalizedSearch) ||
                item.status.toLowerCase().includes(normalizedSearch) ||
                item.source.toLowerCase().includes(normalizedSearch) ||
                item.priority?.toLowerCase().includes(normalizedSearch);

            const matchesStatus   = statusFilter   === "ALL" || item.status   === statusFilter;
            const matchesType     = typeFilter     === "ALL" || item.type     === typeFilter;
            const matchesSource   = sourceFilter   === "ALL" || item.source   === sourceFilter;
            const matchesPriority =
                priorityFilter === "ALL" ||
                normalizeP(item.priority) === priorityFilter.toUpperCase();

            return matchesSearch && matchesStatus && matchesType && matchesSource && matchesPriority;
        });

        return [...filtered].sort((a, b) => {
            switch (sortBy) {
                case "oldest":   return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case "updated":  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                case "title":    return a.title.localeCompare(b.title);
                case "priority": return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
                default:         return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });
    }, [workItems, searchTerm, statusFilter, typeFilter, sourceFilter, priorityFilter, sortBy]);

    const hasActiveFilters = Boolean(
        searchTerm.trim() ||
        statusFilter   !== "ALL" ||
        typeFilter     !== "ALL" ||
        sourceFilter   !== "ALL" ||
        priorityFilter !== "ALL" ||
        sortBy         !== "newest"
    );

    const resetFilters = () => {
        setSearchTerm("");
        setStatusFilter("ALL");
        setTypeFilter("ALL");
        setSourceFilter("ALL");
        setPriorityFilter("ALL");
        setSortBy("newest");
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this work item?")) return;
        try {
            await workItemService.delete(id);
            setWorkItems((prev) => prev.filter((item) => item.id !== id));
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Failed to delete work item"));
        }
    };

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
                <Spinner text="Loading work items…" />
            </FullPageState>
        );
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(160deg,#f8fbff_0%,#eef5ff_100%)]">
            <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">

                {/* ── Header ── */}
                <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white px-7 py-6 shadow-[0_1px_3px_0_rgb(0,0,0,0.04),0_4px_16px_0_rgb(0,0,0,0.04)]">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--cap-blue)]/0 via-[var(--cap-blue)] to-[var(--cap-blue)]/0" />

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                <FolderOpenDot size={18} strokeWidth={1.8} />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                                    Work Items
                                </p>
                                <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
                                    Project Work Items
                                </h1>
                                <p className="mt-1 text-sm text-slate-400">
                                    View, manage, and delete work items for this project.
                                </p>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <Link
                                href={`/tester/projects/${projectId}`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 hover:shadow-sm"
                            >
                                <ChevronLeft size={15} />
                                Back
                            </Link>

                            <Link
                                href={`/tester/projects/${projectId}/work-items/import-jira`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[var(--cap-blue)]/25 hover:text-[var(--cap-blue)] hover:shadow-sm"
                            >
                                <Import size={14} />
                                Import Jira
                            </Link>

                            <Link
                                href={`/tester/projects/${projectId}/work-items/import-spec-document`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[var(--cap-blue)]/25 hover:text-[var(--cap-blue)] hover:shadow-sm"
                            >
                                <Import size={14} />
                                Import Specs
                            </Link>

                            <Link
                                href={`/tester/projects/${projectId}/work-items/new`}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--cap-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 hover:shadow-sm"
                            >
                                <Plus size={15} />
                                Create
                            </Link>
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

                {/* ── Empty state ── */}
                {workItems.length === 0 && !error && (
                    <section className="rounded-2xl border border-slate-200/60 bg-white py-16 text-center shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <FolderOpenDot size={22} />
                        </div>
                        <h2 className="mt-4 text-base font-semibold text-slate-800">
                            No work items yet
                        </h2>
                        <p className="mt-1.5 text-sm text-slate-400">
                            Create a manual work item or import one from Jira.
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <Link
                                href={`/tester/projects/${projectId}/work-items/new`}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--cap-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                                <Plus size={14} />
                                Create manually
                            </Link>
                            <Link
                                href={`/tester/projects/${projectId}/work-items/import-jira`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[var(--cap-blue)]/25 hover:text-[var(--cap-blue)]"
                            >
                                <Import size={14} />
                                Import from Jira
                            </Link>
                        </div>
                    </section>
                )}

                {/* ── Work item grid ── */}
                {workItems.length > 0 && (
                    <section className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04),0_4px_16px_0_rgb(0,0,0,0.04)]">

                        {/* Table header */}
                        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-800">All Items</h2>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    Search, filter, and organize project work items.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                                    {filteredWorkItems.length} of {workItems.length}
                                </span>

                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-red-100 hover:bg-red-50 hover:text-red-500"
                                    >
                                        <X size={12} />
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Smart Filters */}
                        <WorkItemFilters
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            statusFilter={statusFilter}
                            setStatusFilter={setStatusFilter}
                            typeFilter={typeFilter}
                            setTypeFilter={setTypeFilter}
                            sourceFilter={sourceFilter}
                            setSourceFilter={setSourceFilter}
                            priorityFilter={priorityFilter}
                            setPriorityFilter={setPriorityFilter}
                            sortBy={sortBy}
                            setSortBy={setSortBy}
                        />

                        {/* No results */}
                        {filteredWorkItems.length === 0 ? (
                            <div className="px-6 py-14 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                    <Search size={20} />
                                </div>
                                <h3 className="mt-4 text-sm font-semibold text-slate-800">
                                    No matching work items
                                </h3>
                                <p className="mt-1 text-sm text-slate-400">
                                    Try adjusting your search or clearing some filters.
                                </p>
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[var(--cap-blue)]/25 hover:text-[var(--cap-blue)]"
                                >
                                    <X size={14} />
                                    Clear filters
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-px bg-slate-100 md:grid-cols-2 xl:grid-cols-3">
                                {filteredWorkItems.map((item) => (
                                    <WorkItemCard
                                        key={item.id}
                                        item={item}
                                        projectId={projectId}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
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

function WorkItemFilters({
                             searchTerm,
                             setSearchTerm,
                             statusFilter,
                             setStatusFilter,
                             typeFilter,
                             setTypeFilter,
                             sourceFilter,
                             setSourceFilter,
                             priorityFilter,
                             setPriorityFilter,
                             sortBy,
                             setSortBy,
                         }: {
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    statusFilter: string;
    setStatusFilter: (value: string) => void;
    typeFilter: string;
    setTypeFilter: (value: string) => void;
    sourceFilter: string;
    setSourceFilter: (value: string) => void;
    priorityFilter: string;
    setPriorityFilter: (value: string) => void;
    sortBy: string;
    setSortBy: (value: string) => void;
}) {
    return (
        <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-6 py-5">

            {/* Section label */}
            <div className="mb-4 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--cap-blue)]/10 text-[var(--cap-blue)]">
                    <SlidersHorizontal size={12} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Smart Filters
                </span>
            </div>

            {/* Search — full-width row */}
            <div className="relative mb-3">
                <Search
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by title, description, ref…"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-[var(--cap-blue)]/50 focus:ring-4 focus:ring-[var(--cap-blue)]/8"
                />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-300 transition hover:text-slate-500"
                    >
                        <X size={13} />
                    </button>
                )}
            </div>

            {/* Dropdown filter row */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                <FilterSelect
                    label="Status"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                        { label: "All statuses",  value: "ALL" },
                        { label: "Draft",         value: "DRAFT" },
                        { label: "Ready for AI",  value: "READY_FOR_AI" },
                        { label: "Processing",    value: "PROCESSING" },
                        { label: "Analyzed",      value: "ANALYZED" },
                        { label: "Failed",        value: "FAILED" },
                    ]}
                />
                <FilterSelect
                    label="Type"
                    value={typeFilter}
                    onChange={setTypeFilter}
                    options={[
                        { label: "All types",    value: "ALL" },
                        { label: "Feature",      value: "FEATURE" },
                        { label: "Bug",          value: "BUG" },
                        { label: "Improvement",  value: "IMPROVEMENT" },
                        { label: "Task",         value: "TASK" },
                        { label: "User story",   value: "USER_STORY" },
                    ]}
                />
                <FilterSelect
                    label="Source"
                    value={sourceFilter}
                    onChange={setSourceFilter}
                    options={[
                        { label: "All sources",    value: "ALL" },
                        { label: "Manual",         value: "MANUAL" },
                        { label: "Jira",           value: "JIRA" },
                        { label: "Spec document",  value: "SPEC_DOCUMENT" },
                    ]}
                />
                <FilterSelect
                    label="Priority"
                    value={priorityFilter}
                    onChange={setPriorityFilter}
                    options={[
                        { label: "All priorities", value: "ALL" },
                        { label: "Critical",       value: "CRITICAL" },
                        { label: "High",           value: "HIGH" },
                        { label: "Medium",         value: "MEDIUM" },
                        { label: "Low",            value: "LOW" },
                    ]}
                />
                <FilterSelect
                    label="Sort by"
                    value={sortBy}
                    onChange={setSortBy}
                    options={[
                        { label: "Newest first",      value: "newest" },
                        { label: "Oldest first",      value: "oldest" },
                        { label: "Recently updated",  value: "updated" },
                        { label: "Title A–Z",         value: "title" },
                        { label: "Priority",          value: "priority" },
                    ]}
                />
            </div>
        </div>
    );
}

function FilterSelect({
                          label,
                          value,
                          onChange,
                          options,
                      }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { label: string; value: string }[];
}) {
    const isActive = value !== "ALL" && value !== "newest";

    return (
        <label className="block">
            <span
                className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
                    isActive ? "text-[var(--cap-blue)]" : "text-slate-400"
                }`}
            >
                {label}
            </span>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`h-9 w-full appearance-none rounded-xl border px-3 pr-7 text-xs font-medium shadow-sm outline-none transition focus:ring-4 focus:ring-[var(--cap-blue)]/8 ${
                        isActive
                            ? "border-[var(--cap-blue)]/30 bg-[var(--cap-blue)]/5 text-[var(--cap-blue)] focus:border-[var(--cap-blue)]/50"
                            : "border-slate-200 bg-white text-slate-600 focus:border-[var(--cap-blue)]/40"
                    }`}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                {/* Custom chevron */}
                <svg
                    className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
                        isActive ? "text-[var(--cap-blue)]" : "text-slate-300"
                    }`}
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                >
                    <path
                        d="M2 3.5L5 6.5L8 3.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        </label>
    );
}

function WorkItemCard({
                          item,
                          projectId,
                          onDelete,
                      }: {
    item: WorkItem;
    projectId: string;
    onDelete: (id: string) => void;
}) {
    const isProcessing = item.status === "PROCESSING";

    return (
        <div className="flex flex-col bg-white p-5 transition-colors hover:bg-slate-50/60">
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${statusClass(item.status)}`}
                    >
                        {item.status}
                    </span>

                    {item.priority && (
                        <span
                            className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${priorityClass(item.priority)}`}
                        >
                            {item.priority}
                        </span>
                    )}
                </div>

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    <FileText size={14} />
                </div>
            </div>

            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                {item.type}
            </p>

            <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                {item.title}
            </h3>

            <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-400">
                {item.description?.trim() || "No description provided."}
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
                <MetaPill label="Source" value={item.source} />
                {item.externalRef && <MetaPill label="Ref" value={item.externalRef} />}
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                <Link
                    href={`/tester/projects/${projectId}/work-items/${item.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-[var(--cap-blue)]/25 hover:text-[var(--cap-blue)]"
                >
                    <Eye size={12} />
                    View
                </Link>

                {isProcessing ? (
                    <button
                        type="button"
                        disabled
                        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-100 px-3 py-1.5 text-xs font-medium text-slate-300"
                    >
                        <Lock size={12} />
                        Locked
                    </button>
                ) : (
                    <Link
                        href={`/tester/projects/${projectId}/work-items/${item.id}/edit`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                    >
                        <Pencil size={12} />
                        Edit
                    </Link>
                )}

                <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 hover:text-red-600"
                >
                    <Trash2 size={12} />
                    Delete
                </button>
            </div>
        </div>
    );
}

function MetaPill({ label, value }: { label: string; value: string }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-100">
            <span className="text-slate-300">{label}:</span>
            {value}
        </span>
    );
}