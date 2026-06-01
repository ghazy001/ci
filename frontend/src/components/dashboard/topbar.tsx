'use client';

import Link from 'next/link';
import { getStoredUser } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function Topbar() {
    const user = getStoredUser();

    const imageUrl = user?.profilePicture
        ? `${API_URL}${user.profilePicture}`
        : null;

    return (
        <header className="rounded-3xl border border-white/40 bg-white/75 px-6 py-5 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                {/* LEFT */}
                <div>
                    <p className="text-sm font-medium text-[var(--cap-blue)]">
                        Administration Dashboard
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-slate-900">
                        Welcome back, {user?.fullName ?? 'Admin'}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Manage users, roles, access control, and platform metrics.
                    </p>
                </div>

                {/* RIGHT (Clickable Profile Card) */}
                <Link
                    href="/profile"
                    className="
                        group flex items-center gap-4 rounded-2xl border border-slate-100
                        bg-slate-50 px-4 py-3 transition-all duration-200
                        hover:bg-white hover:shadow-md
                    "
                >
                    {/* Avatar */}
                    <div className="relative">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt="Profile"
                                className="h-11 w-11 rounded-full object-cover ring-2 ring-white shadow-sm transition group-hover:scale-105"
                            />
                        ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-500 transition group-hover:scale-105">
                                {user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
                            </div>
                        )}

                        {/* status dot */}
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                    </div>

                    {/* Info */}
                    <div className="leading-tight">
                        <p className="text-sm font-medium text-slate-900 transition group-hover:text-[var(--cap-blue)]">
                            {user?.email}
                        </p>
                        <p className="text-xs uppercase tracking-wide text-[var(--cap-blue)]">
                            {user?.role}
                        </p>
                    </div>
                </Link>
            </div>
        </header>
    );
}