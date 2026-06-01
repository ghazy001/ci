import { api } from './api';
import type { GlobalStats, TesterDashboardStats } from './types';

export async function getGlobalStats() {
    const { data } = await api.get<GlobalStats>('/stats/global');
    return data;
}

export async function getTesterStats() {
    const { data } = await api.get<TesterDashboardStats>('/stats/tester');
    return data;
}