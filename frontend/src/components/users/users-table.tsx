'use client';

import { useMemo, useState } from 'react';
import { Search, Shield, Trash2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';

type Props = {
    users: User[];
    onRefresh: () => Promise<void>;
};

export function UsersTable({ users, onRefresh }: Props) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [roleLoadingId, setRoleLoadingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'TESTER'>('ALL');

    async function deleteUser(user: User) {
        if (!confirm(`Delete ${user.fullName}? This action cannot be undone.`)) return;

        try {
            setLoadingId(user.id);
            await api.delete(`/users/${user.id}`);
            toast.success(`${user.fullName} deleted`);
            await onRefresh();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Delete failed');
        } finally {
            setLoadingId(null);
        }
    }

    async function toggleStatus(user: User) {
        try {
            setLoadingId(user.id);

            await api.patch(`/users/${user.id}/${user.isActive ? 'deactivate' : 'activate'}`);

            toast.success(
                `${user.fullName} ${user.isActive ? 'deactivated' : 'activated'}`
            );

            await onRefresh();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Status update failed');
        } finally {
            setLoadingId(null);
        }
    }

    async function changeRole(user: User, nextRole: 'ADMIN' | 'TESTER') {
        if (user.role === nextRole) return;

        try {
            setRoleLoadingId(user.id);

            await api.patch(`/users/${user.id}`, { role: nextRole });

            toast.success(`${user.fullName} is now ${nextRole}`);
            await onRefresh();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Role update failed');
        } finally {
            setRoleLoadingId(null);
        }
    }

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const matchesSearch =
                user.fullName.toLowerCase().includes(search.toLowerCase()) ||
                user.email.toLowerCase().includes(search.toLowerCase());

            const matchesRole =
                roleFilter === 'ALL' ? true : user.role === roleFilter;

            return matchesSearch && matchesRole;
        });
    }, [users, search, roleFilter]);

    return (
        <div className="space-y-5">

            {/* CONTROL BAR */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:flex-row md:items-center md:justify-between">

                {/* Search */}
                <div className="relative w-full max-w-md">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        placeholder="Search users, emails..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="
              w-full rounded-xl border border-slate-200 bg-white
              py-3 pl-10 pr-4 text-sm
              outline-none transition
              hover:border-slate-300
              focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20
            "
                    />
                </div>

                {/* Role filter */}
                <div className="flex items-center gap-2">
                    <Shield size={16} className="text-slate-400" />

                    <select
                        value={roleFilter}
                        onChange={(e) =>
                            setRoleFilter(e.target.value as 'ALL' | 'ADMIN' | 'TESTER')
                        }
                        className="
              rounded-xl border border-slate-200 bg-white
              px-4 py-3 text-sm
              outline-none transition
              hover:border-slate-300
              focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20
            "
                    >
                        <option value="ALL">All roles</option>
                        <option value="ADMIN">Admin</option>
                        <option value="TESTER">Tester</option>
                    </select>
                </div>
            </div>

            {/* TABLE */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                    </thead>

                    <tbody>
                    {filteredUsers.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-14 text-center text-slate-400">
                                No users found for current filters.
                            </td>
                        </tr>
                    ) : (
                        filteredUsers.map((user) => (
                            <tr
                                key={user.id}
                                className="border-t border-slate-100 transition hover:bg-slate-50/70"
                            >
                                {/* USER */}
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900">
                                        {user.fullName}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {user.email}
                                    </div>
                                </td>

                                {/* ROLE */}
                                <td className="px-6 py-4">
                                    <select
                                        value={user.role}
                                        disabled={roleLoadingId === user.id}
                                        onChange={(e) =>
                                            changeRole(user, e.target.value as 'ADMIN' | 'TESTER')
                                        }
                                        className="
                        rounded-lg border border-slate-200 bg-white
                        px-3 py-2 text-xs font-medium
                        outline-none transition
                        focus:border-blue-600
                      "
                                    >
                                        <option value="ADMIN">ADMIN</option>
                                        <option value="TESTER">TESTER</option>
                                    </select>
                                </td>

                                {/* STATUS */}
                                <td className="px-6 py-4">
                    <span
                        className={`
                        inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold
                        ${user.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'}
                      `}
                    >
                      <span
                          className={`h-1.5 w-1.5 rounded-full ${
                              user.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                      />
                        {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                                </td>

                                {/* ACTIONS */}
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-2">

                                        {/* Toggle */}
                                        <button
                                            onClick={() => toggleStatus(user)}
                                            disabled={loadingId === user.id}
                                            className="
                          inline-flex items-center gap-1.5 rounded-lg
                          bg-slate-900 px-3 py-2 text-xs font-medium text-white
                          transition hover:opacity-90 disabled:opacity-60
                        "
                                        >
                                            <Power size={14} />
                                            {user.isActive ? 'Disable' : 'Enable'}
                                        </button>

                                        {/* Delete */}
                                        <button
                                            onClick={() => deleteUser(user)}
                                            disabled={loadingId === user.id || user.role === 'ADMIN'}
                                            className="
                          inline-flex items-center gap-1.5 rounded-lg
                          bg-red-600 px-3 py-2 text-xs font-medium text-white
                          transition hover:bg-red-700 disabled:opacity-50
                        "
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}