"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    AlertCircle,
    Check,
    ChevronDown,
    ChevronLeft,
    FileSearch,
    FileText,
    Layers3,
    Loader2,
    Sparkles,
    Trash2,
    UploadCloud,
    WandSparkles,
    Flag,
    BookOpen,
    CheckCircle2,
    BarChart3,
    ListChecks,
    Cpu,
} from "lucide-react";

import { workItemService } from "@/lib/work-item.service";
import type {
    ExtractedSpecWorkItem,
    WorkItemType,
    SpecDocumentPreviewResponse,
    SpecAiModelId,
    SpecAiModelOption,
} from "@/lib/types";

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const workItemTypes: WorkItemType[] = [
    "FEATURE", "BUG", "IMPROVEMENT", "TASK", "USER_STORY",
];

const specAiModels: SpecAiModelOption[] = [
    {
        id: "llama-3.3-70b-versatile",
        label: "Llama 3.3 70B Versatile",
        provider: "Meta / Groq",
        description: "Balanced and reliable extraction for most specs.",
    },
    {
        id: "openai/gpt-oss-120b",
        label: "GPT OSS 120B",
        provider: "OpenAI OSS / Groq",
        description: "Fast model for lightweight extraction and previews.",
    },
    {
        id: "meta-llama/llama-4-scout-17b-16e-instruct",
        label: "Llama 4 Scout 17B Instruct",
        provider: "Meta / Groq",
        description: "Best for deep and complex requirement analysis",
    },
];

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function confidenceLabel(confidence: number) {
    if (confidence >= 0.85) return "High confidence";
    if (confidence >= 0.65) return "Medium confidence";
    return "Needs review";
}

function confidenceStyle(confidence: number) {
    if (confidence >= 0.85) return "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100";
    if (confidence >= 0.65) return "bg-amber-50 text-amber-600 ring-1 ring-amber-100";
    return "bg-red-50 text-red-500 ring-1 ring-red-100";
}

function formatFileSize(size: number) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const inputBase =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[var(--cap-blue)]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--cap-blue)]/10";

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */
function StatCard({
                      icon, label, value, sub,
                  }: {
    icon: React.ReactNode; label: string; value: string | number; sub: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                    {icon}
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{sub}</p>
        </div>
    );
}

function FieldLabel({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
    return (
        <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                {icon}
            </span>
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">{label}</p>
                {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function ImportSpecDocumentPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [selectedModel, setSelectedModel] = useState<SpecAiModelId>("llama-3.3-70b-versatile");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<SpecDocumentPreviewResponse | null>(null);
    const [items, setItems] = useState<ExtractedSpecWorkItem[]>([]);
    const [selected, setSelected] = useState<Record<number, boolean>>({});
    const [dragActive, setDragActive] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);
    const averageConfidence = useMemo(() => {
        if (!items.length) return 0;
        return Number((items.reduce((sum, item) => sum + item.confidence, 0) / items.length).toFixed(2));
    }, [items]);
    const selectedModelInfo = useMemo(() => specAiModels.find((m) => m.id === selectedModel), [selectedModel]);

    const handleFile = (nextFile: File | null) => {
        if (!nextFile) return;
        setFile(nextFile);
        setPreview(null);
        setItems([]);
        setSelected({});
        setError("");
        setSuccess("");
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        handleFile(e.dataTransfer.files?.[0] ?? null);
    };

    const handlePreview = async () => {
        if (!file) { setError("Please select a specification document first."); return; }
        try {
            setExtracting(true);
            setError("");
            setSuccess("");
            const data = await workItemService.previewSpecDocument(projectId, file, selectedModel);
            setPreview(data);
            setItems(data.workItems);
            const init: Record<number, boolean> = {};
            data.workItems.forEach((_, i) => { init[i] = true; });
            setSelected(init);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to extract work items from this document.");
        } finally {
            setExtracting(false);
        }
    };

    const updateItem = (index: number, patch: Partial<ExtractedSpecWorkItem>) => {
        setItems((curr) => curr.map((item, i) => i === index ? { ...item, ...patch } : item));
    };

    const updateLines = (index: number, field: "acceptanceCriteria" | "businessRules", value: string) => {
        updateItem(index, { [field]: value.split("\n").map((l) => l.trim()).filter(Boolean) });
    };

    const removeItem = (index: number) => {
        setItems((curr) => curr.filter((_, i) => i !== index));
        setSelected((curr) => {
            const next: Record<number, boolean> = {};
            Object.entries(curr).forEach(([key, val]) => {
                const old = Number(key);
                if (old < index) next[old] = val;
                if (old > index) next[old - 1] = val;
            });
            return next;
        });
    };

    const toggleAll = () => {
        const shouldSelect = selectedCount !== items.length;
        const next: Record<number, boolean> = {};
        items.forEach((_, i) => { next[i] = shouldSelect; });
        setSelected(next);
    };

    const handleImport = async () => {
        const selectedItems = items.filter((_, i) => selected[i]);
        if (!selectedItems.length) { setError("Please select at least one WorkItem to import."); return; }
        try {
            setImporting(true);
            setError("");
            setSuccess("");
            const result = await workItemService.importFromSpecDocument({
                projectId,
                fileName: preview?.file.name ?? file?.name,
                extractionModel: preview?.extraction.model ?? selectedModel,
                workItems: selectedItems,
            });
            setSuccess(`${result.count} WorkItems imported successfully.`);
            setTimeout(() => router.push(`/tester/projects/${projectId}/work-items`), 900);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to import selected WorkItems.");
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[linear-gradient(160deg,#f8fbff_0%,#eef5ff_100%)]">
            <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">

                {/* ── Header ── */}
                <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white px-7 py-6 shadow-[0_1px_3px_0_rgb(0,0,0,0.04),0_4px_16px_0_rgb(0,0,0,0.04)]">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--cap-blue)]/0 via-[var(--cap-blue)] to-[var(--cap-blue)]/0" />

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                <WandSparkles size={18} strokeWidth={1.8} />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                                    AI Specification Import
                                </p>
                                <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
                                    Extract WorkItems from Specs
                                </h1>
                                <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-400">
                                    Upload a cahier de spécifications, choose an AI model, then extract structured
                                    WorkItems with descriptions, acceptance criteria and business rules.
                                </p>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            <Link
                                href={`/tester/projects/${projectId}`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 hover:shadow-sm"
                            >
                                <ChevronLeft size={15} />
                                Back
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ── Stat cards ── */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard icon={<ListChecks size={14} />} label="Extracted" value={items.length} sub="WorkItems detected" />
                    <StatCard icon={<CheckCircle2 size={14} />} label="Selected" value={selectedCount} sub="Ready to import" />
                    <StatCard
                        icon={<BarChart3 size={14} />}
                        label="Confidence"
                        value={items.length ? `${Math.round(averageConfidence * 100)}%` : "—"}
                        sub="Average AI confidence"
                    />
                </div>

                {/* ── Upload + Model ── */}
                <section className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
                    <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">

                        {/* Drop zone */}
                        <div className="p-6 lg:border-r lg:border-slate-100 lg:p-8">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                    <UploadCloud size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">Step 1</p>
                                    <p className="text-sm font-bold text-slate-900">Upload Document</p>
                                </div>
                            </div>

                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                onDragLeave={() => setDragActive(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`mt-5 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
                                    dragActive
                                        ? "border-[var(--cap-blue)] bg-[var(--cap-blue)]/5"
                                        : "border-slate-200 bg-slate-50 hover:border-[var(--cap-blue)]/40 hover:bg-[var(--cap-blue)]/3"
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                                    className="hidden"
                                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                                />
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                    <UploadCloud size={24} strokeWidth={1.5} />
                                </div>
                                <p className="mt-4 text-sm font-semibold text-slate-700">
                                    Drag & drop or click to browse
                                </p>
                                <p className="mt-1 text-xs text-slate-400">PDF, DOCX, TXT or MD</p>
                            </div>

                            {/* File info */}
                            {file && (
                                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                            <FileSearch size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
                                            <p className="text-xs text-slate-400">{formatFileSize(file.size)} · {file.type || "Unknown type"}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Model selector */}
                        <div className="p-6 lg:p-8">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                    <Cpu size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">Step 2</p>
                                    <p className="text-sm font-bold text-slate-900">Choose AI Model</p>
                                </div>
                            </div>

                            <div className="mt-5">
                                <FieldLabel icon={<Sparkles size={13} />} label="Extraction Model" />
                                <div className="relative">
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value as SpecAiModelId)}
                                        disabled={extracting}
                                        className={`${inputBase} appearance-none pr-10`}
                                    >
                                        {specAiModels.map((m) => (
                                            <option key={m.id} value={m.id}>{m.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>

                                {selectedModelInfo && (
                                    <div className="mt-3 rounded-xl border border-[var(--cap-blue)]/10 bg-[var(--cap-blue)]/5 p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-bold text-slate-800">{selectedModelInfo.provider}</p>
                                            <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/15">
                                                Groq
                                            </span>
                                        </div>
                                        <p className="mt-1.5 text-xs leading-5 text-slate-500">{selectedModelInfo.description}</p>
                                        <p className="mt-2 break-all font-mono text-[10px] text-slate-400">{selectedModelInfo.id}</p>
                                    </div>
                                )}
                            </div>

                            {/* Extraction stats post-preview */}
                            {preview && (
                                <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Readable text</span>
                                        <span className="font-semibold text-slate-800">{preview.extraction.textLength} chars</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Model used</span>
                                        <span className="max-w-[55%] break-all text-right font-semibold text-slate-800">{preview.extraction.model}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handlePreview}
                                disabled={!file || extracting}
                                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--cap-blue)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {extracting ? (
                                    <><Loader2 size={16} className="animate-spin" /> Extracting with AI…</>
                                ) : (
                                    <><Sparkles size={16} /> Extract WorkItems</>
                                )}
                            </button>
                        </div>
                    </div>
                </section>

                {/* ── Error / Success banners ── */}
                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                        {success}
                    </div>
                )}

                {/* ── Extracted items ── */}
                {items.length > 0 && (
                    <section className="space-y-5">

                        {/* Review header */}
                        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white px-7 py-6 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
                            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--cap-blue)]/0 via-[var(--cap-blue)] to-[var(--cap-blue)]/0" />
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                        <ListChecks size={18} strokeWidth={1.8} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">AI Preview</p>
                                        <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">Review Extracted WorkItems</h2>
                                        <p className="mt-1 text-sm text-slate-400">Select, edit or remove items before importing them into your project.</p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={toggleAll}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 hover:shadow-sm"
                                    >
                                        <Check size={14} />
                                        {selectedCount === items.length ? "Unselect all" : "Select all"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleImport}
                                        disabled={importing || selectedCount === 0}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--cap-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {importing ? (
                                            <><Loader2 size={14} className="animate-spin" /> Importing…</>
                                        ) : (
                                            <><UploadCloud size={14} /> Import selected ({selectedCount})</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Item cards */}
                        {items.map((item, index) => (
                            <article
                                key={index}
                                className={`rounded-2xl border bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] transition ${
                                    selected[index]
                                        ? "border-[var(--cap-blue)]/20"
                                        : "border-slate-200/60 opacity-60"
                                }`}
                            >
                                {/* Item header */}
                                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                                    <div className="flex items-start gap-3">
                                        {/* Checkbox */}
                                        <button
                                            type="button"
                                            onClick={() => setSelected((c) => ({ ...c, [index]: !c[index] }))}
                                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                                                selected[index]
                                                    ? "border-[var(--cap-blue)] bg-[var(--cap-blue)] text-white"
                                                    : "border-slate-300 bg-white text-transparent"
                                            }`}
                                        >
                                            <Check size={12} />
                                        </button>

                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                    #{index + 1}
                                                </span>
                                                <span className="rounded-lg bg-[var(--cap-blue)]/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--cap-blue)] ring-1 ring-[var(--cap-blue)]/15">
                                                    {item.type}
                                                </span>
                                                <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${confidenceStyle(item.confidence)}`}>
                                                    {Math.round(item.confidence * 100)}% · {confidenceLabel(item.confidence)}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-base font-bold text-slate-900">{item.title}</p>
                                            {item.sourceSection && (
                                                <p className="mt-0.5 text-xs text-slate-400">Source: {item.sourceSection}</p>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100 hover:shadow-sm"
                                    >
                                        <Trash2 size={13} />
                                        Remove
                                    </button>
                                </div>

                                {/* Item fields */}
                                <div className="grid gap-5 p-6 lg:grid-cols-2">
                                    {/* Title */}
                                    <div className="lg:col-span-2">
                                        <FieldLabel icon={<FileText size={13} />} label="Title" />
                                        <input
                                            value={item.title}
                                            onChange={(e) => updateItem(index, { title: e.target.value })}
                                            className={inputBase}
                                        />
                                    </div>

                                    {/* Type */}
                                    <div>
                                        <FieldLabel icon={<Layers3 size={13} />} label="Type" />
                                        <div className="relative">
                                            <select
                                                value={item.type}
                                                onChange={(e) => updateItem(index, { type: e.target.value as WorkItemType })}
                                                className={`${inputBase} appearance-none pr-10`}
                                            >
                                                {workItemTypes.map((t) => (
                                                    <option key={t} value={t}>{t.replace("_", " ")}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <FieldLabel icon={<Flag size={13} />} label="Priority" />
                                        <input
                                            value={item.priority ?? ""}
                                            onChange={(e) => updateItem(index, { priority: e.target.value || null })}
                                            placeholder="High, Medium, Low…"
                                            className={inputBase}
                                        />
                                    </div>

                                    {/* Description */}
                                    <div className="lg:col-span-2">
                                        <FieldLabel icon={<FileText size={13} />} label="Description" />
                                        <textarea
                                            value={item.description}
                                            onChange={(e) => updateItem(index, { description: e.target.value })}
                                            rows={4}
                                            className={`${inputBase} resize-none leading-relaxed`}
                                        />
                                    </div>

                                    {/* Acceptance Criteria */}
                                    <div>
                                        <FieldLabel icon={<CheckCircle2 size={13} />} label="Acceptance Criteria" sub="One criterion per line" />
                                        <textarea
                                            value={item.acceptanceCriteria.join("\n")}
                                            onChange={(e) => updateLines(index, "acceptanceCriteria", e.target.value)}
                                            rows={6}
                                            placeholder="One criterion per line"
                                            className={`${inputBase} resize-none font-mono text-xs leading-relaxed`}
                                        />
                                    </div>

                                    {/* Business Rules */}
                                    <div>
                                        <FieldLabel icon={<BookOpen size={13} />} label="Business Rules" sub="One rule per line" />
                                        <textarea
                                            value={item.businessRules.join("\n")}
                                            onChange={(e) => updateLines(index, "businessRules", e.target.value)}
                                            rows={6}
                                            placeholder="One rule per line"
                                            className={`${inputBase} resize-none font-mono text-xs leading-relaxed`}
                                        />
                                    </div>
                                </div>
                            </article>
                        ))}
                    </section>
                )}

                {/* ── Empty state ── */}
                {!items.length && !extracting && (
                    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-6 text-sm text-slate-400 shadow-sm">
                        <AlertCircle size={16} className="mt-0.5 shrink-0 text-slate-300" />
                        <div>
                            <p className="font-semibold text-slate-500">No WorkItems extracted yet</p>
                            <p className="mt-0.5">Upload a cahier de specs and start the AI extraction to preview generated WorkItems here.</p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}