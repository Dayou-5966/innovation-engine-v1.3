"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight, Loader, Zap, AlertTriangle, RefreshCw } from "lucide-react";

interface GenesisModeProps {
    onSelectConcept: (conceptText: string) => void;
    aiModel: string;
}

export function GenesisMode({ onSelectConcept, aiModel }: GenesisModeProps) {
    const [keywords, setKeywords] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [concepts, setConcepts] = useState<{ id: number; title: string; description: string }[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!keywords.trim()) return;
        setIsGenerating(true);
        setConcepts(null);
        setError(null);
        try {
            const token = localStorage.getItem("auth_token");
            const API_URL = "";
            const res = await fetch(`${API_URL}/api/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ keywords, model: aiModel })
            });
            if (!res.ok) {
                if (res.status === 401) {
                    localStorage.removeItem("auth_token");
                    window.location.reload();
                    return;
                }
                let detail = `HTTP ${res.status}`;
                try { const body = await res.json(); detail = body.detail || detail; } catch { }
                throw new Error(detail);
            }
            const data = await res.json();
            setConcepts(data.concepts);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            console.error("Error generating concepts:", msg);
            setError(msg);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSelect = (concept: { title: string; description: string }) => {
        const text = `${concept.title}: ${concept.description}`;
        onSelectConcept(text);
    };

    return (
        <div className="flex h-full w-full flex-col p-8 sm:p-12 animate-in fade-in zoom-in-95 duration-500">

            {/* Header */}
            <div className="mb-12 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#6095FA]/10 px-3 py-1 mb-4 text-sm font-medium text-[#6095FA] dark:bg-[#6095FA]/20 dark:text-blue-400">
                    <Sparkles size={14} />
                    Phase 1
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
                    Genesis Mode
                </h1>
                <p className="text-lg font-light text-zinc-500 dark:text-zinc-400">
                    Input your initial strategic keywords or disjointed thoughts. The engine will forge them into concrete, actionable concepts.
                </p>
            </div>

            {/* Input Section */}
            <div className="flex w-full max-w-3xl items-center gap-4 mb-16 relative">
                <div className="relative w-full shadow-lg shadow-zinc-100/50 dark:shadow-none rounded-2xl">
                    <Input
                        className="h-16 w-full rounded-2xl border-zinc-200 bg-white pl-6 pr-32 text-lg shadow-none outline-none focus-visible:ring-2 focus-visible:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-900/50"
                        placeholder="e.g. distributed computing, zero-trust, latency"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    />
                    <div className="absolute right-2 top-2 bottom-2">
                        <Button
                            className="h-full rounded-xl px-6 bg-primary text-white hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
                            onClick={handleGenerate}
                            disabled={isGenerating || !keywords.trim()}
                        >
                            {isGenerating ? <Loader className="animate-spin" size={18} /> : "Generate"}
                            {!isGenerating && <ArrowRight size={18} className="ml-2" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && !isGenerating && (
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 p-8 max-w-xl">
                    <AlertTriangle className="h-8 w-8 text-red-400" />
                    <div className="text-center">
                        <p className="font-semibold text-red-800 dark:text-red-300">Generation failed</p>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1 font-mono">{error}</p>
                    </div>
                    <Button
                        variant="outline"
                        className="gap-2 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40"
                        onClick={handleGenerate}
                    >
                        <RefreshCw size={14} /> Retry
                    </Button>
                </div>
            )}

            {/* Loading */}
            {isGenerating && (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 animate-pulse space-y-4">
                    <div className="h-12 w-12 rounded-full border-4 border-zinc-100 border-t-primary animate-spin dark:border-zinc-800 dark:border-t-primary" />
                    <p>Forging concepts...</p>
                </div>
            )}

            {/* Concept Cards */}
            {concepts && !isGenerating && (
                <>
                    <p className="text-sm text-zinc-400 mb-6 flex items-center gap-2">
                        <Zap size={13} className="text-primary" />
                        Click <strong className="text-zinc-600 dark:text-zinc-300">Evaluate this concept</strong> on any card to send it directly to Phase 2.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 fade-in duration-700">
                        {concepts.map((concept, index) => (
                            <Card
                                key={concept.id}
                                className="relative overflow-hidden rounded-2xl border-zinc-100 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-900/50 group flex flex-col"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CardContent className="p-8 flex-1 flex flex-col">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold mb-6">
                                        0{index + 1}
                                    </div>
                                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2 leading-tight">
                                        {concept.title}
                                    </h3>
                                    <div className="flex gap-2 mb-4">
                                        <span className="inline-block text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/50">
                                            {aiModel}
                                        </span>
                                        <span className="inline-block text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50">
                                            AI ✔️ Search ✔️
                                        </span>
                                    </div>
                                    <p className="text-zinc-500 dark:text-zinc-400 font-light leading-relaxed flex-1">
                                        {concept.description}
                                    </p>
                                    {/* CTA button — appears on hover, always visible on touch */}
                                    <button
                                        onClick={() => handleSelect(concept)}
                                        className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/8 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-transparent text-sm font-semibold transition-all duration-200 group/btn"
                                    >
                                        <Zap size={14} className="group-hover/btn:animate-pulse" />
                                        Evaluate this concept
                                        <ArrowRight size={14} />
                                    </button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
