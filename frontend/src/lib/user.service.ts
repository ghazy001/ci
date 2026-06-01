import { api } from './api';
import type { User } from './types';

export async function getUsers(role?: 'ADMIN' | 'TESTER') {
    const { data } = await api.get<User[]>('/users/role', {
        params: role ? { role } : {},
    });
    return data;
}

export async function getTesters() {
    return getUsers('TESTER');
}