import type { Role, User } from './types';

export function isAuthenticated() {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('accessToken');
}

export function hasRole(user: User | null, role: Role) {
    return user?.role === role;
}