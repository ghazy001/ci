import { api } from "./api";
import {
    GenerateTestCasesPayload,
    GenerateTestCasesResponse,
    TestCase,
    TestCaseGeneration,
} from "./types";

export const testCaseService = {
    async generateForWorkItem(
        workItemId: string,
        payload: GenerateTestCasesPayload
    ): Promise<GenerateTestCasesResponse> {
        const { data } = await api.post(
            `/work-items/${workItemId}/test-cases/generate`,
            payload
        );

        return data;
    },

    async getByWorkItem(workItemId: string): Promise<TestCase[]> {
        const { data } = await api.get(`/work-items/${workItemId}/test-cases`);
        return data;
    },

    async getLatestGeneration(
        workItemId: string
    ): Promise<TestCaseGeneration | null> {
        const { data } = await api.get(
            `/work-items/${workItemId}/test-case-generations/latest`
        );

        return data;
    },

    async getGenerationHistory(
        workItemId: string
    ): Promise<TestCaseGeneration[]> {
        const { data } = await api.get(
            `/work-items/${workItemId}/test-case-generations`
        );

        return data;
    },

    async approve(id: string, reviewNotes?: string): Promise<TestCase> {
        const { data } = await api.post(`/test-cases/${id}/approve`, {
            reviewNotes,
        });

        return data;
    },

    async decline(id: string, reviewNotes?: string): Promise<TestCase> {
        const { data } = await api.post(`/test-cases/${id}/decline`, {
            reviewNotes,
        });

        return data;
    },

    async update(
        id: string,
        payload: Partial<TestCase> & {
            preconditions?: string[];
            tags?: string[];
        }
    ): Promise<TestCase> {
        const { data } = await api.patch(`/test-cases/${id}`, payload);
        return data;
    },

    async indexWorkItemForRag(workItemId: string): Promise<any> {
        const { data } = await api.post(`/work-items/${workItemId}/rag/index`);
        return data;
    },

    async searchRagForWorkItem(workItemId: string): Promise<any[]> {
        const { data } = await api.get(`/work-items/${workItemId}/rag/search`);
        return data;
    },

    // ─── Step 16.3 ─────────────────────────────────────────────────────────────

    async retryGeneration(generationId: string): Promise<TestCaseGeneration> {
        const { data } = await api.post(
            `/test-case-generations/${generationId}/retry`
        );

        return data;
    },

    async markGenerationFailed(generationId: string): Promise<TestCaseGeneration> {
        const { data } = await api.post(
            `/test-case-generations/${generationId}/mark-failed`
        );

        return data;
    },

    // ───────────────────────────────────────────────────────────────────────────
};