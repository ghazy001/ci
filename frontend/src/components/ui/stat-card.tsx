import { ReactNode } from 'react';

type Props = {
    label: string;
    value: number;
    hint?: string;
    icon?: ReactNode;
};

export function StatCard({ label, value, hint, icon }: Props) {
    return (
        <div className="group relative overflow-hidden rounded-3xl border border-white/40 bg-white/80 p-6 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--cap-blue)]/5 via-transparent to-[var(--cap-cyan)]/10" />
            <div className="relative">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">{label}</p>
                        <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
                            {value}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[var(--cap-deep)]/6 p-3 text-[var(--cap-deep)]">
                        {icon}
                    </div>
                </div>

                {hint ? (
                    <p className="mt-3 text-sm text-slate-400">{hint}</p>
                ) : null}
            </div>
        </div>
    );
}