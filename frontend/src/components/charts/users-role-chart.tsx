'use client';

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import type { GlobalStats } from '@/lib/types';

type Props = {
    stats: GlobalStats;
};

const COLORS = ['#0A2A66', '#00B5E2'];

export function UsersRoleChart({ stats }: Props) {
    const data = [
        { name: 'Admins', value: stats.admins },
        { name: 'Testers', value: stats.testers },
    ];

    return (
        <div className="rounded-[28px] border border-white/40 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="mb-4">
                <p className="text-sm font-medium text-[var(--cap-blue)]">Distribution</p>
                <h3 className="text-xl font-bold text-slate-900">Users by role</h3>
            </div>

            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={70}
                            outerRadius={105}
                            paddingAngle={4}
                        >
                            {data.map((entry, index) => (
                                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}