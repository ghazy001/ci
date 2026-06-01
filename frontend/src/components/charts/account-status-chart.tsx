'use client';

import {
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import type { GlobalStats } from '@/lib/types';

type Props = {
    stats: GlobalStats;
};

export function AccountStatusChart({ stats }: Props) {
    const data = [
        { name: 'Active', value: stats.activeUsers },
        { name: 'Inactive', value: stats.inactiveUsers },
    ];

    return (
        <div className="rounded-[28px] border border-white/40 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="mb-4">
                <p className="text-sm font-medium text-[var(--cap-blue)]">Monitoring</p>
                <h3 className="text-xl font-bold text-slate-900">Account status</h3>
            </div>

            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[12, 12, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}