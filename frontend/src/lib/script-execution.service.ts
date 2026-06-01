import { api } from "@/lib/api";

export type AutomationScriptExecutionStats = {
    total: number;
    passed: number;
    failed: number;
    timedOut: number;
    canceled: number;
    running: number;
    queued: number;
    passRate: number;
    averageDurationMs: number;
    mostUsedBrowser: string | null;
    latestExecution: {
        id: string;
        status: AutomationScriptExecutionStatus;
        createdAt: string;
        completedAt?: string | null;
    } | null;
    latestFailedExecution: {
        id: string;
        status: AutomationScriptExecutionStatus;
        errorMessage?: string | null;
        createdAt: string;
        completedAt?: string | null;
    } | null;
};

export type AutomationScriptExecutionStatus =
    | "QUEUED"
    | "RUNNING"
    | "PASSED"
    | "FAILED"
    | "TIMED_OUT"
    | "CANCELED";

export type ExecutionArtifact = {
    type: "screenshot" | "trace" | "video" | "report" | "other";
    fileName: string;
    url: string;
    sizeBytes: number;
};

export type AutomationScriptExecution = {
    id: string;
    scriptId: string;
    testCaseId: string;
    workItemId: string;
    requestedById: string;

    status: AutomationScriptExecutionStatus;
    framework: string;
    browser?: string | null;

    targetUrl?: string | null;
    environment?: string | null;
    variables?: Record<string, string> | null;

    command?: string | null;
    exitCode?: number | null;

    stdout?: string | null;
    stderr?: string | null;

    logs?: {
        level: string;
        message: string;
        timestamp: string;
    }[] | null;

    artifacts?: ExecutionArtifact[] | null;

    errorMessage?: string | null;

    startedAt?: string | null;
    completedAt?: string | null;
    createdAt: string;
    updatedAt: string;
};

export type RunAutomationScriptPayload = {
    targetUrl?: string;
    browser?: "CHROMIUM" | "FIREFOX" | "WEBKIT" | "CHROME" | "EDGE";
    environment?: string;
    variables?: Record<string, string>;
};

export type DefectSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type DefectReportStatus =
    | "OPEN"
    | "TRIAGED"
    | "IN_PROGRESS"
    | "RESOLVED"
    | "CLOSED"
    | "REJECTED";

export type TestSuiteReportStatus = "PASSED" | "FAILED" | "PARTIAL";

export type DefectReport = {
    id: string;

    projectId: string;
    workItemId: string;
    testCaseId: string;
    scriptId: string;
    executionId: string;
    createdById: string;

    title: string;
    summary: string;
    severity: DefectSeverity;
    status: DefectReportStatus;

    failureReason?: string | null;
    reproductionSteps?: unknown;
    environment?: string | null;
    browser?: string | null;
    targetUrl?: string | null;

    command?: string | null;
    exitCode?: number | null;
    stdoutExcerpt?: string | null;
    stderrExcerpt?: string | null;
    logs?: unknown;
    artifacts?: unknown;

    createdAt: string;
    updatedAt: string;
};

export type TestSuiteReportItem = {
    id: string;
    reportId: string;
    executionId: string;

    scriptId: string;
    testCaseId: string;
    workItemId: string;

    status: AutomationScriptExecutionStatus;
    durationMs?: number | null;
    errorMessage?: string | null;

    createdAt: string;
};

export type TestSuiteReport = {
    id: string;

    projectId: string;
    workItemId?: string | null;
    scriptId?: string | null;
    requestedById: string;

    title: string;
    status: TestSuiteReportStatus;

    total: number;
    passed: number;
    failed: number;
    timedOut: number;
    canceled: number;
    running: number;
    queued: number;

    passRate: number;
    durationMs?: number | null;

    startedAt?: string | null;
    completedAt?: string | null;

    summary?: unknown;
    artifacts?: unknown;

    items: TestSuiteReportItem[];

    createdAt: string;
    updatedAt: string;
};

export async function runAutomationScriptLive(
    scriptId: string,
    payload: RunAutomationScriptPayload,
) {
    const { data } = await api.post<{
        execution: AutomationScriptExecution;
        queued: boolean;
        message: string;
    }>(`/automation-scripts/${scriptId}/executions`, payload);

    return data;
}

export async function getScriptExecution(executionId: string) {
    const { data } = await api.get<AutomationScriptExecution>(
        `/script-executions/${executionId}`,
    );

    return data;
}

export async function cancelScriptExecution(executionId: string) {
    const { data } = await api.post<AutomationScriptExecution>(
        `/script-executions/${executionId}/cancel`,
    );

    return data;
}

export function listenToExecutionEvents(
    executionId: string,
    onMessage: (execution: AutomationScriptExecution) => void | Promise<void>,
    onError?: (error: Event) => void,
) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
        throw new Error("NEXT_PUBLIC_API_URL is not defined");
    }

    const eventSource = new EventSource(
        `${apiUrl}/script-executions/${executionId}/events`,
        {
            withCredentials: true,
        },
    );

    eventSource.onmessage = (event) => {
        const execution = JSON.parse(event.data) as AutomationScriptExecution;

        void onMessage(execution);

        if (execution.status !== "QUEUED" && execution.status !== "RUNNING") {
            eventSource.close();
        }
    };

    eventSource.onerror = (error) => {
        eventSource.close();

        if (onError) {
            onError(error);
        }
    };

    return eventSource;
}

export async function getScriptExecutions(scriptId: string) {
    const { data } = await api.get<AutomationScriptExecution[]>(
        `/automation-scripts/${scriptId}/executions`,
    );

    return data;
}

export async function getScriptExecutionStats(scriptId: string) {
    const { data } = await api.get<AutomationScriptExecutionStats>(
        `/automation-scripts/${scriptId}/execution-stats`,
    );

    return data;
}

export async function getDefectReportByExecution(executionId: string) {
    const { data } = await api.get<DefectReport | null>(
        `/script-executions/${executionId}/defect-report`,
    );

    return data;
}

export async function createDefectReportForExecution(executionId: string) {
    const { data } = await api.post<DefectReport | null>(
        `/script-executions/${executionId}/defect-report`,
    );

    return data;
}

export async function createTestSuiteReport(payload: {
    executionIds: string[];
    title?: string;
}) {
    const { data } = await api.post<TestSuiteReport>(
        `/test-suite-reports`,
        payload,
    );

    return data;
}

export async function getTestSuiteReport(reportId: string) {
    const { data } = await api.get<TestSuiteReport>(
        `/test-suite-reports/${reportId}`,
    );

    return data;
}

export async function downloadDefectReportPdf(executionId: string) {
    const response = await api.get(
        `/script-executions/${executionId}/defect-report/pdf`,
        {
            responseType: "blob",
        },
    );

    downloadBlob(response.data, `defect-report-${executionId}.pdf`);
}

export async function downloadTestSuiteReportPdf(reportId: string) {
    const response = await api.get(`/test-suite-reports/${reportId}/pdf`, {
        responseType: "blob",
    });

    downloadBlob(response.data, `test-suite-report-${reportId}.pdf`);
}

function downloadBlob(blob: Blob, fileName: string) {
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);
}
export async function getTestSuiteReportsByScript(scriptId: string) {
    const { data } = await api.get<TestSuiteReport[]>(
        `/automation-scripts/${scriptId}/test-suite-reports`,
    );

    return data;
}
export type ScheduledTestRunStatus = "ACTIVE" | "PAUSED" | "DISABLED";

export type SchedulePreset = "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM_CRON";

export type ScheduledTestRun = {
    id: string;

    projectId: string;
    workItemId: string;
    scriptId: string;
    createdById: string;

    name: string;
    description?: string | null;

    status: ScheduledTestRunStatus;

    cronExpression: string;
    timezone: string;

    targetUrl?: string | null;
    browser?: "CHROMIUM" | "FIREFOX" | "WEBKIT" | "CHROME" | "EDGE" | null;
    environment?: string | null;
    variables?: Record<string, string> | null;

    lastRunAt?: string | null;
    nextRunAt?: string | null;
    lastExecutionId?: string | null;

    createdAt: string;
    updatedAt: string;
};

export type CreateScheduledTestRunPayload = {
    scriptId: string;
    name: string;
    description?: string;

    preset: SchedulePreset;
    dayOfWeek?: "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
    dayOfMonth?: number;
    time: string;
    cronExpression?: string;
    timezone?: string;

    targetUrl?: string;
    browser?: "CHROMIUM" | "FIREFOX" | "WEBKIT" | "CHROME" | "EDGE";
    environment?: string;
    variables?: Record<string, string>;
};

export type UpdateScheduledTestRunPayload = Partial<{
    name: string;
    description: string;
    status: ScheduledTestRunStatus;
    cronExpression: string;
    timezone: string;
    targetUrl: string;
    browser: "CHROMIUM" | "FIREFOX" | "WEBKIT" | "CHROME" | "EDGE";
    environment: string;
    variables: Record<string, string>;
}>;
export async function createScheduledTestRun(
    payload: CreateScheduledTestRunPayload,
) {
    const { data } = await api.post<ScheduledTestRun>(
        "/scheduled-test-runs",
        payload,
    );

    return data;
}

export async function getScheduledTestRunsByScript(scriptId: string) {
    const { data } = await api.get<ScheduledTestRun[]>(
        `/automation-scripts/${scriptId}/scheduled-test-runs`,
    );

    return data;
}

export async function getScheduledTestRun(id: string) {
    const { data } = await api.get<ScheduledTestRun>(
        `/scheduled-test-runs/${id}`,
    );

    return data;
}

export async function updateScheduledTestRun(
    id: string,
    payload: UpdateScheduledTestRunPayload,
) {
    const { data } = await api.patch<ScheduledTestRun>(
        `/scheduled-test-runs/${id}`,
        payload,
    );

    return data;
}

export async function pauseScheduledTestRun(id: string) {
    const { data } = await api.post<ScheduledTestRun>(
        `/scheduled-test-runs/${id}/pause`,
    );

    return data;
}

export async function resumeScheduledTestRun(id: string) {
    const { data } = await api.post<ScheduledTestRun>(
        `/scheduled-test-runs/${id}/resume`,
    );

    return data;
}

export async function disableScheduledTestRun(id: string) {
    const { data } = await api.post<ScheduledTestRun>(
        `/scheduled-test-runs/${id}/disable`,
    );

    return data;
}