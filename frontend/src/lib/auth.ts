import { api } from './api';
import type { LoginResponse, User } from './types';

const ACCESS_TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

function isBrowser() {
    return typeof window !== 'undefined';
}

export function saveSession(data: LoginResponse) {
    if (!isBrowser()) return;

    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearSession() {
    if (!isBrowser()) return;

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
    if (!isBrowser()) return null;

    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw) as User;
    } catch {
        return null;
    }
}

export function getAccessToken(): string | null {
    if (!isBrowser()) return null;

    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function login(email: string, password: string) {
    const { data } = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
    });

    saveSession(data);
    return data;
}

export async function getMe() {
    const { data } = await api.get<User>('/auth/me');

    if (isBrowser()) {
        localStorage.setItem(USER_KEY, JSON.stringify(data));
    }

    return data;
}

export async function logout() {
    try {
        await api.post('/auth/logout');
    } finally {
        clearSession();
    }
}

export async function updateProfile(fullName: string, email: string) {
    const { data } = await api.patch<User>('/auth/profile', {
        fullName,
        email,
    });

    if (isBrowser()) {
        localStorage.setItem(USER_KEY, JSON.stringify(data));
    }

    return data;
}

export async function uploadProfilePicture(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.patch<User>('/auth/profile/picture', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    if (isBrowser()) {
        localStorage.setItem(USER_KEY, JSON.stringify(data));
    }

    return data;
}