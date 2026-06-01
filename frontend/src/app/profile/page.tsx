'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertCircle,
    BadgeCheck,
    Camera,
    ChevronLeft,
    CheckCircle2,
    Mail,
    ShieldCheck,
    UploadCloud,
    User2,
} from 'lucide-react';
import {
    getAccessToken,
    getMe,
    updateProfile,
    uploadProfilePicture,
} from '@/lib/auth';
import type { User } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */
function FullPageState({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[linear-gradient(160deg,#f8fbff_0%,#eef5ff_100%)]">
            <div className="mx-auto max-w-6xl p-6 lg:p-8">{children}</div>
        </div>
    );
}

function Spinner({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-6 text-sm text-slate-400 shadow-sm">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--cap-blue)] border-t-transparent" />
            {text}
        </div>
    );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] ${className}`}>
            {children}
        </div>
    );
}

function CardHeader({ icon, label, title, description }: {
    icon: React.ReactNode; label: string; title: string; description: string;
}) {
    return (
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">{label}</p>
                <p className="text-sm font-bold text-slate-900">{title}</p>
            </div>
        </div>
    );
}

const inputBase =
    'h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[var(--cap-blue)]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--cap-blue)]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function ProfilePage() {
    const router = useRouter();

    const [user, setUser]               = useState<User | null>(null);
    const [fullName, setFullName]       = useState('');
    const [email, setEmail]             = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl]   = useState<string | null>(null);

    const [loading, setLoading]               = useState(true);
    const [savingProfile, setSavingProfile]   = useState(false);
    const [uploadingPicture, setUploadingPicture] = useState(false);
    const [message, setMessage]               = useState('');
    const [error, setError]                   = useState('');

    const currentImage = useMemo(() => {
        if (previewUrl) return previewUrl;
        if (user?.profilePicture) return `${API_URL}${user.profilePicture}`;
        return null;
    }, [previewUrl, user?.profilePicture]);

    useEffect(() => {
        const token = getAccessToken();
        if (!token) { router.replace('/login'); return; }

        const loadProfile = async () => {
            try {
                setLoading(true);
                setError('');
                const data = await getMe();
                setUser(data);
                setFullName(data.fullName || '');
                setEmail(data.email || '');
            } catch (err: any) {
                setError(err?.response?.data?.message || err.message || 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [router]);

    useEffect(() => {
        if (!selectedFile) { setPreviewUrl(null); return; }
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [selectedFile]);

    const handleBack = () => {
        const role = user?.role?.toLowerCase();
        if (role === 'admin')  { router.push('/admin');  return; }
        if (role === 'tester') { router.push('/tester'); return; }
        router.back();
    };

    const handleProfileSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            setSavingProfile(true);
            setError('');
            setMessage('');
            const updatedUser = await updateProfile(fullName, email);
            setUser(updatedUser);
            setMessage('Profile updated successfully.');
        } catch (err: any) {
            setError(err?.response?.data?.message || err.message || 'Failed to update profile');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) { setError('Only JPG, PNG, and WEBP images are allowed.'); return; }
        if (file.size > 2 * 1024 * 1024) { setError('Image size must be less than 2MB.'); return; }
        setError('');
        setMessage('');
        setSelectedFile(file);
    };

    const handlePictureUpload = async () => {
        if (!selectedFile) { setError('Please choose an image first.'); return; }
        try {
            setUploadingPicture(true);
            setError('');
            setMessage('');
            const updatedUser = await uploadProfilePicture(selectedFile);
            setUser(updatedUser);
            setSelectedFile(null);
            setPreviewUrl(null);
            setMessage('Profile picture updated successfully.');
        } catch (err: any) {
            setError(err?.response?.data?.message || err.message || 'Failed to upload profile picture');
        } finally {
            setUploadingPicture(false);
        }
    };

    /* ── Guard: loading ── */
    if (loading) return <FullPageState><Spinner text="Loading profile…" /></FullPageState>;

    /* ── Main ── */
    return (
        <div className="min-h-screen bg-[linear-gradient(160deg,#f8fbff_0%,#eef5ff_100%)]">
            <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">

                {/* ── Header ── */}
                <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white px-7 py-6 shadow-[0_1px_3px_0_rgb(0,0,0,0.04),0_4px_16px_0_rgb(0,0,0,0.04)]">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--cap-blue)]/0 via-[var(--cap-blue)] to-[var(--cap-blue)]/0" />

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                <User2 size={18} strokeWidth={1.8} />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                                    Personal Settings
                                </p>
                                <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
                                    My Profile
                                </h1>
                                <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-400">
                                    Manage your personal information, identity details, and profile image from one place.
                                </p>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={handleBack}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 hover:shadow-sm"
                            >
                                <ChevronLeft size={15} />
                                Back
                            </button>
                        </div>
                    </div>
                </section>

                {/* ── Error / Success banners ── */}
                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        {error}
                    </div>
                )}
                {message && (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                        {message}
                    </div>
                )}

                {/* ── Main grid ── */}
                <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">

                    {/* ── Profile picture card ── */}
                    <Card>
                        <CardHeader
                            icon={<Camera size={16} />}
                            label="Avatar"
                            title="Profile Picture"
                            description="Upload a clear avatar for your account."
                        />

                        <div className="p-5 space-y-5">
                            {/* Avatar */}
                            <div className="flex justify-center pt-2">
                                <div className="relative">
                                    {currentImage ? (
                                        <img
                                            src={currentImage}
                                            alt="Profile"
                                            className="h-36 w-36 rounded-full border-4 border-white object-cover shadow-[0_8px_24px_-8px_rgba(15,23,42,0.25)]"
                                        />
                                    ) : (
                                        <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-white bg-slate-100 text-sm font-medium text-slate-400 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.15)]">
                                            No picture
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-100 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-sm">
                                        <BadgeCheck size={12} className="text-[var(--cap-blue)]" />
                                        {user?.isActive ? 'Active account' : 'Inactive account'}
                                    </div>
                                </div>
                            </div>

                            {/* Drop zone */}
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50">
                                <label className="flex cursor-pointer flex-col items-center justify-center px-4 py-6 text-center transition hover:bg-slate-100/60 rounded-xl">
                                    <UploadCloud size={22} className="text-[var(--cap-blue)]" />
                                    <span className="mt-2.5 text-sm font-semibold text-slate-700">Choose an image</span>
                                    <span className="mt-0.5 text-xs text-slate-400">JPG, PNG or WEBP — max 2MB</span>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>

                                {selectedFile && (
                                    <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
                                        <span className="font-semibold text-slate-800">Selected:</span>{' '}
                                        {selectedFile.name}
                                    </div>
                                )}
                            </div>

                            {/* Upload button */}
                            <button
                                type="button"
                                onClick={handlePictureUpload}
                                disabled={uploadingPicture || !selectedFile}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--cap-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {uploadingPicture ? (
                                    <>
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Uploading…
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud size={15} />
                                        Upload Picture
                                    </>
                                )}
                            </button>
                        </div>
                    </Card>

                    {/* ── Profile info form ── */}
                    <Card>
                        <CardHeader
                            icon={<User2 size={16} />}
                            label="Identity"
                            title="Profile Information"
                            description="Keep your contact details and identity up to date."
                        />

                        <form onSubmit={handleProfileSubmit} className="p-5 space-y-5">

                            {/* Full Name */}
                            <div>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">Full Name</p>
                                <div className="relative">
                                    <User2 size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Enter your full name"
                                        className={inputBase}
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">Email</p>
                                <div className="relative">
                                    <Mail size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        className={inputBase}
                                    />
                                </div>
                            </div>

                            {/* Role + Status */}
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">Role</p>
                                    <div className="relative">
                                        <ShieldCheck size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={user?.role || ''}
                                            disabled
                                            className={inputBase}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">Status</p>
                                    <div className="relative">
                                        <BadgeCheck size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={user?.isActive ? 'Active' : 'Inactive'}
                                            disabled
                                            className={inputBase}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Read-only notice */}
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-400">
                                Your role and status are managed by the platform and cannot be changed here.
                            </div>

                            {/* Submit */}
                            <div className="flex justify-end pt-1">
                                <button
                                    type="submit"
                                    disabled={savingProfile}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--cap-blue)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {savingProfile ? (
                                        <>
                                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Saving…
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </form>
                    </Card>

                </div>
            </div>
        </div>
    );
}