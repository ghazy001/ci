'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { login } from '@/lib/auth';

export function LoginForm() {
    const router = useRouter();

    const [email, setEmail] = useState('admin@project.com');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await login(email, password);

            toast.success(`Welcome back, ${data.user.fullName}`);

            if (data.user.mustChangePassword) {
                router.push('/change-password');
                return;
            }

            if (data.user.role === 'ADMIN') {
                router.push('/admin');
            } else {
                router.push('/tester');
            }
        } catch (err: any) {
            const message =
                err?.response?.data?.message || 'Login failed. Please try again.';
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            {/* HEADER */}


            <form onSubmit={handleSubmit} className="space-y-6">
                {/* EMAIL */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                        Email address
                    </label>

                    <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="
              w-full rounded-xl border border-slate-200 bg-white
              px-4 py-3.5 text-sm text-slate-900
              shadow-sm outline-none transition

              hover:border-slate-300
              focus:border-blue-600
              focus:ring-2 focus:ring-blue-600/20
            "
                    />
                </div>

                {/* PASSWORD */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                        Password
                    </label>

                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="
                w-full rounded-xl border border-slate-200 bg-white
                px-4 py-3.5 pr-12 text-sm text-slate-900
                shadow-sm outline-none transition

                hover:border-slate-300
                focus:border-blue-600
                focus:ring-2 focus:ring-blue-600/20
              "
                        />

                        <button
                            type="button"
                            onClick={() => setShowPassword((p) => !p)}
                            className="
                absolute inset-y-0 right-3 flex items-center
                text-slate-400 transition hover:text-slate-700
              "
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center justify-between">
                    <div />

                    <button
                        type="button"
                        onClick={() => router.push('/forgot-password')}
                        className="
              inline-flex items-center gap-1.5 text-sm font-medium
              text-blue-700 transition

              hover:text-blue-900 hover:underline
            "
                    >
                        <KeyRound size={15} />
                        Forgot password?
                    </button>
                </div>

                {/* ERROR */}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* SUBMIT */}
                <button
                    type="submit"
                    disabled={loading}
                    className="
            group relative w-full overflow-hidden rounded-xl
            bg-[linear-gradient(90deg,#0a2a66,#0b5bd3)]
            px-4 py-3.5 text-sm font-semibold text-white
            shadow-md transition

            hover:shadow-lg
            active:scale-[0.99]
            disabled:opacity-60 disabled:cursor-not-allowed
          "
                >
          <span className="relative z-10">
            {loading ? 'Signing in...' : 'Sign in'}
          </span>

                    {/* subtle glow */}
                    <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent_60%)]" />
                </button>
            </form>
        </div>
    );
}