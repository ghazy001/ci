'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '@/lib/project.service';
import { getStoredUser } from '@/lib/auth';
import { FolderPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateProjectPage() {
    const router = useRouter();
    const user = getStoredUser();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (user?.role !== 'ADMIN') {
        return (
            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <p className="text-red-600">Access denied.</p>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setLoading(true);
            setError('');

            const project = await createProject({ name, description });
            router.push(`/admin/projects/${project.id}`);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                            <FolderPlus size={24} />
                        </div>

                        <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-400">
                            Admin Panel
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                            Create Project
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Set up a new project workspace and start assigning members.
                        </p>
                    </div>

                    <Link
                        href="/admin/projects"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
                    >
                        <ArrowLeft size={16} />
                        Back to Projects
                    </Link>
                </div>
            </div>

            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Project Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="e.g. Mobile App Testing"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Description
                        </label>
                        <textarea
                            rows={5}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the purpose, scope, and goals of this project..."
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                        />
                    </div>

                    {error && (
                        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3">
                        <Link
                            href="/admin/projects"
                            className="rounded-2xl px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? 'Creating...' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}