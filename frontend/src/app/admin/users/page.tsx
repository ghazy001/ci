'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { UsersTable } from '@/components/users/users-table';
import { CreateUserModal } from '@/components/users/create-user-modal';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get<User[]>('/users');
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    return (
        <section className="space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#0a2a66_0%,#0b5bd3_55%,#44d3ff_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(11,91,211,0.06),transparent_30%)]" />

                <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">
                            <ShieldCheck size={14} />
                            Access governance
                        </div>

                        <h3 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                            User Management
                        </h3>

                        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                            Manage platform accounts, roles, and activation status across the
                            TestFlow administration workspace.
                        </p>
                    </div>

                    <button
                        onClick={() => setOpenCreateModal(true)}
                        className="
              inline-flex items-center justify-center gap-2 rounded-2xl
              bg-[linear-gradient(90deg,#0a2a66,#0b5bd3)]
              px-5 py-3 font-semibold text-white shadow-md transition
              hover:shadow-lg active:scale-[0.99]
            "
                    >
                        <Plus size={18} />
                        Create User
                    </button>
                </div>
            </div>

            {/* Content panel */}
            <div className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 sm:px-8">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Directory</p>
                        <p className="text-xs text-slate-500">
                            Review and manage registered users
                        </p>
                    </div>

                    <div className="text-xs font-medium text-slate-400">
                        {loading ? 'Loading users...' : `${users.length} user${users.length === 1 ? '' : 's'}`}
                    </div>
                </div>

                <div className="p-4 sm:p-6">
                    <UsersTable users={users} onRefresh={loadUsers} />
                </div>
            </div>

            <CreateUserModal
                open={openCreateModal}
                onClose={() => setOpenCreateModal(false)}
                onCreated={loadUsers}
            />
        </section>
    );
}