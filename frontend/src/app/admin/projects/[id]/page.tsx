'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    addProjectMember,
    getProjectById,
    getProjectMembers,
    removeProjectMember,
} from '@/lib/project.service';
import { getStoredUser } from '@/lib/auth';
import { getTesters } from '@/lib/user.service';
import type { Project, ProjectMember, User } from '@/lib/types';
import {
    FolderKanban,
    Users,
    UserPlus,
    Trash2,
    Mail,
    Shield,
    UserCog,
} from 'lucide-react';

export default function AdminProjectDetailsPage() {
    const params = useParams();
    const projectId = params.id as string;
    const user = getStoredUser();

    const [project, setProject] = useState<Project | null>(null);
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [testers, setTesters] = useState<User[]>([]);
    const [testerId, setTesterId] = useState('');
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState('');

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');

            const [projectData, membersData, testersData] = await Promise.all([
                getProjectById(projectId),
                getProjectMembers(projectId),
                getTesters(),
            ]);

            setProject(projectData);
            setMembers(membersData);
            setTesters(testersData);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to load project');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            void loadData();
        }
    }, [projectId]);

    if (user?.role !== 'ADMIN') {
        return (
            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <p className="text-red-600">Access denied.</p>
            </div>
        );
    }

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setAssigning(true);
            setError('');

            await addProjectMember(projectId, {
                userId: testerId,
                role: 'TESTER',
            });

            setTesterId('');
            await loadData();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to assign tester');
        } finally {
            setAssigning(false);
        }
    };

    const handleRemove = async (userId: string) => {
        try {
            setError('');
            await removeProjectMember(projectId, userId);
            await loadData();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to remove member');
        }
    };

    const assignedUserIds = new Set(members.map((member) => member.userId));

    const availableTesters = testers.filter(
        (tester) => !assignedUserIds.has(tester.id),
    );

    if (loading) {
        return (
            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <p className="text-slate-500">Loading project...</p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <p className="text-slate-500">Project not found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="rounded-[28px] border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-600 shadow-sm">
                    {error}
                </div>
            )}

            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                            <FolderKanban size={24} />
                        </div>

                        <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-400">
                            Project Overview
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                            {project.name}
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                            {project.description || 'No description'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 px-5 py-4">
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                                Members
                            </p>
                            <div className="mt-2 flex items-center gap-2 text-slate-900">
                                <Users size={18} />
                                <span className="text-lg font-semibold">{members.length}</span>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 px-5 py-4">
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                                Available Testers
                            </p>
                            <div className="mt-2 flex items-center gap-2 text-slate-900">
                                <UserCog size={18} />
                                <span className="text-lg font-semibold">{availableTesters.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <UserPlus size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Assign Tester</h2>
                        <p className="text-sm text-slate-500">
                            Add a tester to this project from the available user list.
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={handleAssign}
                    className="flex flex-col gap-3 lg:flex-row lg:items-center"
                >
                    <select
                        value={testerId}
                        onChange={(e) => setTesterId(e.target.value)}
                        className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        required
                    >
                        <option value="">Select a tester</option>
                        {availableTesters.map((tester) => (
                            <option key={tester.id} value={tester.id}>
                                {tester.fullName} ({tester.email})
                            </option>
                        ))}
                    </select>

                    <button
                        type="submit"
                        disabled={assigning || !testerId}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <UserPlus size={16} />
                        {assigning ? 'Assigning...' : 'Assign Tester'}
                    </button>
                </form>
            </div>

            <div className="rounded-[28px] bg-white p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <Users size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Members</h2>
                        <p className="text-sm text-slate-500">
                            View and manage project participants.
                        </p>
                    </div>
                </div>

                {members.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 px-6 py-10 text-center">
                        <p className="text-sm text-slate-500">No members yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {members.map((member) => (
                            <div
                                key={member.id}
                                className="flex flex-col gap-4 rounded-[24px] border border-slate-100 bg-slate-50 p-5 md:flex-row md:items-center md:justify-between"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-base font-semibold text-slate-900">
                                            {member.user.fullName}
                                        </p>

                                        {member.role === 'OWNER' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white">
                                                <Shield size={12} />
                                                Owner
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                                        <Mail size={14} />
                                        <span className="truncate">{member.user.email}</span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                        <span className="rounded-full bg-white px-3 py-1 text-slate-600 ring-1 ring-slate-200">
                                            System Role: {member.user.role}
                                        </span>
                                        <span className="rounded-full bg-white px-3 py-1 text-slate-600 ring-1 ring-slate-200">
                                            Project Role: {member.role}
                                        </span>
                                    </div>
                                </div>

                                {member.role !== 'OWNER' && (
                                    <button
                                        onClick={() => handleRemove(member.userId)}
                                        className="inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500"
                                    >
                                        <Trash2 size={16} />
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}