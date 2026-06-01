'use client';

import { useEffect, useState } from 'react';
import { Shield, Users, UserCog, UserX } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { UsersRoleChart } from '@/components/charts/users-role-chart';
import { AccountStatusChart } from '@/components/charts/account-status-chart';
import { api } from '@/lib/api';
import type { GlobalStats } from '@/lib/types';

export default function AdminStatsPage() {
    const [stats, setStats] = useState<GlobalStats | null>(null);

    useEffect(() => {
        async function loadStats() {
            const { data } = await api.get<GlobalStats>('/stats/global');
            setStats(data);
        }

        void loadStats();
    }, []);

    if (!stats) {
        return (
            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <p className="text-slate-500">Loading statistics...</p>
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
                    label="Admins"
                    value={stats.admins}
                    icon={<Shield size={20} />}
                />
                <StatCard
                    label="Testers"
                    value={stats.testers}
                    icon={<UserCog size={20} />}
                />
                <StatCard
                    label="Inactive Accounts"
                    value={stats.inactiveUsers}
                    icon={<UserX size={20} />}
                />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <UsersRoleChart stats={stats} />
                <AccountStatusChart stats={stats} />
            </div>
        </>
    );
}