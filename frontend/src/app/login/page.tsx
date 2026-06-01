'use client';

import { LoginForm } from '@/components/auth/login-form';
import Image from 'next/image';

export default function LoginPage() {
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
                                    Intelligent quality engineering
                                </p>

                                <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-0.03em] text-white xl:text-6xl">
                                    TestFlow
                                </h1>

                                <p className="mt-6 max-w-lg text-base leading-7 text-white/75 xl:text-lg xl:leading-8">
                                    A modern AI-powered test automation workspace designed to help
                                    teams accelerate validation, reduce friction, and ship with
                                    confidence.
                                </p>
                            </div>
                        </div>

                        {/* Bottom */}
                        <div className="grid gap-5">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                                        Focus
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-white/90">
                                        Automation at scale
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                                        Benefit
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-white/90">
                                        Faster release cycles
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                                        Standard
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-white/90">
                                        Secure by design
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-white/10 px-6 py-5 backdrop-blur-md">
                                <p className="text-sm leading-6 text-white/72">
                                    Delivering a calmer, smarter testing experience for enterprise
                                    programs — simple, secure, and efficient.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* RIGHT / LOGIN PANEL */}
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
                                AI-powered test automation for Capgemini teams
                            </p>
                        </div>

                        {/* Login card */}
                        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
                            {/* top accent */}
                            <div className="h-1.5 w-full bg-[linear-gradient(90deg,#0a2a66_0%,#0b5bd3_55%,#44d3ff_100%)]" />

                            <div className="p-8 sm:p-10">
                                <div className="mb-8">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-700/80">
                                        Welcome back
                                    </p>
                                    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                                        Sign in to TestFlow
                                    </h2>
                                    <p className="mt-3 text-sm leading-6 text-slate-500">
                                        Access your AI testing workspace and continue managing
                                        automated quality workflows.
                                    </p>
                                </div>

                                <LoginForm />

                                <div className="mt-8 border-t border-slate-200 pt-5">
                                    <p className="text-xs leading-5 text-slate-500">
                                        Protected access for authorized users. Please use your
                                        approved credentials to continue.
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