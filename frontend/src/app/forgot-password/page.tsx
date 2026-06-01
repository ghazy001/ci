'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        try {
            setLoading(true);
            const { data } = await api.post('/auth/forgot-password', { email });
            toast.success(data.message);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to request password reset');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
            <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
                {/* LEFT / BRAND PANEL */}
                <section className="relative hidden overflow-hidden lg:flex">
                    {/* Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(155deg,#06152f_0%,#0a2a66_38%,#0b5bd3_100%)]" />

                    {/* Decorative brand glow */}
                    <div className="absolute -top-24 right-[-6rem] h-[28rem] w-[28rem] rounded-full bg-cyan-300/20 blur-3xl" />
                    <div className="absolute bottom-[-8rem] left-[-6rem] h-[22rem] w-[22rem] rounded-full bg-blue-200/10 blur-3xl" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.10),transparent_22%),radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.12),transparent_18%),radial-gradient(circle_at_65%_75%,rgba(255,255,255,0.06),transparent_20%)]" />

                    {/* Flow lines / abstract brand motion */}
                    <div className="absolute inset-0 opacity-30">
                        <div className="absolute left-[-10%] top-[18%] h-[32rem] w-[32rem] rounded-full border border-white/10" />
                        <div className="absolute left-[8%] top-[28%] h-[28rem] w-[28rem] rounded-full border border-cyan-200/10" />
                        <div className="absolute left-[18%] top-[38%] h-[24rem] w-[24rem] rounded-full border border-white/10" />
                    </div>

                    <div className="relative z-10 flex w-full flex-col justify-between px-14 py-12 xl:px-20 xl:py-16">
                        {/* Top */}
                        <div>
                            <div className="flex items-center gap-4">
                                <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                                    <Image
                                        src="/capgemini-logo.png"
                                        alt="Capgemini"
                                        width={130}
                                        height={130}
                                        className="h-auto w-[88px] object-contain"
                                        priority
                                    />
                                </div>

                                <div className="leading-tight">
                                    <p className="text-[11px] uppercase tracking-[0.28em] text-white/60">
                                        Enterprise platform
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-white/85">
                                        Built for Capgemini delivery teams
                                    </p>
                                </div>
                            </div>

                            <div className="mt-20 max-w-xl">
                                <p className="mb-5 text-xs font-medium uppercase tracking-[0.32em] text-cyan-200/80">
                                    Secure account recovery
                                </p>

                                <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-0.03em] text-white xl:text-6xl">
                                    Reset your access
                                </h1>

                                <p className="mt-6 max-w-lg text-base leading-7 text-white/75 xl:text-lg xl:leading-8">
                                    Recover your TestFlow account securely with a protected reset
                                    link sent to your registered Capgemini work email.
                                </p>
                            </div>
                        </div>

                        {/* Bottom */}
                        <div className="grid gap-5">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                                        Security
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-white/90">
                                        Encrypted request
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                                        Access
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-white/90">
                                        Work email only
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                                        Expiry
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-white/90">
                                        Time-limited link
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-white/10 px-6 py-5 backdrop-blur-md">
                                <p className="text-sm leading-6 text-white/72">
                                    Password recovery is handled through a secure identity workflow
                                    to keep enterprise access protected and controlled.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* RIGHT / RECOVERY PANEL */}
                <section className="relative flex items-center justify-center overflow-hidden px-6 py-10 sm:px-8 lg:px-12">
                    {/* Background layers */}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,#f6f9fc_0%,#eef3f9_100%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(11,91,211,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.10),transparent_24%)]" />

                    {/* Soft grid texture */}
                    <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] [background-size:40px_40px]" />

                    <div className="relative z-10 w-full max-w-md">
                        {/* Mobile brand header */}
                        <div className="mb-8 text-center lg:hidden">
                            <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                                <Image
                                    src="/capgemini-logo.png"
                                    alt="Capgemini"
                                    width={84}
                                    height={84}
                                    className="h-auto w-[72px] object-contain"
                                    priority
                                />
                                <div className="text-left">
                                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                                        Enterprise platform
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                        TestFlow
                                    </p>
                                </div>
                            </div>

                            <p className="mt-4 text-sm leading-6 text-slate-500">
                                Secure account recovery for Capgemini teams
                            </p>
                        </div>

                        {/* Recovery card */}
                        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
                            {/* Top accent */}
                            <div className="h-1.5 w-full bg-[linear-gradient(90deg,#0a2a66_0%,#0b5bd3_55%,#44d3ff_100%)]" />

                            <div className="p-8 sm:p-10">
                                <div className="mb-8">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-700/80">
                                        Account recovery
                                    </p>
                                    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                                        Forgot password?
                                    </h2>
                                    <p className="mt-3 text-sm leading-6 text-slate-500">
                                        Enter your registered work email and we’ll send you a secure
                                        password reset link.
                                    </p>
                                </div>

                                {/* Security notice */}
                                <div className="mb-7 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-700/10 text-blue-700">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                                />
                                            </svg>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium text-slate-900">
                                                Secure reset process
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                The recovery link is protected and should only be
                                                opened from your trusted device.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label
                                            htmlFor="email"
                                            className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                                        >
                                            Work email address
                                        </label>

                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="firstname.lastname@capgemini.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition-all hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-700/20 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {loading ? 'Sending reset link...' : 'Send reset link'}

                                        {!loading && (
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                </form>

                                <div className="mt-8 border-t border-slate-200 pt-5">
                                    <Link
                                        href="/login"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-blue-700"
                                    >
                                        <svg
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                            />
                                        </svg>
                                        Back to sign in
                                    </Link>

                                    <p className="mt-5 text-xs leading-5 text-slate-500">
                                        Protected access for authorized users. Reset requests are
                                        validated against your approved enterprise identity.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}