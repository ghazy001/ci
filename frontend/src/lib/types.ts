export type Role = 'ADMIN' | 'TESTER';

export type User = {
    id: string;
    fullName: string;
    email: string;
    role: Role;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
    lastLoginAt?: string | null;
    mustChangePassword: boolean;
    profilePicture?: string | null;
};

export type LoginResponse = {
    message: string;
    user: User;
    accessToken: string;
    refreshToken: string;
};

export type GlobalStats = {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    admins: number;
    testers: number;
};

export type ProjectMemberRole = 'OWNER' | 'TESTER';

export type ProjectMember = {
    id: string;
    projectId: string;
    userId: string;
    role: ProjectMemberRole;
    assignedAt: string;
    user: {
        id: string;
        fullName: string;
        email: string;
        role: Role;
    };
};

export type Project = {
    id: string;
    name: string;
    description?: string | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: {
        id: string;
        fullName: string;
        email: string;
        role?: Role;
    };
    members?: ProjectMember[];
};

export type CreateProjectDto = {
    name: string;
    description?: string;
};

export type UpdateProjectDto = {
    name?: string;
    description?: string;
};

export type AddProjectMemberDto = {
    userId: string;
    role: ProjectMemberRole;
};

export type UserRole = "ADMIN" | "TESTER";

export type WorkItemType =
    | "FEATURE"
    | "BUG"
    | "IMPROVEMENT"
    | "TASK"
    | "USER_STORY";

export type WorkItemSource = "MANUAL" | "JIRA" | "SPEC_DOCUMENT";

export type WorkItemStatus =
    | "DRAFT"
    | "READY_FOR_AI"
    | "PROCESSING"
    | "ANALYZED"
    | "FAILED";

export interface WorkItem {
    id: string;
    projectId: string;
    createdById: string;
    type: WorkItemType;
    source: WorkItemSource;
    status: WorkItemStatus;
    title: string;
    description?: string | null;
    acceptanceCriteria?: string[] | null;
    businessRules?: string[] | null;
    priority?: string | null;
    externalSystem?: string | null;
    externalRef?: string | null;
    rawPayload?: unknown;
    normalizedContent?: unknown;
    metadata?: unknown;
    createdAt: string;
    updatedAt: string;
}

export interface CreateWorkItemPayload {
    projectId: string;
    type: WorkItemType;
    title: string;
    description?: string;
    acceptanceCriteria?: string[];
    businessRules?: string[];
    priority?: string;
}

export type JiraConnection = {
    id: string;
    cloudId: string;
    siteName?: string | null;
    siteUrl?: string | null;
    scope?: string | null;
    expiresAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

export type ImportJiraWorkItemPayload = {
    projectId: string;
    externalRef: string;
    cloudId: string;
};

export type JiraIssueSearchItem = {
    id: string;
    key: string;
    summary: string;
    issueType?: string | null;
    priority?: string | null;
    status?: string | null;
    projectName?: string | null;
    projectKey?: string | null;
    updated?: string | null;
    assignee?: string | null;
};

export interface JiraIssueSearchResponse {
    site: {
        cloudId: string;
        siteName?: string | null;
        siteUrl?: string | null;
    };
    filters: {
        query: string;
        projectKey?: string | null;
        status?: string | null;
        issueType?: string | null;
    };
    issues: JiraIssueSearchItem[];
}

export type JiraIssuePreview = {
    site: {
        cloudId: string;
        siteName?: string | null;
        siteUrl?: string | null;
    };
    issue: {
        id: string;
        key: string;
        summary: string;
        status?: string | null;
        issueType?: string | null;
        priority?: string | null;
        project?: string | null;
    };
    mapped: {
        title: string;
        description: string;
        acceptanceCriteria: string[];
        businessRules: string[];
        priority?: string | null;
        type: string;
        extraSections: {
            tasks: string[];
            testCases: string[];
            definitionOfDone: string[];
            notes: string[];
        };
        extractionMeta: {
            method: 'rules' | 'rules_plus_ai';
            confidence: number;
            fallbackReasons?: string[];
            model?: string;
        };
    };
};

export type SpecAiModelId =
    | "llama-3.3-70b-versatile"
    | "openai/gpt-oss-120b"
    | "meta-llama/llama-4-scout-17b-16e-instruct";

export interface SpecAiModelOption {
    id: SpecAiModelId;
    label: string;
    provider: string;
    description: string;
}

export interface ExtractedSpecWorkItem {
    title: string;
    type: WorkItemType;
    description: string;
    acceptanceCriteria: string[];
    businessRules: string[];
    priority?: string | null;
    confidence: number;
    sourceSection?: string | null;
}

export interface SpecDocumentPreviewResponse {
    file: {
        name: string;
        mimeType: string;
        size: number;
    };
    extraction: {
        textLength: number;
        workItemsCount: number;
        model: string;
    };
    workItems: ExtractedSpecWorkItem[];
}

export interface ImportSpecDocumentPayload {
    projectId: string;
    fileName?: string;
    extractionModel?: string;
    workItems: ExtractedSpecWorkItem[];
}

export type TestCaseStatus = "GENERATED" | "EDITED" | "APPROVED" | "DECLINED";

export type TestCaseType =
    | "FUNCTIONAL"
    | "VALIDATION"
    | "NEGATIVE"
    | "EDGE_CASE"
    | "SECURITY"
    | "UI"
    | "INTEGRATION"
    | "REGRESSION";

export type TestCasePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TestCaseStep = {
    order: number;
    action: string;
    expected?: string | null;
};

export type TestCaseCoverage = {
    acceptanceCriteria: string[];
    businessRules: string[];
};

export type TestCase = {
    id: string;
    workItemId: string;
    generationId?: string | null;
    generatedById: string;

    title: string;
    objective?: string | null;
    type: TestCaseType;
    priority: TestCasePriority;
    status: TestCaseStatus;

    preconditions?: string[] | null;
    steps: TestCaseStep[];
    expectedResult: string;
    testData?: Record<string, string> | null;
    tags?: string[] | null;
    coverage?: TestCaseCoverage | null;

    aiTrace?: Record<string, unknown> | null;
    reviewNotes?: string | null;

    approvedAt?: string | null;
    declinedAt?: string | null;
    editedAt?: string | null;

    createdAt: string;
    updatedAt: string;
};

export type TestCaseGenerationStatus =
    | "PENDING"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED";

export type TestCaseGeneration = {
    id: string;
    workItemId: string;
    requestedById: string;
    status: TestCaseGenerationStatus;

    provider?: string | null;
    model?: string | null;
    promptVersion?: string | null;
    generationMethod?: string | null;

    inputHash: string;
    options?: Record<string, unknown> | null;
    warnings?: string[] | null;
    errorMessage?: string | null;
    aiTrace?: Record<string, unknown> | null;
    confidence?: number | null;

    createdAt: string;
    startedAt?: string | null;
    completedAt?: string | null;
    updatedAt: string;

    testCases?: TestCase[];
};

export type GenerateTestCasesPayload = {
    maxTestCases?: number;
    includePositiveTests?: boolean;
    includeNegativeTests?: boolean;
    includeEdgeCases?: boolean;
    includeSecurityTests?: boolean;
    useRag?: boolean;
    language?: string;
};

export type GenerateTestCasesResponse = {
    generation: TestCaseGeneration;
    testCases: TestCase[];
    reused: boolean;
    warnings?: string[];
};
export type AutomationFramework =
    | "PLAYWRIGHT_TS"
    | "PLAYWRIGHT_PYTHON"
    | "CYPRESS_TS"
    | "SELENIUM_JAVA";

export type BrowserTarget =
    | "CHROMIUM"
    | "FIREFOX"
    | "WEBKIT"
    | "CHROME"
    | "EDGE";

export type AutomationScriptGenerationStatus =
    | "PENDING"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED";

export type AutomationScriptStatus =
    | "GENERATED"
    | "EDITED"
    | "APPROVED"
    | "DECLINED"
    | "REMOVED";

export type GenerateAutomationScriptPayload = {
    framework: AutomationFramework;
    targetUrl: string;
    browser?: BrowserTarget;
    environment?: string;
    selectorsStrategy?: "ROLE_FIRST" | "DATA_TEST_ID_FIRST" | "CSS_FALLBACK" | "AUTO";
    authRequired?: boolean;
    authRole?: string;
    authInstructions?: string;
    extraInstructions?: string;
    variables?: Record<string, string>;
};

export type AutomationScript = {
    id: string;
    generationId: string;
    testCaseId: string;
    workItemId: string;
    generatedById: string;

    status: AutomationScriptStatus;
    framework: AutomationFramework;

    fileName: string;
    language: string;
    code: string;
    explanation?: string | null;

    dependencies?: string[] | null;
    setupNotes?: string[] | null;
    selectorsUsed?: {
        purpose: string;
        selector: string;
        source: string;
    }[] | null;
    warnings?: string[] | null;
    aiTrace?: Record<string, unknown> | null;

    reviewNotes?: string | null;

    approvedAt?: string | null;
    declinedAt?: string | null;
    editedAt?: string | null;
    removedAt?: string | null;

    createdAt: string;
    updatedAt: string;
};

export type AutomationScriptGeneration = {
    id: string;
    testCaseId: string;
    workItemId: string;
    requestedById: string;

    status: AutomationScriptGenerationStatus;

    framework: AutomationFramework;
    browser?: BrowserTarget | null;
    targetUrl: string;
    environment?: string | null;

    context?: Record<string, unknown> | null;
    pageInspection?: Record<string, unknown> | null;
    warnings?: string[] | null;
    errorMessage?: string | null;

    provider?: string | null;
    model?: string | null;
    promptVersion?: string | null;
    generationMethod?: string | null;
    confidence?: number | null;

    aiTrace?: Record<string, unknown> | null;

    createdAt: string;
    startedAt?: string | null;
    completedAt?: string | null;
    updatedAt: string;

    scripts?: AutomationScript[];
};

export type GenerateAutomationScriptResponse = {
    generation: AutomationScriptGeneration;
    script: AutomationScript | null;
};
export type AnalyticsChartType = "bar" | "line" | "pie" | "table" | "kpi";

export type AnalyticsChartRecommendation = {
    type: AnalyticsChartType;
    x?: string | null;
    y?: string | null;
    series?: string | null;
    reason: string;
};

export type AnalyticsAssistantResponse = {
    question: string;
    needsSql: boolean;
    sql: string | null;
    rows: Record<string, unknown>[];
    chart: AnalyticsChartRecommendation;
    explanation: string;
    insight: string;
    unavailableReason?: string | null;
    scope?: {
        mode: "GLOBAL_ADMIN" | "PROJECT" | "ASSIGNED_PROJECTS";
        projectId?: string | null;
        assignedProjectIds?: string[];
    };
};
export type ProjectOption = {
    id: string;
    name: string;
    description?: string | null;
};
// audit logs
export type AuditAction =
    | "LOGIN"
    | "LOGOUT"
    | "LOGIN_FAILED"
    | "USER_CREATED"
    | "USER_UPDATED"
    | "USER_ACTIVATED"
    | "USER_DEACTIVATED"
    | "PASSWORD_CHANGED"
    | "PASSWORD_RESET_REQUESTED"
    | "PASSWORD_RESET_COMPLETED"
    | "PROFILE_UPDATED"
    | "PROJECT_CREATED"
    | "PROJECT_UPDATED"
    | "PROJECT_DELETED"
    | "PROJECT_MEMBER_ADDED"
    | "PROJECT_MEMBER_REMOVED"
    | "WORK_ITEM_CREATED"
    | "WORK_ITEM_UPDATED"
    | "WORK_ITEM_DELETED"
    | "WORK_ITEM_IMPORTED_JIRA"
    | "WORK_ITEM_IMPORTED_SPEC_DOCUMENT"
    | "TEST_CASE_GENERATION_STARTED"
    | "TEST_CASE_GENERATION_COMPLETED"
    | "TEST_CASE_GENERATION_FAILED"
    | "TEST_CASE_APPROVED"
    | "TEST_CASE_DECLINED"
    | "TEST_CASE_EDITED"
    | "AUTOMATION_SCRIPT_GENERATION_STARTED"
    | "AUTOMATION_SCRIPT_GENERATION_COMPLETED"
    | "AUTOMATION_SCRIPT_GENERATION_FAILED"
    | "AUTOMATION_SCRIPT_APPROVED"
    | "AUTOMATION_SCRIPT_DECLINED"
    | "AUTOMATION_SCRIPT_EDITED"
    | "AUTOMATION_SCRIPT_REMOVED"
    | "AUTOMATION_SCRIPT_DOWNLOADED"
    | "SCRIPT_EXECUTION_STARTED"
    | "SCRIPT_EXECUTION_PASSED"
    | "SCRIPT_EXECUTION_FAILED"
    | "SCRIPT_EXECUTION_TIMED_OUT"
    | "SCRIPT_EXECUTION_CANCELED"
    | "DEFECT_REPORT_CREATED"
    | "DEFECT_REPORT_UPDATED"
    | "DEFECT_REPORT_PDF_DOWNLOADED"
    | "TEST_SUITE_REPORT_CREATED"
    | "TEST_SUITE_REPORT_PDF_DOWNLOADED"
    | "SCHEDULED_RUN_CREATED"
    | "SCHEDULED_RUN_UPDATED"
    | "SCHEDULED_RUN_PAUSED"
    | "SCHEDULED_RUN_RESUMED"
    | "SCHEDULED_RUN_DISABLED"
    | "ANALYTICS_QUESTION_ASKED";

export type AuditEntityType =
    | "AUTH"
    | "USER"
    | "PROJECT"
    | "PROJECT_MEMBER"
    | "WORK_ITEM"
    | "JIRA"
    | "SPEC_DOCUMENT"
    | "TEST_CASE"
    | "TEST_CASE_GENERATION"
    | "AUTOMATION_SCRIPT"
    | "AUTOMATION_SCRIPT_GENERATION"
    | "SCRIPT_EXECUTION"
    | "DEFECT_REPORT"
    | "TEST_SUITE_REPORT"
    | "SCHEDULED_TEST_RUN"
    | "ANALYTICS_ASSISTANT";

export type AuditSeverity = "INFO" | "WARNING" | "CRITICAL";

export type AuditLog = {
    id: string;

    actorId?: string | null;
    actorEmail?: string | null;
    actorName?: string | null;
    actorRole?: Role | null;

    action: AuditAction;
    entityType: AuditEntityType;
    entityId?: string | null;
    projectId?: string | null;

    message: string;
    severity: AuditSeverity;

    ipAddress?: string | null;
    userAgent?: string | null;

    success: boolean;

    before?: unknown;
    after?: unknown;
    metadata?: unknown;

    createdAt: string;

    actor?: {
        id: string;
        fullName: string;
        email: string;
        role: Role;
    } | null;
};

export type AuditLogsResponse = {
    data: AuditLog[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export type AuditLogStats = {
    totalToday: number;
    failedToday: number;
    criticalToday: number;
    loginFailedToday: number;
    recentCritical: AuditLog[];
};
export type TesterDashboardStats = {
    cards: {
        projects: number;
        workItems: number;
        testCases: number;
        automationScripts: number;
        executions: number;
        scheduledRuns: number;
        analyticsAssistant: number;
    };
    quality: {
        approvedTestCases: number;
        pendingTestCases: number;
        approvedAutomationScripts: number;
        passedExecutions: number;
        failedExecutions: number;
        passRate: number;
    };
    workItems: {
        ready: number;
        analyzed: number;
        failed: number;
    };
    recentProjects: {
        id: string;
        name: string;
        description?: string | null;
        workItemCount: number;
        updatedAt: string;
    }[];
};

