'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token') || '';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!token) {
            toast.error('Missing reset token');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        try {
            setLoading(true);

            await api.post('/auth/reset-password', {
                token,
                newPassword,
            });

            toast.success('Password reset successfully');
            router.push('/login');
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message || 'Failed to reset password',
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#f4f7fb] text-slate-900">
            {/* Background */}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#f8fbff_0%,#eef3f9_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(11,91,211,0.13),transparent_28%),radial-gradient(circle_at_82%_78%,rgba(68,211,255,0.16),transparent_24%)]" />
            <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] [background-size:42px_42px]" />

            {/* Glow shapes */}
            <div className="absolute left-[-8rem] top-[-6rem] h-[22rem] w-[22rem] rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute bottom-[-8rem] right-[-6rem] h-[26rem] w-[26rem] rounded-full bg-cyan-300/20 blur-3xl" />

            <section className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
                <div className="w-full max-w-[480px]">
                    {/* Brand */}
                    <div className="mb-7 flex justify-center">
                        <div className="inline-flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                            <Image
                                src="/capgemini-logo.png"
                                alt="Capgemini"
                                width={88}
                                height={88}
                                className="h-auto w-[74px] object-contain"
                                priority
                            />

                            <div>
                                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                                    Enterprise platform
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-950">
                                    TestFlow
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Card */}
                    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.12)]">
                        <div className="h-1.5 w-full bg-[linear-gradient(90deg,#0a2a66_0%,#0b5bd3_55%,#44d3ff_100%)]" />

                        <div className="p-8 sm:p-10">
                            <div className="mb-8 text-center">
                                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700/10 text-blue-700">
                                    <ShieldIcon />
                                </div>

                                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-700/80">
                                    Account recovery
                                </p>

                                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                                    Reset your password
                                </h1>

                                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
                                    Create a new password for your TestFlow account to restore
                                    secure access.
                                </p>
                            </div>

                            {!token && (
                                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 text-amber-700">
                                            <AlertIcon />
                                        </div>

                                        <p className="text-xs leading-5 text-amber-800">
                                            This reset link is missing a valid token. Please request
                                            a new password reset link before continuing.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <PasswordField
                                    id="newPassword"
                                    label="New password"
                                    placeholder="Create new password"
                                    value={newPassword}
                                    onChange={setNewPassword}
                                    visible={showNewPassword}
                                    onToggleVisibility={() =>
                                        setShowNewPassword((previous) => !previous)
                                    }
                                    icon={<KeyIcon />}
                                    disabled={!token || loading}
                                />

                                <PasswordField
                                    id="confirmPassword"
                                    label="Confirm password"
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={setConfirmPassword}
                                    visible={showConfirmPassword}
                                    onToggleVisibility={() =>
                                        setShowConfirmPassword((previous) => !previous)
                                    }
                                    icon={<CheckIcon />}
                                    disabled={!token || loading}
                                />

                                <button
                                    type="submit"
                                    disabled={loading || !token}
                                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition-all hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-xl hover:shadow-blue-700/25 focus:outline-none focus:ring-4 focus:ring-blue-700/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                                >
                                    {loading ? 'Resetting password...' : 'Reset password'}

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

                            <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 text-blue-700">
                                        <InfoIcon />
                                    </div>

                                    <p className="text-xs leading-5 text-slate-500">
                                        After your password is reset, you’ll return to the sign-in
                                        page and access TestFlow with your new credentials.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 text-center">
                                <Link
                                    href="/login"
                                    className="text-sm font-medium text-slate-500 transition-colors hover:text-blue-700"
                                >
                                    Back to sign in
                                </Link>
                            </div>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-xs text-slate-500">
                        Protected account recovery for authorized Capgemini users.
                    </p>
                </div>
            </section>
        </main>
    );
}

type PasswordFieldProps = {
    id: string;
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    visible: boolean;
    onToggleVisibility: () => void;
    icon: React.ReactNode;
    disabled?: boolean;
};

function PasswordField({
                           id,
                           label,
                           placeholder,
                           value,
                           onChange,
                           visible,
                           onToggleVisibility,
                           icon,
                           disabled = false,
                       }: PasswordFieldProps) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
            >
                {label}
            </label>

            <div className="relative">
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {icon}
                </div>

                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required
                    disabled={disabled}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 pr-12 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />

                <button
                    type="button"
                    onClick={onToggleVisibility}
                    disabled={disabled}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300"
                    aria-label={visible ? `Hide ${label}` : `Show ${label}`}
                >
                    {visible ? <EyeOffIcon /> : <EyeIcon />}
                </button>
            </div>
        </div>
    );
}

function ShieldIcon() {
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4"
            />
        </svg>
    );
}

function KeyIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a4 4 0 11-7.465 2.014L3 13.55V17h3.45L11 12.465A4 4 0 0115 7z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 6l4 4m-2-6l4 4"
            />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
            />
        </svg>
    );
}

function EyeIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3l18 18"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.58 10.58A2 2 0 0010 12a2 2 0 003.42"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.88 4.24A10.45 10.45 0 0112 4c4.477 0 8.268 2.943 9.542 7a10.52 10.52 0 01-3.13 4.47"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6.11 6.11A10.61 10.61 0 002.458 12C3.732 16.057 7.523 19 12 19a10.5 10.5 0 004.01-.79"
            />
        </svg>
    );
}

function AlertIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v4m0 4h.01"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
        </svg>
    );
}

function InfoIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 22a10 10 0 110-20 10 10 0 010 20z"
            />
        </svg>
    );
}