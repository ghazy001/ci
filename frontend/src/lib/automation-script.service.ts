import { api } from "@/lib/api";
import {
    AutomationScript,
    AutomationScriptGeneration,
    GenerateAutomationScriptPayload,
    GenerateAutomationScriptResponse,
} from "@/lib/types";

export const automationScriptService = {
    async generateForTestCase(
        testCaseId: string,
        payload: GenerateAutomationScriptPayload
    ): Promise<GenerateAutomationScriptResponse> {
        const { data } = await api.post(
            `/test-cases/${testCaseId}/automation-scripts/generate`,
            payload
        );

        return data;
    },

    async getByTestCase(testCaseId: string): Promise<AutomationScript[]> {
        const { data } = await api.get(
            `/test-cases/${testCaseId}/automation-scripts`
        );

        return data;
    },

    async getLatestGenerationByTestCase(
        testCaseId: string
    ): Promise<AutomationScriptGeneration | null> {
        const { data } = await api.get(
            `/test-cases/${testCaseId}/automation-script-generations/latest`
        );

        return data;
    },

    async getGeneration(
        generationId: string
    ): Promise<AutomationScriptGeneration> {
        const { data } = await api.get(
            `/automation-script-generations/${generationId}`
        );

        return data;
    },

    async syncGeneration(
        generationId: string
    ): Promise<AutomationScriptGeneration> {
        const { data } = await api.post(
            `/automation-script-generations/${generationId}/sync`
        );

        return data;
    },

    async retryGeneration(
        generationId: string
    ): Promise<AutomationScriptGeneration> {
        const { data } = await api.post(
            `/automation-script-generations/${generationId}/retry`
        );

        return data;
    },

    async markGenerationFailed(
        generationId: string
    ): Promise<AutomationScriptGeneration> {
        const { data } = await api.post(
            `/automation-script-generations/${generationId}/mark-failed`
        );

        return data;
    },

    async getOne(scriptId: string): Promise<AutomationScript> {
        const { data } = await api.get(`/automation-scripts/${scriptId}`);
        return data;
    },

    async update(
        scriptId: string,
        payload: Partial<Pick<AutomationScript, "fileName" | "code" | "explanation" | "reviewNotes">>
    ): Promise<AutomationScript> {
        const { data } = await api.patch(`/automation-scripts/${scriptId}`, payload);
        return data;
    },

    async approve(scriptId: string, reviewNotes?: string): Promise<AutomationScript> {
        const { data } = await api.post(`/automation-scripts/${scriptId}/approve`, {
            reviewNotes,
        });

        return data;
    },

    async decline(scriptId: string, reviewNotes?: string): Promise<AutomationScript> {
        const { data } = await api.post(`/automation-scripts/${scriptId}/decline`, {
            reviewNotes,
        });

        return data;
    },

    async remove(scriptId: string): Promise<AutomationScript> {
        const { data } = await api.post(`/automation-scripts/${scriptId}/remove`);
        return data;
    },

    getDownloadUrl(scriptId: string): string {
        return `/automation-scripts/${scriptId}/download`;
    },
};