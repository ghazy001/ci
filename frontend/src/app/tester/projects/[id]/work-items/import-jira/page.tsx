"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, AlertCircle, Download } from "lucide-react";

import JiraImportForm from "@/components/work-items/jira-import-form";
import { workItemService } from "@/lib/work-item.service";
import { ImportJiraWorkItemPayload } from "@/lib/types";

export default function ImportJiraWorkItemPage() {
    const params    = useParams();
    const router    = useRouter();
    const projectId = params.id as string;

    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState("");

    const handleSubmit = async (payload: ImportJiraWorkItemPayload) => {
        try {
            setLoading(true);
            setError("");
            await workItemService.importFromJira(payload);
            router.push(`/tester/projects/${projectId}`);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to import Jira issue");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[linear-gradient(160deg,#f8fbff_0%,#eef5ff_100%)]">
            <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">

                {/* ── Page header ── */}
                <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white px-7 py-6 shadow-[0_1px_3px_0_rgb(0,0,0,0.04),0_4px_16px_0_rgb(0,0,0,0.04)]">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--cap-blue)]/0 via-[var(--cap-blue)] to-[var(--cap-blue)]/0" />

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                <Download size={18} strokeWidth={1.8} />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                                    Work Items
                                </p>
                                <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
                                    Import from Jira
                                </h1>
                                <p className="mt-1 max-w-xl text-sm text-slate-400">
                                    Search and preview a Jira issue, then import it as a structured work item.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => router.push(`/tester/projects/${projectId}`)}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 hover:shadow-sm"
                        >
                            <ChevronLeft size={15} />
                            Back to Project
                        </button>
                    </div>

                    {/* Error inside header */}
                    {error && (
                        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                            <AlertCircle size={15} className="mt-0.5 shrink-0" />
                            {error}
                        </div>
                    )}
                </section>

                {/* ── Form ── */}
                <JiraImportForm
                    projectId={projectId}
                    onSubmit={handleSubmit}
                    loading={loading}
                />

            </div>
        </div>
    );
}