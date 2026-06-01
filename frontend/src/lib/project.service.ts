import { api } from './api';
import type {
    AddProjectMemberDto,
    CreateProjectDto,
    Project,
    ProjectMember,
    UpdateProjectDto,
} from './types';

export async function getProjects() {
    const { data } = await api.get<Project[]>('/projects');
    return data;
}

export async function getProjectById(projectId: string) {
    const { data } = await api.get<Project>(`/projects/${projectId}`);
    return data;
}

export async function createProject(payload: CreateProjectDto) {
    const { data } = await api.post<Project>('/projects', payload);
    return data;
}

export async function updateProject(projectId: string, payload: UpdateProjectDto) {
    const { data } = await api.patch<Project>(`/projects/${projectId}`, payload);
    return data;
}

export async function deleteProject(projectId: string) {
    const { data } = await api.delete<{ message: string }>(`/projects/${projectId}`);
    return data;
}

export async function getProjectMembers(projectId: string) {
    const { data } = await api.get<ProjectMember[]>(`/projects/${projectId}/members`);
    return data;
}

export async function addProjectMember(projectId: string, payload: AddProjectMemberDto) {
    const { data } = await api.post<ProjectMember>(`/projects/${projectId}/members`, payload);
    return data;
}

export async function removeProjectMember(projectId: string, userId: string) {
    const { data } = await api.delete<{ message: string }>(
        `/projects/${projectId}/members/${userId}`,
    );
    return data;
}