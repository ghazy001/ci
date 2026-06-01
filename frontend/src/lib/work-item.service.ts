import { api } from "./api";
import {
    CreateWorkItemPayload,
    ImportJiraWorkItemPayload,
    ImportSpecDocumentPayload,
    JiraConnection,
    JiraIssuePreview,
    JiraIssueSearchItem,
    SpecDocumentPreviewResponse,
    WorkItem,
} from "./types";

type SearchIssuesParams = {
    query: string;
    cloudId?: string;
    projectKey?: string;
    status?: string;
    issueType?: string;
};

type SearchIssuesResponse = {
    site: {
        cloudId: string;
        siteName?: string | null;
        siteUrl?: string | null;
    };
    filters: {
        query: string;
        cloudId: string;
        projectKey?: string | null;
        status?: string | null;
        issueType?: string | null;
    };
    issues: JiraIssueSearchItem[];
};

export const jiraService = {
    async getOAuthUrl(returnTo?: string): Promise<string> {
        const res = await api.get("/jira/oauth/url", {
            params: {
                returnTo,
            },
        });

        return res.data.url;
    },

    async getConnections(): Promise<JiraConnection[]> {
        const res = await api.get("/jira/oauth/connections");
        return res.data;
    },

    async searchIssues(
        params: SearchIssuesParams
    ): Promise<SearchIssuesResponse> {
        const res = await api.get("/jira/search", {
            params,
        });

        return res.data;
    },

    async getIssuePreview(
        issueKey: string,
        cloudId?: string
    ): Promise<JiraIssuePreview> {
        const res = await api.get("/jira/issue", {
            params: {
                issueKey,
                cloudId,
            },
        });

        return res.data;
    },
};

export const workItemService = {
    async getByProject(projectId: string): Promise<WorkItem[]> {
        const res = await api.get("/work-items", {
            params: { projectId },
        });
        return res.data;
    },

    async getById(id: string): Promise<WorkItem> {
        const res = await api.get(`/work-items/${id}`);
        return res.data;
    },

    async createManual(payload: CreateWorkItemPayload): Promise<WorkItem> {
        const res = await api.post("/work-items", payload);
        return res.data;
    },

    async importFromJira(payload: ImportJiraWorkItemPayload): Promise<WorkItem> {
        const res = await api.post("/work-items/import/jira", payload);
        return res.data;
    },

    async previewSpecDocument(
        projectId: string,
        file: File,
        model: string
    ): Promise<SpecDocumentPreviewResponse> {
        const formData = new FormData();
        formData.append("projectId", projectId);
        formData.append("file", file);
        formData.append("model", model);

        const res = await api.post("/spec-documents/preview", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        return res.data;
    },

    async importFromSpecDocument(
        payload: ImportSpecDocumentPayload
    ): Promise<{ count: number; workItems: WorkItem[] }> {
        const res = await api.post("/spec-documents/import", payload);
        return res.data;
    },

    async update(id: string, payload: CreateWorkItemPayload): Promise<WorkItem> {
        const res = await api.patch(`/work-items/${id}`, payload);
        return res.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/work-items/${id}`);
    },
};