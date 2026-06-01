'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderKanban, Plus, Users, ArrowRight } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import { getProjects } from '@/lib/project.service';
import type { Project } from '@/lib/types';
import { deleteProject } from '@/lib/project.service';

export default function AdminProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const user = getStoredUser();

    const handleDelete = async (projectId: string) => {
        const confirmDelete = confirm('Are you sure you want to delete this project?');
        if (!confirmDelete) return;

        try {
            await deleteProject(projectId);

            // update UI after delete
            setProjects((prev) => prev.filter((p) => p.id !== projectId));
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Failed to delete project');
        }
    };

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const data = await getProjects();
                setProjects(data);
            } catch (err: any) {
                setError(err?.response?.data?.message || 'Failed to load projects');
            } finally {
                setLoading(false);
            }
        };

        void loadProjects();
    }, []);

    if (user?.role !== 'ADMIN') {
        return (
            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <p className="text-red-600">Access denied.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <p className="text-slate-500">Loading projects...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-400">
                            Admin Panel
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                            Projects
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Manage all projects, review descriptions, and access project details.
                        </p>
                    </div>

                    <Link
                        href="/admin/projects/create"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                        <Plus size={18} />
                        Create Project
                    </Link>
                </div>
            </div>

            {projects.length === 0 ? (
                <div className="rounded-[28px] bg-white p-8 shadow-sm">
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                            <FolderKanban size={24} />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">No projects found</h2>
                        <p className="mt-2 max-w-md text-sm text-slate-500">
                            There are no projects available yet. Start by creating your first project.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className="rounded-[28px] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                                        <FolderKanban size={20} />
                                    </div>

                                    <div className="min-w-0">
                                        <h2 className="truncate text-lg font-semibold text-slate-900">
                                            {project.name}
                                        </h2>
                                        <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-500">
                                            {project.description || 'No description'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                                <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                                    <Users size={16} />
                                    <span>Members: {project.members?.length ?? 0}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleDelete(project.id)}
                                        className="text-red-600 text-sm font-medium hover:underline"
                                    >
                                        Delete
                                    </button>

                                    <Link
                                        href={`/admin/projects/${project.id}`}
                                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-slate-600"
                                    >
                                        View
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}