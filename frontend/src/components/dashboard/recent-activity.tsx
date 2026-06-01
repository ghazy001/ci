'use client';

import type { GlobalStats } from '@/lib/types';

type Props = {
    stats: GlobalStats;
};

export function RecentActivity({ stats }: Props) {
    const items = [
        {
            title: 'User base snapshot',
            description: `${stats.totalUsers} total accounts currently registered in the platform.`,
        },
        {
            title: 'Active accounts',
            description: `${stats.activeUsers} users can currently access the platform.`,
        },
        {
            title: 'Inactive accounts',
            description: `${stats.inactiveUsers} accounts are currently disabled by administration.`,
        },
        {
            title: 'Role balance',
            description: `${stats.admins} admin(s) and ${stats.testers} tester(s) are configured.`,
        },
    ];

    return (
        <div className="rounded-[28px] border border-white/40 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="mb-4">
                <p className="text-sm font-medium text-[var(--cap-blue)]">Insights</p>
                <h3 className="text-xl font-bold text-slate-900">Recent activity</h3>
            </div>

            <div className="space-y-4">
                {items.map((item) => (
                    <div
                        key={item.title}
                        className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                    >
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}