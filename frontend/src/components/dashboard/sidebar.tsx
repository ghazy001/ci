'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    BarChart3,
    LogOut,
    Sparkles,
    Group,
} from 'lucide-react';
import { logout } from '@/lib/auth';

const items = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/projects', label: 'Projects', icon: Group },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/stats', label: 'Statistics', icon: BarChart3 },
    { href: '/admin/analytics-assistant', label: 'Analytics assistant', icon: Sparkles },
    { href: '/admin/audit-logs', label: 'Audit logs', icon: BarChart3 },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    async function handleLogout() {
        await logout();
        router.push('/login');
    }

    return (
        <aside className="relative sticky top-0 flex h-screen w-72 flex-col overflow-hidden text-white shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)]">

            {/* Background layers */}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#06152f_0%,#0a2a66_40%,#081f4d_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_80%_90%,rgba(255,255,255,0.06),transparent_30%)]" />

            {/* subtle grid */}
            <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:36px_36px]" />

            <div className="relative z-10 flex h-full flex-col">

                {/* HEADER */}
                <div className="border-b border-white/10 px-6 py-7">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-cyan-300/80">
                        <Sparkles size={13} />
                        Control Layer
                    </div>

                    <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">
                        Admin Console
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-white/65">
                        Governance, access control and operational oversight.
                    </p>
                </div>

                {/* NAV */}
                <nav className="flex-1 space-y-1.5 px-3 py-6">
                    {items.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                  group relative flex items-center gap-3 rounded-xl px-4 py-3
                  text-sm font-medium transition-all duration-200
                  ${active ? 'text-white' : 'text-white/75 hover:text-white'}
                `}
                            >
                                {/* active indicator */}
                                {active && (
                                    <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-cyan-300" />
                                )}

                                {/* background */}
                                <div
                                    className={`
                    absolute inset-0 rounded-xl transition
                    ${active ? 'bg-white/10' : 'bg-transparent group-hover:bg-white/6'}
                  `}
                                />

                                {/* icon */}
                                <div
                                    className={`
                    relative z-10 flex h-9 w-9 items-center justify-center rounded-lg
                    transition
                    ${active
                                        ? 'bg-white/10'
                                        : 'bg-white/5 group-hover:bg-white/10'}
                  `}
                                >
                                    <Icon size={17} />
                                </div>

                                {/* label */}
                                <span className="relative z-10">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* FOOTER */}
                <div className="border-t border-white/10 p-4">
                    <button
                        onClick={handleLogout}
                        className="
              group flex w-full items-center gap-3 rounded-xl px-4 py-3
              text-sm font-medium text-white/80 transition
              hover:bg-white/10 hover:text-white
            "
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition">
                            <LogOut size={17} />
                        </div>

                        Logout
                    </button>
                </div>
            </div>
        </aside>
    );
}