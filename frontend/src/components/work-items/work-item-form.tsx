"use client";

import { useEffect, useState } from "react";
import {
    ClipboardList,
    FileText,
    Flag,
    Layers3,
    BookOpen,
    CheckCircle2,
    AlertCircle,
    Lock,
} from "lucide-react";
import { CreateWorkItemPayload, WorkItemType, WorkItem } from "@/lib/types";

type Props = {
    projectId: string;
    onSubmit: (payload: CreateWorkItemPayload) => Promise<void>;
    loading?: boolean;
    initialData?: WorkItem;
};

const workItemTypes: WorkItemType[] = [
    "FEATURE",
    "BUG",
    "IMPROVEMENT",
    "TASK",
    "USER_STORY",
];

const priorityOptions = ["LOW", "MEDIUM", "HIGH"];

const inputBase =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[var(--cap-blue)]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--cap-blue)]/10 disabled:cursor-not-allowed disabled:opacity-50";

function FieldLabel({
                        icon,
                        label,
                        sub,
                    }: {
    icon: React.ReactNode;
    label: string;
    sub?: string;
}) {
    return (
        <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                {icon}
            </span>
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                    {label}
                </p>
                {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
            </div>
        </div>
    );
}

export default function WorkItemForm({
                                         projectId,
                                         onSubmit,
                                         loading,
                                         initialData,
                                     }: Props) {
    const isProcessing = initialData?.status === "PROCESSING";

    const [title, setTitle] = useState("");
    const [type, setType] = useState<WorkItemType>("FEATURE");
    const [description, setDescription] = useState("");
    const [acceptanceCriteriaText, setAcceptanceCriteriaText] = useState("");
    const [businessRulesText, setBusinessRulesText] = useState("");
    const [priority, setPriority] = useState("");

    useEffect(() => {
        if (!initialData) return;
        setTitle(initialData.title);
        setType(initialData.type);
        setDescription(initialData.description || "");
        setAcceptanceCriteriaText(initialData.acceptanceCriteria?.join("\n") || "");
        setBusinessRulesText(initialData.businessRules?.join("\n") || "");
        setPriority(initialData.priority || "");
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isProcessing) return;

        const acceptanceCriteria = acceptanceCriteriaText
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean);
        const businessRules = businessRulesText
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean);

        await onSubmit({
            projectId,
            title,
            type,
            description,
            acceptanceCriteria,
            businessRules,
            priority,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Processing Warning */}
            {isProcessing && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                    <Lock size={15} className="mt-0.5 shrink-0" />
                    <span>
                        This work item is currently processing and cannot be edited.
                    </span>
                </div>
            )}

            {/* Title + Type row */}
            <div className="grid gap-6 sm:grid-cols-2">
                {/* Title */}
                <div className="sm:col-span-2">
                    <FieldLabel icon={<ClipboardList size={13} />} label="Title" />
                    <input
                        disabled={isProcessing}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter a clear, descriptive title…"
                        required
                        className={inputBase}
                    />
                </div>

                {/* Type */}
                <div>
                    <FieldLabel icon={<Layers3 size={13} />} label="Type" />
                    <select
                        disabled={isProcessing}
                        value={type}
                        onChange={(e) => setType(e.target.value as WorkItemType)}
                        className={inputBase}
                    >
                        {workItemTypes.map((t) => (
                            <option key={t} value={t}>
                                {t.replace("_", " ")}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Priority */}
                <div>
                    <FieldLabel icon={<Flag size={13} />} label="Priority" />
                    <select
                        disabled={isProcessing}
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className={inputBase}
                    >
                        <option value="">— Select priority —</option>
                        {priorityOptions.map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Description */}
            <div>
                <FieldLabel
                    icon={<FileText size={13} />}
                    label="Description"
                    sub="Describe the scope and context of this work item"
                />
                <textarea
                    disabled={isProcessing}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide a clear description of what needs to be done…"
                    rows={4}
                    className={`${inputBase} resize-none leading-relaxed`}
                />
            </div>

            {/* Acceptance Criteria + Business Rules */}
            <div className="grid gap-6 sm:grid-cols-2">
                <div>
                    <FieldLabel
                        icon={<CheckCircle2 size={13} />}
                        label="Acceptance Criteria"
                        sub="One criterion per line"
                    />
                    <textarea
                        disabled={isProcessing}
                        value={acceptanceCriteriaText}
                        onChange={(e) => setAcceptanceCriteriaText(e.target.value)}
                        placeholder={"User can log in with email\nUser sees error on wrong password"}
                        rows={5}
                        className={`${inputBase} resize-none font-mono text-xs leading-relaxed`}
                    />
                </div>

                <div>
                    <FieldLabel
                        icon={<BookOpen size={13} />}
                        label="Business Rules"
                        sub="One rule per line"
                    />
                    <textarea
                        disabled={isProcessing}
                        value={businessRulesText}
                        onChange={(e) => setBusinessRulesText(e.target.value)}
                        placeholder={"Passwords must be 8+ characters\nEmail must be unique"}
                        rows={5}
                        className={`${inputBase} resize-none font-mono text-xs leading-relaxed`}
                    />
                </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    disabled={loading || isProcessing}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--cap-blue)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Saving…
                        </>
                    ) : isProcessing ? (
                        <>
                            <Lock size={14} />
                            Locked
                        </>
                    ) : initialData ? (
                        "Update Work Item"
                    ) : (
                        "Create Work Item"
                    )}
                </button>
            </div>
        </form>
    );
}