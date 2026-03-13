"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Workflow,
    CheckCircle2,
    Circle,
    Loader,
    Play,
    ArrowLeft,
    RotateCcw,
    Settings2,
    ChevronDown,
    ChevronUp,
    Square,
    AlertCircle,
    FileText,
    Zap
} from "lucide-react";

import { VisualOutputDashboard, EvaluationResult } from "./dashboard";

const EVAL_TEMPLATES = [
    {
        id: "healthcare",
        label: "Healthcare Focus",
        color: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/40",
        overrides: {
            stage1: "Prioritise regulatory pathway clarity (FDA 510(k) / CE marking). Flag any HIPAA or patient-data risks early.",
            stage2: "Focus market sizing on US and EU digital health segments. Identify payer dynamics and reimbursement feasibility.",
            stage3: "Model a longer payback horizon (5–8 years). Factor in clinical trial CAPEX and regulatory approval delays.",
            stage4: "Emphasise patient-outcome evidence and clinical validation requirements in the final recommendation.",
        },
    },
    {
        id: "b2b-saas",
        label: "B2B SaaS Lens",
        color: "text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800/40",
        overrides: {
            stage1: "Evaluate fit for a subscription / seat-based SaaS model. Check alignment with enterprise procurement cycles.",
            stage2: "Research existing SaaS incumbents, integration ecosystem, and switching-cost moats. Focus on ARR benchmarks.",
            stage3: "Assume SaaS unit economics: 70 %+ gross margin, 12-month payback on CAC, net revenue retention >110 %.",
            stage4: "Score heavily on go-to-market motion clarity and ability to reach $1M ARR within 18 months.",
        },
    },
    {
        id: "capital-constrained",
        label: "Capital-Constrained",
        color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40",
        overrides: {
            stage1: "Assume a bootstrap or pre-seed budget (< $500K total). Flag any dependency on deep-tech or large R&D spend.",
            stage2: "Identify low-cost distribution channels (product-led growth, open-source, community). Avoid capital-intensive sales.",
            stage3: "Cap total CAPEX at $250K. Model break-even within 12 months. Penalise any scenario requiring Series A to survive.",
            stage4: "Reward lean, high-margin business models. Reject ideas that structurally require large upfront capital.",
        },
    },
    {
        id: "deep-tech",
        label: "Deep Tech / IP",
        color: "text-violet-600 bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800/40",
        overrides: {
            stage1: "Evaluate strength of the underlying technical moat. Identify defensible IP, patents, or trade secrets.",
            stage2: "Research academic publications, university spin-outs, and DARPA/NSF grants as competitive signals.",
            stage3: "Model a 3–5 year pre-revenue R&D phase. Include grant funding as a realistic CAPEX offset.",
            stage4: "Prioritise technical feasibility and IP defensibility over short-term commercialisation speed.",
        },
    },
] as const;

const BASE_STEPS = [
    { id: 1, title: "Strategic Triage", desc: (n: number, dr: boolean) => n > 0 ? `Searching web + reading ${n} mandate doc${n > 1 ? "s" : ""} & evaluating alignment.` : "Searching web & evaluating strategic mandate alignment." },
    { id: 2, title: "Feasibility Scans", desc: (n: number, dr: boolean) => dr ? "Running Deep Research on TAM, SAM & IP (Takes 10–30 mins)." : "Live web search: market reports, competitor funding, patent filings." },
    { id: 3, title: "Stress Testing", desc: (n: number, dr: boolean) => dr ? "Running Deep Research for financial data (Takes 10–30 mins)." : "Running Monte Carlo simulations for financial risk." },
    { id: 4, title: "Compiling Report", desc: (n: number, dr: boolean) => "Synthesising all stage findings into final report." }
];

interface EvaluationFunnelProps {
    seedConcept?: string | null;
    onSeedConsumed?: () => void;
    onBackToGenesis?: () => void;
    aiModel: string;
    deepResearchEnabled: boolean;
    deepResearchModel: string;
    mandateDocs: { filename: string }[];
}

export function EvaluationFunnel({ seedConcept, onSeedConsumed, onBackToGenesis, aiModel, deepResearchEnabled, deepResearchModel, mandateDocs }: EvaluationFunnelProps) {
    const [idea, setIdea] = useState("");
    const [currentStep, setCurrentStep] = useState(0);
    const [stageProgressPct, setStageProgressPct] = useState(0);
    const [displayProgressPct, setDisplayProgressPct] = useState(0);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluationData, setEvaluationData] = useState<EvaluationResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [overrides, setOverrides] = useState({ stage1: "", stage2: "", stage3: "", stage4: "" });
    const [showOverrides, setShowOverrides] = useState(false);
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const autoStartedRef = useRef<string | null>(null);

    const STEPS = BASE_STEPS.map(s => ({ ...s, resolvedDesc: s.desc(mandateDocs.length, deepResearchEnabled), model: aiModel }));

    // When a seed concept arrives from Genesis Mode, prefill and auto-start
    useEffect(() => {
        if (seedConcept && seedConcept !== autoStartedRef.current) {
            autoStartedRef.current = seedConcept;
            // Reset previous evaluation state
            setEvaluationData(null);
            setError(null);
            setCurrentStep(0);
            setIsEvaluating(false);
            setIdea(seedConcept);
            onSeedConsumed?.();
            // Note: Auto-start removed to allow user time to configure Advanced Agent Overrides
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seedConcept]);

    // Smoothly animate the displayed progress percentage toward the actual backend target
    useEffect(() => {
        if (displayProgressPct === stageProgressPct) return;

        const interval = setInterval(() => {
            setDisplayProgressPct((prev) => {
                if (prev < stageProgressPct) {
                    return Math.min(prev + 1, stageProgressPct);
                } else if (prev > stageProgressPct) {
                    return stageProgressPct; // direct jump down on reset
                }
                return prev;
            });
        }, 15); // Fast smooth count up

        return () => clearInterval(interval);
    }, [stageProgressPct, displayProgressPct]);

    const startEvaluation = async (ideaText?: string) => {
        const target = (ideaText ?? idea).trim();
        if (!target) return;

        setIsEvaluating(true);
        setCurrentStep(1);
        setStageProgressPct(0);
        setDisplayProgressPct(0);
        setError(null);
        setEvaluationData(null);
        setCurrentJobId(null);

        try {
            const token = localStorage.getItem("auth_token");
            const API_URL = "";

            // Step 1 — kick off the pipeline in the background, get job_id immediately
            const startRes = await fetch(`${API_URL}/api/evaluate/async`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    idea: target, 
                    model: aiModel, 
                    overrides,
                    deep_research_enabled: deepResearchEnabled,
                    deep_research_model: deepResearchModel
                })
            });
            if (!startRes.ok) {
                const errText = await startRes.text();
                console.error("[Evaluation Funnel] startRes Error:", startRes.status, errText);
                if (startRes.status === 401) {
                    localStorage.removeItem("auth_token");
                    window.location.reload();
                    return;
                }
                throw new Error(`Failed to start evaluation: ${errText}`);
            }
            const { job_id } = await startRes.json();
            setCurrentJobId(job_id);

            // Step 2 — poll /api/evaluate/status/{job_id} every 3s until done
            const data = await new Promise<Record<string, unknown>>((resolve, reject) => {
                const poll = async () => {
                    try {
                        const statusRes = await fetch(`${API_URL}/api/evaluate/status/${job_id}`, {
                            headers: { "Authorization": `Bearer ${token}` }
                        });
                        if (!statusRes.ok) {
                            if (statusRes.status === 401) {
                                localStorage.removeItem("auth_token");
                                window.location.reload();
                                return;
                            }
                            const errBody = await statusRes.json().catch(() => ({}));
                            reject(new Error((errBody as { detail?: string }).detail ?? "Evaluation failed."));
                            return;
                        }
                        const status = await statusRes.json();
                        if (status.status === "done") {
                            resolve(status.result);
                        } else if (status.status === "cancelled") {
                            // Assemble partial report from intermediate results
                            const inter = status.intermediate || {};
                            const partial: any = {
                                Title: "Partial Evaluation Report",
                                Recommendation: "EVALUATION HALTED",
                                Justification: "The user manually stopped the evaluation pipeline before completion. Below are the raw findings generated up to the interruption point.",
                                D0_Scorecard: {
                                    Total_Score: 0,
                                    Strategic_Alignment: { Score: 0, Rationale: "Evaluation halted before scoring." },
                                    Disruptive_Potential: { Score: 0, Rationale: "Evaluation halted before scoring." },
                                    Technical_Feasibility: { Score: 0, Rationale: "Evaluation halted before scoring." },
                                    Commercial_Impact: { Score: 0, Rationale: "Evaluation halted before scoring." },
                                    Scalability: { Score: 0, Rationale: "Evaluation halted before scoring." }
                                },
                                Top_3_Deal_Killing_Risks: [],
                                Market_Verification: {
                                    TAM: "Pending",
                                    SAM: "Pending",
                                    SOM: "Pending",
                                    Key_Competitors: []
                                },
                                IP_Scan: {
                                    Key_Patent_Families: "Pending",
                                    Freedom_To_Operate_Risk: "Pending",
                                    Patent_Application_Opportunity: "Pending"
                                },
                                Financial_Simulation: {
                                    CAPEX: { Total_CAPEX_USD: 0 },
                                    OPEX_Annual: { Total_Annual_OPEX_USD: 0 },
                                    Revenue_Projections: { Year_1_USD: 0, Year_3_USD: 0, Year_5_USD: 0, Revenue_Model: "Pending" },
                                    Profitability: { Gross_Margin_Pct: 0, NPV_5yr_USD: 0, IRR_Pct: 0, Payback_Years: 0 },
                                    Key_Assumptions: [],
                                    Monte_Carlo: { Base_Investment_USD: 0, "5th_Percentile_Value": 0, Median_Value: 0, Risk_Assessment: "Pending" }
                                },
                                Signals_And_Signposts: {
                                    Bullish_Signals: [],
                                    Bearish_Signals: [],
                                    Strategic_Signposts: []
                                }
                            };

                            if (inter.stage1) {
                                partial.Eureka_Moment = inter.stage1.brief;
                                partial.Mandate_Insights = [{ Key_Point: "Stage 1 Halted", Source_Document: "N/A", Relevance: "Strategist completed analysis." }];
                                partial.Strategist_Verdict = { Kill_Switch: "HALTED", Reasoning: "Pipeline interrupted." };
                            }
                            if (inter.stage2) {
                                partial.Market_Verification.TAM = "See full report text below";
                                partial.Market_Verification.SAM = "See full report text below";
                                partial.Market_Verification.SOM = inter.stage2.report;
                            }
                            if (inter.stage3) {
                                partial.Financial_Simulation.Monte_Carlo.Risk_Assessment = inter.stage3.report;
                            }
                            resolve(partial);
                        } else if (status.status === "error") {
                            reject(new Error(status.error ?? "Pipeline error."));
                        } else {
                            // Use current_stage to strictly set the UI step
                            if (status.current_stage) {
                                const stageMap: Record<string, number> = {
                                    "stage1": 1,
                                    "stage2": 2,
                                    "stage3": 3,
                                    "stage4": 4
                                };
                                const actualStep = stageMap[status.current_stage];
                                if (actualStep !== undefined) {
                                    setCurrentStep(actualStep);
                                }
                            }
                            if (status.current_progress !== undefined) {
                                setStageProgressPct(status.current_progress);
                            }
                            // still running — poll again
                            setTimeout(poll, 3000);
                        }
                    } catch (e) {
                        reject(e);
                    }
                };
                poll();
            });

            setCurrentStep(STEPS.length + 1);
            setEvaluationData(data as unknown as EvaluationResult);

        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred during evaluation.");
            setIsEvaluating(false);
        } finally {
            setIsEvaluating(false);
        }

    };

    const handleReset = () => {
        autoStartedRef.current = null;
        setIdea("");
        setCurrentStep(0);
        setStageProgressPct(0);
        setDisplayProgressPct(0);
        setIsEvaluating(false);
        setEvaluationData(null);
        setError(null);
    };

    const cancelEvaluation = async () => {
        if (!currentJobId) return;
        try {
            const token = localStorage.getItem("auth_token");
            await fetch(`/api/evaluate/cancel/${currentJobId}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
        } catch (e) {
            console.error("Failed to cancel job", e);
        }
    };

    const isComplete = currentStep > STEPS.length;

    return (
        <div className="flex h-full w-full flex-col p-8 sm:p-12 animate-in fade-in zoom-in-95 duration-500">

            {/* Header */}
            <div className="mb-12 max-w-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#6095FA]/10 px-3 py-1 text-sm font-medium text-[#6095FA] dark:bg-[#6095FA]/20 dark:text-blue-400">
                        <Workflow size={14} />
                        Phase 2
                    </div>
                    {onBackToGenesis && (
                        <button
                            onClick={onBackToGenesis}
                            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors font-medium"
                        >
                            <ArrowLeft size={13} /> Back to Genesis
                        </button>
                    )}
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
                    Evaluation Funnel
                </h1>
                <p className="text-lg font-light text-zinc-500 dark:text-zinc-400">
                    Submit your concept for rigorous scrutiny. The orchestration payload will test desirability, feasibility, and viability.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                {/* Left: Input Area */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="relative shadow-lg shadow-zinc-100/50 dark:shadow-none rounded-2xl group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl z-10" />
                        <Textarea
                            className="min-h-[300px] w-full resize-none rounded-2xl border-zinc-200 bg-white p-6 text-lg font-light leading-relaxed shadow-none outline-none focus-visible:ring-2 focus-visible:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-900/50"
                            placeholder="Detail your generated concept here. Include market targets, expected technical capabilities, and alignment goals..."
                            value={idea}
                            onChange={(e) => setIdea(e.target.value)}
                            disabled={currentStep > 0}
                        />
                    </div>

                    {/* Advanced Agent Overrides Drawer */}
                    <div className="rounded-2xl border border-zinc-200 bg-white/50 overflow-hidden dark:border-zinc-800 dark:bg-zinc-900/30">
                        <button
                            onClick={() => setShowOverrides(!showOverrides)}
                            className="flex w-full items-center justify-between px-6 py-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Settings2 size={16} className="text-zinc-500" />
                                Advanced Agent Overrides (Optional)
                            </div>
                            {showOverrides ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                        </button>

                        {showOverrides && (
                            <div className="border-t border-zinc-100 p-6 space-y-4 bg-zinc-50/50 dark:border-zinc-800 dark:bg-black/20 animate-in slide-in-from-top-2 duration-300">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mb-2">
                                    Directly inject instructions into the prompts of the 4 autonomous agents to steer their behavior.
                                </p>

                                {/* Preset Templates */}
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-1.5">
                                        <Zap size={11} /> Quick Templates
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {EVAL_TEMPLATES.map(t => (
                                            <button
                                                key={t.id}
                                                disabled={currentStep > 0}
                                                onClick={() => setOverrides({ ...t.overrides })}
                                                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed ${t.color}`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                        <button
                                            disabled={currentStep > 0}
                                            onClick={() => setOverrides({ stage1: "", stage2: "", stage3: "", stage4: "" })}
                                            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] dark:bg-violet-900/50 dark:text-violet-300">1</span>
                                            Stage 1: Strategist
                                        </label>
                                        <Textarea
                                            placeholder="e.g., 'Assume no mandate constraints exist for this specific idea.'"
                                            value={overrides.stage1}
                                            onChange={(e) => setOverrides({ ...overrides, stage1: e.target.value })}
                                            className="min-h-[60px] resize-none text-sm dark:bg-zinc-900/50"
                                            disabled={currentStep > 0}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px] dark:bg-sky-900/50 dark:text-sky-300">2</span>
                                            Stage 2: Market Researcher
                                        </label>
                                        <Textarea
                                            placeholder="e.g., 'Focus competitive analysis entirely on the European SaaS market.'"
                                            value={overrides.stage2}
                                            onChange={(e) => setOverrides({ ...overrides, stage2: e.target.value })}
                                            className="min-h-[60px] resize-none text-sm dark:bg-zinc-900/50"
                                            disabled={currentStep > 0}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] dark:bg-rose-900/50 dark:text-rose-300">3</span>
                                            Stage 3: Quant & Risk Specialist
                                        </label>
                                        <Textarea
                                            placeholder="e.g., 'Target a 30% gross margin and assume initial CAPEX is exactly $2M.'"
                                            value={overrides.stage3}
                                            onChange={(e) => setOverrides({ ...overrides, stage3: e.target.value })}
                                            className="min-h-[60px] resize-none text-sm dark:bg-zinc-900/50"
                                            disabled={currentStep > 0}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] dark:bg-emerald-900/50 dark:text-emerald-300">4</span>
                                            Stage 4: Synthesizer
                                        </label>
                                        <Textarea
                                            placeholder="e.g., 'Adopt an extremely skeptical tone and fail any idea that lacks immediate ROI.'"
                                            value={overrides.stage4}
                                            onChange={(e) => setOverrides({ ...overrides, stage4: e.target.value })}
                                            className="min-h-[60px] resize-none text-sm dark:bg-zinc-900/50"
                                            disabled={currentStep > 0}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mandate Document Status */}
                    <div className={`flex flex-col gap-1.5 p-5 rounded-2xl border ${mandateDocs.length === 0 ? "bg-red-50/50 border-red-200/60 dark:bg-red-950/20 dark:border-red-900/50" : "bg-zinc-50 border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800"}`}>
                        <div className={`text-sm font-semibold flex items-center gap-2 ${mandateDocs.length === 0 ? "text-red-700 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                            {mandateDocs.length === 0 ? <AlertCircle size={16} /> : <FileText size={16} />}
                            {mandateDocs.length} Mandate Document{mandateDocs.length === 1 ? "" : "s"} Uploaded
                        </div>
                        {mandateDocs.length > 0 ? (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                Active context: {mandateDocs.map(d => <span key={d.filename} className="font-medium text-zinc-700 dark:text-zinc-300 mr-2">{d.filename}</span>)}
                            </p>
                        ) : (
                            <p className="text-xs text-red-600/80 dark:text-red-400/80 leading-relaxed font-medium">
                                Warning: The AI agents have no strategic context. The resulting evaluation may lack organizational alignment. Proceed with caution.
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3 mt-6">
                        <Button
                            size="lg"
                            className="flex-1 sm:flex-none h-14 rounded-xl px-8 bg-primary text-white hover:opacity-90 transition-opacity shadow-md shadow-primary/20 text-md"
                            onClick={() => startEvaluation()}
                            disabled={isEvaluating || !idea.trim() || isComplete}
                        >
                            {isEvaluating ? (
                                <><Loader className="mr-2 h-5 w-5 animate-spin" /> Evaluating Chunk {currentStep - 1}</>
                            ) : isComplete ? (
                                "Evaluation Complete"
                            ) : (
                                <><Play className="mr-2 h-4 w-4" /> Run Deep Evaluation</>
                            )}
                        </Button>
                        {isEvaluating && (
                            <Button
                                size="lg"
                                variant="destructive"
                                className="flex-none h-14 rounded-xl px-6 hover:opacity-90 transition-opacity shadow-md shadow-red-500/20 text-md"
                                onClick={cancelEvaluation}
                            >
                                <Square className="mr-2 h-5 w-5" /> Stop
                            </Button>
                        )}
                        {(isComplete || error || (!isEvaluating && evaluationData)) && (
                            <button
                                onClick={handleReset}
                                className="h-14 px-5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 transition-colors flex items-center gap-2"
                            >
                                <RotateCcw size={15} /> New Evaluation
                            </button>
                        )}
                    </div>
                </div>

                {/* Right: Progress Tracker */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Orchestration Status */}
                    <div className="rounded-3xl border border-zinc-100 bg-white/50 p-8 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/30">
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-8 flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                {isEvaluating && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${currentStep > 0 ? "bg-primary" : "bg-zinc-300 dark:bg-zinc-700"}`}></span>
                            </span>
                            Orchestration Status
                        </h3>

                        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[1.1rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:-z-10 before:bg-gradient-to-b before:from-zinc-200 before:to-transparent dark:before:from-zinc-800 before:transition-all">
                            {STEPS.map((step) => {
                                const isCompleted = currentStep > step.id;
                                const isActive = currentStep === step.id;

                                return (
                                    <div key={step.id} className="relative flex items-start gap-6 group">
                                        <div className={`mt-1 h-10 w-10 shrink-0 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-white dark:bg-black z-10 ${isCompleted ? "border-primary text-primary" :
                                            isActive ? "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(96,149,250,0.5)]" :
                                                "border-zinc-200 text-zinc-300 dark:border-zinc-800 dark:text-zinc-700"
                                            }`}
                                        >
                                            {isCompleted ? <CheckCircle2 size={20} className="text-primary" /> :
                                                isActive ? <Loader size={20} className="animate-spin text-primary" /> :
                                                    <span className="text-sm font-semibold">{step.id}</span>
                                            }
                                        </div>

                                        <div className="flex flex-col gap-1 transition-all duration-300">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className={`text-base font-semibold ${isCompleted || isActive ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-600"}`}>
                                                    {step.title}
                                                </h4>
                                            </div>
                                            <p className={`text-sm font-light ${isCompleted || isActive ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-700"}`}>
                                                {step.resolvedDesc}
                                            </p>
                                            {isActive && (
                                                <div className="w-full max-w-sm mt-3 flex items-center gap-3">
                                                    <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary transition-all duration-75 ease-out rounded-full shadow-[0_0_8px_rgba(96,149,250,0.5)]"
                                                            style={{ width: `${displayProgressPct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-semibold text-primary w-8 text-right shrink-0">
                                                        {displayProgressPct}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mt-12 p-6 rounded-xl bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
                    <p className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Orchestration Error</p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            )}

            {/* Result */}
            {evaluationData && (
                <div className="mt-16 pt-8 border-t border-zinc-100 dark:border-zinc-800">
                    {onBackToGenesis && (
                        <div className="mb-8 flex items-center gap-4">
                            <button
                                onClick={onBackToGenesis}
                                className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-primary transition-colors font-medium"
                            >
                                <ArrowLeft size={15} />
                                ← Return to Genesis Mode to evaluate another concept
                            </button>
                        </div>
                    )}
                    <VisualOutputDashboard data={evaluationData} />
                </div>
            )}
        </div>
    );
}
