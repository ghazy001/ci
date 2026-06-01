'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Code2,
  FolderKanban,
  Loader2,
  PlayCircle,
  Sparkles,
  Target,
  TimerReset,
  TriangleAlert,
} from 'lucide-react';
import { TesterTopbar } from '@/components/dashboard/TesterTopbar';
import { getTesterStats } from '@/lib/stats.service';
import type { TesterDashboardStats } from '@/lib/types';

function formatNumber(value?: number) {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
}

function StatCard({
                    label,
                    value,
                    icon,
                    href,
                    description,
                    accent = 'blue',
                    clickable = false,
                  }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href?: string;
  description: string;
  accent?: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';
  clickable?: boolean;
}) {
  const accentClass = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
    rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  }[accent];

  const content = (
      <>
        <div
            className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--cap-blue)]/70 to-transparent ${
                clickable ? 'opacity-0 transition-opacity group-hover:opacity-100' : 'opacity-40'
            }`}
        />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {label}
            </p>

            <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">
              {formatNumber(value)}
            </p>

            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          </div>

          <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${accentClass}`}
          >
            {icon}
          </div>
        </div>

        {clickable ? (
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-sm font-semibold text-slate-500">
            Open section
          </span>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-[var(--cap-blue)] transition-transform group-hover:translate-x-1">
            View
            <ChevronRight size={16} />
          </span>
            </div>
        ) : (
            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
              Overview metric
            </div>
        )}
      </>
  );

  const baseClass =
      'relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]';

  const clickableClass =
      'group block transition-all duration-200 hover:-translate-y-1 hover:border-[var(--cap-blue)]/30 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]';

  if (clickable && href) {
    return (
        <Link href={href} className={`${baseClass} ${clickableClass}`}>
          {content}
        </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}

function MetricPill({
                      label,
                      value,
                      icon,
                    }: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <div className="flex items-center gap-2 text-slate-500">
          {icon}
          <span className="text-xs font-bold uppercase tracking-[0.16em]">
          {label}
        </span>
        </div>

        <p className="mt-3 text-2xl font-black text-slate-950">
          {value}
        </p>
      </div>
  );
}

function LoadingState() {
  return (
      <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200/70 bg-white">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin text-[var(--cap-blue)]" size={26} />
          <p className="text-sm font-semibold">Loading tester workspace...</p>
        </div>
      </div>
  );
}

export default function TesterDashboardPage() {
  const [stats, setStats] = useState<TesterDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      try {
        setLoading(true);
        setError(null);

        const data = await getTesterStats();

        if (mounted) {
          setStats(data);
        }
      } catch {
        if (mounted) {
          setError('Unable to load tester dashboard stats.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      mounted = false;
    };
  }, []);

  const dashboardCards = useMemo(() => {
    if (!stats) return [];

    return [
      {
        label: 'Projects',
        value: stats.cards.projects,
        href: '/tester/projects',
        description: 'Assigned QA workspaces and product modules.',
        icon: <FolderKanban size={22} />,
        accent: 'blue' as const,
        clickable: true,
      },
      {
        label: 'Work Items',
        value: stats.cards.workItems,
        description: 'Features, bugs, tasks, and user stories ready for testing.',
        icon: <ClipboardList size={22} />,
        accent: 'violet' as const,
        clickable: false,
      },
      {
        label: 'Test Cases',
        value: stats.cards.testCases,
        description: 'Generated, edited, and approved QA scenarios.',
        icon: <CheckCircle2 size={22} />,
        accent: 'emerald' as const,
        clickable: false,
      },
      {
        label: 'Scripts',
        value: stats.cards.automationScripts,
        description: 'Automation scripts generated from approved test cases.',
        icon: <Code2 size={22} />,
        accent: 'amber' as const,
        clickable: false,
      },
      {
        label: 'Executions',
        value: stats.cards.executions,
        description: 'Latest automation runs and execution history.',
        icon: <PlayCircle size={22} />,
        accent: 'rose' as const,
        clickable: false,
      },
      {
        label: 'Analytics Chat',
        value: stats.cards.analyticsAssistant,
        href: '/tester/analytics-assistant',
        description: 'Ask AI questions about projects, quality, and test activity.',
        icon: <Bot size={22} />,
        accent: 'blue' as const,
        clickable: true,
      },
    ];
  }, [stats]);

  return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,transparent_35%),linear-gradient(160deg,#f8fbff_0%,#eef5ff_100%)]">
        <div className="mx-auto max-w-7xl space-y-5 p-6 lg:p-8">
          <TesterTopbar />

          {/* Compact Header */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white px-6 py-5 shadow-[0_14px_45px_rgba(15,23,42,0.05)]">
            <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[var(--cap-blue)]/10 blur-3xl" />

            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--cap-blue)]/10 text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/15">
                  <Sparkles size={21} />
                </div>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--cap-blue)]">
                    Tester Command Center
                  </p>

                  <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                    QA workspace overview
                  </h1>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    Monitor assigned projects, test coverage, automation health, and AI analytics.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                    href="/tester/projects"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  <FolderKanban size={16} />
                  Projects
                </Link>

                <Link
                    href="/tester/analytics-assistant"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--cap-blue)]/30 hover:text-[var(--cap-blue)]"
                >
                  <Bot size={16} />
                  Analytics Chat
                </Link>
              </div>
            </div>
          </section>

          {loading && <LoadingState />}

          {!loading && error && (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">
                {error}
              </div>
          )}

          {!loading && !error && stats && (
              <>
                {/* Main Stats */}
                <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {dashboardCards.map((card) => (
                      <StatCard key={card.label} {...card} />
                  ))}
                </section>

                {/* Quality + Pipeline */}
                <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                          Quality Pulse
                        </p>

                        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                          Execution & approval health
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          A compact view of approvals, automation runs, and execution quality.
                        </p>
                      </div>

                      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-center ring-1 ring-emerald-100">
                        <p className="text-xs font-black uppercase tracking-wider text-emerald-600">
                          Pass Rate
                        </p>

                        <p className="mt-1 text-3xl font-black text-emerald-700">
                          {stats.quality.passRate}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      <MetricPill
                          label="Approved Tests"
                          value={formatNumber(stats.quality.approvedTestCases)}
                          icon={<CheckCircle2 size={16} />}
                      />

                      <MetricPill
                          label="Pending Reviews"
                          value={formatNumber(stats.quality.pendingTestCases)}
                          icon={<TimerReset size={16} />}
                      />

                      <MetricPill
                          label="Approved Scripts"
                          value={formatNumber(stats.quality.approvedAutomationScripts)}
                          icon={<Code2 size={16} />}
                      />

                      <MetricPill
                          label="Passed Runs"
                          value={formatNumber(stats.quality.passedExecutions)}
                          icon={<Target size={16} />}
                      />

                      <MetricPill
                          label="Failed Runs"
                          value={formatNumber(stats.quality.failedExecutions)}
                          icon={<TriangleAlert size={16} />}
                      />

                      <MetricPill
                          label="Active Schedules"
                          value={formatNumber(stats.cards.scheduledRuns)}
                          icon={<Activity size={16} />}
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                          Current Pipeline
                        </p>

                        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                          Work item status
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Non-clickable overview of your current work item flow.
                        </p>
                      </div>

                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                        <BarChart3 size={24} />
                      </div>
                    </div>

                    <div className="mt-6 space-y-5">
                      {[
                        {
                          label: 'Ready for AI',
                          value: stats.workItems.ready,
                          barClassName: 'bg-blue-500',
                          badgeClassName: 'bg-blue-50 text-blue-700 ring-blue-100',
                        },
                        {
                          label: 'Analyzed',
                          value: stats.workItems.analyzed,
                          barClassName: 'bg-emerald-500',
                          badgeClassName: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
                        },
                        {
                          label: 'Failed',
                          value: stats.workItems.failed,
                          barClassName: 'bg-rose-500',
                          badgeClassName: 'bg-rose-50 text-rose-700 ring-rose-100',
                        },
                      ].map((item) => {
                        const max = Math.max(
                            stats.workItems.ready,
                            stats.workItems.analyzed,
                            stats.workItems.failed,
                            1
                        );

                        const width = Math.round((item.value / max) * 100);

                        return (
                            <div key={item.label}>
                              <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-bold text-slate-700">
                            {item.label}
                          </span>

                                <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${item.badgeClassName}`}
                                >
                            {formatNumber(item.value)}
                          </span>
                              </div>

                              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className={`h-full rounded-full ${item.barClassName}`}
                                    style={{ width: `${width}%` }}
                                />
                              </div>
                            </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-100">
                      Pipeline overview only
                    </div>
                  </div>
                </section>

                {/* Recent Projects - Not Clickable */}
                <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                        Recent Projects
                      </p>

                      <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                        Assigned project snapshot
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        A read-only preview of your latest assigned projects.
                      </p>
                    </div>

                    <Link
                        href="/tester/projects"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--cap-blue)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-110"
                    >
                      View all projects
                      <ChevronRight size={16} />
                    </Link>
                  </div>

                  <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {stats.recentProjects.map((project) => (
                        <div
                            key={project.id}
                            className="rounded-3xl border border-slate-100 bg-slate-50/80 p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                        <span className="inline-flex rounded-xl bg-[var(--cap-blue)]/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/15">
                          Project
                        </span>

                              <h3 className="mt-3 text-base font-black text-slate-950">
                                {project.name}
                              </h3>

                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                                {project.description || 'No description provided.'}
                              </p>
                            </div>

                            <span className="shrink-0 rounded-xl bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 ring-1 ring-emerald-100">
                        Active
                      </span>
                          </div>

                          <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Work Items
                            </p>

                            <p className="mt-1 text-2xl font-black text-slate-950">
                              {formatNumber(project.workItemCount)}
                            </p>
                          </div>

                          <div className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500">
                            Preview only
                          </div>
                        </div>
                    ))}

                    {stats.recentProjects.length === 0 && (
                        <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                          <p className="font-bold text-slate-700">
                            No assigned projects yet.
                          </p>

                          <p className="mt-2 text-sm text-slate-500">
                            Once you are added to a project, it will appear here.
                          </p>
                        </div>
                    )}
                  </div>
                </section>
              </>
          )}
        </div>
      </div>
  );
}