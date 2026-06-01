'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    ChevronLeft,
    FolderKanban,
    ShieldAlert,
    Users2,
    UserCircle2,
    Mail,
    BadgeCheck,
    FilePlus2,
    Import,
    FolderOpenDot,
    FileSearch,
    AlertCircle,
} from 'lucide-react';

import { getProjectById, getProjectMembers } from '@/lib/project.service';
import { getStoredUser } from '@/lib/auth';
import type { Project, ProjectMember, User } from '@/lib/types';

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function TesterProjectDetailsPage() {
    const params = useParams();
    const projectId = params.id as string;

    const [user, setUser] = useState<User | null>(null);
    const [userReady, setUserReady] = useState(false);
    const [project, setProject] = useState<Project | null>(null);
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const storedUser = getStoredUser();
        setUser(storedUser);
        setUserReady(true);
    }, []);

    useEffect(() => {
        if (!userReady || !user || user.role !== 'TESTER' || !projectId) return;

        const loadProject = async () => {
            try {
                setLoading(true);
                setError('');
                const [projectData, membersData] = await Promise.all([
                    getProjectById(projectId),
                    getProjectMembers(projectId),
                ]);
                setProject(projectData);
                setMembers(membersData);
            } catch (err: any) {
                setError(err?.response?.data?.message || 'Failed to load project');
            } finally {
                setLoading(false);
            }
        };

        loadProject();
    }, [userReady, user, projectId]);

    const stats = useMemo(() => ({
        membersCount: members.length,
        testersCount: members.filter((m) => m.role === 'TESTER').length,
        otherRolesCount: members.filter((m) => m.role !== 'TESTER').length,
        hasDescription: !!project?.description?.trim(),
    }), [members, project]);

    /* ── Guard states ── */
    if (!userReady) return <FullPageState><Spinner text="Loading workspace…" /></FullPageState>;

    if (!user || user.role !== 'TESTER') return (
        <FullPageState>
            <AccessDenied />
        </FullPageState>
    );

    if (loading) return <FullPageState><Spinner text="Loading project…" /></FullPageState>;

    if (error) return (
        <FullPageState>
            <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-600">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
            </div>
        </FullPageState>
    );

    if (!project) return (
        <FullPageState>
            <div className="rounded-xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
                Project not found.
            </div>
        </FullPageState>
    );

    /* ── Main render ── */
    return (
        <div className="min-h-screen bg-[linear-gradient(160deg,#f8fbff_0%,#eef5ff_100%)]">
            <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">

                {/* ── Header ── */}
                <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white px-7 py-6 shadow-[0_1px_3px_0_rgb(0,0,0,0.04),0_4px_16px_0_rgb(0,0,0,0.04)]">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--cap-blue)]/0 via-[var(--cap-blue)] to-[var(--cap-blue)]/0" />

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                <FolderKanban size={18} strokeWidth={1.8} />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                                    Project Details
                                </p>
                                <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
                                    {project.name}
                                </h1>
                                <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-400">
                                    {project.description?.trim() || 'No description available for this project yet.'}
                                </p>
                            </div>
                        </div>

                        <Link
                            href="/tester/projects"
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 hover:shadow-sm"
                        >
                            <ChevronLeft size={15} />
                            Back to Projects
                        </Link>
                    </div>
                </section>

                {/* ── Stats ── */}
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Project"
                        value={project.name}
                        valueSize="sm"
                        icon={<FolderKanban size={16} />}
                        color="blue"
                    />
                    <StatCard
                        label="Members"
                        value={stats.membersCount}
                        icon={<Users2 size={16} />}
                        color="sky"
                    />
                    <StatCard
                        label="Testers"
                        value={stats.testersCount}
                        icon={<BadgeCheck size={16} />}
                        color="green"
                    />
                    <StatCard
                        label="Description"
                        value={stats.hasDescription ? 'Available' : 'Missing'}
                        valueSize="sm"
                        icon={<ShieldAlert size={16} />}
                        color={stats.hasDescription ? 'green' : 'amber'}
                    />
                </section>

                {/* ── Work Items ── */}
                <section className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04),0_4px_16px_0_rgb(0,0,0,0.04)]">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                <FolderOpenDot size={16} />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                                    Work Items
                                </p>
                                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                                    Manage Work Items
                                </h2>
                            </div>
                        </div>
                        <Link
                            href={`/tester/projects/${projectId}/work-items`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[var(--cap-blue)]/25 hover:text-[var(--cap-blue)] hover:shadow-sm"
                        >
                            <FolderOpenDot size={14} />
                            View all
                        </Link>
                    </div>

                    <div className="grid gap-3 p-5 md:grid-cols-3">
                        {/* Create manually — primary CTA */}
                        <Link
                            href={`/tester/projects/${projectId}/work-items/new`}
                            className="group flex items-start gap-4 rounded-xl bg-[var(--cap-blue)] p-5 text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_0_rgb(0,0,0,0.15)]"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                                <FilePlus2 size={18} />
                            </div>
                            <div>
                                <p className="font-semibold">Create manually</p>
                                <p className="mt-0.5 text-sm leading-relaxed text-white/70">
                                    Add a new work item by filling in the details yourself.
                                </p>
                            </div>
                        </Link>

                        {/* Import from Jira */}
                        <Link
                            href={`/tester/projects/${projectId}/work-items/import-jira`}
                            className="group flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:shadow-[0_4px_16px_0_rgb(0,0,0,0.06)]"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                                <Import size={18} />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">Import from Jira</p>
                                <p className="mt-0.5 text-sm leading-relaxed text-slate-400">
                                    Bring existing Jira items into this workspace.
                                </p>
                            </div>
                        </Link>

                        {/* Import from Specs */}
                        <Link
                            href={`/tester/projects/${projectId}/work-items/import-spec-document`}
                            className="group flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--cap-blue)]/20 hover:bg-white hover:shadow-[0_4px_16px_0_rgb(0,0,0,0.06)]"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                <FileSearch size={18} />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">Import from Specs</p>
                                <p className="mt-0.5 text-sm leading-relaxed text-slate-400">
                                    Generate items from a specification document.
                                </p>
                            </div>
                        </Link>
                    </div>
                </section>

                {/* ── Members ── */}
                <section className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04),0_4px_16px_0_rgb(0,0,0,0.04)]">
                    <div className="border-b border-slate-100 px-6 py-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                            Team Overview
                        </p>
                        <div className="mt-0.5 flex items-baseline justify-between gap-4">
                            <h2 className="text-xl font-bold tracking-tight text-slate-900">
                                Project Members
                            </h2>
                            {members.length > 0 && (
                                <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                                    {members.length} member{members.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-slate-400">
                            Users assigned to this project and their current roles.
                        </p>
                    </div>

                    <div className="p-6">
                        {members.length === 0 ? (
                            <div className="py-14 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                    <Users2 size={22} />
                                </div>
                                <h3 className="mt-4 text-base font-semibold text-slate-800">No members yet</h3>
                                <p className="mt-1.5 text-sm text-slate-400">
                                    This project has no assigned members right now.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {members.map((member) => (
                                    <MemberCard key={member.id} member={member} />
                                ))}
                            </div>
                        )}
                    </div>
                </section>

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
            <div className="mx-auto max-w-7xl p-6 lg:p-8">
                {children}
            </div>
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

function AccessDenied() {
    return (
        <div className="rounded-xl border border-red-100 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                    <ShieldAlert size={18} />
                </div>
                <div>
                    <p className="font-semibold text-slate-900">Access Denied</p>
                    <p className="mt-0.5 text-sm text-slate-500">You don't have permission to view this page.</p>
                </div>
            </div>
        </div>
    );
}

const colorMap = {
    blue:  { bg: 'bg-[var(--cap-blue)]/8',  text: 'text-[var(--cap-blue)]' },
    green: { bg: 'bg-emerald-50',             text: 'text-emerald-600' },
    sky:   { bg: 'bg-sky-50',                 text: 'text-sky-600' },
    amber: { bg: 'bg-amber-50',               text: 'text-amber-600' },
} as const;

function StatCard({
                      label,
                      value,
                      icon,
                      color,
                      valueSize = 'lg',
                  }: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: keyof typeof colorMap;
    valueSize?: 'lg' | 'sm';
}) {
    const { bg, text } = colorMap[color];
    return (
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg} ${text}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">{label}</p>
                <p className={`mt-0.5 font-bold tracking-tight text-slate-900 truncate ${valueSize === 'lg' ? 'text-2xl' : 'text-base'}`}>
                    {value}
                </p>
            </div>
        </div>
    );
}

function MemberCard({ member }: { member: ProjectMember }) {
    const isTester = member.role === 'TESTER';

    return (
        <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--cap-blue)]/15 hover:bg-white hover:shadow-[0_4px_16px_0_rgb(0,0,0,0.06)]">
            {/* Avatar */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                <UserCircle2 size={20} />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                    {member.user.fullName}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <Mail size={11} />
                    <span className="truncate">{member.user.email}</span>
                </div>
            </div>

            {/* Role badge */}
            <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${
                isTester
                    ? 'bg-[var(--cap-blue)]/8 text-[var(--cap-blue)] ring-[var(--cap-blue)]/15'
                    : 'bg-slate-100 text-slate-500 ring-slate-200'
            }`}>
                {member.role}
            </span>
        </div>
    );
}