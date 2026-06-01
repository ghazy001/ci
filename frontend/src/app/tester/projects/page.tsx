'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    ChevronLeft,
    ChevronRight,
    FolderKanban,
    Layers3,
    ShieldAlert,
    Sparkles,
    FileText,
    AlertCircle,
    Search,
    SlidersHorizontal,
    X,
    ArrowDownAZ,
} from 'lucide-react';

import { getStoredUser } from '@/lib/auth';
import { getProjects } from '@/lib/project.service';
import type { Project, User } from '@/lib/types';

type DocumentationFilter = 'ALL' | 'DOCUMENTED' | 'MISSING_INFO';
type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc';

function getErrorMessage(error: unknown, fallback: string) {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response;
        return response?.data?.message || fallback;
    }
    return fallback;
}

export default function TesterProjectsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [documentationFilter, setDocumentationFilter] = useState<DocumentationFilter>('ALL');
    const [sortBy, setSortBy] = useState<SortOption>('newest');

    useEffect(() => {
        const storedUser = getStoredUser();
        setUser(storedUser);
    }, []);

    useEffect(() => {
        const loadProjects = async () => {
            try {
                setLoading(true);
                setError('');
                const data = await getProjects();
                setProjects(data);
            } catch (err: unknown) {
                setError(getErrorMessage(err, 'Failed to load projects'));
            } finally {
                setLoading(false);
            }
        };
        loadProjects();
    }, []);

    const stats = useMemo(
        () => ({
            totalProjects: projects.length,
            activeProjects: projects.length,
            withDescription: projects.filter((p) => !!p.description?.trim()).length,
            withoutDescription: projects.filter((p) => !p.description?.trim()).length,
        }),
        [projects]
    );

    const filteredProjects = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        const filtered = projects.filter((project) => {
            const hasDescription = !!project.description?.trim();

            const matchesSearch =
                !normalizedSearch ||
                project.name.toLowerCase().includes(normalizedSearch) ||
                project.description?.toLowerCase().includes(normalizedSearch) ||
                project.createdBy?.fullName?.toLowerCase().includes(normalizedSearch) ||
                project.createdBy?.email?.toLowerCase().includes(normalizedSearch);

            const matchesDocumentation =
                documentationFilter === 'ALL' ||
                (documentationFilter === 'DOCUMENTED' && hasDescription) ||
                (documentationFilter === 'MISSING_INFO' && !hasDescription);

            return matchesSearch && matchesDocumentation;
        });

        return [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'oldest':    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'name_asc':  return a.name.localeCompare(b.name);
                case 'name_desc': return b.name.localeCompare(a.name);
                default:          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });
    }, [projects, searchTerm, documentationFilter, sortBy]);

    const hasActiveFilters = Boolean(
        searchTerm.trim() ||
        documentationFilter !== 'ALL' ||
        sortBy !== 'newest'
    );

    const resetFilters = () => {
        setSearchTerm('');
        setDocumentationFilter('ALL');
        setSortBy('newest');
    };

    /* ── Loading state ── */
    if (!user) {
        return (
            <PageShell>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-400 shadow-sm">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--cap-blue)] border-t-transparent" />
                    Loading your workspace…
                </div>
            </PageShell>
        );
    }

    /* ── Access denied ── */
    if (user.role !== 'TESTER') {
        return (
            <PageShell>
                <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-4">
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
                </div>
            </PageShell>
        );
    }

    /* ── Main page ── */
    return (
        <PageShell>
            <main className="space-y-6">

                {/* ── Page header ── */}
                <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white px-7 py-6 shadow-[0_1px_3px_0_rgb(0,0,0,0.04),0_4px_16px_0_rgb(0,0,0,0.04)]">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--cap-blue)]/0 via-[var(--cap-blue)] to-[var(--cap-blue)]/0" />

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                                Workspace
                            </p>
                            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                                My Projects
                            </h1>
                            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-400">
                                Review assigned projects, explore workspaces, and jump into testing activities.
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2.5">
                            <Link
                                href="/tester"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 hover:shadow-sm"
                            >
                                <ChevronLeft size={15} />
                                Dashboard
                            </Link>

                            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--cap-blue)]/15 bg-[var(--cap-blue)]/8 px-4 py-2 text-sm font-semibold text-[var(--cap-blue)]">
                                <Sparkles size={14} />
                                Tester Panel
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Stats row ── */}
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Total Projects"
                        value={loading ? null : stats.totalProjects}
                        icon={<FolderKanban size={16} />}
                        color="blue"
                    />
                    <StatCard
                        label="Active"
                        value={loading ? null : stats.activeProjects}
                        icon={<Layers3 size={16} />}
                        color="green"
                    />
                    <StatCard
                        label="Documented"
                        value={loading ? null : stats.withDescription}
                        icon={<FileText size={16} />}
                        color="sky"
                    />
                    <StatCard
                        label="Missing Info"
                        value={loading ? null : stats.withoutDescription}
                        icon={<AlertCircle size={16} />}
                        color="amber"
                    />
                </section>

                {/* ── Project grid ── */}
                <section className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04),0_4px_16px_0_rgb(0,0,0,0.04)]">

                    {/* Section header */}
                    <div className="border-b border-slate-100 px-6 py-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                            Assigned Projects
                        </p>

                        <div className="mt-0.5 flex items-baseline justify-between gap-4">
                            <h2 className="text-xl font-bold tracking-tight text-slate-900">
                                Project Overview
                            </h2>

                            {!loading && projects.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                                        {filteredProjects.length} of {projects.length}
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
                            )}
                        </div>

                        <p className="mt-1 text-sm text-slate-400">
                            Browse assigned projects and open the workspace you want to inspect.
                        </p>
                    </div>

                    {/* Smart Filters */}
                    {!loading && projects.length > 0 && (
                        <ProjectSmartFilters
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            documentationFilter={documentationFilter}
                            setDocumentationFilter={setDocumentationFilter}
                            sortBy={sortBy}
                            setSortBy={setSortBy}
                        />
                    )}

                    <div className="p-6">
                        {/* Loading skeleton */}
                        {loading && (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {[1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className="h-52 animate-pulse rounded-xl border border-slate-100 bg-slate-50"
                                    />
                                ))}
                            </div>
                        )}

                        {/* Error */}
                        {!loading && error && (
                            <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-600">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Empty state */}
                        {!loading && !error && projects.length === 0 && (
                            <div className="py-16 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                    <FolderKanban size={22} />
                                </div>
                                <h3 className="mt-4 text-base font-semibold text-slate-800">
                                    No projects assigned yet
                                </h3>
                                <p className="mt-1.5 text-sm text-slate-400">
                                    Once projects are assigned, they&apos;ll appear here.
                                </p>
                            </div>
                        )}

                        {/* No filter results */}
                        {!loading && !error && projects.length > 0 && filteredProjects.length === 0 && (
                            <div className="py-16 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                    <Search size={22} />
                                </div>
                                <h3 className="mt-4 text-base font-semibold text-slate-800">
                                    No matching projects
                                </h3>
                                <p className="mt-1.5 text-sm text-slate-400">
                                    Try changing your search or clearing the active filters.
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
                        )}

                        {/* Project cards */}
                        {!loading && !error && filteredProjects.length > 0 && (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {filteredProjects.map((project) => (
                                    <ProjectCard key={project.id} project={project} />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </PageShell>
    );
}

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */

function PageShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[linear-gradient(160deg,#f8fbff_0%,#eef5ff_100%)]">
            <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
                {children}
            </div>
        </div>
    );
}

function ProjectSmartFilters({
                                 searchTerm,
                                 setSearchTerm,
                                 documentationFilter,
                                 setDocumentationFilter,
                                 sortBy,
                                 setSortBy,
                             }: {
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    documentationFilter: DocumentationFilter;
    setDocumentationFilter: (value: DocumentationFilter) => void;
    sortBy: SortOption;
    setSortBy: (value: SortOption) => void;
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
                    placeholder="Search projects by name, description, creator…"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-[var(--cap-blue)]/50 focus:ring-4 focus:ring-[var(--cap-blue)]/8"
                />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-300 transition hover:text-slate-500"
                    >
                        <X size={13} />
                    </button>
                )}
            </div>

            {/* Dropdown filter row */}
            <div className="grid grid-cols-2 gap-2">
                <FilterSelect
                    label="Documentation"
                    value={documentationFilter}
                    onChange={(value) => setDocumentationFilter(value as DocumentationFilter)}
                    options={[
                        { label: 'All projects',  value: 'ALL' },
                        { label: 'Documented',    value: 'DOCUMENTED' },
                        { label: 'Missing info',  value: 'MISSING_INFO' },
                    ]}
                />
                <FilterSelect
                    label="Sort by"
                    value={sortBy}
                    onChange={(value) => setSortBy(value as SortOption)}
                    icon={<ArrowDownAZ size={11} />}
                    options={[
                        { label: 'Newest first', value: 'newest' },
                        { label: 'Oldest first', value: 'oldest' },
                        { label: 'Name A–Z',     value: 'name_asc' },
                        { label: 'Name Z–A',     value: 'name_desc' },
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
                          icon,
                      }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { label: string; value: string }[];
    icon?: React.ReactNode;
}) {
    const isActive = value !== 'ALL' && value !== 'newest';

    return (
        <label className="block">
            <span
                className={`mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
                    isActive ? 'text-[var(--cap-blue)]' : 'text-slate-400'
                }`}
            >
                {icon}
                {label}
            </span>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`h-9 w-full appearance-none rounded-xl border px-3 pr-7 text-xs font-medium shadow-sm outline-none transition focus:ring-4 focus:ring-[var(--cap-blue)]/8 ${
                        isActive
                            ? 'border-[var(--cap-blue)]/30 bg-[var(--cap-blue)]/5 text-[var(--cap-blue)] focus:border-[var(--cap-blue)]/50'
                            : 'border-slate-200 bg-white text-slate-600 focus:border-[var(--cap-blue)]/40'
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
                        isActive ? 'text-[var(--cap-blue)]' : 'text-slate-300'
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

const colorMap = {
    blue:  { bg: 'bg-[var(--cap-blue)]/8', text: 'text-[var(--cap-blue)]' },
    green: { bg: 'bg-emerald-50',           text: 'text-emerald-600' },
    sky:   { bg: 'bg-sky-50',               text: 'text-sky-600' },
    amber: { bg: 'bg-amber-50',             text: 'text-amber-600' },
} as const;

function StatCard({
                      label,
                      value,
                      icon,
                      color,
                  }: {
    label: string;
    value: number | null;
    icon: React.ReactNode;
    color: keyof typeof colorMap;
}) {
    const { bg, text } = colorMap[color];

    return (
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg} ${text}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">{label}</p>
                <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
                    {value === null ? (
                        <span className="inline-block h-5 w-8 animate-pulse rounded bg-slate-100" />
                    ) : (
                        value
                    )}
                </p>
            </div>
        </div>
    );
}

function ProjectCard({ project }: { project: Project }) {
    const hasDescription = !!project.description?.trim();

    return (
        <Link
            href={`/tester/projects/${project.id}`}
            className="group flex flex-col rounded-xl border border-slate-100 bg-slate-50/60 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--cap-blue)]/20 hover:bg-white hover:shadow-[0_4px_20px_0_rgb(0,0,0,0.07)]"
        >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--cap-blue)]/10 text-[var(--cap-blue)]">
                    <FolderKanban size={16} />
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 ring-1 ring-emerald-100">
                    Active
                </span>
            </div>

            {/* Title & description */}
            <div className="mt-4 flex-1">
                <h3 className="line-clamp-1 font-semibold text-slate-900 transition-colors duration-150 group-hover:text-[var(--cap-blue)]">
                    {project.name}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-400">
                    {hasDescription
                        ? project.description
                        : 'No description available for this project yet.'}
                </p>
            </div>

            {/* Mini meta row */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-100">
                    Assigned
                </span>
                <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-100">
                    Tester
                </span>
                {!hasDescription && (
                    <span className="rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-600 ring-1 ring-amber-100">
                        No docs
                    </span>
                )}
            </div>

            {/* Footer CTA */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-400">Open workspace</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-[var(--cap-blue)] transition-transform duration-150 group-hover:translate-x-0.5">
                    View <ChevronRight size={13} />
                </span>
            </div>
        </Link>
    );
}