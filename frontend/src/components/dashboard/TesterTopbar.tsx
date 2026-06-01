'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronRight, FlaskConical } from 'lucide-react';
import { getStoredUser, getMe, logout } from '@/lib/auth';
import type { User } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function TesterTopbar() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        const storedUser = getStoredUser();
        setUser(storedUser);

        const loadFreshUser = async () => {
            try {
                const freshUser = await getMe();
                setUser(freshUser);
            } catch {
                // keep stored user if request fails
            }
        };

        loadFreshUser();
    }, []);

    const imageUrl = user?.profilePicture
        ? `${API_URL}${user.profilePicture}`
        : null;

    const initial = user?.fullName?.charAt(0)?.toUpperCase() || 'T';

    const handleLogout = async () => {
        setLoggingOut(true);
        await logout();
        router.push('/login');
    };

    return (
        <header className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white px-7 py-5 shadow-[0_1px_3px_0_rgb(0,0,0,0.04),0_4px_16px_0_rgb(0,0,0,0.04)]">
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--cap-blue)]/0 via-[var(--cap-blue)] to-[var(--cap-blue)]/0" />

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                {/* Left — identity block */}
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                        <FlaskConical size={18} strokeWidth={1.8} />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                            Testing Workspace
                        </p>
                        <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">
                            Welcome back,{' '}
                            <span className="text-[var(--cap-blue)]">
                                {user?.fullName?.split(' ')[0] ?? 'Tester'}
                            </span>
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-400">
                            Track projects, review tickets, and manage test runs.
                        </p>
                    </div>
                </div>

                {/* Right — actions */}
                <div className="flex items-center gap-2.5">

                    {/* Profile card */}
                    <Link
                        href="/profile"
                        className="group flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 transition-all duration-200 hover:border-[var(--cap-blue)]/30 hover:bg-white hover:shadow-[0_2px_12px_0_rgb(0,0,0,0.06)]"
                    >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt="Profile"
                                    className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-sm transition-transform duration-200 group-hover:scale-105"
                                />
                            ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--cap-blue)]/20 to-[var(--cap-blue)]/10 text-sm font-bold text-[var(--cap-blue)] ring-2 ring-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                                    {initial}
                                </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 shadow-sm" />
                        </div>

                        {/* Info */}
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold leading-tight text-slate-800 transition-colors duration-200 group-hover:text-[var(--cap-blue)]">
                                {user?.fullName ?? 'Tester'}
                            </p>
                            <p className="truncate text-xs leading-tight text-slate-400">
                                {user?.email}
                            </p>
                        </div>

                        {/* Role badge + chevron */}
                        <div className="flex shrink-0 items-center gap-1 rounded-md bg-[var(--cap-blue)]/8 px-2 py-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--cap-blue)]">
                                {user?.role ?? 'Tester'}
                            </span>
                            <ChevronRight
                                size={11}
                                className="text-[var(--cap-blue)] opacity-60 transition-transform duration-200 group-hover:translate-x-0.5"
                            />
                        </div>
                    </Link>

                    {/* Divider */}
                    <div className="h-8 w-px bg-slate-200" />

                    {/* Logout button */}
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        title="Sign out"
                        aria-label="Sign out"
                        className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-500 transition-all duration-300 hover:border-red-200 hover:bg-red-600 hover:text-white hover:shadow-[0_4px_16px_-4px_rgba(220,38,38,0.5)] active:scale-95 disabled:opacity-60"
                    >
                        {/* Shimmer on hover */}
                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />

                        {loggingOut ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300 border-t-red-600 group-hover:border-white/40 group-hover:border-t-white" />
                        ) : (
                            <LogOut
                                size={15}
                                strokeWidth={2}
                                className="transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:rotate-[-8deg]"
                            />
                        )}

                        <span className="relative">
                            {loggingOut ? 'Signing out…' : 'Sign out'}
                        </span>
                    </button>

                </div>
            </div>
        </header>
    );
}