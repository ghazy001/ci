"use client";

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
const CHART_COLORS = ["#2563eb", "#0891b2", "#7c3aed", "#059669", "#d97706", "#dc2626"];

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
        background: "#0f172a",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "10px",
        color: "#e2e8f0",
        fontSize: "12px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
    },
    labelStyle: { color: "#94a3b8", fontWeight: 600 },
    itemStyle: { color: "#e2e8f0" },
};

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function AdminAnalyticsAssistantPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            content:
                "Welcome, Admin. I can analyze global QA metrics, project health, approvals, automation coverage, AI generation activity, and script execution status. What would you like to explore?",
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
        (async () => {
            try {
                setProjectsLoading(true);
                setProjects(await getProjects());
            } catch {
                setProjects([]);
            } finally {
                setProjectsLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const latestResponse = useMemo(
        () => selectedResponse || [...messages].reverse().find((m) => m.response)?.response || null,
        [messages, selectedResponse]
    );

    const selectedProjectName = !selectedProjectId
        ? "Global"
        : projects.find((p) => p.id === selectedProjectId)?.name ?? "Project";

    const submitQuestion = async (value?: string) => {
        const q = (value ?? question).trim();
        if (!q || loading) return;

        setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "user", content: q, createdAt: new Date().toISOString() },
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
                        "I couldn't analyze that question. Please try rephrasing it.",
                    createdAt: new Date().toISOString(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="w-full">
            <style>{`
                .thin-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
                .thin-scroll::-webkit-scrollbar-track { background: transparent; }
                .thin-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.3); border-radius: 999px; }
                .thin-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.5); }
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .msg-anim { animation: fadeSlideUp 0.2s ease-out forwards; }
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.8); }
                }
                .typing-dot:nth-child(1) { animation: pulse-dot 1.2s ease-in-out infinite 0ms; }
                .typing-dot:nth-child(2) { animation: pulse-dot 1.2s ease-in-out infinite 200ms; }
                .typing-dot:nth-child(3) { animation: pulse-dot 1.2s ease-in-out infinite 400ms; }
            `}</style>

            {/* Page wrapper — dark sidebar-aware background */}
            <div className="flex min-h-[calc(100vh-80px)] flex-col gap-0 bg-slate-50">

                {/* ── Top bar ── */}
                <header className="border-b border-slate-200 bg-white px-6 py-4">
                    <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6">
                        {/* Left: identity */}
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
                                <Bot size={17} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-sm font-bold text-slate-900">QA Analytics Assistant</h1>
                                <p className="text-xs text-slate-400">AI-powered query engine · Admin view</p>
                            </div>
                        </div>

                        {/* Right: scope selector */}
                        <div className="flex items-center gap-3">
                            {/* Scope badge */}
                            <div className="hidden items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 sm:flex">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                <span className="text-xs font-semibold text-blue-700">
                                    Scope: {selectedProjectName}
                                </span>
                            </div>

                            {/* Project picker */}
                            <div className="relative">
                                <FolderKanban
                                    size={14}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <select
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    disabled={projectsLoading}
                                    className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-xs font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                                        backgroundRepeat: "no-repeat",
                                        backgroundPosition: "right 0.6rem center",
                                    }}
                                >
                                    <option value="">{projectsLoading ? "Loading…" : "Global analytics"}</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Live indicator */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                </span>
                                Live
                            </div>
                        </div>
                    </div>
                </header>

                {/* ── Main content ── */}
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-0 p-5">
                    <div className="grid w-full flex-1 gap-5 xl:grid-cols-[380px_1fr]">

                        {/* ── LEFT: Chat panel ── */}
                        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            {/* Chat header */}
                            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                                    <Sparkles size={15} className="text-violet-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">AI Analyst</p>
                                    <p className="text-[11px] text-slate-400">Projects · test cases · automation · jobs</p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="thin-scroll flex flex-1 flex-col gap-3 overflow-y-auto p-4" style={{ minHeight: 0 }}>
                                {messages.map((msg) => (
                                    <MessageBubble
                                        key={msg.id}
                                        message={msg}
                                        onSelectResponse={() => msg.response && setSelectedResponse(msg.response)}
                                    />
                                ))}

                                {loading && <TypingIndicator />}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick prompts */}
                            <div className="border-t border-slate-100 px-4 py-3">
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    Quick prompts
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_PROMPTS.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => submitQuestion(p)}
                                            disabled={loading}
                                            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Input */}
                            <div className="border-t border-slate-100 p-3">
                                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
                                    <input
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && submitQuestion()}
                                        placeholder="Ask about QA metrics…"
                                        className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => submitQuestion()}
                                        disabled={loading || !question.trim()}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT: Data panels ── */}
                        <div className="flex flex-col gap-5">

                            {/* Chart panel */}
                            <VizPanel response={latestResponse} />

                            {/* SQL + Insight */}
                            <div className="grid gap-5 lg:grid-cols-2">
                                <SqlPanel response={latestResponse} />
                                <InsightPanel response={latestResponse} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

/* ─────────────────────────────────────────────
   Typing Indicator
───────────────────────────────────────────── */
function TypingIndicator() {
    return (
        <div className="flex justify-start msg-anim">
            <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   Message Bubble
───────────────────────────────────────────── */
function MessageBubble({ message, onSelectResponse }: { message: ChatMessage; onSelectResponse: () => void }) {
    const isUser = message.role === "user";
    const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return (
        <div className={`flex flex-col msg-anim ${isUser ? "items-end" : "items-start"}`}>
            <div className={`mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest ${isUser ? "text-blue-500" : "text-slate-400"}`}>
                {isUser ? "You" : "AI Analyst"}
                <span className="font-normal normal-case tracking-normal text-slate-300">{time}</span>
            </div>

            <div
                className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isUser
                        ? "rounded-br-sm bg-blue-600 text-white shadow-sm shadow-blue-200"
                        : "rounded-bl-sm border border-slate-200 bg-slate-50 text-slate-700"
                }`}
            >
                <p className="whitespace-pre-line">{message.content}</p>

                {message.response && (
                    <button
                        type="button"
                        onClick={onSelectResponse}
                        className={`mt-2 flex items-center gap-1.5 text-[11px] font-bold transition hover:gap-2 ${
                            isUser ? "text-blue-200 hover:text-white" : "text-blue-600 hover:text-blue-800"
                        }`}
                    >
                        <Zap size={11} />
                        View chart &amp; data
                    </button>
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   Panel Shell
───────────────────────────────────────────── */
function PanelShell({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
            {children}
        </div>
    );
}

/* ─────────────────────────────────────────────
   Panel Header
───────────────────────────────────────────── */
function PanelHeader({
    icon,
    iconBg,
    iconColor,
    label,
    title,
    badge,
}: {
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    title: string;
    badge?: ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                    <span className={iconColor}>{icon}</span>
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                    <p className="truncate text-sm font-bold text-slate-800">{title}</p>
                </div>
            </div>
            {badge}
        </div>
    );
}

/* ─────────────────────────────────────────────
   Visualization Panel
───────────────────────────────────────────── */
function VizPanel({ response }: { response: AnalyticsAssistantResponse | null }) {
    const chartType = response?.chart.type ?? "—";

    return (
        <PanelShell>
            <PanelHeader
                icon={<BarChart3 size={15} />}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
                label="Visualization"
                title={response ? response.question : "No query yet"}
                badge={
                    <span className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {chartType}
                    </span>
                }
            />

            <div className="flex min-h-[300px] items-center justify-center p-5">
                {!response ? (
                    <EmptyState
                        icon={<BarChart3 size={22} />}
                        title="Ask a question to see a chart"
                        sub="The assistant writes SQL, runs it, and picks the best visualization."
                    />
                ) : response.rows.length === 0 ? (
                    <EmptyState icon={<Database size={22} />} title="No data returned" sub={response.insight} />
                ) : (
                    <div className="h-[300px] w-full">
                        <AnalyticsChart response={response} />
                    </div>
                )}
            </div>
        </PanelShell>
    );
}

/* ─────────────────────────────────────────────
   Chart
───────────────────────────────────────────── */
function AnalyticsChart({ response }: { response: AnalyticsAssistantResponse }) {
    const rows = response.rows;
    const xKey = response.chart.x || Object.keys(rows[0] || {})[0];
    const yKey = response.chart.y || Object.keys(rows[0] || {})[1];
    const type = response.chart.type as string;

    if (type === "kpi") {
        const firstRow = rows[0] || {};
        const valueKey = yKey || Object.keys(firstRow)[0];
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">KPI Result</p>
                    <p className="mt-2 text-7xl font-black tabular-nums tracking-tight text-blue-600">
                        {String(firstRow[valueKey] ?? "—")}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">{valueKey}</p>
                </div>
            </div>
        );
    }

    if (type === "pie") {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Pie data={rows} dataKey={yKey} nameKey={xKey} outerRadius={110} innerRadius={48} paddingAngle={2} label>
                        {rows.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        );
    }

    if (type === "line") {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey={xKey} stroke="#cbd5e1" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis stroke="#cbd5e1" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey={yKey} stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 5 }} />
                </LineChart>
            </ResponsiveContainer>
        );
    }

    if (type === "area") {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rows} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey={xKey} stroke="#cbd5e1" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis stroke="#cbd5e1" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey={yKey} stroke="#2563eb" strokeWidth={2.5} fill="url(#areaGrad)" />
                </AreaChart>
            </ResponsiveContainer>
        );
    }

    if (type === "table") return <RowsTable rows={rows} />;

    /* default: bar */
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} barCategoryGap="28%" margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(148,163,184,0.18)" vertical={false} />
                <XAxis
                    dataKey={xKey}
                    stroke="#cbd5e1"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                />
                <YAxis stroke="#cbd5e1" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey={yKey} radius={[6, 6, 0, 0]}>
                    {rows.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

/* ─────────────────────────────────────────────
   SQL Panel
───────────────────────────────────────────── */
function SqlPanel({ response }: { response: AnalyticsAssistantResponse | null }) {
    const highlighted = useMemo(() => {
        if (!response?.sql) return null;

        const keywords = [
            "SELECT","FROM","WHERE","GROUP BY","ORDER BY","HAVING","COUNT","SUM","AVG",
            "ROUND","CASE","WHEN","THEN","ELSE","END","NULLIF","AS","AND","OR","NOT",
            "IN","JOIN","LEFT","INNER","ON","LIMIT","DISTINCT",
        ];

        let h = response.sql.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        keywords.forEach((kw) => {
            h = h.replace(new RegExp(`\\b${kw}\\b`, "g"), `<span class="sql-kw">${kw}</span>`);
        });
        h = h.replace(/'([^']*)'/g, `<span class="sql-str">'$1'</span>`);
        h = h.replace(
            /\b(test_cases|automation_scripts|work_items|projects|users|ai_jobs)\b/g,
            `<span class="sql-tbl">$1</span>`
        );
        return h;
    }, [response?.sql]);

    return (
        <PanelShell>
            <style>{`
                .sql-kw { color: #3b82f6; font-weight: 700; }
                .sql-str { color: #10b981; }
                .sql-tbl { color: #f59e0b; }
            `}</style>

            <PanelHeader
                icon={<TerminalSquare size={15} />}
                iconBg="bg-slate-100"
                iconColor="text-slate-600"
                label="Generated SQL"
                title="Query inspector"
            />

            <div className="p-4">
                {highlighted ? (
                    <>
                        <pre
                            className="thin-scroll max-h-[180px] overflow-auto rounded-xl bg-slate-950 p-4 text-[11px] leading-6 text-slate-300"
                            dangerouslySetInnerHTML={{ __html: highlighted }}
                        />
                        <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                                {response!.rows.length} rows
                            </span>
                            <span className="flex-1 truncate">{response!.explanation}</span>
                        </div>
                    </>
                ) : (
                    <EmptyStateMini label="SQL appears here after a query runs." />
                )}
            </div>
        </PanelShell>
    );
}

/* ─────────────────────────────────────────────
   Insight Panel
───────────────────────────────────────────── */
function InsightPanel({ response }: { response: AnalyticsAssistantResponse | null }) {
    return (
        <PanelShell>
            <PanelHeader
                icon={<Sparkles size={15} />}
                iconBg="bg-violet-100"
                iconColor="text-violet-600"
                label="Insight"
                title="Explanation &amp; preview"
            />

            <div className="p-4">
                {response ? (
                    <div className="space-y-3">
                        {response.scope && (
                            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                                <span>
                                    Scope:{" "}
                                    <strong>
                                        {response.scope.mode === "GLOBAL_ADMIN"
                                            ? "Global admin"
                                            : response.scope.mode === "PROJECT"
                                            ? "Selected project"
                                            : "Assigned projects"}
                                    </strong>
                                </span>
                            </div>
                        )}
                        <p className="text-sm leading-relaxed text-slate-600">{response.insight}</p>
                        <RowsTable rows={response.rows} compact />
                    </div>
                ) : (
                    <EmptyStateMini label="Explanation and result table appear here after a query." />
                )}
            </div>
        </PanelShell>
    );
}

/* ─────────────────────────────────────────────
   Rows Table
───────────────────────────────────────────── */
function RowsTable({ rows, compact = false }: { rows: Record<string, unknown>[]; compact?: boolean }) {
    if (!rows.length) return <p className="text-xs text-slate-400">No rows returned.</p>;

    const columns = Object.keys(rows[0]);

    return (
        <div className={`thin-scroll overflow-auto rounded-xl border border-slate-200 ${compact ? "max-h-44" : "max-h-80"}`}>
            <table className="min-w-full border-collapse text-left text-xs">
                <thead>
                    <tr className="sticky top-0 bg-slate-50">
                        {columns.map((col) => (
                            <th key={col} className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr key={ri} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                            {columns.map((col) => (
                                <td key={col} className="whitespace-nowrap px-3 py-2 text-slate-600">
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

/* ─────────────────────────────────────────────
   Empty States
───────────────────────────────────────────── */
function EmptyState({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
    return (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                {icon}
            </div>
            <p className="text-sm font-semibold text-slate-600">{title}</p>
            <p className="max-w-xs text-xs leading-relaxed text-slate-400">{sub}</p>
        </div>
    );
}

function EmptyStateMini({ label }: { label: string }) {
    return (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">
            {label}
        </div>
    );
}