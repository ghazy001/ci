"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ShieldAlert, Sparkles } from "lucide-react";

import { getStoredUser } from "@/lib/auth";
import type { User } from "@/lib/types";
import TestCaseGenerationPanel from "@/components/test-cases/test-case-generation-panel";

export default function TesterWorkItemTestCasesPage() {
    const params = useParams();

    const projectId = params.id as string;
    const workItemId = params.workItemId as string;

    const [user, setUser] = useState<User | null>(null);
    const [userReady, setUserReady] = useState(false);

    useEffect(() => {
        const storedUser = getStoredUser();
        setUser(storedUser);
        setUserReady(true);
    }, []);

    if (!userReady) {
        return (
            <FullPageState>
                <Spinner text="Loading workspace…" />
            </FullPageState>
        );
    }

    if (!user || user.role !== "TESTER") {
        return (
            <FullPageState>
                <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-white p-5 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                        <ShieldAlert size={18} />
                    </div>

                    <div>
                        <p className="font-semibold text-slate-900">Access Denied</p>
                        <p className="mt-0.5 text-sm text-slate-500">
                            You don&apos;t have permission to view this page.
                        </p>
                    </div>
                </div>
            </FullPageState>
        );
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(160deg,#f8fbff_0%,#eef5ff_100%)]">
            <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
                <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white px-7 py-6 shadow-[0_1px_3px_0_rgb(0,0,0,0.04),0_4px_16px_0_rgb(0,0,0,0.04)]">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--cap-blue)]/0 via-[var(--cap-blue)] to-[var(--cap-blue)]/0" />

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cap-blue)]/8 text-[var(--cap-blue)]">
                                <Sparkles size={18} strokeWidth={1.8} />
                            </div>

                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cap-blue)]">
                                    QA Workspace
                                </p>

                                <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
                                    AI Test Cases
                                </h1>

                                <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-400">
                                    Review focused test cases, approve the useful ones, and generate automation only when ready.
                                </p>
                            </div>
                        </div>

                        <Link
                            href={`/tester/projects/${projectId}/work-items/${workItemId}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 hover:shadow-sm"
                        >
                            <ChevronLeft size={15} />
                            Back to work item
                        </Link>
                    </div>
                </section>

                <TestCaseGenerationPanel workItemId={workItemId} />
            </div>
        </div>
    );
}

function FullPageState({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[linear-gradient(160deg,#f8fbff_0%,#eef5ff_100%)]">
            <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
        </div>
    );
}

function Spinner({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-400 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--cap-blue)] border-t-transparent" />
            {text}
        </div>
    );
}
