"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    ArrowLeft,
    BarChart3,
    Bot,
    ChevronDown,
    Database,
    FolderKanban,
    Loader2,
    Send,
    Sparkles,
    TerminalSquare,
    Zap,
} from "lucide-react";
import { analyticsAssistantService } from "@/lib/analytics-assistant.service";
import { AnalyticsAssistantResponse, ProjectOption } from "@/lib/types";
import { getProjects } from "@/lib/project.service";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    response?: AnalyticsAssistantResponse;
    createdAt: string;
};

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const CHART_COLORS = ["#0070ad", "#00a3e0", "#2f6bff", "#20c5a5", "#6f7dfb", "#1f93c6"];

const QUICK_PROMPTS = [
    "Test case approval status",
    "Projects with most work items",
    "Most generated test cases",
    "Scripts by framework",
    "Automation coverage",
    "Approved tests without scripts",
    "AI generation failures",
    "Work items by source",
];

const TOOLTIP_STYLE = {
    contentStyle: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        color: "#0f172a",
        fontSize: "12px",
        boxShadow: "0 14px 36px rgba(15, 23, 42, 0.12)",
    },
};

/* ═══════════════════════════════════════════
   Page
═══════════════════════════════════════════ */
export default function AdminAnalyticsAssistantPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            content:
                "Welcome Admin. Ask me about global QA metrics, project health, approvals, automation coverage, AI generation failures, or script status.",
            createdAt: new Date().toISOString(),
        },
    ]);

    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedResponse, setSelectedResponse] = useState<AnalyticsAssistantResponse | null>(null);
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [projectsLoading, setProjectsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const load = async () => {
            try {
                setProjectsLoading(true);
                setProjects(await getProjects());
            } catch {
                setProjects([]);
            } finally {
                setProjectsLoading(false);
            }
        };

        load();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const latestResponse = useMemo(
        () => selectedResponse || [...messages].reverse().find((m) => m.response)?.response || null,
        [messages, selectedResponse]
    );

    const selectedProjectName = !selectedProjectId
        ? "Global analytics"
        : projects.find((p) => p.id === selectedProjectId)?.name ?? "Selected project";

    const submitQuestion = async (value?: string) => {
        const q = (value ?? question).trim();
        if (!q || loading) return;

        setMessages((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                role: "user",
                content: q,
                createdAt: new Date().toISOString(),
            },
        ]);
        setQuestion("");
        setLoading(true);

        try {
            const response = await analyticsAssistantService.ask({
                question: q,
                projectId: selectedProjectId || undefined,
            });

            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: response.insight || response.explanation,
                    response,
                    createdAt: new Date().toISOString(),
                },
            ]);
            setSelectedResponse(response);
        } catch (error: any) {
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content:
                        error?.response?.data?.message ||
                        "I could not analyze this question. Please try another one.",
                    createdAt: new Date().toISOString(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="w-full bg-transparent">
            <style>{`
        .thin-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .thin-scroll::-webkit-scrollbar-track { background: transparent; }
        .thin-scroll::-webkit-scrollbar-thumb { background: rgba(0,112,173,0.22); border-radius: 999px; }
      `}</style>

            <div className="flex min-h-[calc(100vh-96px)] w-full flex-col gap-6 rounded-2xl bg-[linear-gradient(160deg,#f8fbff_0%,#eef5ff_100%)] p-6 lg:p-8">
                <AdminAssistantHero
                    projects={projects}
                    projectsLoading={projectsLoading}
                    selectedProjectId={selectedProjectId}
                    selectedProjectName={selectedProjectName}
                    onProjectChange={setSelectedProjectId}
                />

                <section className="grid flex-1 gap-5 xl:grid-cols-[420px_1fr]">
                    <ChatPanel
                        messages={messages}
                        loading={loading}
                        question={question}
                        messagesEndRef={messagesEndRef}
                        onQuestionChange={setQuestion}
                        onSubmit={submitQuestion}
                        onSelectResponse={setSelectedResponse}
                    />

                    <div className="grid min-h-[720px] gap-5 xl:grid-rows-[1fr_auto]">
                        <VizPanel response={latestResponse} />
                        <div className="grid gap-5 lg:grid-cols-2">
                            <SqlPanel response={latestResponse} />
                            <InsightPanel response={latestResponse} />
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

/* ═══════════════════════════════════════════
   Shared UI
═══════════════════════════════════════════ */
function IconBox({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
            {children}
        </div>
    );
}

function PanelShell({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <section
            className={`relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04),0_4px_16px_0_rgb(0,0,0,0.04)] ${className}`}
        >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--cap-blue)]/0 via-[var(--cap-blue)] to-[var(--cap-blue)]/0" />
            {children}
        </section>
    );
}

function SectionTitle({
                          eyebrow,
                          title,
                          description,
                          icon,
                      }: {
    eyebrow: string;
    title: string;
    description?: string;
    icon: ReactNode;
}) {
    return (
        <div className="flex items-start gap-4">
            <IconBox>{icon}</IconBox>
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                    {eyebrow}
                </p>
                <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
                {description && (
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════
   Header
═══════════════════════════════════════════ */
function AdminAssistantHero({
                                projects,
                                projectsLoading,
                                selectedProjectId,
                                selectedProjectName,
                                onProjectChange,
                            }: {
    projects: ProjectOption[];
    projectsLoading: boolean;
    selectedProjectId: string;
    selectedProjectName: string;
    onProjectChange: (id: string) => void;
}) {
    return (
        <PanelShell className="px-7 py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <SectionTitle
                    eyebrow="Admin AI Analytics"
                    title="QA Analytics Assistant"
                    description="Analyze global QA operations, project health, approvals, automation coverage, and AI generation activity."
                    icon={<Bot size={18} strokeWidth={1.8} />}
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="rounded-xl border border-[var(--cap-blue)]/15 bg-[var(--cap-blue)]/8 px-4 py-2 text-xs text-slate-500">
                        <span className="mr-2 text-[var(--cap-blue)]">●</span>
                        Scope: <span className="font-bold text-[var(--cap-blue)]">{selectedProjectName}</span>
                    </div>

                    <div className="relative min-w-[250px]">
                        <FolderKanban
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cap-blue)]"
                        />
                        <select
                            value={selectedProjectId}
                            onChange={(e) => onProjectChange(e.target.value)}
                            disabled={projectsLoading}
                            className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-[var(--cap-blue)]/40 focus:bg-white focus:ring-4 focus:ring-[var(--cap-blue)]/10 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <option value="">{projectsLoading ? "Loading projects…" : "Global analytics"}</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            size={15}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                    </div>


                </div>
            </div>
        </PanelShell>
    );
}

/* ═══════════════════════════════════════════
   Chat Panel
═══════════════════════════════════════════ */
function ChatPanel({
                       messages,
                       loading,
                       question,
                       messagesEndRef,
                       onQuestionChange,
                       onSubmit,
                       onSelectResponse,
                   }: {
    messages: ChatMessage[];
    loading: boolean;
    question: string;
    messagesEndRef: RefObject<HTMLDivElement | null>;
    onQuestionChange: (v: string) => void;
    onSubmit: (v?: string) => void;
    onSelectResponse: (r: AnalyticsAssistantResponse) => void;
}) {
    return (
        <PanelShell className="flex min-h-[720px] flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <SectionTitle
                    eyebrow="Admin AI Analyst"
                    title="Ask about QA operations"
                    description="Projects · test cases · automation · AI jobs"
                    icon={<Sparkles size={18} strokeWidth={1.8} />}
                />
                <span className="mt-2 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgb(52,211,153,0.14)]" />
            </div>

            <div className="thin-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        message={msg}
                        onSelectResponse={() => msg.response && onSelectResponse(msg.response)}
                    />
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="max-w-[86%] rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
                            <div className="flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin text-[var(--cap-blue)]" />
                                Generating SQL · running query · preparing insight…
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-slate-100 px-5 pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Quick prompts
                </p>
                <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onSubmit(p)}
                            disabled={loading}
                            className="rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:border-[var(--cap-blue)]/25 hover:bg-[var(--cap-blue)]/8 hover:text-[var(--cap-blue)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="m-5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2 pl-4 transition focus-within:border-[var(--cap-blue)]/40 focus-within:bg-white focus-within:ring-4 focus-within:ring-[var(--cap-blue)]/10">
                <input
                    value={question}
                    onChange={(e) => onQuestionChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                    placeholder="Ask: automation coverage by project…"
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
                <button
                    type="button"
                    onClick={() => onSubmit()}
                    disabled={loading || !question.trim()}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)] text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
            </div>
        </PanelShell>
    );
}

/* ═══════════════════════════════════════════
   Message Bubble
═══════════════════════════════════════════ */
function MessageBubble({ message, onSelectResponse }: { message: ChatMessage; onSelectResponse: () => void }) {
    const isUser = message.role === "user";
    const time = new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div className={`flex max-w-[90%] flex-col ${isUser ? "self-end items-end" : "self-start items-start"}`}>
            <div
                className={`mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] ${
                    isUser ? "text-[var(--cap-blue)]" : "text-slate-400"
                }`}
            >
                {isUser ? "Admin" : "AI Analyst"}
                <span className="text-[10px] font-medium normal-case tracking-normal text-slate-400">{time}</span>
            </div>

            <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] ${
                    isUser
                        ? "rounded-br-md border border-[var(--cap-blue)]/20 bg-[var(--cap-blue)] text-white"
                        : "rounded-bl-md border border-slate-200 bg-slate-50/80 text-slate-700"
                }`}
            >
                <p className="m-0 whitespace-pre-line">{message.content}</p>

                {message.response && (
                    <button
                        type="button"
                        onClick={onSelectResponse}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[var(--cap-blue)] transition hover:translate-x-0.5"
                    >
                        <Zap size={12} />
                        View chart &amp; SQL
                    </button>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════
   Visualization Panel
═══════════════════════════════════════════ */
function VizPanel({ response }: { response: AnalyticsAssistantResponse | null }) {
    return (
        <PanelShell className="flex min-h-[420px] flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <SectionTitle
                    eyebrow="Visualization"
                    title={response ? response.question : "No question asked yet"}
                    description={response ? `${response.rows.length} rows returned` : "The generated chart will appear here."}
                    icon={<BarChart3 size={18} strokeWidth={1.8} />}
                />
                <span className="rounded-lg bg-[var(--cap-blue)]/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/15">
          {response?.chart.type ?? "empty"}
        </span>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center p-6">
                {!response ? (
                    <EmptyState
                        icon={<BarChart3 size={24} />}
                        title="Ask a question to generate a chart"
                        description="The assistant will write SQL, run it, and choose the best visualization."
                    />
                ) : response.rows.length === 0 ? (
                    <EmptyState icon={<Database size={24} />} title="No data returned" description={response.insight} />
                ) : (
                    <AnalyticsChart response={response} />
                )}
            </div>
        </PanelShell>
    );
}

/* ═══════════════════════════════════════════
   Chart Renderer
═══════════════════════════════════════════ */
function AnalyticsChart({ response }: { response: AnalyticsAssistantResponse }) {
    const rows = response.rows;
    const xKey = response.chart.x || Object.keys(rows[0] || {})[0];
    const yKey = response.chart.y || Object.keys(rows[0] || {})[1];
    const type = response.chart.type as string;

    if (type === "kpi") {
        const firstRow = rows[0] || {};
        const valueKey = yKey || Object.keys(firstRow)[0];

        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">KPI</p>
                    <p className="mt-3 bg-gradient-to-r from-[var(--cap-blue)] to-sky-400 bg-clip-text text-7xl font-black tracking-tight text-transparent">
                        {String(firstRow[valueKey] ?? "—")}
                    </p>
                    <p className="mt-3 text-sm font-medium text-slate-400">{valueKey}</p>
                </div>
            </div>
        );
    }

    if (type === "pie") {
        return (
            <div className="h-full min-h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Pie data={rows} dataKey={yKey} nameKey={xKey} outerRadius={110} innerRadius={42} label>
                            {rows.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === "line") {
        return (
            <div className="h-full min-h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                        <XAxis dataKey={xKey} stroke="#94a3b8" tick={{ fontSize: 11, fill: "#64748b" }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: "#64748b" }} />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Line
                            type="monotone"
                            dataKey={yKey}
                            stroke="var(--cap-blue)"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: "var(--cap-blue)" }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === "area") {
        return (
            <div className="h-full min-h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={rows}>
                        <defs>
                            <linearGradient id="adminAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--cap-blue)" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="var(--cap-blue)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                        <XAxis dataKey={xKey} stroke="#94a3b8" tick={{ fontSize: 11, fill: "#64748b" }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: "#64748b" }} />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Area
                            type="monotone"
                            dataKey={yKey}
                            stroke="var(--cap-blue)"
                            strokeWidth={2.5}
                            fill="url(#adminAreaGrad)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === "table") return <RowsTable rows={rows} />;

    return (
        <div className="h-full min-h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                    <XAxis
                        dataKey={xKey}
                        stroke="#94a3b8"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        angle={-22}
                        textAnchor="end"
                        height={64}
                    />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey={yKey} radius={[7, 7, 0, 0]}>
                        {rows.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ═══════════════════════════════════════════
   SQL Panel
═══════════════════════════════════════════ */
function SqlPanel({ response }: { response: AnalyticsAssistantResponse | null }) {
    const highlighted = useMemo(() => {
        if (!response?.sql) return null;

        const keywords = [
            "SELECT",
            "FROM",
            "WHERE",
            "GROUP BY",
            "ORDER BY",
            "HAVING",
            "COUNT",
            "SUM",
            "AVG",
            "ROUND",
            "CASE",
            "WHEN",
            "THEN",
            "ELSE",
            "END",
            "NULLIF",
            "AS",
            "AND",
            "OR",
            "NOT",
            "IN",
            "JOIN",
            "LEFT",
            "INNER",
            "ON",
            "LIMIT",
            "DISTINCT",
        ];

        let h = response.sql.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        keywords.forEach((kw) => {
            h = h.replace(new RegExp(`\\b${kw}\\b`, "g"), `<span style="color:#2f6bff">${kw}</span>`);
        });

        h = h.replace(/'([^']*)'/g, `<span style="color:#059669">'$1'</span>`);
        h = h.replace(
            /\b(test_cases|automation_scripts|work_items|projects|users|ai_jobs)\b/g,
            `<span style="color:#0070ad">$1</span>`
        );

        return h;
    }, [response?.sql]);

    return (
        <PanelShell className="p-5">
            <div className="mb-4 flex items-center gap-3">
                <IconBox>
                    <TerminalSquare size={16} />
                </IconBox>
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                        Generated SQL
                    </p>
                    <p className="mt-0.5 text-sm text-slate-400">Inspect the query created by the assistant.</p>
                </div>
            </div>

            {highlighted ? (
                <>
          <pre
              className="thin-scroll max-h-[170px] overflow-auto rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-[11px] leading-7 text-slate-500"
              dangerouslySetInnerHTML={{ __html: highlighted }}
          />
                    <div className="mt-3 flex gap-4 text-xs text-slate-400">
            <span>
              Rows: <span className="font-bold text-slate-600">{response!.rows.length}</span>
            </span>
                        <span>·</span>
                        <span className="truncate">{response!.explanation}</span>
                    </div>
                </>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                    SQL appears here after a query runs.
                </div>
            )}
        </PanelShell>
    );
}

/* ═══════════════════════════════════════════
   Insight Panel
═══════════════════════════════════════════ */
function InsightPanel({ response }: { response: AnalyticsAssistantResponse | null }) {
    return (
        <PanelShell className="p-5">
            <div className="mb-4 flex items-center gap-3">
                <IconBox>
                    <Database size={16} />
                </IconBox>
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                        Insight
                    </p>
                    <p className="mt-0.5 text-sm text-slate-400">Explanation and result preview.</p>
                </div>
            </div>

            {response ? (
                <div>
                    {response.scope && (
                        <div className="mb-3 rounded-xl border border-[var(--cap-blue)]/15 bg-[var(--cap-blue)]/8 px-4 py-2 text-xs text-slate-500">
                            Scope:{" "}
                            <span className="font-bold text-[var(--cap-blue)]">
                {response.scope.mode === "GLOBAL_ADMIN"
                    ? "Global admin"
                    : response.scope.mode === "PROJECT"
                        ? "Selected project"
                        : "Assigned projects"}
              </span>
                        </div>
                    )}
                    <p className="mb-4 text-sm leading-relaxed text-slate-700">{response.insight}</p>
                    <RowsTable rows={response.rows} compact />
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                    Explanation and result table appear here.
                </div>
            )}
        </PanelShell>
    );
}

/* ═══════════════════════════════════════════
   Rows Table
═══════════════════════════════════════════ */
function RowsTable({ rows, compact = false }: { rows: Record<string, unknown>[]; compact?: boolean }) {
    if (!rows.length) return <p className="text-sm text-slate-400">No rows.</p>;

    const columns = Object.keys(rows[0]);

    return (
        <div
            className={`thin-scroll overflow-auto rounded-xl border border-slate-200 ${compact ? "max-h-40" : "max-h-80"}`}
        >
            <table className="min-w-full border-collapse text-left text-xs">
                <thead>
                <tr className="sticky top-0 bg-slate-50">
                    {columns.map((col) => (
                        <th
                            key={col}
                            className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-bold uppercase tracking-wide text-slate-400"
                        >
                            {col}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {rows.map((row, ri) => (
                    <tr key={ri} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                        {columns.map((col) => (
                            <td key={col} className="whitespace-nowrap px-3 py-2 text-slate-500">
                                {String(row[col] ?? "")}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

/* ═══════════════════════════════════════════
   Empty State
═══════════════════════════════════════════ */
function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
    return (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-[var(--cap-blue)]/20 bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                {icon}
            </div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="max-w-xs text-sm leading-relaxed text-slate-400">{description}</p>
        </div>
    );
}
