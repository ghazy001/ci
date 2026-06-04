"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    FileCode2,
    Filter,
    Loader2,
    RefreshCw,
    Search,
    Settings2,
    ShieldCheck,
    Sparkles,
    XCircle,
} from "lucide-react";

import { automationScriptService } from "@/lib/automation-script.service";
import { testCaseService } from "@/lib/test-case.service";
import type {
    AutomationScript,
    AutomationScriptGeneration,
    GenerateAutomationScriptPayload,
    TestCase,
    TestCaseGeneration,
    TestCasePriority,
    TestCaseType,
} from "@/lib/types";
import AutomationScriptCard from "@/components/automation-scripts/automation-script-card";
import GenerateScriptModal from "@/components/automation-scripts/generate-script-modal";

type Props = { workItemId: string };
type TestCaseDraft = Omit<Partial<TestCase>, "preconditions" | "tags"> & {
    preconditions?: string[];
    tags?: string[];
};
type StatusFilter = "ALL" | TestCase["status"];
type TypeFilter = "ALL" | TestCaseType;
type PriorityFilter = "ALL" | TestCasePriority;
type ScriptFilter = "ALL" | "WITH_SCRIPTS" | "WITHOUT_SCRIPTS";
type SortKey = "priority" | "status" | "title" | "type";

const typeLabels: Record<TestCaseType, string> = {
    FUNCTIONAL: "Functional",
    VALIDATION: "Validation",
    NEGATIVE: "Negative",
    EDGE_CASE: "Edge case",
    SECURITY: "Security",
    UI: "UI",
    INTEGRATION: "Integration",
    REGRESSION: "Regression",
};

const priorityLabels: Record<TestCasePriority, string> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
};

const priorityRank: Record<TestCasePriority, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
};

const statusRank: Record<TestCase["status"], number> = {
    GENERATED: 1,
    EDITED: 2,
    APPROVED: 3,
    DECLINED: 4,
};

export default function TestCaseGenerationPanel({ workItemId }: Props) {
    const [testCases, setTestCases] = useState<TestCase[]>([]);
    const [latestGeneration, setLatestGeneration] = useState<TestCaseGeneration | null>(null);
    const [generationHistory, setGenerationHistory] = useState<TestCaseGeneration[]>([]);

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [polling, setPolling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generationTimedOut, setGenerationTimedOut] = useState(false);

    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
    const [scriptsOpenIds, setScriptsOpenIds] = useState<Record<string, boolean>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<TestCaseDraft>({});

    const [maxTestCases, setMaxTestCases] = useState(10);
    const [includeNegativeTests, setIncludeNegativeTests] = useState(true);
    const [includeEdgeCases, setIncludeEdgeCases] = useState(true);
    const [includeSecurityTests, setIncludeSecurityTests] = useState(false);
    const [useRag, setUseRag] = useState(true);
    const [language, setLanguage] = useState("fr");

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
    const [scriptFilter, setScriptFilter] = useState<ScriptFilter>("ALL");
    const [sortBy, setSortBy] = useState<SortKey>("priority");

    const [scriptModalTestCase, setScriptModalTestCase] = useState<TestCase | null>(null);
    const [scriptGenerating, setScriptGenerating] = useState(false);
    const [scriptsByTestCase, setScriptsByTestCase] = useState<Record<string, AutomationScript[]>>({});
    const [scriptGenerationsByTestCase, setScriptGenerationsByTestCase] = useState<Record<string, AutomationScriptGeneration | null>>({});
    const [scriptGenerationTimedOutByTestCase, setScriptGenerationTimedOutByTestCase] = useState<Record<string, boolean>>({});

    const pollingCancelledRef = useRef(false);

    const approvedCount = useMemo(() => testCases.filter((tc) => tc.status === "APPROVED").length, [testCases]);
    const declinedCount = useMemo(() => testCases.filter((tc) => tc.status === "DECLINED").length, [testCases]);
    const pendingCount = useMemo(
        () => testCases.filter((tc) => tc.status === "GENERATED" || tc.status === "EDITED").length,
        [testCases],
    );
    const automationReadyCount = useMemo(
        () => testCases.filter((tc) => (scriptsByTestCase[tc.id] || []).length > 0).length,
        [scriptsByTestCase, testCases],
    );

    const filteredTestCases = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return testCases
            .filter((testCase) => {
                if (statusFilter !== "ALL" && testCase.status !== statusFilter) return false;
                if (typeFilter !== "ALL" && testCase.type !== typeFilter) return false;
                if (priorityFilter !== "ALL" && testCase.priority !== priorityFilter) return false;

                const scriptsCount = scriptsByTestCase[testCase.id]?.length || 0;
                if (scriptFilter === "WITH_SCRIPTS" && scriptsCount === 0) return false;
                if (scriptFilter === "WITHOUT_SCRIPTS" && scriptsCount > 0) return false;

                if (!query) return true;

                const searchableContent = [
                    testCase.title,
                    testCase.objective,
                    testCase.expectedResult,
                    testCase.status,
                    typeLabels[testCase.type],
                    priorityLabels[testCase.priority],
                    ...(testCase.tags || []),
                    ...(testCase.preconditions || []),
                    ...(testCase.steps || []).flatMap((step) => [step.action, step.expected || ""]),
                    ...(testCase.coverage?.acceptanceCriteria || []),
                    ...(testCase.coverage?.businessRules || []),
                ]
                    .join(" ")
                    .toLowerCase();

                return searchableContent.includes(query);
            })
            .sort((a, b) => {
                if (sortBy === "priority") return priorityRank[b.priority] - priorityRank[a.priority];
                if (sortBy === "status") return statusRank[a.status] - statusRank[b.status];
                if (sortBy === "type") return typeLabels[a.type].localeCompare(typeLabels[b.type]);
                return a.title.localeCompare(b.title);
            });
    }, [priorityFilter, scriptFilter, scriptsByTestCase, searchTerm, sortBy, statusFilter, testCases, typeFilter]);

    const hasActiveFilters =
        searchTerm.trim().length > 0 ||
        statusFilter !== "ALL" ||
        typeFilter !== "ALL" ||
        priorityFilter !== "ALL" ||
        scriptFilter !== "ALL";

    useEffect(() => {
        pollingCancelledRef.current = false;
        loadData();

        return () => {
            pollingCancelledRef.current = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workItemId]);

    const loadScriptsForTestCase = async (testCaseId: string) => {
        const [scripts, latestScriptGeneration] = await Promise.all([
            automationScriptService.getByTestCase(testCaseId),
            automationScriptService.getLatestGenerationByTestCase(testCaseId),
        ]);

        setScriptsByTestCase((prev) => ({ ...prev, [testCaseId]: scripts }));
        setScriptGenerationsByTestCase((prev) => ({ ...prev, [testCaseId]: latestScriptGeneration }));

        return latestScriptGeneration;
    };

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [casesData, generationData, historyData] = await Promise.all([
                testCaseService.getByWorkItem(workItemId),
                testCaseService.getLatestGeneration(workItemId),
                testCaseService.getGenerationHistory(workItemId),
            ]);

            setTestCases(casesData);
            setLatestGeneration(generationData);
            setGenerationHistory(historyData);

            await Promise.all(casesData.filter((tc) => tc.status === "APPROVED").map((tc) => loadScriptsForTestCase(tc.id)));
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to load AI test cases.");
        } finally {
            setLoading(false);
        }
    };

    const refreshDataSilently = async () => {
        const [casesData, generationData, historyData] = await Promise.all([
            testCaseService.getByWorkItem(workItemId),
            testCaseService.getLatestGeneration(workItemId),
            testCaseService.getGenerationHistory(workItemId),
        ]);

        setTestCases(casesData);
        setLatestGeneration(generationData);
        setGenerationHistory(historyData);

        return generationData;
    };

    const pollLatestGeneration = async () => {
        setPolling(true);

        try {
            const maxAttempts = 45;

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                if (pollingCancelledRef.current) return;

                const generation = await testCaseService.getLatestGeneration(workItemId);
                setLatestGeneration(generation);

                const historyData = await testCaseService.getGenerationHistory(workItemId);
                setGenerationHistory(historyData);

                if (!generation || generation.status !== "PROCESSING") {
                    await refreshDataSilently();
                    return;
                }

                await new Promise((resolve) => setTimeout(resolve, 2000));
            }

            setGenerationTimedOut(true);
            await refreshDataSilently();
        } finally {
            setPolling(false);
        }
    };

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            setGenerationTimedOut(false);
            setError(null);

            const safeMaxTestCases = Math.min(Math.max(maxTestCases, 1), 30);

            await testCaseService.generateForWorkItem(workItemId, {
                maxTestCases: safeMaxTestCases,
                includePositiveTests: true,
                includeNegativeTests,
                includeEdgeCases,
                includeSecurityTests,
                useRag,
                language,
            });

            await pollLatestGeneration();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to generate test cases.");
            await loadData();
        } finally {
            setGenerating(false);
        }
    };

    const handleApprove = async (testCaseId: string) => {
        try {
            setError(null);
            const updated = await testCaseService.approve(testCaseId);
            replaceTestCase(updated);
            await loadScriptsForTestCase(testCaseId);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to approve test case.");
        }
    };

    const handleDecline = async (testCaseId: string) => {
        try {
            setError(null);
            replaceTestCase(await testCaseService.decline(testCaseId));
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to decline test case.");
        }
    };

    const startEdit = (testCase: TestCase) => {
        setEditingId(testCase.id);
        setDraft({
            title: testCase.title,
            objective: testCase.objective,
            type: testCase.type,
            priority: testCase.priority,
            preconditions: testCase.preconditions || [],
            steps: testCase.steps || [],
            expectedResult: testCase.expectedResult,
            testData: testCase.testData || {},
            tags: testCase.tags || [],
            coverage: testCase.coverage || { acceptanceCriteria: [], businessRules: [] },
        });
        setExpandedIds((prev) => ({ ...prev, [testCase.id]: true }));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setDraft({});
    };

    const saveEdit = async (testCaseId: string) => {
        try {
            setError(null);
            replaceTestCase(await testCaseService.update(testCaseId, draft));
            cancelEdit();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to update test case.");
        }
    };

    const replaceTestCase = (updated: TestCase) => {
        setTestCases((prev) => prev.map((tc) => (tc.id === updated.id ? updated : tc)));
    };

    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter("ALL");
        setTypeFilter("ALL");
        setPriorityFilter("ALL");
        setScriptFilter("ALL");
        setSortBy("priority");
    };

    const handleRetryLatestGeneration = async () => {
        if (!latestGeneration) return;

        try {
            setGenerating(true);
            setGenerationTimedOut(false);
            setError(null);
            await testCaseService.retryGeneration(latestGeneration.id);
            await pollLatestGeneration();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to retry generation.");
            await loadData();
        } finally {
            setGenerating(false);
        }
    };

    const handleMarkLatestGenerationFailed = async () => {
        if (!latestGeneration) return;

        try {
            setError(null);
            await testCaseService.markGenerationFailed(latestGeneration.id);
            setGenerationTimedOut(false);
            await loadData();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to mark generation as failed.");
        }
    };

    const pollLatestScriptGeneration = async (testCaseId: string) => {
        const maxAttempts = 60;
        setScriptGenerationTimedOutByTestCase((prev) => ({ ...prev, [testCaseId]: false }));

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const latest = await automationScriptService.getLatestGenerationByTestCase(testCaseId);
            setScriptGenerationsByTestCase((prev) => ({ ...prev, [testCaseId]: latest }));

            if (!latest || latest.status !== "PROCESSING") {
                await loadScriptsForTestCase(testCaseId);
                return;
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        setScriptGenerationTimedOutByTestCase((prev) => ({ ...prev, [testCaseId]: true }));
        await loadScriptsForTestCase(testCaseId);
    };

    const handleGenerateScript = async (testCase: TestCase, payload: GenerateAutomationScriptPayload) => {
        try {
            setScriptGenerating(true);
            setError(null);
            await automationScriptService.generateForTestCase(testCase.id, payload);
            setScriptModalTestCase(null);
            setScriptsOpenIds((prev) => ({ ...prev, [testCase.id]: true }));
            await pollLatestScriptGeneration(testCase.id);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to generate automation script.");
        } finally {
            setScriptGenerating(false);
        }
    };

    const handleRetryScriptGeneration = async (testCaseId: string, generationId: string) => {
        try {
            setScriptGenerating(true);
            setError(null);
            setScriptGenerationTimedOutByTestCase((prev) => ({ ...prev, [testCaseId]: false }));
            await automationScriptService.retryGeneration(generationId);
            await pollLatestScriptGeneration(testCaseId);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to retry automation script generation.");
            await loadScriptsForTestCase(testCaseId);
        } finally {
            setScriptGenerating(false);
        }
    };

    const handleMarkScriptGenerationFailed = async (testCaseId: string, generationId: string) => {
        try {
            setError(null);
            await automationScriptService.markGenerationFailed(generationId);
            setScriptGenerationTimedOutByTestCase((prev) => ({ ...prev, [testCaseId]: false }));
            await loadScriptsForTestCase(testCaseId);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to mark automation script generation as failed.");
        }
    };

    const replaceAutomationScript = (script: AutomationScript) => {
        setScriptsByTestCase((prev) => ({
            ...prev,
            [script.testCaseId]: (prev[script.testCaseId] || []).map((item) => (item.id === script.id ? script : item)),
        }));
    };

    const removeAutomationScriptFromState = (script: AutomationScript) => {
        setScriptsByTestCase((prev) => ({
            ...prev,
            [script.testCaseId]: (prev[script.testCaseId] || []).filter((item) => item.id !== script.id),
        }));
    };

    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-200/60 bg-white p-8 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--cap-blue)]" />
                    <span>Loading AI test cases…</span>
                </div>
            </div>
        );
    }

    const isBusy = generating || polling;
    const isProcessing = latestGeneration?.status === "PROCESSING";

    return (
        <>
            {/* ─── Main Panel ─────────────────────────────────────────── */}
            <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_4px_0_rgb(0,0,0,0.05),0_6px_20px_0_rgb(0,0,0,0.04)]">
                {/* Top accent line */}
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--cap-blue)] to-transparent" />

                <div className="space-y-6 px-6 py-7 sm:px-7 lg:px-8">

                    {/* ── Header ─────────────────────────────────────── */}
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        {/* Title block */}
                        <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/12">
                                <ShieldCheck size={19} strokeWidth={1.75} />
                            </div>
                            <div className="min-w-0 pt-0.5">
                                <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-[var(--cap-blue)]">
                                    Test Case Review
                                </p>
                                <h2 className="mt-1 text-[1.375rem] font-bold leading-tight tracking-[-0.02em] text-slate-900">
                                    Review Board
                                </h2>
                                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-400">
                                    Generate focused test cases, review them one by one, then create automation only for approved cases.
                                </p>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Ghost / secondary buttons */}
                            <GhostButton onClick={() => setShowSettings((v) => !v)} icon={<Settings2 size={14} strokeWidth={2} />}>
                                Settings
                            </GhostButton>
                            <GhostButton
                                onClick={() => setShowHistory((v) => !v)}
                                icon={
                                    <ChevronDown
                                        className={`h-[15px] w-[15px] transition-transform duration-200 ${showHistory ? "rotate-180" : ""}`}
                                    />
                                }
                            >
                                History
                            </GhostButton>

                            {/* Retry failed — danger ghost */}
                            {latestGeneration?.status === "FAILED" && (
                                <button
                                    type="button"
                                    onClick={handleRetryLatestGeneration}
                                    disabled={isBusy}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200/80 bg-red-50 px-3.5 text-[13px] font-medium text-red-600 transition-all hover:border-red-300 hover:bg-red-100 hover:shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Retry failed
                                </button>
                            )}

                            {/* Primary CTA */}
                            <PrimaryButton onClick={handleGenerate} disabled={isBusy} loading={isBusy}>
                                {isBusy ? (
                                    isProcessing ? "Processing…" : "Generating…"
                                ) : testCases.length > 0 ? (
                                    <><RefreshCw className="h-3.5 w-3.5" />Generate again</>
                                ) : (
                                    <><Sparkles className="h-3.5 w-3.5" />Generate test cases</>
                                )}
                            </PrimaryButton>
                        </div>
                    </div>

                    {/* ── Generation status strip ─────────────────────── */}
                    {latestGeneration && (
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-xs">
                            <GenerationStatusBadge status={latestGeneration.status} />
                            {latestGeneration.provider && (
                                <StatusMeta>{latestGeneration.provider} / {latestGeneration.model}</StatusMeta>
                            )}
                            {typeof latestGeneration.confidence === "number" && (
                                <StatusMeta>Confidence {Math.round(latestGeneration.confidence * 100)}%</StatusMeta>
                            )}
                            {latestGeneration.generationMethod && (
                                <span className="rounded-full bg-[var(--cap-blue)]/8 px-3 py-1 font-medium text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/15">
                                    {latestGeneration.generationMethod.includes("rag") ? "RAG enabled" : "Standard generation"}
                                </span>
                            )}
                        </div>
                    )}

                    {/* ── Settings panel ─────────────────────────────── */}
                    {showSettings && (
                        <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-5">
                            <div className="mb-4 border-b border-slate-100 pb-3">
                                <h3 className="text-[13px] font-semibold text-slate-800">Generation settings</h3>
                                <p className="mt-0.5 text-xs text-slate-400">Hidden by default to keep the review page focused.</p>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <label className="space-y-1.5">
                                    <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Max test cases</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={30}
                                        value={maxTestCases}
                                        onChange={(e) => setMaxTestCases(Number(e.target.value))}
                                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[var(--cap-blue)]/50 focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                    />
                                </label>
                                <label className="space-y-1.5">
                                    <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Language</span>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[var(--cap-blue)]/50 focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                    >
                                        <option value="fr">French</option>
                                        <option value="en">English</option>
                                    </select>
                                </label>
                                <ToggleOption label="Use project context / RAG" checked={useRag} onChange={setUseRag} />
                                <ToggleOption label="Negative tests" checked={includeNegativeTests} onChange={setIncludeNegativeTests} />
                                <ToggleOption label="Edge cases" checked={includeEdgeCases} onChange={setIncludeEdgeCases} />
                                <ToggleOption label="Security tests" checked={includeSecurityTests} onChange={setIncludeSecurityTests} />
                            </div>
                        </div>
                    )}

                    {/* ── Banners ─────────────────────────────────────── */}
                    {isProcessing && (
                        <InfoBanner tone="amber" icon={<Loader2 className="h-4 w-4 animate-spin" />} title="AI generation is running">
                            The board refreshes automatically when the new test cases are ready.
                        </InfoBanner>
                    )}

                    {generationTimedOut && latestGeneration?.status === "PROCESSING" && (
                        <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 h-[15px] w-[15px] shrink-0 text-orange-600" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-semibold text-orange-800">Generation is taking longer than expected.</p>
                                    <p className="mt-1 text-xs leading-relaxed text-orange-700">
                                        The AI job may still finish, but you can check again or mark it as failed before retrying.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <SmallGhostButton
                                            onClick={pollLatestGeneration}
                                            disabled={polling}
                                            className="border-orange-200 text-orange-700 hover:bg-orange-100"
                                        >
                                            Check again
                                        </SmallGhostButton>
                                        <SmallGhostButton
                                            onClick={handleMarkLatestGenerationFailed}
                                            className="border-red-200 text-red-600 hover:bg-red-50"
                                        >
                                            Mark as failed
                                        </SmallGhostButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <InfoBanner tone="red" icon={<AlertCircle className="h-4 w-4" />} title="Something went wrong">
                            {error}
                        </InfoBanner>
                    )}

                    {latestGeneration?.warnings && latestGeneration.warnings.length > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                            <div className="flex items-center gap-2 text-[13px] font-semibold text-amber-800">
                                <AlertCircle className="h-[15px] w-[15px]" />
                                AI warnings
                            </div>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-amber-700">
                                {latestGeneration.warnings.map((w, i) => <li key={`${w}-${i}`}>{w}</li>)}
                            </ul>
                        </div>
                    )}

                    {/* ── History ─────────────────────────────────────── */}
                    {showHistory && (
                        <GenerationHistory
                            generationHistory={generationHistory}
                            isBusy={isBusy}
                            onRetry={async (generationId) => {
                                try {
                                    setGenerating(true);
                                    setGenerationTimedOut(false);
                                    setError(null);
                                    await testCaseService.retryGeneration(generationId);
                                    await pollLatestGeneration();
                                } catch (err: any) {
                                    setError(err?.response?.data?.message || "Failed to retry generation.");
                                    await loadData();
                                } finally {
                                    setGenerating(false);
                                }
                            }}
                        />
                    )}

                    {/* ── Stat cards ──────────────────────────────────── */}
                    {testCases.length > 0 && (
                        <>
                            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
                                <StatCard label="Pending review" value={pendingCount} icon={<AlertCircle size={17} strokeWidth={2} />} />
                                <StatCard label="Approved" value={approvedCount} icon={<CheckCircle2 size={17} strokeWidth={2} />} />
                                <StatCard label="Declined" value={declinedCount} icon={<XCircle size={17} strokeWidth={2} />} />
                                <StatCard label="Automation ready" value={automationReadyCount} icon={<FileCode2 size={17} strokeWidth={2} />} />
                            </div>

                            {/* ── Filter bar ─────────────────────────────── */}
                            <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    {/* Search */}
                                    <div className="relative flex-1">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search test cases, steps, expected result…"
                                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[var(--cap-blue)]/40 focus:bg-white focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                        />
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <FilterSelect
                                            label="Status"
                                            value={statusFilter}
                                            onChange={(v) => setStatusFilter(v as StatusFilter)}
                                            options={[
                                                { label: "All statuses", value: "ALL" },
                                                { label: "Generated", value: "GENERATED" },
                                                { label: "Edited", value: "EDITED" },
                                                { label: "Approved", value: "APPROVED" },
                                                { label: "Declined", value: "DECLINED" },
                                            ]}
                                            compact
                                        />
                                        <FilterSelect
                                            label="Sort"
                                            value={sortBy}
                                            onChange={(v) => setSortBy(v as SortKey)}
                                            options={[
                                                { label: "Priority", value: "priority" },
                                                { label: "Status", value: "status" },
                                                { label: "Title", value: "title" },
                                                { label: "Type", value: "type" },
                                            ]}
                                            compact
                                        />
                                        <GhostButton
                                            onClick={() => setShowFilters((v) => !v)}
                                            icon={<Filter size={13} strokeWidth={2} />}
                                        >
                                            More
                                        </GhostButton>
                                        {hasActiveFilters && (
                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {showFilters && (
                                    <div className="mt-3 grid gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 md:grid-cols-3">
                                        <FilterSelect
                                            label="Priority"
                                            value={priorityFilter}
                                            onChange={(v) => setPriorityFilter(v as PriorityFilter)}
                                            options={[
                                                { label: "All priorities", value: "ALL" },
                                                { label: "Critical", value: "CRITICAL" },
                                                { label: "High", value: "HIGH" },
                                                { label: "Medium", value: "MEDIUM" },
                                                { label: "Low", value: "LOW" },
                                            ]}
                                        />
                                        <FilterSelect
                                            label="Type"
                                            value={typeFilter}
                                            onChange={(v) => setTypeFilter(v as TypeFilter)}
                                            options={[
                                                { label: "All types", value: "ALL" },
                                                ...Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
                                            ]}
                                        />
                                        <FilterSelect
                                            label="Scripts"
                                            value={scriptFilter}
                                            onChange={(v) => setScriptFilter(v as ScriptFilter)}
                                            options={[
                                                { label: "All scripts", value: "ALL" },
                                                { label: "With scripts", value: "WITH_SCRIPTS" },
                                                { label: "Without scripts", value: "WITHOUT_SCRIPTS" },
                                            ]}
                                        />
                                    </div>
                                )}

                                <p className="mt-3 text-[11px] text-slate-400">
                                    Showing <span className="font-semibold text-slate-600">{filteredTestCases.length}</span> of{" "}
                                    <span className="font-semibold text-slate-600">{testCases.length}</span> test cases.
                                </p>
                            </div>
                        </>
                    )}

                    {/* ── Test Case list ──────────────────────────────── */}
                    <div className="space-y-3">
                        {testCases.length === 0 ? (
                            <EmptyInitialState isProcessing={isProcessing} />
                        ) : filteredTestCases.length === 0 ? (
                            <EmptyFilterState onClear={clearFilters} />
                        ) : (
                            filteredTestCases.map((testCase, index) => {
                                const isExpanded = !!expandedIds[testCase.id];
                                const isEditing = editingId === testCase.id;
                                const scripts = scriptsByTestCase[testCase.id] || [];
                                const scriptsOpen = !!scriptsOpenIds[testCase.id];

                                return (
                                    <article
                                        key={testCase.id}
                                        className="group overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50/60 transition-all duration-200 hover:-translate-y-px hover:border-[var(--cap-blue)]/25 hover:bg-white hover:shadow-[0_4px_16px_0_rgb(0,0,0,0.07)]"
                                    >
                                        <div className="p-5">
                                            {/* Card header row */}
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                {/* Left: badges + title */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="inline-flex rounded-md bg-[var(--cap-blue)]/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/15">
                                                            TC-{String(index + 1).padStart(2, "0")}
                                                        </span>
                                                        <StatusBadge status={testCase.status} />
                                                        <PriorityBadge priority={testCase.priority} />
                                                        <Badge>{typeLabels[testCase.type]}</Badge>
                                                        {scripts.length > 0 && (
                                                            <span className="rounded-full bg-[var(--cap-blue)]/8 px-2.5 py-0.5 text-[11px] font-medium text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/15">
                                                                {scripts.length} script{scripts.length === 1 ? "" : "s"}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {isEditing ? (
                                                        <input
                                                            value={draft.title || ""}
                                                            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                                                            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[var(--cap-blue)]/40 focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                                        />
                                                    ) : (
                                                        <h3 className="mt-2.5 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-slate-900">
                                                            {testCase.title}
                                                        </h3>
                                                    )}

                                                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                                                        {testCase.objective || testCase.expectedResult || "No summary available."}
                                                    </p>
                                                </div>

                                                {/* Right: action buttons */}
                                                <div className="flex flex-wrap items-start gap-1.5 lg:justify-end">
                                                    {/* Expand toggle */}
                                                    <SmallGhostButton
                                                        onClick={() => setExpandedIds((prev) => ({ ...prev, [testCase.id]: !prev[testCase.id] }))}
                                                        className="border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                                                        icon={isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                    >
                                                        {isExpanded ? "Hide" : "Details"}
                                                    </SmallGhostButton>

                                                    {/* Edit */}
                                                    {!isEditing && testCase.status !== "DECLINED" && (
                                                        <SmallGhostButton
                                                            onClick={() => startEdit(testCase)}
                                                            className="border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                                                        >
                                                            Edit
                                                        </SmallGhostButton>
                                                    )}

                                                    {/* Save / Cancel */}
                                                    {isEditing ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => saveEdit(testCase.id)}
                                                                className="h-8 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white transition hover:bg-black active:scale-[0.97]"
                                                            >
                                                                Save
                                                            </button>
                                                            <SmallGhostButton
                                                                onClick={cancelEdit}
                                                                className="border-slate-200 text-slate-600 hover:border-slate-300"
                                                            >
                                                                Cancel
                                                            </SmallGhostButton>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/* Approve */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleApprove(testCase.id)}
                                                                disabled={testCase.status === "APPROVED"}
                                                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55"
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                Approve
                                                            </button>
                                                            {/* Decline */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDecline(testCase.id)}
                                                                disabled={testCase.status === "DECLINED"}
                                                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-600 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55"
                                                            >
                                                                <XCircle className="h-3.5 w-3.5" />
                                                                Decline
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expanded details */}
                                            {(isExpanded || isEditing) && (
                                                <div className="mt-5 space-y-5 border-t border-slate-100 pt-5">
                                                    <EditableTextarea
                                                        label="Objective"
                                                        value={isEditing ? draft.objective || "" : testCase.objective || ""}
                                                        editing={isEditing}
                                                        onChange={(v) => setDraft((prev) => ({ ...prev, objective: v }))}
                                                    />
                                                    <StepsBlock
                                                        testCaseId={testCase.id}
                                                        steps={(isEditing ? draft.steps || [] : testCase.steps || []) as TestCase["steps"]}
                                                        isEditing={isEditing}
                                                        draftSteps={(draft.steps || []) as TestCase["steps"]}
                                                        setDraft={setDraft}
                                                    />
                                                    <EditableTextarea
                                                        label="Expected result"
                                                        value={isEditing ? draft.expectedResult || "" : testCase.expectedResult}
                                                        editing={isEditing}
                                                        onChange={(v) => setDraft((prev) => ({ ...prev, expectedResult: v }))}
                                                    />
                                                    {testCase.coverage && (
                                                        <div className="grid gap-3 md:grid-cols-2">
                                                            <CoverageBlock title="Acceptance criteria" items={testCase.coverage.acceptanceCriteria || []} />
                                                            <CoverageBlock title="Business rules" items={testCase.coverage.businessRules || []} />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Automation sub-section — approved only */}
                                            {testCase.status === "APPROVED" && (
                                                <div className="mt-5 border-t border-slate-100 pt-4">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div>
                                                            <h4 className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Automation</h4>
                                                            <p className="mt-0.5 text-[11px] text-slate-400">Scripts stay collapsed to keep the review board readable.</p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            <SmallGhostButton
                                                                onClick={() => setScriptsOpenIds((prev) => ({ ...prev, [testCase.id]: !prev[testCase.id] }))}
                                                                icon={scriptsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                                className="border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                                                            >
                                                                {scriptsOpen ? "Hide scripts" : `Scripts (${scripts.length})`}
                                                            </SmallGhostButton>
                                                            <button
                                                                type="button"
                                                                onClick={() => setScriptModalTestCase(testCase)}
                                                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--cap-blue)] px-3.5 text-xs font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"
                                                            >
                                                                <Sparkles className="h-3.5 w-3.5" />
                                                                Generate script
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {scriptsOpen && (
                                                        <div className="mt-3.5 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                                                            {scriptGenerationsByTestCase[testCase.id]?.status === "PROCESSING" && (
                                                                <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700">
                                                                    <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
                                                                    Script generation is running. The script will appear automatically when ready.
                                                                </div>
                                                            )}
                                                            {scriptGenerationTimedOutByTestCase[testCase.id] && scriptGenerationsByTestCase[testCase.id]?.status === "PROCESSING" && (
                                                                <div className="rounded-lg border border-orange-200 bg-orange-50/80 p-3">
                                                                    <div className="flex items-start gap-2">
                                                                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-600" />
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-xs font-semibold text-orange-800">Script generation is taking longer than expected.</p>
                                                                            <p className="mt-1 text-[11px] text-orange-700">The job may still finish, or you can mark it as failed.</p>
                                                                            <div className="mt-2.5 flex flex-wrap gap-2">
                                                                                <SmallGhostButton onClick={() => pollLatestScriptGeneration(testCase.id)} className="border-orange-200 text-orange-700 hover:bg-orange-100">Check again</SmallGhostButton>
                                                                                <SmallGhostButton onClick={() => { const g = scriptGenerationsByTestCase[testCase.id]; if (!g) return; handleMarkScriptGenerationFailed(testCase.id, g.id); }} className="border-red-200 text-red-600 hover:bg-red-50">Mark as failed</SmallGhostButton>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {scriptGenerationsByTestCase[testCase.id]?.status === "FAILED" && (
                                                                <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                                                                    <p className="text-xs font-semibold text-red-700">Automation script generation failed.</p>
                                                                    <p className="mt-1 text-[11px] text-red-600">{scriptGenerationsByTestCase[testCase.id]?.errorMessage || "Script generation failed."}</p>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { const g = scriptGenerationsByTestCase[testCase.id]; if (!g) return; handleRetryScriptGeneration(testCase.id, g.id); }}
                                                                        disabled={scriptGenerating}
                                                                        className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                                                                    >
                                                                        <RefreshCw className="h-3 w-3" />
                                                                        Retry script generation
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {scripts.length === 0 ? (
                                                                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-[11px] text-slate-400">
                                                                    No automation scripts generated for this test case yet.
                                                                </div>
                                                            ) : (
                                                                scripts.map((script) => (
                                                                    <AutomationScriptCard
                                                                        key={script.id}
                                                                        script={script}
                                                                        onChanged={replaceAutomationScript}
                                                                        onRemoved={removeAutomationScriptFromState}
                                                                    />
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </div>
                </div>
            </section>

            {/* ── Script modal ─────────────────────────────────────────── */}
            <GenerateScriptModal
                open={!!scriptModalTestCase}
                testCase={scriptModalTestCase}
                loading={scriptGenerating}
                onClose={() => setScriptModalTestCase(null)}
                onSubmit={async (payload) => {
                    if (!scriptModalTestCase) return;
                    await handleGenerateScript(scriptModalTestCase, payload);
                }}
            />
        </>
    );
}

/* ─────────────────────────────────────────────────────────────
   Shared primitive components
──────────────────────────────────────────────────────────────── */

/** Solid primary CTA button */
function PrimaryButton({
                           children,
                           onClick,
                           disabled,
                           loading,
                       }: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-[var(--cap-blue)] px-4 text-[13px] font-semibold text-white shadow-[0_1px_3px_0_rgb(0,0,0,0.14)] transition-all hover:brightness-110 hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55"
        >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {children}
        </button>
    );
}

/** Standard ghost / secondary button (header-level) */
function GhostButton({
                         children,
                         onClick,
                         icon,
                         className = "",
                     }: {
    children: React.ReactNode;
    onClick: () => void;
    icon?: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-600 transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow-sm active:scale-[0.97] ${className}`}
        >
            {icon}
            {children}
        </button>
    );
}

/** Small ghost button used inside cards and banners */
function SmallGhostButton({
                              children,
                              onClick,
                              disabled,
                              icon,
                              className = "",
                          }: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    icon?: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border bg-white px-3 text-xs font-medium transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
        >
            {icon}
            {children}
        </button>
    );
}

/* ─────────────────────────────────────────────────────────────
   Sub-components
──────────────────────────────────────────────────────────────── */

function StatusMeta({ children }: { children: React.ReactNode }) {
    return (
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
            {children}
        </span>
    );
}

function InfoBanner({
                        tone,
                        icon,
                        title,
                        children,
                    }: {
    tone: "amber" | "red";
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {
    const wrap =
        tone === "red"
            ? "border-red-100 bg-red-50/80 text-red-700"
            : "border-amber-100 bg-amber-50/80 text-amber-700";
    const titleCls = tone === "red" ? "text-red-800" : "text-amber-800";

    return (
        <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${wrap}`}>
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div>
                <p className={`text-[13px] font-semibold ${titleCls}`}>{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed opacity-90">{children}</p>
            </div>
        </div>
    );
}

function GenerationHistory({
                               generationHistory,
                               isBusy,
                               onRetry,
                           }: {
    generationHistory: TestCaseGeneration[];
    isBusy: boolean;
    onRetry: (generationId: string) => Promise<void>;
}) {
    return (
        <div className="rounded-xl border border-slate-200/60 bg-slate-50/70 p-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-[13px] font-semibold text-slate-900">Generation History</h3>
                    <p className="mt-0.5 text-[11px] text-slate-400">Previous AI generation attempts for this work item.</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
                    {generationHistory.length} attempt{generationHistory.length === 1 ? "" : "s"}
                </span>
            </div>

            {generationHistory.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
                    No generation history yet.
                </div>
            ) : (
                <div className="mt-4 space-y-3">
                    {generationHistory.map((generation) => (
                        <div
                            key={generation.id}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]"
                        >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <GenerationStatusBadge status={generation.status} />
                                        {generation.provider && (
                                            <StatusMeta>{generation.provider} / {generation.model}</StatusMeta>
                                        )}
                                        {typeof generation.confidence === "number" && (
                                            <StatusMeta>{Math.round(generation.confidence * 100)}% confidence</StatusMeta>
                                        )}
                                    </div>
                                    <p className="mt-2 text-[11px] text-slate-400">
                                        Created {new Date(generation.createdAt).toLocaleString()}
                                        {generation.completedAt
                                            ? ` · Completed ${new Date(generation.completedAt).toLocaleString()}`
                                            : ""}
                                    </p>
                                    {generation.promptVersion && (
                                        <p className="mt-1 font-mono text-[10.5px] text-slate-400">{generation.promptVersion}</p>
                                    )}
                                </div>
                                <div className="text-right text-xs text-slate-500">
                                    <p className="text-2xl font-bold tabular-nums text-slate-700">{generation.testCases?.length || 0}</p>
                                    <p>test cases</p>
                                </div>
                            </div>
                            {generation.errorMessage && (
                                <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-600">
                                    {generation.errorMessage}
                                </div>
                            )}
                            {generation.warnings && generation.warnings.length > 0 && (
                                <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
                                    <p className="text-xs font-semibold text-amber-700">Warnings</p>
                                    <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-amber-700">
                                        {generation.warnings.map((w, i) => (
                                            <li key={`${generation.id}-warning-${i}`}>{w}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {generation.status === "FAILED" && (
                                <button
                                    type="button"
                                    onClick={() => onRetry(generation.id)}
                                    disabled={isBusy}
                                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Retry this generation
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ToggleOption({
                          label,
                          checked,
                          onChange,
                      }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] transition hover:border-slate-300 hover:shadow-sm">
            <span className="font-medium text-slate-800">{label}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="accent-[var(--cap-blue)]"
            />
        </label>
    );
}

function FilterSelect({
                          label,
                          value,
                          onChange,
                          options,
                          compact = false,
                      }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { label: string; value: string }[];
    compact?: boolean;
}) {
    return (
        <label className={compact ? "min-w-[9rem]" : ""}>
            <span className="sr-only">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-[13px] text-slate-700 outline-none transition focus:border-[var(--cap-blue)]/40 focus:bg-white focus:ring-2 focus:ring-[var(--cap-blue)]/10"
            >
                {options.map((o) => (
                    <option key={`${label}-${o.value}`} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function StatCard({
                      label,
                      value,
                      icon,
                  }: {
    label: string;
    value: number;
    icon: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                    <p className="mt-2 text-[2rem] font-bold tabular-nums leading-none tracking-tight text-slate-900">{value}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/10">
                    {icon}
                </div>
            </div>
        </div>
    );
}

function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
            {children}
        </span>
    );
}

function PriorityBadge({ priority }: { priority: TestCasePriority }) {
    const cls =
        priority === "CRITICAL"
            ? "bg-red-50 text-red-700 ring-red-200"
            : priority === "HIGH"
                ? "bg-orange-50 text-orange-700 ring-orange-200"
                : priority === "MEDIUM"
                    ? "bg-amber-50 text-amber-700 ring-amber-200"
                    : "bg-slate-50 text-slate-600 ring-slate-200";
    return (
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${cls}`}>
            {priorityLabels[priority]}
        </span>
    );
}

function StatusBadge({ status }: { status: TestCase["status"] }) {
    const cls =
        status === "APPROVED"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : status === "DECLINED"
                ? "bg-red-50 text-red-700 ring-red-200"
                : status === "EDITED"
                    ? "bg-blue-50 text-blue-700 ring-blue-200"
                    : "bg-amber-50 text-amber-700 ring-amber-200";
    return (
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${cls}`}>
            {status}
        </span>
    );
}

function GenerationStatusBadge({ status }: { status: TestCaseGeneration["status"] }) {
    const cls =
        status === "COMPLETED"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : status === "FAILED"
                ? "bg-red-50 text-red-700 ring-red-200"
                : status === "PROCESSING"
                    ? "bg-amber-50 text-amber-700 ring-amber-200"
                    : "bg-slate-50 text-slate-600 ring-slate-200";
    return (
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${cls}`}>
            {status}
        </span>
    );
}

function EditableTextarea({
                              label,
                              value,
                              editing,
                              onChange,
                          }: {
    label: string;
    value: string;
    editing: boolean;
    onChange: (v: string) => void;
}) {
    return (
        <div>
            <h4 className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</h4>
            {editing ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--cap-blue)]/40 focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                />
            ) : (
                <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-slate-700">
                    {value || "—"}
                </p>
            )}
        </div>
    );
}

function StepsBlock({
                        testCaseId,
                        steps,
                        isEditing,
                        draftSteps,
                        setDraft,
                    }: {
    testCaseId: string;
    steps: TestCase["steps"];
    isEditing: boolean;
    draftSteps: TestCase["steps"];
    setDraft: React.Dispatch<React.SetStateAction<TestCaseDraft>>;
}) {
    return (
        <div>
            <h4 className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Steps</h4>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {steps.map((step, i) => (
                    <div
                        key={`${testCaseId}-step-${i}`}
                        className="grid gap-3 border-b border-slate-100 p-4 last:border-b-0 md:grid-cols-[40px_1fr]"
                    >
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-[11px] font-bold text-slate-500 ring-1 ring-slate-100">
                            {i + 1}
                        </div>
                        <div className="space-y-2 text-[13px]">
                            {isEditing ? (
                                <input
                                    value={step.action}
                                    onChange={(e) => {
                                        const next = [...draftSteps];
                                        next[i] = { ...next[i], action: e.target.value };
                                        setDraft((prev) => ({ ...prev, steps: next }));
                                    }}
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-[var(--cap-blue)]/40 focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                />
                            ) : (
                                <p className="font-medium text-slate-900">{step.action}</p>
                            )}
                            <div className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
                                <span className="font-semibold text-slate-600">Expected: </span>
                                {isEditing ? (
                                    <input
                                        value={step.expected || ""}
                                        onChange={(e) => {
                                            const next = [...draftSteps];
                                            next[i] = { ...next[i], expected: e.target.value };
                                            setDraft((prev) => ({ ...prev, steps: next }));
                                        }}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 outline-none focus:border-[var(--cap-blue)]/40 focus:ring-2 focus:ring-[var(--cap-blue)]/10"
                                    />
                                ) : (
                                    step.expected || "—"
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CoverageBlock({ title, items }: { title: string; items: string[] }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">{title}</h4>
            {items.length === 0 ? (
                <p className="mt-2 text-[13px] text-slate-400">No explicit coverage.</p>
            ) : (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-slate-700">
                    {items.map((item, i) => (
                        <li key={`${title}-${i}`}>{item}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function EmptyInitialState({ isProcessing }: { isProcessing: boolean }) {
    return (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                <Sparkles size={18} strokeWidth={1.6} />
            </div>
            <p className="text-[13px] font-semibold text-slate-700">
                {isProcessing ? "AI is generating test cases…" : "No test cases generated yet."}
            </p>
            <p className="mt-1 text-[12px] text-slate-400">
                {isProcessing
                    ? "Generated test cases will appear here when ready."
                    : "Click generate to create manual QA test cases from this work item."}
            </p>
        </div>
    );
}

function EmptyFilterState({ onClear }: { onClear: () => void }) {
    return (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Search size={18} strokeWidth={1.8} />
            </div>
            <p className="text-[13px] font-semibold text-slate-800">No test cases match your filters.</p>
            <p className="mt-1 text-[12px] text-slate-400">
                Try changing the search text, status, priority, type, or script filter.
            </p>
            <button
                type="button"
                onClick={onClear}
                className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 hover:shadow-sm"
            >
                Clear filters
            </button>
        </div>
    );
}