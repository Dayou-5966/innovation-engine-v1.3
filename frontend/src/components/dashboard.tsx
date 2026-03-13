"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    CheckCircle2, AlertTriangle, ShieldAlert, BadgeCheck,
    FileText, Scale, TrendingUp, Cpu, Factory, XCircle,
    Workflow, ShieldCheck, ShieldX, BarChart3, Users, Globe, Bot
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EvaluationResult {
    Title: string;
    Eureka_Moment: string;
    Deep_Research_Utilized?: boolean;
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
    Financial_Simulation?: {
        // New dual-model structure
        Pilot_CAPEX?: { RD_Technology?: string; Prototype_Hardware?: string; IP_Legal?: string; Integration_Testing?: string; Total_Pilot_CAPEX_USD?: number; Comparable_Project?: string; };
        Pilot_OPEX?: { Core_Team?: string; Facilities?: string; Compliance_Regulatory?: string; GA?: string; Total_Pilot_OPEX_USD?: number; };
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
    Recommendation: string;
    Justification: string;
}

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
            <div className="space-y-2 text-sm">
                {rows.filter(([, v]) => v).map(([label, val]) => (
                    <div key={label} className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0 last:pb-0 gap-4">
                        <span className="text-zinc-500 dark:text-zinc-400 shrink-0">{label}</span>
                        <span className="text-zinc-700 dark:text-zinc-300 text-right font-light leading-relaxed">{val}</span>
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

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function VisualOutputDashboard({ data }: { data: EvaluationResult }) {
    if (!data) return null;
    const isProceed = (data.Recommendation ?? "").toUpperCase().includes("PROCEED");
    const verdict = data.Strategist_Verdict;
    const isVeto = verdict?.Kill_Switch?.toUpperCase() === "VETO";

    return (
        <div id="pdf-content-wrapper" className="w-full space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

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
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 flex items-center justify-between">
                    <span>D0 Scorecard Breakdown</span>
                    <span className="text-2xl font-bold text-primary px-4 py-2 bg-primary/10 rounded-xl">
                        {data.D0_Scorecard.Total_Score}/50
                    </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ScoreCard title="Strategic Alignment" icon={<Scale className="h-5 w-5" />} score={data.D0_Scorecard.Strategic_Alignment.Score} rationale={data.D0_Scorecard.Strategic_Alignment.Rationale} />
                    <ScoreCard title="Disruptive Potential" icon={<TrendingUp className="h-5 w-5" />} score={data.D0_Scorecard.Disruptive_Potential.Score} rationale={data.D0_Scorecard.Disruptive_Potential.Rationale} />
                    <ScoreCard title="Technical Feasibility" icon={<Cpu className="h-5 w-5" />} score={data.D0_Scorecard.Technical_Feasibility.Score} rationale={data.D0_Scorecard.Technical_Feasibility.Rationale} />
                    <ScoreCard title="Commercial Impact" icon={<Factory className="h-5 w-5" />} score={data.D0_Scorecard.Commercial_Impact.Score} rationale={data.D0_Scorecard.Commercial_Impact.Rationale} />
                    <ScoreCard title="Scalability" icon={<Workflow className="h-5 w-5" />} score={data.D0_Scorecard.Scalability.Score} rationale={data.D0_Scorecard.Scalability.Rationale} />
                </div>
            </div>

            {/* Deal-Killing Risks */}
            {data.Top_3_Deal_Killing_Risks && data.Top_3_Deal_Killing_Risks.length > 0 && (
                <div className="space-y-4 pt-2">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        <ShieldAlert className="text-red-500 h-5 w-5" />
                        Top 3 Deal-Killing Risks
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {data.Top_3_Deal_Killing_Risks.map((risk, index) => (
                            <Card key={index} className="border-red-100 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20 shadow-sm relative overflow-hidden hover:-translate-y-1 transition-transform">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-red-600" />
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-red-900 dark:text-red-400 text-base font-semibold flex gap-3 items-start">
                                        <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold">
                                            {index + 1}
                                        </span>
                                        {risk.Title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-sm text-red-800/80 dark:text-red-300/80 leading-relaxed font-light">
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
            )}

            {/* Market Intelligence */}
            <div className="space-y-4 pt-2">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <BarChart3 className="text-primary h-5 w-5" />
                    Market Intelligence
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Market Sizing */}
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

                    {/* Competitors */}
                    {data.Market_Verification.Key_Competitors && data.Market_Verification.Key_Competitors.length > 0 ? (
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
                    ) : (
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 space-y-4">
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" /> IP Scan
                            </h4>
                            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400 font-light">
                                <li><strong className="font-medium text-zinc-900 dark:text-zinc-300">Existing Patents:</strong> {data.IP_Scan.Existing_Patents}</li>
                                <li><strong className="font-medium text-zinc-900 dark:text-zinc-300">Opportunity:</strong> {data.IP_Scan.Patent_Application_Opportunity}</li>
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
                    <div></div>
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
                                                ["Prototype / Hardware", data.Financial_Simulation.Pilot_CAPEX.Prototype_Hardware],
                                                ["IP & Legal", data.Financial_Simulation.Pilot_CAPEX.IP_Legal],
                                                ["Integration & Testing", data.Financial_Simulation.Pilot_CAPEX.Integration_Testing],
                                            ]}
                                            total={data.Financial_Simulation.Pilot_CAPEX.Total_Pilot_CAPEX_USD}
                                            totalLabel="Total Pilot CAPEX"
                                        />
                                    )}
                                    {data.Financial_Simulation.Pilot_OPEX && (
                                        <FinTable
                                            title="Pilot OPEX (Annual)"
                                            rows={[
                                                ["Core Team", data.Financial_Simulation.Pilot_OPEX.Core_Team],
                                                ["Facilities", data.Financial_Simulation.Pilot_OPEX.Facilities],
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
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreCard({ title, icon, score, rationale }: { title: string; icon: React.ReactNode; score: number; rationale: string }) {
    const color =
        score >= 8 ? "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400"
            : score >= 5 ? "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400"
                : "text-red-600 bg-red-50 border-red-100 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400";
    return (
        <Card className="rounded-2xl border-zinc-100 dark:border-zinc-800 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                    {icon} {title}
                </CardTitle>
                <div className={`font-bold text-lg px-3 py-1 rounded-lg border ${color}`}>{score}/10</div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 font-light mt-2 leading-relaxed">{rationale}</p>
            </CardContent>
        </Card>
    );
}

function Badge({ label, value, severity }: { label: string; value: string; severity?: boolean }) {
    const v = value.toLowerCase();
    const color = severity
        ? v === "critical" ? "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300"
            : v === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                : v === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        : v === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
            : v === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    return (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>
            {label}: {value}
        </span>
    );
}
