"use client";

import { useState } from "react";
import { Loader2, X, Zap, Globe, Shield, Settings2, ChevronRight, CheckCircle2 } from "lucide-react";
import {
    AutomationFramework,
    BrowserTarget,
    GenerateAutomationScriptPayload,
    TestCase,
} from "@/lib/types";

type Props = {
    open: boolean;
    testCase: TestCase | null;
    loading?: boolean;
    onClose: () => void;
    onSubmit: (payload: GenerateAutomationScriptPayload) => Promise<void>;
};

const frameworkOptions: { value: AutomationFramework; label: string; tag: string }[] = [
    { value: "PLAYWRIGHT_TS", label: "Playwright", tag: "TypeScript" },
    { value: "PLAYWRIGHT_PYTHON", label: "Playwright", tag: "Python" },
    { value: "CYPRESS_TS",  label: "Cypress",    tag: "TypeScript" },
    { value: "SELENIUM_JAVA", label: "Selenium", tag: "Java" },
];

const browserOptions: { value: BrowserTarget; label: string }[] = [
    { value: "CHROMIUM", label: "Chromium" },
    { value: "FIREFOX",  label: "Firefox" },
    { value: "WEBKIT",   label: "WebKit" },
    { value: "CHROME",   label: "Chrome" },
    { value: "EDGE",     label: "Edge" },
];

const selectorOptions = [
    { value: "AUTO",              label: "Auto",             desc: "Let AI decide" },
    { value: "ROLE_FIRST",        label: "Role / Label",     desc: "Accessible selectors" },
    { value: "DATA_TEST_ID_FIRST",label: "data-testid",      desc: "Test attribute" },
    { value: "CSS_FALLBACK",      label: "CSS",              desc: "CSS selectors" },
];

type SelectorStrategy = "AUTO" | "ROLE_FIRST" | "DATA_TEST_ID_FIRST" | "CSS_FALLBACK";

export default function GenerateScriptModal({ open, testCase, loading = false, onClose, onSubmit }: Props) {
    const [framework, setFramework]   = useState<AutomationFramework>("PLAYWRIGHT_TS");
    const [targetUrl, setTargetUrl]   = useState("");
    const [browser, setBrowser]       = useState<BrowserTarget>("CHROMIUM");
    const [environment, setEnvironment] = useState("local");
    const [selectorsStrategy, setSelectorsStrategy] = useState<SelectorStrategy>("AUTO");
    const [authRequired, setAuthRequired] = useState(false);
    const [authRole, setAuthRole]         = useState("");
    const [authInstructions, setAuthInstructions] = useState("");
    const [extraInstructions, setExtraInstructions] = useState(
        "Use environment variables for sensitive values. Do not hardcode credentials."
    );
    const [formError, setFormError] = useState<string | null>(null);

    if (!open || !testCase) return null;

    const handleSubmit = async () => {
        setFormError(null);
        if (!targetUrl.trim()) { setFormError("Target URL is required."); return; }
        if (!/^https?:\/\//i.test(targetUrl.trim())) { setFormError("Target URL must start with http:// or https://"); return; }
        await onSubmit({
            framework, targetUrl: targetUrl.trim(), browser,
            environment: environment.trim() || undefined,
            selectorsStrategy,
            authRequired,
            authRole: authRole.trim() || undefined,
            authInstructions: authInstructions.trim() || undefined,
            extraInstructions: extraInstructions.trim() || undefined,
            variables: {},
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/30 backdrop-blur-[2px] p-0 sm:p-4"
             onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}>

            <div className="w-full sm:max-w-2xl max-h-[96vh] sm:max-h-[88vh] flex flex-col bg-white sm:rounded-2xl overflow-hidden"
                 style={{ boxShadow: "0 32px 80px -12px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)" }}>

                {/* ── Header ── */}
                <div className="flex-shrink-0 px-6 pt-6 pb-5 border-b border-slate-100">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-[15px] font-semibold text-slate-900 leading-tight">
                                    Generate automation script
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    AI inspects target page before writing code
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} disabled={loading}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Test case pill */}
                    <div className="mt-4 flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-100">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                                Approved test case
                            </p>
                            <p className="text-sm font-medium text-slate-800 truncate">{testCase.title}</p>
                            {testCase.expectedResult && (
                                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{testCase.expectedResult}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {/* Framework selection */}
                    <section>
                        <SectionLabel icon={<Settings2 className="w-3.5 h-3.5" />} label="Framework" />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                            {frameworkOptions.map((opt) => (
                                <button key={opt.value} type="button"
                                        onClick={() => setFramework(opt.value)}
                                        className={`relative flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all ${
                                            framework === opt.value
                                                ? "border-violet-600 bg-violet-50 ring-2 ring-violet-600/10"
                                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                        }`}>
                                    <span className={`text-[13px] font-semibold ${framework === opt.value ? "text-violet-700" : "text-slate-700"}`}>
                                        {opt.label}
                                    </span>
                                    <span className={`text-[11px] mt-0.5 ${framework === opt.value ? "text-violet-500" : "text-slate-400"}`}>
                                        {opt.tag}
                                    </span>
                                    {framework === opt.value && (
                                        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-violet-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* URL + Environment */}
                    <section>
                        <SectionLabel icon={<Globe className="w-3.5 h-3.5" />} label="Target" />
                        <div className="mt-2 space-y-2.5">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono select-none">
                                    URL
                                </span>
                                <input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)}
                                       placeholder="https://example.com/login"
                                       className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 bg-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                                        Environment
                                    </label>
                                    <input value={environment} onChange={(e) => setEnvironment(e.target.value)}
                                           placeholder="local / staging / production"
                                           className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 bg-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                                        Browser
                                    </label>
                                    <select value={browser} onChange={(e) => setBrowser(e.target.value as BrowserTarget)}
                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all appearance-none cursor-pointer">
                                        {browserOptions.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Selector strategy */}
                    <section>
                        <SectionLabel icon={<ChevronRight className="w-3.5 h-3.5" />} label="Selector strategy" />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                            {selectorOptions.map((opt) => (
                                <button key={opt.value} type="button"
                                        onClick={() => setSelectorsStrategy(opt.value as SelectorStrategy)}
                                        className={`flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all ${
                                            selectorsStrategy === opt.value
                                                ? "border-violet-600 bg-violet-50 ring-2 ring-violet-600/10"
                                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                        }`}>
                                    <span className={`text-[13px] font-semibold ${selectorsStrategy === opt.value ? "text-violet-700" : "text-slate-700"}`}>
                                        {opt.label}
                                    </span>
                                    <span className={`text-[11px] mt-0.5 ${selectorsStrategy === opt.value ? "text-violet-500" : "text-slate-400"}`}>
                                        {opt.desc}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Auth */}
                    <section>
                        <div className="flex items-center justify-between">
                            <SectionLabel icon={<Shield className="w-3.5 h-3.5" />} label="Authentication" />
                            <button type="button" onClick={() => setAuthRequired(!authRequired)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                        authRequired ? "bg-violet-600" : "bg-slate-200"
                                    }`}>
                                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform ${
                                    authRequired ? "translate-x-4" : "translate-x-1"
                                }`} />
                            </button>
                        </div>

                        <div className={`overflow-hidden transition-all duration-200 ${authRequired ? "mt-3 max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                            <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <div>
                                    <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                                        Role
                                    </label>
                                    <input value={authRole} onChange={(e) => setAuthRole(e.target.value)}
                                           placeholder="tester / admin / customer"
                                           className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 bg-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                                        Instructions
                                    </label>
                                    <textarea value={authInstructions} onChange={(e) => setAuthInstructions(e.target.value)}
                                              rows={3} placeholder="Use TESTER_EMAIL and TESTER_PASSWORD environment variables. Login before executing the test."
                                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 bg-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all resize-none" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Extra instructions */}
                    <section>
                        <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                            Extra instructions
                        </label>
                        <textarea value={extraInstructions} onChange={(e) => setExtraInstructions(e.target.value)}
                                  rows={3}
                                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 bg-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all resize-none" />
                    </section>

                    {/* Error */}
                    {formError && (
                        <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            {formError}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
                    <p className="text-xs text-slate-400 hidden sm:block">
                        Playwright will inspect the page before code generation
                    </p>
                    <div className="flex items-center gap-2 ml-auto">
                        <button type="button" onClick={onClose} disabled={loading}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40">
                            Cancel
                        </button>
                        <button type="button" onClick={handleSubmit} disabled={loading}
                                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm shadow-violet-200">
                            {loading
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                                : <><Zap className="w-4 h-4" strokeWidth={2.5} /> Generate script</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <span className="text-slate-400">{icon}</span>
            {label}
        </div>
    );
}