import { api } from "@/lib/api";
import { AnalyticsAssistantResponse } from "@/lib/types";

export const analyticsAssistantService = {
    async ask(payload: {
        question: string;
        projectId?: string;
    }): Promise<AnalyticsAssistantResponse> {
        const { data } = await api.post("/analytics-assistant/ask", payload);
        return data;
    },
};