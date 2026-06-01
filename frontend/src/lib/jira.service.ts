import {
    JiraConnection,
    JiraIssuePreview,
    JiraIssueSearchItem,
} from "@/lib/types";
import { api } from "@/lib/api";

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
            params: { returnTo },
        });

        return res.data.url;
    },

    async getConnections(): Promise<JiraConnection[]> {
        const res = await api.get("/jira/oauth/connections");
        return res.data;
    },

    async searchIssues(
        params: SearchIssuesParams,
    ): Promise<SearchIssuesResponse> {
        const res = await api.get("/jira/search", {
            params,
        });

        return res.data;
    },

    async getIssuePreview(
        issueKey: string,
        cloudId?: string,
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