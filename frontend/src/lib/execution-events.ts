// src/lib/execution-events.ts

export type AutomationScriptExecutionStatus =
    | 'QUEUED'
    | 'RUNNING'
    | 'PASSED'
    | 'FAILED'
    | 'TIMED_OUT'
    | 'CANCELED';

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

    command?: string | null;
    exitCode?: number | null;

    stdout?: string | null;
    stderr?: string | null;
    logs?: unknown;
    artifacts?: unknown;

    errorMessage?: string | null;

    startedAt?: string | null;
    completedAt?: string | null;

    createdAt: string;
    updatedAt: string;
};

export function listenToExecutionEvents(
    executionId: string,
    onMessage: (execution: AutomationScriptExecution) => void,
    onError?: (error: Event) => void,
) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
        throw new Error('NEXT_PUBLIC_API_URL is not defined');
    }

    const eventSource = new EventSource(
        `${apiUrl}/script-executions/${executionId}/events`,
        {
            withCredentials: true,
        },
    );

    eventSource.onmessage = (event) => {
        const execution = JSON.parse(event.data) as AutomationScriptExecution;

        onMessage(execution);

        if (execution.status !== 'QUEUED' && execution.status !== 'RUNNING') {
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