"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    CheckCircle2, AlertTriangle, ShieldAlert, BadgeCheck,
    FileText, Scale, TrendingUp, Cpu, Factory, XCircle,
    Workflow, ShieldCheck, ShieldX, BarChart3, Users, Globe, Bot,
    BookOpen, Target, Coins, Lightbulb, Calculator, Rocket
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ScatterChart, Scatter, ZAxis } from "recharts";
import PivotAlert from "./PivotAlert";
import GoldenLeverWidget from "./GoldenLeverWidget";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EvaluationResult {
    Title: string;
    Eureka_Moment: string;
    Deep_Research_Utilized?: boolean;
    Strategist_Report?: string;
    Deep_Research_Market_Report?: string;
    Quant_Report?: string;
    Quant_Monte_Carlo?: {
        "5th_Percentile_Value": number;
        "Median_Value": number;
        "Risk_Assessment": string;
        "Histogram": { value: number; probability: number }[];
    };
    Mandate_Insights?: {
        Key_Point: string;
        Source_Document: string;
        Relevance: string;
    }[];
    Strategist_Verdict?: {
        Kill_Switch: string;
        Mandate_Clause_Cited: string;
        Reasoning: string;
    };
    D0_Scorecard: {
        Total_Score: number;
        Strategic_Alignment: { Score: number; Rationale: string };
        Disruptive_Potential: { Score: number; Rationale: string };
        Technical_Feasibility: { Score: number; Rationale: string };
        Commercial_Impact: { Score: number; Rationale: string };
        Scalability: { Score: number; Rationale: string };
    };
    Top_3_Deal_Killing_Risks: {
        Title: string;
        Description: string;
        Probability?: string;
        Severity?: string;
        Mitigation?: string;
    }[];
    Market_Verification: {
        // new schema
        TAM?: string;
        SAM?: string;
        SOM?: string;
        Key_Competitors?: { Name: string; Approach: string; Differentiator: string }[];
        Supply_Chain?: string;
        Regulatory_Environment?: string;
        // legacy fallback
        Market_Size?: string;
        Competitors?: string;
    };
    IP_Scan: {
        Key_Patent_Families?: string;
        Freedom_To_Operate_Risk?: string;
        Patent_Application_Opportunity: string;
        Existing_Patents?: string;
        White_Space_Map?: { label: string; x_axis_tech_complexity: number; y_axis_market_saturation: number }[];
    };
    Signals_And_Signposts?: {
        Bullish_Signals?: { Signal: string; Implication: string }[];
        Bearish_Signals?: { Signal: string; Implication: string }[];
        Strategic_Signposts?: {
            Milestone: string;
            Bull_Case: string;
            Bear_Case: string;
            Watch_By: string;
        }[];
    };
    Key_Highlights?: string[];
    Risks_Mitigations?: {
        Risk: string;
        Severity: string;
        Mitigation: string;
    }[];
    Strategic_Alignment?: string;
    Financial_Simulation?: {
        // New dual-model structure
        Pilot_CAPEX?: { RD_Technology?: string; Infrastructure_Hardware?: string; IP_Legal?: string; Integration_Deployment?: string; Total_Pilot_CAPEX_USD?: number; Comparable_Project?: string; };
        Pilot_OPEX?: { Engineering_Headcount?: string; Sales_Marketing?: string; Cloud_Infrastructure?: string; Compliance_Regulatory?: string; GA?: string; Total_Pilot_OPEX_USD?: number; };
        FullScale_CAPEX?: { Production_Infrastructure?: string; Equipment_At_Scale?: string; Supply_Chain_Setup?: string; Regulatory_Certification?: string; Total_FullScale_CAPEX_USD?: number; Comparable_Project?: string; };
        FullScale_OPEX?: { Full_Team?: string; Operations_Maintenance?: string; Sales_Marketing?: string; Raw_Materials_Supply?: string; Insurance_Compliance?: string; GA?: string; Total_FullScale_OPEX_USD?: number; };
        // Legacy single-model structure (backwards compat)
        CAPEX?: { RD_Technology?: string; Infrastructure_Hardware?: string; IP_Legal?: string; Integration_Deployment?: string; Total_CAPEX_USD?: number; };
        OPEX_Annual?: { Engineering_Headcount?: string; Sales_Marketing?: string; Cloud_Infrastructure?: string; Compliance_Regulatory?: string; GA?: string; Total_Annual_OPEX_USD?: number; };
        Revenue_Projections?: { Year_1_USD?: number; Year_3_USD?: number; Year_5_USD?: number; Revenue_Model?: string; };
        Profitability?: { Gross_Margin_Pct?: number; EBITDA_Breakeven?: string; NPV_5yr_USD?: number; IRR_Pct?: number; Payback_Years?: number; Total_Investment_USD?: number; };
        Key_Assumptions?: string[];
        Monte_Carlo?: { Base_Investment_USD?: number; "5th_Percentile_Value"?: number; Median_Value?: number; Risk_Assessment?: string; };
        // Legacy flat fallback
        Base_Investment_USD?: number;
        "5th_Percentile_Value"?: number;
        Median_Value?: number;
        Risk_Assessment?: string;
    };
    Agent_Summaries?: {
        Strategist?: { Theme: string; Detailed_Observations: string[] };
        Market_Researcher?: { Theme: string; Detailed_Observations: string[] };
        Risk_Specialist?: { Theme: string; Detailed_Observations: string[] };
    };
    Logic_Trace?: string[];
    Recommendation: string;
    Justification: string;
    
    // Proactive Watchtower Fields
    Golden_Lever?: string;
    Pivot_Triggered?: boolean;

    // Tactical Roadmap Fields (Stage 5)
    Tactical_Roadmap?: {
        OKRs: { Objective: string; Key_Results: string[] }[];
        Hiring_Priority: { RoleTitle: string; Why: string }[];
    }
}

const strategistRenderers = {
    h3: ({ node, ...props }: any) => (
        <h3 className="text-xl font-semibold text-violet-900 dark:text-violet-200 flex items-center gap-2 mt-8 mb-4 border-b border-violet-200 dark:border-violet-900/50 pb-3" {...props} />
    ),
    ul: ({ node, ...props }: any) => (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 p-0" {...props} />
    ),
    li: ({ node, ...props }: any) => (
        <li className="bg-violet-50/30 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 rounded-xl p-5 shadow-sm list-none hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-200 ease-out" {...props} />
    ),
    strong: ({ node, ...props }: any) => (
        <strong className="font-semibold text-violet-700 dark:text-violet-300" {...props} />
    ),
    p: ({ node, ...props }: any) => (
        <p className="text-zinc-700 dark:text-zinc-300 font-light leading-relaxed my-3" {...props} />
    )
};

const marketRenderers = {
    h3: ({ node, ...props }: any) => (
        <h3 className="text-xl font-semibold text-sky-900 dark:text-sky-200 flex items-center gap-2 mt-8 mb-4 border-b border-sky-200 dark:border-sky-900/50 pb-3" {...props} />
    ),
    ul: ({ node, ...props }: any) => (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 p-0" {...props} />
    ),
    li: ({ node, ...props }: any) => (
        <li className="bg-sky-50/30 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-900/30 rounded-xl p-5 shadow-sm list-none hover:shadow-md hover:border-sky-200 dark:hover:border-sky-800 transition-all duration-200 ease-out" {...props} />
    ),
    strong: ({ node, ...props }: any) => (
        <strong className="font-semibold text-sky-700 dark:text-sky-300" {...props} />
    ),
    p: ({ node, ...props }: any) => (
        <p className="text-zinc-700 dark:text-zinc-300 font-light leading-relaxed my-3" {...props} />
    )
};

const quantRenderers = {
    h3: ({ node, ...props }: any) => (
        <h3 className="text-xl font-semibold text-rose-900 dark:text-rose-200 flex items-center gap-2 mt-8 mb-4 border-b border-rose-200 dark:border-rose-900/50 pb-3" {...props} />
    ),
    ul: ({ node, ...props }: any) => (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 p-0" {...props} />
    ),
    li: ({ node, ...props }: any) => (
        <li className="bg-rose-50/30 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl p-5 shadow-sm list-none hover:shadow-md hover:border-rose-200 dark:hover:border-rose-800 transition-all duration-200 ease-out" {...props} />
    ),
    strong: ({ node, ...props }: any) => (
        <strong className="font-semibold text-rose-700 dark:text-rose-300" {...props} />
    ),
    p: ({ node, ...props }: any) => (
        <p className="text-zinc-700 dark:text-zinc-300 font-light leading-relaxed my-3" {...props} />
    )
};

// ── FinTable helper ────────────────────────────────────────────────────────────
function FinTable({ title, rows, total, totalLabel }: {
    title: string;
    rows: [string, string | undefined][];
    total?: number;
    totalLabel?: string;
}) {
    return (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 space-y-3">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">{title}</h4>
            <div className="space-y-4 text-sm">
                {rows.filter(([, v]) => v).map(([label, val]) => (
                    <div key={label} className="flex flex-col border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0 last:pb-0 gap-1.5">
                        <span className="text-zinc-900 dark:text-zinc-100 font-medium">{label}</span>
                        <span className="text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">{val}</span>
                    </div>
                ))}
                {total != null && (
                    <div className="flex justify-between items-center pt-1 mt-1 border-t-2 border-zinc-200 dark:border-zinc-700">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{totalLabel ?? "Total"}</span>
                        <span className="font-bold text-primary">${(total / 1e6).toFixed(1)}M</span>
                    </div>
                )}
            </div>
        </div>
    );
}    

export function ScoreCard({ title, icon, score, rationale }: { title: string, icon: React.ReactNode, score: number, rationale: string }) {
    const color = score >= 8 ? "text-emerald-500" : score >= 5 ? "text-amber-500" : "text-red-500";
    return (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">{icon} {title}</h4>
                <span className={`text-xl font-bold ${color}`}>{score}/10</span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-light">{rationale}</p>
        </div>
    );
}

export function Badge({ label, value, severity }: { label: string, value: string, severity?: boolean }) {
    if (!value) return null;
    const color = severity
        ? (value.toLowerCase() === "high" ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800" :
            value.toLowerCase() === "medium" ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800" :
                "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800")
        : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
            {label}: {value}
        </span>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function VisualOutputDashboard({ data }: { data: EvaluationResult }) {
    const [activeTab, setActiveTab] = React.useState<"executive" | "market" | "strategist" | "quant">("executive");

    if (!data) return null;
    const isProceed = (data.Recommendation ?? "").toUpperCase().includes("PROCEED");
    const verdict = data.Strategist_Verdict;
    const isVeto = verdict?.Kill_Switch?.toUpperCase() === "VETO";

    return (
        <div id="pdf-content-wrapper" className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Top Navigation Tabs */}
            {data.Deep_Research_Market_Report && (
                <div className="flex gap-2 p-1 mb-8 bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl max-w-fit">
                    <button
                        onClick={() => setActiveTab("executive")}
                        className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                            activeTab === "executive" 
                                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50" 
                                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                        }`}
                    >
                        <BadgeCheck size={16} className={activeTab === "executive" ? "text-primary" : "opacity-70"} />
                        Executive Summary
                    </button>
                    {data.Strategist_Report && (
                        <button
                            onClick={() => setActiveTab("strategist")}
                            className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                                activeTab === "strategist" 
                                    ? "bg-violet-100 text-violet-900 shadow-sm dark:bg-violet-900/50 dark:text-violet-100 ring-1 ring-violet-200 dark:ring-violet-800"
                                    : "text-zinc-500 hover:text-violet-700 dark:text-zinc-400 dark:hover:text-violet-300"
                            }`}
                        >
                            <Target size={16} className={activeTab === "strategist" ? "text-violet-600 dark:text-violet-400" : "opacity-70"} />
                            Strategist Report
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab("market")}
                        className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                            activeTab === "market" 
                                ? "bg-sky-100 text-sky-900 shadow-sm dark:bg-sky-900/50 dark:text-sky-100 ring-1 ring-sky-200 dark:ring-sky-800" 
                                : "text-zinc-500 hover:text-sky-700 dark:text-zinc-400 dark:hover:text-sky-300"
                        }`}
                    >
                        <Globe size={16} className={activeTab === "market" ? "text-sky-600 dark:text-sky-400" : "opacity-70"} />
                        Market Intelligence Report
                    </button>
                    {data.Quant_Report && (
                        <button
                            onClick={() => setActiveTab("quant")}
                            className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                                activeTab === "quant" 
                                    ? "bg-rose-100 text-rose-900 shadow-sm dark:bg-rose-900/50 dark:text-rose-100 ring-1 ring-rose-200 dark:ring-rose-800" 
                                    : "text-zinc-500 hover:text-rose-700 dark:text-zinc-400 dark:hover:text-rose-300"
                            }`}
                        >
                            <Calculator size={16} className={activeTab === "quant" ? "text-rose-600 dark:text-rose-400" : "opacity-70"} />
                            Quant & Risk Report
                        </button>
                    )}
                </div>
            )}

            {/* Tab Content: Market Report */}
            {activeTab === "market" && data.Deep_Research_Market_Report && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="p-3 bg-sky-100/50 dark:bg-sky-900/20 rounded-xl ring-1 ring-sky-200 dark:ring-sky-800/50">
                            <Globe className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-sky-950 dark:text-sky-50">Deep Research Synthesized Market Report</h2>
                            <p className="text-sky-600/80 dark:text-sky-400 mt-1">Full analysis compiled by the Lead Market Intelligence Manager.</p>
                        </div>
                    </div>
                    <div className="prose prose-zinc dark:prose-invert max-w-none bg-sky-50/10 dark:bg-sky-950/10 p-8 rounded-2xl border border-sky-100/50 dark:border-sky-900/20 shadow-sm">
                        <div className="text-zinc-800 dark:text-zinc-200">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={marketRenderers}>
                                {data.Deep_Research_Market_Report}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content: Strategist Report */}
            {activeTab === "strategist" && data.Strategist_Report && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="p-3 bg-violet-100/50 dark:bg-violet-900/20 rounded-xl ring-1 ring-violet-200 dark:ring-violet-800/50">
                            <Target className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-violet-950 dark:text-violet-50">Detailed Strategist Report</h2>
                            <p className="text-violet-600/80 dark:text-violet-400 mt-1">Foundational analysis of mandate alignment and core strategy.</p>
                        </div>
                    </div>
                    <div className="prose prose-zinc dark:prose-invert max-w-none bg-violet-50/10 dark:bg-violet-950/10 p-8 rounded-2xl border border-violet-100/50 dark:border-violet-900/20 shadow-sm">
                        <div className="text-zinc-800 dark:text-zinc-200">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={strategistRenderers}>
                                {data.Strategist_Report}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content: Quant Report */}
            {activeTab === "quant" && data.Quant_Report && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="p-3 bg-rose-100/50 dark:bg-rose-900/20 rounded-xl ring-1 ring-rose-200 dark:ring-rose-800/50">
                            <Calculator className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-rose-950 dark:text-rose-50">Quantitative Risk & Financial Report</h2>
                            <p className="text-rose-600/80 dark:text-rose-400 mt-1">Monte Carlo output detailing standard deviations, volatility, and worst-case scenario analysis.</p>
                        </div>
                    </div>

                    {data.Quant_Monte_Carlo && data.Quant_Monte_Carlo.Histogram && (
                        <div className="p-8 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm mb-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Monte Carlo Simulation: Return Distribution</h3>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Probability mass function over 10,000 localized runs.</p>
                                </div>
                                <div className="flex gap-3 text-sm font-medium">
                                    <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center gap-2">
                                        <span className="text-zinc-500">Median:</span> 
                                        <span className="text-zinc-900 dark:text-zinc-100">${(data.Quant_Monte_Carlo.Median_Value / 1000000).toFixed(2)}M</span>
                                    </div>
                                    <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2 border border-red-100 dark:border-red-900/30">
                                        <span>5th Pct (Risk):</span> 
                                        <span>${(data.Quant_Monte_Carlo["5th_Percentile_Value"] / 1000000).toFixed(2)}M</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.Quant_Monte_Carlo.Histogram} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:opacity-20" />
                                        <XAxis dataKey="value" tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis tickFormatter={(val) => `${val}%`} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            formatter={(value: any) => [`${value}%`, "Probability"]} 
                                            labelFormatter={(label: any) => `Value: $${(label / 1000000).toFixed(2)}M`}
                                            contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                            wrapperClassName="dark:bg-zinc-900 dark:border-zinc-800"
                                        />
                                        <Area type="monotone" dataKey="probability" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProb)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    <div className="prose prose-zinc dark:prose-invert max-w-none bg-rose-50/10 dark:bg-rose-950/10 p-8 rounded-2xl border border-rose-100/50 dark:border-rose-900/20 shadow-sm">
                        <div className="text-zinc-800 dark:text-zinc-200">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={quantRenderers}>
                                {data.Quant_Report}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content: Executive Summary */}
            <div className={`space-y-10 ${activeTab !== "executive" ? "hidden" : "block"}`}>
                
                {/* Header */}
                <div className="flex flex-col gap-3 pb-8 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
                            <BadgeCheck className="text-primary h-8 w-8 shrink-0" />
                            {data.Title}
                        </h2>
                        {data.Deep_Research_Utilized && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 text-xs font-bold ring-1 ring-violet-200 dark:ring-violet-800 shrink-0">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                                </span>
                                Deep Research Executed
                            </div>
                        )}
                    </div>
                    <p className="text-xl font-light leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-4xl">
                        {data.Eureka_Moment}
                    </p>
                </div>

            {/* High Priority Alerts (Watchtower Upgrades) */}
            <PivotAlert 
              recommendation={data.Recommendation} 
              justification={data.Justification} 
            />

            {/* Mandate Insights */}
            {data.Mandate_Insights && data.Mandate_Insights.length > 0 && (
                <div className="space-y-4 pt-2">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        <FileText className="text-primary h-5 w-5" />
                        Key Mandate Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data.Mandate_Insights.map((insight, index) => (
                            <Card key={index} className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm relative overflow-hidden flex flex-col items-start gap-4 p-5">
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 leading-snug">
                                        {insight.Key_Point}
                                    </h4>
                                    <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 px-2 py-1 rounded inline-block">
                                        Source: {insight.Source_Document}
                                    </p>
                                </div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                    {insight.Relevance}
                                </p>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Strategist Verdict */}
            {verdict && (
                <div className={`rounded-2xl border p-6 flex gap-5 items-start ${isVeto
                    ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30"
                    : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30"
                    }`}>
                    <div className={`shrink-0 p-3 rounded-xl ${isVeto ? "bg-red-100 dark:bg-red-900/40" : "bg-emerald-100 dark:bg-emerald-900/40"}`}>
                        {isVeto
                            ? <ShieldX className="h-7 w-7 text-red-600 dark:text-red-400" />
                            : <ShieldCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                        }
                    </div>
                    <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Strategist Kill Switch</h3>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full tracking-wide ${isVeto
                                ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                                }`}>
                                {verdict.Kill_Switch}
                            </span>
                        </div>
                        {verdict.Mandate_Clause_Cited && verdict.Mandate_Clause_Cited !== "N/A" && (
                            <p className="text-xs italic text-zinc-500 dark:text-zinc-400 bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2 border border-zinc-100 dark:border-zinc-800">
                                📋 &ldquo;{verdict.Mandate_Clause_Cited}&rdquo;
                            </p>
                        )}
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-light">
                            {verdict.Reasoning}
                        </p>
                    </div>
                </div>
            )}

            {/* Logic Trace (Chain of Custody) */}
            {data.Logic_Trace && data.Logic_Trace.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        <Workflow className="text-primary h-5 w-5" />
                        Intelligence Logic Trace
                    </h3>
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 space-y-2">
                        {data.Logic_Trace.map((trace, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                                        {i + 1}
                                    </div>
                                    {i < data.Logic_Trace!.length - 1 && (
                                        <div className="w-px h-full bg-primary/20 my-1" />
                                    )}
                                </div>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 font-mono py-0.5">
                                    {trace}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Agent Summaries */}
            {data.Agent_Summaries && Object.keys(data.Agent_Summaries).length > 0 && (
                <div className="space-y-4 pt-2">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        <Bot className="text-primary h-5 w-5" />
                        Agent Summaries
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {data.Agent_Summaries.Strategist && (
                            <Card className="border-indigo-100 bg-indigo-50/30 dark:border-indigo-900/40 dark:bg-indigo-900/10 shadow-sm relative overflow-hidden flex flex-col p-5">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-indigo-600" />
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-3 border-b border-indigo-100 dark:border-indigo-800">
                                        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                                            <Scale className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">Strategist</h4>
                                            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{data.Agent_Summaries.Strategist.Theme}</p>
                                        </div>
                                    </div>
                                    <ul className="space-y-2">
                                        {data.Agent_Summaries.Strategist.Detailed_Observations?.map((obs, i) => (
                                            <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed flex items-start gap-2">
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                                <span>{obs}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Card>
                        )}
                        {data.Agent_Summaries.Market_Researcher && (
                            <Card className="border-sky-100 bg-sky-50/30 dark:border-sky-900/40 dark:bg-sky-900/10 shadow-sm relative overflow-hidden flex flex-col p-5">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-sky-600" />
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-3 border-b border-sky-100 dark:border-sky-800">
                                        <div className="p-2 rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400">
                                            <Globe className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">Market Researcher</h4>
                                            <p className="text-xs font-medium text-sky-600 dark:text-sky-400">{data.Agent_Summaries.Market_Researcher.Theme}</p>
                                        </div>
                                    </div>
                                    <ul className="space-y-2">
                                        {data.Agent_Summaries.Market_Researcher.Detailed_Observations?.map((obs, i) => (
                                            <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed flex items-start gap-2">
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                                                <span>{obs}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Card>
                        )}
                        {data.Agent_Summaries.Risk_Specialist && (
                            <Card className="border-rose-100 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-900/10 shadow-sm relative overflow-hidden flex flex-col p-5">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-rose-600" />
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-3 border-b border-rose-100 dark:border-rose-800">
                                        <div className="p-2 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
                                            <AlertTriangle className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">Risk Specialist</h4>
                                            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{data.Agent_Summaries.Risk_Specialist.Theme}</p>
                                        </div>
                                    </div>
                                    <ul className="space-y-2">
                                        {data.Agent_Summaries.Risk_Specialist.Detailed_Observations?.map((obs, i) => (
                                            <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed flex items-start gap-2">
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                                <span>{obs}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {/* D0 Scorecard */}
            {data.D0_Scorecard && (
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 flex items-center justify-between">
                        <span>D0 Scorecard Breakdown</span>
                        <span className="text-2xl font-bold text-primary px-4 py-2 bg-primary/10 rounded-xl">
                            {data.D0_Scorecard.Total_Score}/50
                        </span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ScoreCard title="Strategic Alignment" icon={<Scale className="h-5 w-5" />} score={data.D0_Scorecard.Strategic_Alignment?.Score ?? 0} rationale={data.D0_Scorecard.Strategic_Alignment?.Rationale ?? ""} />
                        <ScoreCard title="Disruptive Potential" icon={<TrendingUp className="h-5 w-5" />} score={data.D0_Scorecard.Disruptive_Potential?.Score ?? 0} rationale={data.D0_Scorecard.Disruptive_Potential?.Rationale ?? ""} />
                        <ScoreCard title="Technical Feasibility" icon={<Cpu className="h-5 w-5" />} score={data.D0_Scorecard.Technical_Feasibility?.Score ?? 0} rationale={data.D0_Scorecard.Technical_Feasibility?.Rationale ?? ""} />
                        <ScoreCard title="Commercial Impact" icon={<Factory className="h-5 w-5" />} score={data.D0_Scorecard.Commercial_Impact?.Score ?? 0} rationale={data.D0_Scorecard.Commercial_Impact?.Rationale ?? ""} />
                        <ScoreCard title="Scalability" icon={<Workflow className="h-5 w-5" />} score={data.D0_Scorecard.Scalability?.Score ?? 0} rationale={data.D0_Scorecard.Scalability?.Rationale ?? ""} />
                    </div>
                </div>
            )}

            {/* Proactive Watchtower Row: Golden Lever + Deal-Killers */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-2">
                
                {/* Golden Lever Widget (takes 1 column) */}
                <div className="lg:col-span-1 border border-blue-100 dark:border-blue-900/30 rounded-2xl shadow-sm bg-blue-50/10 dark:bg-blue-950/20">
                    <GoldenLeverWidget 
                        goldenLever={data.Golden_Lever || "General Market Volatility"} 
                    />
                </div>

                {/* Deal-Killing Risks (takes 3 columns) */}
                {data.Top_3_Deal_Killing_Risks && data.Top_3_Deal_Killing_Risks.length > 0 ? (
                    <div className="lg:col-span-3 space-y-4">
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                            <ShieldAlert className="text-red-500 h-5 w-5" />
                            Top 3 Deal-Killing Risks
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                            {data.Top_3_Deal_Killing_Risks.map((risk, index) => (
                                <Card key={index} className="border-red-100 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20 shadow-sm relative overflow-hidden hover:-translate-y-1 transition-transform h-full flex flex-col">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-red-600" />
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-red-900 dark:text-red-400 text-base font-semibold flex gap-3 items-start">
                                            <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold">
                                                {index + 1}
                                            </span>
                                            {risk.Title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 flex-1 flex flex-col">
                                        <p className="text-sm text-red-800/80 dark:text-red-300/80 leading-relaxed font-light flex-1">
                                            {risk.Description}
                                        </p>
                                        {(risk.Probability || risk.Severity) && (
                                            <div className="flex gap-2 flex-wrap">
                                                {risk.Probability && (
                                                    <Badge label="Probability" value={risk.Probability} />
                                                )}
                                                {risk.Severity && (
                                                    <Badge label="Severity" value={risk.Severity} severity />
                                                )}
                                            </div>
                                        )}
                                        {risk.Mitigation && (
                                            <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 border border-red-100 dark:border-red-900/30">
                                                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Mitigation Pathway</p>
                                                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{risk.Mitigation}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="lg:col-span-3"></div>
                )}
            </div>

            {/* Tactical Roadmap (Stage 5) */}
            {data.Tactical_Roadmap && (
                <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-900/10 rounded-3xl p-8 border border-indigo-100/50 dark:border-indigo-800/30 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                            <Target className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Stage 5: Tactical Integration Roadmap</h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Execution Lead's 90-day OKRs and Top 3 Hiring Priorities to mitigate failure.</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* OKRs */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Workflow className="h-4 w-4 text-indigo-500" />
                                90-Day OKRs
                            </h4>
                            <div className="space-y-3">
                                {data.Tactical_Roadmap.OKRs.map((okr, i) => (
                                    <div key={i} className="bg-white/60 dark:bg-zinc-900/60 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800/60 shadow-sm backdrop-blur-sm">
                                        <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-2 text-indigo-900 dark:text-indigo-100">{okr.Objective}</p>
                                        <ul className="space-y-1.5 list-disc list-inside">
                                            {okr.Key_Results.map((kr, j) => (
                                                <li key={j} className="text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed pl-1 -indent-4 opacity-90">{kr}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Hiring Priority */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Users className="h-4 w-4 text-purple-500" />
                                Top 3 Hiring Priorities
                            </h4>
                            <div className="space-y-3">
                                {data.Tactical_Roadmap.Hiring_Priority.map((hire, i) => (
                                    <div key={i} className="flex gap-4 items-start bg-white/60 dark:bg-zinc-900/60 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800/60 shadow-sm backdrop-blur-sm">
                                        <div className="flex bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-bold w-8 h-8 rounded-full items-center justify-center shrink-0 mt-0.5">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-1">{hire.RoleTitle}</p>
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">{hire.Why}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Market Intelligence */}
            <div className="space-y-4 pt-2">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <BarChart3 className="text-primary h-5 w-5" />
                    Market Intelligence
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Market Sizing */}
                    {data.Market_Verification && (
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 space-y-4">
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" /> Market Sizing
                            </h4>
                            {data.Market_Verification.TAM ? (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-start gap-4">
                                        <span className="font-medium text-zinc-500 dark:text-zinc-400 shrink-0">TAM</span>
                                        <span className="text-zinc-800 dark:text-zinc-200 text-right">{data.Market_Verification.TAM}</span>
                                    </div>
                                    <div className="flex justify-between items-start gap-4">
                                        <span className="font-medium text-zinc-500 dark:text-zinc-400 shrink-0">SAM</span>
                                        <span className="text-zinc-800 dark:text-zinc-200 text-right">{data.Market_Verification.SAM}</span>
                                    </div>
                                    <div className="flex justify-between items-start gap-4">
                                        <span className="font-medium text-zinc-500 dark:text-zinc-400 shrink-0">SOM (Yr 3)</span>
                                        <span className="text-zinc-800 dark:text-zinc-200 text-right">{data.Market_Verification.SOM}</span>
                                    </div>
                                    {data.Market_Verification.Supply_Chain && (
                                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                            <p className="font-medium text-zinc-500 dark:text-zinc-400 mb-1">Supply Chain</p>
                                            <p className="text-zinc-700 dark:text-zinc-300 font-light">{data.Market_Verification.Supply_Chain}</p>
                                        </div>
                                    )}
                                    {data.Market_Verification.Regulatory_Environment && (
                                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                            <p className="font-medium text-zinc-500 dark:text-zinc-400 mb-1">Regulatory Environment</p>
                                            <p className="text-zinc-700 dark:text-zinc-300 font-light">{data.Market_Verification.Regulatory_Environment}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 font-light">
                                    <p><strong className="font-medium text-zinc-900 dark:text-zinc-300">Size:</strong> {data.Market_Verification.Market_Size}</p>
                                    <p><strong className="font-medium text-zinc-900 dark:text-zinc-300">Competitors:</strong> {data.Market_Verification.Competitors}</p>
                                    <p><strong className="font-medium text-zinc-900 dark:text-zinc-300">Supply Chain:</strong> {data.Market_Verification.Supply_Chain}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Competitors */}
                    {data.Market_Verification?.Key_Competitors && data.Market_Verification.Key_Competitors.length > 0 && (
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 space-y-4">
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" /> Competitive Landscape
                            </h4>
                            <ul className="space-y-3">
                                {data.Market_Verification.Key_Competitors.map((c, i) => (
                                    <li key={i} className="text-sm border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0 last:pb-0">
                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{c.Name}</span>
                                        <span className="text-zinc-500 dark:text-zinc-400"> — {c.Approach}</span>
                                        {c.Differentiator && (
                                            <p className="text-xs text-primary/80 mt-0.5">↳ {c.Differentiator}</p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* IP row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {(data.IP_Scan?.Key_Patent_Families || data.IP_Scan?.Freedom_To_Operate_Risk || data.IP_Scan?.Existing_Patents || data.IP_Scan?.Patent_Application_Opportunity) ? (
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 space-y-3">
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" /> IP Scan
                            </h4>
                            <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 font-light">
                                {data.IP_Scan?.Key_Patent_Families && (
                                    <p><strong className="font-medium text-zinc-900 dark:text-zinc-300">Key Patent Families:</strong> {data.IP_Scan.Key_Patent_Families}</p>
                                )}
                                {data.IP_Scan?.Freedom_To_Operate_Risk && (
                                    <p><strong className="font-medium text-zinc-900 dark:text-zinc-300">FTO Risk:</strong> {data.IP_Scan.Freedom_To_Operate_Risk}</p>
                                )}
                                {data.IP_Scan?.Existing_Patents && !data.IP_Scan?.Key_Patent_Families && (
                                    <p><strong className="font-medium text-zinc-900 dark:text-zinc-300">Existing Patents:</strong> {data.IP_Scan.Existing_Patents}</p>
                                )}
                                {data.IP_Scan?.Patent_Application_Opportunity && (
                                    <p><strong className="font-medium text-zinc-900 dark:text-zinc-300">Filing Opportunity:</strong> {data.IP_Scan.Patent_Application_Opportunity}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div></div>
                    )}
                    {/* White Space Map */}
                    {data.IP_Scan?.White_Space_Map && data.IP_Scan.White_Space_Map.length > 0 ? (
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 flex flex-col">
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 mb-4">
                                <Target className="h-4 w-4 text-primary" /> Generative IP White Space
                            </h4>
                            <div className="flex-1 min-h-[250px] w-full mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
                                        <XAxis 
                                            type="number" 
                                            dataKey="x_axis_tech_complexity" 
                                            name="Tech Complexity" 
                                            domain={[0, 100]} 
                                            tick={{ fontSize: 10, fill: '#71717a' }}
                                            label={{ value: "Tech Complexity →", position: "bottom", fontSize: 10, fill: '#71717a' }}
                                        />
                                        <YAxis 
                                            type="number" 
                                            dataKey="y_axis_market_saturation" 
                                            name="Market Saturation" 
                                            domain={[0, 100]} 
                                            tick={{ fontSize: 10, fill: '#71717a' }}
                                            label={{ value: "Market Saturation →", angle: -90, position: "left", fontSize: 10, fill: '#71717a' }}
                                        />
                                        <ZAxis type="category" dataKey="label" name="Domain" />
                                        <Tooltip 
                                            cursor={{ strokeDasharray: '3 3' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl shadow-lg text-xs w-48">
                                                            <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{d.label}</p>
                                                            <p className="text-zinc-500 dark:text-zinc-400">Complexity: <span className="font-medium text-zinc-700 dark:text-zinc-300">{d.x_axis_tech_complexity}</span></p>
                                                            <p className="text-zinc-500 dark:text-zinc-400">Saturation: <span className="font-medium text-zinc-700 dark:text-zinc-300">{d.y_axis_market_saturation}</span></p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Scatter data={data.IP_Scan.White_Space_Map} fill="#3b82f6" />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : (
                        <div></div>
                    )}
                </div>
            </div>

            {/* ── Signals & Signposts ───────────────────────────────────── */}
            {data.Signals_And_Signposts && (
                <div className="space-y-6 pt-2">
                    <div className="flex items-center gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Signals &amp; Signposts</h3>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">Live Intel</span>
                    </div>

                    {/* Bullish + Bearish side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Bullish */}
                        {data.Signals_And_Signposts.Bullish_Signals && data.Signals_And_Signposts.Bullish_Signals.length > 0 && (
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-900/30 space-y-3">
                                <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
                                    <span className="text-base">🟢</span> Bullish Signals
                                </h4>
                                <ul className="space-y-3">
                                    {data.Signals_And_Signposts.Bullish_Signals.map((s, i) => (
                                        <li key={i} className="text-sm border-b border-emerald-100 dark:border-emerald-900/20 pb-3 last:border-0 last:pb-0">
                                            <p className="text-emerald-900 dark:text-emerald-200 font-medium leading-snug">{s.Signal}</p>
                                            {s.Implication && <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-1 font-light">{s.Implication}</p>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Bearish */}
                        {data.Signals_And_Signposts.Bearish_Signals && data.Signals_And_Signposts.Bearish_Signals.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl p-6 border border-red-100 dark:border-red-900/30 space-y-3">
                                <h4 className="font-semibold text-red-800 dark:text-red-300 text-sm flex items-center gap-2">
                                    <span className="text-base">🔴</span> Bearish Signals
                                </h4>
                                <ul className="space-y-3">
                                    {data.Signals_And_Signposts.Bearish_Signals.map((s, i) => (
                                        <li key={i} className="text-sm border-b border-red-100 dark:border-red-900/20 pb-3 last:border-0 last:pb-0">
                                            <p className="text-red-900 dark:text-red-200 font-medium leading-snug">{s.Signal}</p>
                                            {s.Implication && <p className="text-red-700 dark:text-red-400 text-xs mt-1 font-light">{s.Implication}</p>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Strategic Signposts */}
                    {data.Signals_And_Signposts.Strategic_Signposts && data.Signals_And_Signposts.Strategic_Signposts.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-semibold text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
                                <span className="text-base">🚩</span> Strategic Signposts — Future Milestones to Watch
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {data.Signals_And_Signposts.Strategic_Signposts.map((sp, i) => (
                                    <div key={i} className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-5 border border-amber-100 dark:border-amber-900/30 space-y-3 flex flex-col">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm leading-snug flex-1">{sp.Milestone}</p>
                                            {sp.Watch_By && (
                                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 shrink-0 whitespace-nowrap">
                                                    {sp.Watch_By}
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-2 text-xs flex-1">
                                            {sp.Bull_Case && (
                                                <div className="flex gap-1.5">
                                                    <span className="text-emerald-500 shrink-0 mt-0.5">▲</span>
                                                    <p className="text-emerald-800 dark:text-emerald-300 font-light">{sp.Bull_Case}</p>
                                                </div>
                                            )}
                                            {sp.Bear_Case && (
                                                <div className="flex gap-1.5">
                                                    <span className="text-red-500 shrink-0 mt-0.5">▼</span>
                                                    <p className="text-red-800 dark:text-red-300 font-light">{sp.Bear_Case}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Key Highlights */}
            {data.Key_Highlights && data.Key_Highlights.length > 0 && (
                <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-6 border border-primary/20 dark:border-primary/20">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-lg mb-4 flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" /> Key Highlights
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-zinc-700 dark:text-zinc-300">
                        {data.Key_Highlights.map((highlight, index) => (
                            <li key={index} className="leading-relaxed">{highlight}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Risks & Mitigations */}
            {data.Risks_Mitigations && data.Risks_Mitigations.length > 0 && (
                <div className="bg-red-50/60 dark:bg-red-950/20 rounded-2xl p-6 border border-red-100 dark:border-red-900/30">
                    <h3 className="font-semibold text-red-900 dark:text-red-400 text-lg mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" /> Risks & Mitigations
                    </h3>
                    <div className="space-y-4">
                        {data.Risks_Mitigations.map((item, index) => (
                            <div key={index} className="border-b border-red-100 dark:border-red-900/30 pb-4 last:border-b-0 last:pb-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-red-800 dark:text-red-300">{item.Risk}</span>
                                    <Badge label="Severity" value={item.Severity} severity />
                                </div>
                                <p className="text-sm text-red-700/90 dark:text-red-300/90 leading-relaxed">
                                    <span className="font-medium">Mitigation:</span> {item.Mitigation}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Strategic Alignment */}
            {data.Strategic_Alignment && (
                <div className="bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-400 text-lg mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5" /> Strategic Alignment
                    </h3>
                    <p className="text-blue-800/90 dark:text-blue-300/90 leading-relaxed">{data.Strategic_Alignment}</p>
                </div>
            )}

{/* ── Full Financial Model ─────────────────────────────────── */}
{data.Financial_Simulation && (
    <div className="space-y-6 pt-2">
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Globe className="text-primary h-5 w-5" />
            Financial Model &amp; Simulation
        </h3>

        {/* Dual Model: Pilot + Full-Scale CAPEX/OPEX */}
        {data.Financial_Simulation.Pilot_CAPEX || data.Financial_Simulation.FullScale_CAPEX ? (
            <>
                {/* Comparison summary bar */}
                {data.Financial_Simulation.Profitability?.Total_Investment_USD != null && (
                    <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Total Investment (Pilot + Scale-up)</span>
                        <span className="text-xl font-bold text-primary">${(data.Financial_Simulation.Profitability.Total_Investment_USD / 1e6).toFixed(1)}M</span>
                    </div>
                )}
                {/* Pilot Phase */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" /> MODEL A — Pilot / Innovation Phase (Year 1-2)
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {data.Financial_Simulation.Pilot_CAPEX && (
                            <FinTable
                                title="Pilot CAPEX (One-time)"
                                rows={[
                                    ["R&D / Technology", data.Financial_Simulation.Pilot_CAPEX.RD_Technology],
                                    ["Prototype / Hardware", data.Financial_Simulation.Pilot_CAPEX.Infrastructure_Hardware],
                                    ["IP & Legal", data.Financial_Simulation.Pilot_CAPEX.IP_Legal],
                                    ["Integration & Testing", data.Financial_Simulation.Pilot_CAPEX.Integration_Deployment],
                                ]}
                                total={data.Financial_Simulation.Pilot_CAPEX.Total_Pilot_CAPEX_USD}
                                totalLabel="Total Pilot CAPEX"
                            />
                        )}
                        {data.Financial_Simulation.Pilot_OPEX && (
                            <FinTable
                                title="Pilot OPEX (Annual)"
                                rows={[
                                    ["Core Team", data.Financial_Simulation.Pilot_OPEX.Engineering_Headcount],
                                    ["Facilities", data.Financial_Simulation.Pilot_OPEX.Sales_Marketing],
                                    ["Cloud Infrastructure", data.Financial_Simulation.Pilot_OPEX.Cloud_Infrastructure],
                                    ["Compliance & Regulatory", data.Financial_Simulation.Pilot_OPEX.Compliance_Regulatory],
                                    ["G&A", data.Financial_Simulation.Pilot_OPEX.GA],
                                ]}
                                total={data.Financial_Simulation.Pilot_OPEX.Total_Pilot_OPEX_USD}
                                totalLabel="Total Pilot OPEX/yr"
                            />
                        )}
                    </div>
                    {data.Financial_Simulation.Pilot_CAPEX?.Comparable_Project && (
                        <p className="text-xs text-blue-600/70 dark:text-blue-400/70 italic px-1">📎 Comparable: {data.Financial_Simulation.Pilot_CAPEX.Comparable_Project}</p>
                    )}
                </div>

                {/* Full-Scale Phase */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-purple-500" /> MODEL B — Full-Scale Commercial Operation (Year 3-5+)
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {data.Financial_Simulation.FullScale_CAPEX && (
                            <FinTable
                                title="Full-Scale CAPEX (Deployment)"
                                rows={[
                                    ["Production Infrastructure", data.Financial_Simulation.FullScale_CAPEX.Production_Infrastructure],
                                    ["Equipment at Scale", data.Financial_Simulation.FullScale_CAPEX.Equipment_At_Scale],
                                    ["Supply Chain Setup", data.Financial_Simulation.FullScale_CAPEX.Supply_Chain_Setup],
                                    ["Regulatory & Certification", data.Financial_Simulation.FullScale_CAPEX.Regulatory_Certification],
                                ]}
                                total={data.Financial_Simulation.FullScale_CAPEX.Total_FullScale_CAPEX_USD}
                                totalLabel="Total Full-Scale CAPEX"
                            />
                        )}
                        {data.Financial_Simulation.FullScale_OPEX && (
                            <FinTable
                                title="Full-Scale OPEX (Annual)"
                                rows={[
                                    ["Full Team", data.Financial_Simulation.FullScale_OPEX.Full_Team],
                                    ["Operations & Maintenance", data.Financial_Simulation.FullScale_OPEX.Operations_Maintenance],
                                    ["Sales & Marketing", data.Financial_Simulation.FullScale_OPEX.Sales_Marketing],
                                    ["Raw Materials & Supply", data.Financial_Simulation.FullScale_OPEX.Raw_Materials_Supply],
                                    ["Insurance & Compliance", data.Financial_Simulation.FullScale_OPEX.Insurance_Compliance],
                                    ["G&A", data.Financial_Simulation.FullScale_OPEX.GA],
                                ]}
                                total={data.Financial_Simulation.FullScale_OPEX.Total_FullScale_OPEX_USD}
                                totalLabel="Total Full-Scale OPEX/yr"
                            />
                        )}
                    </div>
                    {data.Financial_Simulation.FullScale_CAPEX?.Comparable_Project && (
                        <p className="text-xs text-purple-600/70 dark:text-purple-400/70 italic px-1">📎 Comparable: {data.Financial_Simulation.FullScale_CAPEX.Comparable_Project}</p>
                    )}
                </div>
            </>
        ) : (
            /* Legacy single-model layout */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {data.Financial_Simulation.CAPEX && (
                    <FinTable
                        title="CAPEX Breakdown (One-time)"
                        rows={[
                            ["R&D / Technology", data.Financial_Simulation.CAPEX.RD_Technology],
                            ["Infrastructure / Hardware", data.Financial_Simulation.CAPEX.Infrastructure_Hardware],
                            ["IP & Legal", data.Financial_Simulation.CAPEX.IP_Legal],
                            ["Integration & Deployment", data.Financial_Simulation.CAPEX.Integration_Deployment],
                        ]}
                        total={data.Financial_Simulation.CAPEX.Total_CAPEX_USD}
                        totalLabel="Total CAPEX"
                    />
                )}
                {data.Financial_Simulation.OPEX_Annual && (
                    <FinTable
                        title="Annual OPEX (Steady-state)"
                        rows={[
                            ["Engineering & Headcount", data.Financial_Simulation.OPEX_Annual.Engineering_Headcount],
                            ["Sales & Marketing", data.Financial_Simulation.OPEX_Annual.Sales_Marketing],
                            ["Cloud Infrastructure", data.Financial_Simulation.OPEX_Annual.Cloud_Infrastructure],
                            ["Compliance & Regulatory", data.Financial_Simulation.OPEX_Annual.Compliance_Regulatory],
                            ["G&A", data.Financial_Simulation.OPEX_Annual.GA],
                        ]}
                        total={data.Financial_Simulation.OPEX_Annual.Total_Annual_OPEX_USD}
                        totalLabel="Total Annual OPEX"
                    />
                )}
            </div>
        )}

        {/* Revenue + Profitability */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.Financial_Simulation.Revenue_Projections && (
                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 space-y-4">
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">Revenue Projections</h4>
                    {data.Financial_Simulation.Revenue_Projections.Revenue_Model && (
                        <span className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50">
                            {data.Financial_Simulation.Revenue_Projections.Revenue_Model}
                        </span>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                        {([["Year 1", data.Financial_Simulation.Revenue_Projections.Year_1_USD],
                        ["Year 3", data.Financial_Simulation.Revenue_Projections.Year_3_USD],
                        ["Year 5", data.Financial_Simulation.Revenue_Projections.Year_5_USD]] as [string, number | undefined][])
                            .map(([label, val]) => (
                                <div key={label} className="bg-white dark:bg-zinc-800/60 rounded-xl p-3 text-center">
                                    <p className="text-xs text-zinc-400 mb-1">{label}</p>
                                    <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                        {val != null ? `$${(val / 1e6).toFixed(1)}M` : "—"}
                                    </p>
                                </div>
                            ))}
                    </div>
                </div>
            )}
            {data.Financial_Simulation.Profitability && (
                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 space-y-3">
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">Profitability Metrics</h4>
                    <div className="space-y-2 text-sm">
                        {([
                            ["Gross Margin", data.Financial_Simulation.Profitability.Gross_Margin_Pct != null ? `${data.Financial_Simulation.Profitability.Gross_Margin_Pct}%` : null],
                            ["EBITDA Break-even", data.Financial_Simulation.Profitability.EBITDA_Breakeven ?? null],
                            ["NPV (5yr @ 10%)", data.Financial_Simulation.Profitability.NPV_5yr_USD != null ? `$${(data.Financial_Simulation.Profitability.NPV_5yr_USD / 1e6).toFixed(1)}M` : null],
                            ["IRR", data.Financial_Simulation.Profitability.IRR_Pct != null ? `${data.Financial_Simulation.Profitability.IRR_Pct}%` : null],
                            ["Payback Period", data.Financial_Simulation.Profitability.Payback_Years != null ? `${data.Financial_Simulation.Profitability.Payback_Years} yrs` : null],
                        ] as [string, string | null][]).filter(([, v]) => v != null).map(([label, val]) => (
                            <div key={label} className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0 last:pb-0">
                                <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{val}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Key Assumptions */}
        {data.Financial_Simulation.Key_Assumptions && data.Financial_Simulation.Key_Assumptions.length > 0 && (
            <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl p-5 border border-amber-100 dark:border-amber-900/30">
                <h4 className="font-semibold text-amber-900 dark:text-amber-400 text-sm mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Key Financial Assumptions
                </h4>
                <ol className="space-y-1.5 list-decimal list-inside">
                    {data.Financial_Simulation.Key_Assumptions.map((a, i) => (
                        <li key={i} className="text-sm text-amber-800/80 dark:text-amber-300/80 font-light leading-relaxed">{a}</li>
                    ))}
                </ol>
            </div>
        )}

        {/* Monte Carlo */}
        {data.Financial_Simulation && (() => {
            const fs = data.Financial_Simulation!;
            const mc = fs.Monte_Carlo ?? {
                Base_Investment_USD: fs.Base_Investment_USD,
                "5th_Percentile_Value": fs["5th_Percentile_Value"],
                Median_Value: fs.Median_Value,
                Risk_Assessment: fs.Risk_Assessment,
            };
            if (!mc || (!mc["5th_Percentile_Value"] && !mc.Median_Value)) return null;
            const riskColor = (mc.Risk_Assessment ?? "").includes("High") ? "text-red-500" : "text-emerald-500";
            return (
                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm mb-4 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" /> Monte Carlo Simulation (10,000 iterations on CAPEX)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="bg-white dark:bg-zinc-800/60 rounded-xl p-3 text-center">
                            <p className="text-xs text-zinc-400 mb-1">Base Investment</p>
                            <p className="font-bold text-zinc-800 dark:text-zinc-100">${((mc.Base_Investment_USD ?? 0) / 1e6).toFixed(1)}M</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-800/60 rounded-xl p-3 text-center">
                            <p className="text-xs text-zinc-400 mb-1">5th Pct (Downside)</p>
                            <p className="font-bold text-red-600 dark:text-red-400">${((mc["5th_Percentile_Value"] ?? 0) / 1e6).toFixed(1)}M</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-800/60 rounded-xl p-3 text-center">
                            <p className="text-xs text-zinc-400 mb-1">Median Return</p>
                            <p className="font-bold text-emerald-600 dark:text-emerald-400">${((mc.Median_Value ?? 0) / 1e6).toFixed(1)}M</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-800/60 rounded-xl p-3 text-center">
                            <p className="text-xs text-zinc-400 mb-1">Risk</p>
                            <p className={`font-bold text-xs ${riskColor}`}>{mc.Risk_Assessment ?? "—"}</p>
                        </div>
                    </div>
                </div>
            );
        })()}
    </div>
)}
        {/* Final Recommendation */}
        <div className={`mt-4 p-8 md:p-12 rounded-3xl border ${isProceed ? "bg-primary/5 border-primary/20 dark:bg-primary/10" : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30"}`}>
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                <div className={`p-4 rounded-2xl shrink-0 ${isProceed ? "bg-primary/20 text-primary" : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"}`}>
                    {isProceed ? <CheckCircle2 className="h-12 w-12" /> : <XCircle className="h-12 w-12" />}
                </div>
                <div className="space-y-3">
                    <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isProceed ? "text-primary" : "text-red-700 dark:text-red-400"}`}>
                        {data.Recommendation ?? "PENDING"}
                    </h2>
                    <p className="text-zinc-700 dark:text-zinc-300 text-lg sm:text-xl font-light leading-relaxed max-w-3xl">
                        {data.Justification ?? "Evaluation results are being compiled."}
                    </p>
                </div>
            </div>
        </div>
        {/* Tactical Roadmap (Stage 5) */}
        {data.Tactical_Roadmap && (
            <div className="mt-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Tactical Execution Roadmap
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* OKRs */}
                    <div>
                        <h4 className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-1.5">
                            <Workflow className="h-4 w-4" /> 90-Day Objectives & Key Results
                        </h4>
                        <div className="space-y-3">
                            {data.Tactical_Roadmap.OKRs.map((okr, idx) => (
                                <div key={idx} className="bg-white/60 dark:bg-zinc-900/40 p-3 rounded-xl border border-blue-50 dark:border-blue-900/20">
                                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-1">{okr.Objective}</p>
                                    <ul className="list-disc pl-4 space-y-0.5">
                                        {okr.Key_Results.map((kr, kIdx) => (
                                            <li key={kIdx} className="text-xs text-zinc-600 dark:text-zinc-400">{kr}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hiring Priority */}
                    <div>
                        <h4 className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-1.5">
                            <Users className="h-4 w-4" /> Critical Hiring Priorities
                        </h4>
                        <div className="space-y-3">
                            {data.Tactical_Roadmap.Hiring_Priority.map((role, idx) => (
                                <div key={idx} className="bg-white/60 dark:bg-zinc-900/40 p-3 rounded-xl border border-blue-50 dark:border-blue-900/20">
                                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-1 flex items-center justify-between">
                                        {role.RoleTitle}
                                        <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                            Priority {idx + 1}
                                        </span>
                                    </p>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{role.Why}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

    </div>
{/* End of Executive Summary Wrapper */}
{activeTab === 'market' && data.Deep_Research_Market_Report && (
                <div className="mt-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-lg mb-4 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" /> Deep Research Market Report
                    </h3>
                    <div className="prose dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                        {data.Deep_Research_Market_Report}
                    </div>
                </div>
            )}
        </div>
    );
}
