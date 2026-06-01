'use client';

import { useState } from 'react';
import { X, ShieldPlus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type Props = {
    open: boolean;
    onClose: () => void;
    onCreated: () => Promise<void>;
};

export function CreateUserModal({ open, onClose, onCreated }: Props) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'ADMIN' | 'TESTER'>('TESTER');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!open) return null;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.post('/users', {
                fullName,
                email,
                password,
                role,
            });

            setFullName('');
            setEmail('');
            setPassword('');
            setRole('TESTER');

            await onCreated();
            toast.success('User created successfully');
            onClose();
        } catch (err: any) {
            const message =
                err?.response?.data?.message || 'Failed to create user.';
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06152f]/55 p-4 backdrop-blur-md">
            <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/40 bg-white shadow-[0_30px_100px_rgba(2,6,23,0.30)]">
                {/* top accent */}
                <div className="h-1.5 w-full bg-[linear-gradient(90deg,#0a2a66_0%,#0b5bd3_55%,#44d3ff_100%)]" />

                {/* atmosphere */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(11,91,211,0.08),transparent_28%)]" />

                <div className="relative p-6 sm:p-8">
                    {/* Header */}
                    <div className="mb-8 flex items-start justify-between gap-4">
                        <div className="max-w-md">
                            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">
                                <ShieldPlus size={14} />
                                Administration
                            </div>

                            <h3 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                                Create user
                            </h3>

                            <p className="mt-3 text-sm leading-6 text-slate-500">
                                Provision a new platform account and assign the appropriate role
                                for access governance.
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            aria-label="Close modal"
                            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Full name
                                </label>
                                <input
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Enter full name"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Email address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Temporary password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Role
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as 'ADMIN' | 'TESTER')}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                >
                                    <option value="TESTER">Tester</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                        </div>

                        {error ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        ) : null}

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={loading}
                                className="rounded-2xl bg-[linear-gradient(90deg,#0a2a66,#0b5bd3)] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? 'Creating user...' : 'Create user'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}