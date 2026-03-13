"use client";

import { MandateDocumentPanel } from "./mandate-documents";

import { cn } from "@/lib/utils";
import {
    Sparkles,
    Workflow,
    LogOut,
    WalletCards,
    BookOpen,
    Cpu
} from "lucide-react";

export const GEMINI_MODELS = [
    { id: "gemini-2.5-pro", name: "🔴 Gemini 2.5 Pro", inputCost: 1.25, outputCost: 10.00 },
    { id: "gemini-2.5-flash", name: "🟡 Gemini 2.5 Flash", inputCost: 0.30, outputCost: 2.50 },
    { id: "gemini-2.5-flash-lite", name: "🟢 Gemini 2.5 Flash-Lite", inputCost: 0.10, outputCost: 0.40 },
    { id: "gemini-2.5-pro-preview-05-06", name: "🔴 Gemini 2.5 Pro Preview (May)", inputCost: 1.25, outputCost: 10.00 },
    { id: "gemini-3-flash-preview", name: "🟡 Gemini 3 Flash Preview", inputCost: 0.50, outputCost: 3.00 },
    { id: "gemini-3.1-pro-preview", name: "🔴 Gemini 3.1 Pro Preview", inputCost: 2.00, outputCost: 12.00 },
    { id: "gemini-flash-latest", name: "🟡 Gemini Flash Latest", inputCost: 0.50, outputCost: 3.00 },
    { id: "gemini-pro-latest", name: "🔴 Gemini Pro Latest", inputCost: 2.00, outputCost: 12.00 }
];

export const DEEP_RESEARCH_MODELS = [
    { id: "deep-research-pro-preview-12-2025", name: "🔎 Gemini Deep Research Agent (Preview)" }
];

interface SidebarProps {
    currentView: "genesis" | "evaluation" | "portfolio" | "guide";
    onViewChange: (view: "genesis" | "evaluation" | "portfolio" | "guide") => void;
    aiModel: string;
    setAiModel: (model: string) => void;
    deepResearchEnabled: boolean;
    setDeepResearchEnabled: (enabled: boolean) => void;
    deepResearchModel: string;
    setDeepResearchModel: (model: string) => void;
    setMandateDocs: (docs: { filename: string }[]) => void;
}

export function Sidebar({ 
    currentView, onViewChange, 
    aiModel, setAiModel, 
    deepResearchEnabled, setDeepResearchEnabled,
    deepResearchModel, setDeepResearchModel,
    setMandateDocs 
}: SidebarProps) {
    return (
        <div className="flex h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-zinc-100 bg-white/50 p-6 backdrop-blur-xl dark:border-zinc-800 dark:bg-black/50">
            <div className="space-y-8">

                {/* Logo / Branding */}
                <div className="flex items-center gap-3 px-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-sm shadow-primary/20">
                        <img src="/logo.png" alt="Innovation Engine" className="h-10 w-10 object-cover" />
                    </div>
                    <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 flex flex-col">
                        <span>The Innovation Engine (TIE)</span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal leading-none mt-1">(Ver 1.3-DEV)</span>
                    </span>
                </div>

                {/* Navigation */}
                <nav className="space-y-2">
                    <button
                        onClick={() => onViewChange("genesis")}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ease-out",
                            currentView === "genesis"
                                ? "bg-[#6095FA]/10 text-[#6095FA] dark:bg-[#6095FA]/20 dark:text-blue-400"
                                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900"
                        )}
                    >
                        <Sparkles size={18} className={currentView === "genesis" ? "animate-pulse" : ""} />
                        Genesis Mode
                    </button>

                    <button
                        onClick={() => onViewChange("evaluation")}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ease-out",
                            currentView === "evaluation"
                                ? "bg-[#6095FA]/10 text-[#6095FA] dark:bg-[#6095FA]/20 dark:text-blue-400"
                                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900"
                        )}
                    >
                        <Workflow size={18} />
                        Evaluation Funnel
                    </button>

                    <button
                        onClick={() => onViewChange("portfolio")}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ease-out",
                            currentView === "portfolio"
                                ? "bg-[#6095FA]/10 text-[#6095FA] dark:bg-[#6095FA]/20 dark:text-blue-400"
                                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900"
                        )}
                    >
                        <WalletCards size={18} />
                        Portfolio Archive
                    </button>

                    <button
                        onClick={() => onViewChange("guide")}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ease-out",
                            currentView === "guide"
                                ? "bg-[#6095FA]/10 text-[#6095FA] dark:bg-[#6095FA]/20 dark:text-blue-400"
                                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900"
                        )}
                    >
                        <BookOpen size={18} />
                        How to Use
                    </button>
                </nav>
            </div>

            {/* Footer Navigation */}
            <div className="pb-4 space-y-4">
                <div className="mb-6 mb-2">
                    <MandateDocumentPanel onDocsChange={setMandateDocs} />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wider text-zinc-500 uppercase px-2">AI Engine</label>
                    <div className="relative group">
                        <select
                            value={aiModel}
                            onChange={(e) => setAiModel(e.target.value)}
                            className="w-full appearance-none rounded-xl border border-zinc-200 bg-white/50 px-4 py-3 pr-10 text-xs font-medium text-zinc-700 outline-none transition-all hover:bg-zinc-50 focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-800 dark:bg-black/50 dark:text-zinc-300 dark:hover:bg-zinc-900/50"
                        >
                            {GEMINI_MODELS.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name} — ${model.inputCost < 1 ? model.inputCost.toFixed(2) : model.inputCost.toFixed(2)}/M in · ${model.outputCost < 1 ? model.outputCost.toFixed(2) : model.outputCost.toFixed(2)}/M out
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-400">
                            <Cpu size={14} className="group-hover:text-primary transition-colors" />
                        </div>
                    </div>
                </div>

                {/* Deep Research Integration */}
                <div className="space-y-3 rounded-xl border border-zinc-200 bg-white/50 p-3 dark:border-zinc-800 dark:bg-black/40">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                            Deep Research
                        </label>
                        <button
                            onClick={() => setDeepResearchEnabled(!deepResearchEnabled)}
                            className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                deepResearchEnabled ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-700"
                            )}
                        >
                            <span
                                className={cn(
                                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                    deepResearchEnabled ? "translate-x-4" : "translate-x-0"
                                )}
                            />
                        </button>
                    </div>

                    {deepResearchEnabled && (
                        <select
                            value={deepResearchModel}
                            onChange={(e) => setDeepResearchModel(e.target.value)}
                            className="w-full appearance-none rounded-lg border border-zinc-200 bg-white/50 px-3 py-2 text-xs font-medium text-zinc-700 outline-none transition-all hover:bg-zinc-50 focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-800 dark:bg-black/60 dark:text-zinc-300 dark:hover:bg-zinc-900/50"
                        >
                            {DEEP_RESEARCH_MODELS.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <button
                    onClick={() => { localStorage.removeItem("auth_token"); window.location.reload(); }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-500 transition-all hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                >
                    <LogOut size={18} />
                    Disconnect
                </button>
            </div>
        </div>
    );
}
