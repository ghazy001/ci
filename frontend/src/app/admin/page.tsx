'use client';

import { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Shield } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { UsersRoleChart } from '@/components/charts/users-role-chart';
import { AccountStatusChart } from '@/components/charts/account-status-chart';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { api } from '@/lib/api';
import type { GlobalStats } from '@/lib/types';

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                const { data } = await api.get<GlobalStats>('/stats/global');
                setStats(data);
            } finally {
                setLoading(false);
            }
        }

        void loadStats();
    }, []);

    if (loading) {
        return (
            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <p className="text-slate-500">Loading dashboard metrics...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <p className="text-slate-500">Unable to load dashboard data.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Total Users"
                    value={stats.totalUsers}
                    icon={<Users size={20} />}
                />
                <StatCard
                    label="Active Users"
                    value={stats.activeUsers}
                    icon={<UserCheck size={20} />}
                />
                <StatCard
                    label="Inactive Users"
                    value={stats.inactiveUsers}
                    icon={<UserX size={20} />}
                />
                <StatCard
                    label="Admins"
                    value={stats.admins}
                    icon={<Shield size={20} />}
                />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <UsersRoleChart stats={stats} />
                <AccountStatusChart stats={stats} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <div className="rounded-[28px] border border-white/40 bg-white/75 p-8 shadow-sm backdrop-blur">
                    <h3 className="text-xl font-bold text-slate-900">Platform Overview</h3>
                    <p className="mt-2 max-w-3xl text-slate-500">
                        This administration workspace centralizes authentication, role-based
                        access control, user lifecycle management, and platform-wide metrics
                        for the AI-driven software test automation solution.
                    </p>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">Security posture</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">
                                JWT-based protected access
                            </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">User governance</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">
                                Role assignment and account control
                            </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">Architecture</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">
                                Next.js + NestJS + PostgreSQL
                            </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">Project direction</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">
                                Ready for AI integration with FastAPI
                            </p>
                        </div>
                    </div>
                </div>

                <RecentActivity stats={stats} />
            </div>
        </>
    );
}