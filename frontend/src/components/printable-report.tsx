import React from 'react';
import { EvaluationResult } from './dashboard';
import { BadgeCheck, FileText, Zap, Key, ShieldAlert, BarChart3, LineChart, Globe2, ScanFace, Activity, CheckCircle2, Factory, TrendingUp, AlertTriangle } from "lucide-react";

export function PrintableReport({ data }: { data: EvaluationResult }) {
    if (!data) return null;
    const isProceed = (data.Recommendation ?? "").toUpperCase().includes("PROCEED");
    const isVeto = data.Strategist_Verdict?.Kill_Switch?.toUpperCase() === "VETO";

    return (
        <div id="pdf-print-document" className="bg-white text-zinc-900 p-8 mx-auto space-y-8" style={{ width: '800px', minHeight: '1122px', fontSize: '12px', lineHeight: '1.4' }}>

            {/* PAGE 1: Title Page */}
            <div className="pdf-section pb-10 border-b-[6px] border-indigo-600 break-after-page min-h-[90vh] flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-70 -z-10"></div>
                
                <div className="space-y-6 relative z-10">
                    <p className="font-bold text-indigo-500 uppercase tracking-widest text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Innovation Engine
                    </p>
                    <h1 className="text-[3rem] font-extrabold leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-indigo-900 to-violet-900">
                        {data.Title}
                    </h1>
                    <p className="text-xl font-light text-zinc-600 mt-2 max-w-2xl">{data.Eureka_Moment}</p>
                    
                    <div className="pt-8 mt-8 bg-zinc-50/50 p-6 rounded-2xl border border-zinc-200 grid grid-cols-2 gap-6 shadow-sm">
                        <div>
                            <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Final Verdict</p>
                            <div className="flex items-center gap-3">
                                {isProceed ? <CheckCircle2 className="w-10 h-10 text-emerald-500" /> : <ShieldAlert className="w-10 h-10 text-rose-500" />}
                                <span className={`text-3xl font-extrabold ${isProceed ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {data.Recommendation}
                                </span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Generation Date</p>
                            <p className="text-2xl font-semibold text-zinc-800">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>
                    {data.Deep_Research_Utilized && (
                        <div className="mt-8 inline-flex px-5 py-3 bg-gradient-to-r from-violet-100 to-indigo-100 text-violet-800 rounded-xl border border-violet-200 font-bold items-center gap-3 shadow-sm">
                            <Activity className="w-6 h-6 text-violet-600 animate-pulse" />
                            Deep Research Verification Executed
                        </div>
                    )}
                </div>
            </div>

            {/* SECTIONS: Executive Summary */}
            <div className="pdf-section space-y-4">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-600 border-b-2 border-zinc-100 pb-2 mb-4 flex items-center gap-3">
                    <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Zap className="w-5 h-5" /></span>
                    Executive Summary
                </h2>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 p-5 rounded-2xl border border-blue-100 shadow-sm">
                    <h4 className="font-extrabold text-lg mb-2 text-blue-900">Final Justification</h4>
                    <p className="text-blue-900/80 text-base leading-snug">{data.Justification}</p>
                </div>

                {data.Strategist_Verdict && (
                    <div className={`mt-6 p-6 rounded-2xl border ${isVeto ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                        <h4 className={`font-bold text-lg mb-2 flex items-center gap-2 ${isVeto ? 'text-rose-800' : 'text-emerald-800'}`}>
                             Strategist Verdict: {isVeto ? "VETO APPLIED" : "PASS"}
                        </h4>
                        <p className={`ml-7 mb-2 ${isVeto ? 'text-rose-900/80' : 'text-emerald-900/80'}`}>{data.Strategist_Verdict.Reasoning}</p>
                        {data.Strategist_Verdict.Mandate_Clause_Cited !== "N/A" && (
                            <div className={`ml-7 pl-4 border-l-4 italic text-sm ${isVeto ? 'border-rose-300 text-rose-700' : 'border-emerald-300 text-emerald-700'}`}>
                                "{data.Strategist_Verdict.Mandate_Clause_Cited}"
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* SECTION: Mandate Insights */}
            {data.Mandate_Insights && data.Mandate_Insights.length > 0 && (
                <div className="pdf-section break-inside-avoid space-y-4">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-600 border-b-2 border-zinc-100 pb-2 mb-4 flex items-center gap-3">
                        <span className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><FileText className="w-5 h-5" /></span>
                        Mandate Alignment
                    </h2>
                    <div className="space-y-3">
                        {data.Mandate_Insights.map((insight, idx) => (
                            <div key={idx} className="bg-white border-l-4 border-l-amber-400 border border-zinc-200 p-4 rounded-r-xl shadow-sm leading-snug">
                                <h4 className="font-bold text-zinc-900 text-lg mb-1">{insight.Key_Point}</h4>
                                <span className="inline-block px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded mb-3 border border-amber-100">Source: {insight.Source_Document}</span>
                                <p className="text-zinc-700">{insight.Relevance}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECTION: Scorecard */}
            {data.D0_Scorecard && (
                <div className="pdf-section break-inside-avoid space-y-4">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-600 border-b-2 border-zinc-100 pb-2 mb-4 flex items-center gap-3">
                        <span className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><BarChart3 className="w-5 h-5" /></span>
                        D0 Scorecard 
                        <span className="ml-auto text-2xl font-black text-emerald-500">{data.D0_Scorecard.Total_Score}/50</span>
                    </h2>
                    <div className="grid grid-cols-1 gap-3">
                        {[
                            { title: "Strategic Alignment", data: data.D0_Scorecard.Strategic_Alignment, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
                            { title: "Disruptive Potential", data: data.D0_Scorecard.Disruptive_Potential, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
                            { title: "Technical Feasibility", data: data.D0_Scorecard.Technical_Feasibility, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' },
                            { title: "Commercial Impact", data: data.D0_Scorecard.Commercial_Impact, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                            { title: "Scalability", data: data.D0_Scorecard.Scalability, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' }
                        ].map((metric, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-5 border border-zinc-100 rounded-xl bg-white shadow-sm ring-1 ring-zinc-900/5">
                                <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black border-2 ${metric.color} ${metric.bg}`}>
                                    {metric.data.Score}
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-zinc-900 mb-1">{metric.title}</h4>
                                    <p className="text-zinc-600 text-sm">{metric.data.Rationale}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECTION: Agent Summaries */}
            {data.Agent_Summaries && (
                <div className="space-y-4">
                    <div className="pdf-section break-inside-avoid">
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-600 border-b-2 border-zinc-100 pb-2 mb-4 flex items-center gap-3">
                            <span className="p-1.5 bg-violet-100 text-violet-600 rounded-lg"><ScanFace className="w-5 h-5" /></span>
                            Specialized Agent Syntheses
                        </h2>
                    </div>
                    <div className="space-y-4">
                        {Object.entries(data.Agent_Summaries).map(([agent, details], idx) => {
                            const colors = ['border-blue-400 bg-blue-50', 'border-emerald-400 bg-emerald-50', 'border-rose-400 bg-rose-50'];
                            const textColor = ['text-blue-900', 'text-emerald-900', 'text-rose-900'];
                            return (
                                <div key={idx} className={`pdf-section break-inside-avoid border-l-[6px] rounded-r-2xl p-5 mb-4 ${colors[idx % 3]}`}>
                                    <h3 className={`font-black text-lg uppercase tracking-wider mb-1 ${textColor[idx % 3]}`}>{agent.replace('_', ' ')}</h3>
                                    <p className="font-bold text-zinc-800 italic mb-3 text-base">"{details.Theme}"</p>
                                    <ul className="space-y-2 list-disc list-inside text-zinc-700 font-medium leading-snug">
                                        {details.Detailed_Observations?.map((obs, j) => (
                                            <li key={j} className="pl-1 -indent-5 ml-4">{obs}</li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* SECTION: Market & IP */}
            <div className="space-y-4">
                <div className="pdf-section break-inside-avoid">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-600 border-b-2 border-zinc-100 pb-2 mb-4 flex items-center gap-3">
                        <span className="p-1.5 bg-cyan-100 text-cyan-600 rounded-lg"><Globe2 className="w-5 h-5" /></span>
                        Market & IP Verification
                    </h2>
                
                {/* Market Sizes Ribbon */}
                <div className="flex gap-3 mb-4">
                    {[
                        { label: 'TAM (Total)', val: data.Market_Verification.TAM || data.Market_Verification.Market_Size },
                        { label: 'SAM (Serviceable)', val: data.Market_Verification.SAM },
                        { label: 'SOM (Obtainable)', val: data.Market_Verification.SOM }
                    ].map((m, i) => m.val && (
                        <div key={i} className="flex-1 bg-zinc-900 text-white rounded-xl p-4 shadow-md">
                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">{m.label}</p>
                            <p className="text-xl font-black mt-1">{m.val}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Ecosystem */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                        <h4 className="font-extrabold text-lg text-zinc-800 mb-3 flex items-center gap-2"><Factory className="text-cyan-600 w-4 h-4" /> Ecosystem</h4>
                        <div className="space-y-3 leading-snug">
                            <div><span className="font-bold text-zinc-500 uppercase text-[10px] block mb-1">Supply Chain</span> <span className="text-zinc-800 text-xs bg-zinc-50 p-2 rounded-lg block border border-zinc-100">{data.Market_Verification.Supply_Chain || "N/A"}</span></div>
                            <div><span className="font-bold text-zinc-500 uppercase text-[10px] block mb-1">Regulations</span> <span className="text-zinc-800 text-xs bg-zinc-50 p-2 rounded-lg block border border-zinc-100">{data.Market_Verification.Regulatory_Environment || "N/A"}</span></div>
                        </div>
                    </div>
                    {/* IP Scan */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                        <h4 className="font-extrabold text-lg text-zinc-800 mb-3 flex items-center gap-2"><Key className="text-cyan-600 w-4 h-4" /> Intellectual Property</h4>
                        <div className="space-y-3 leading-snug">
                            <div><span className="font-bold text-zinc-500 uppercase text-[10px] block mb-1">Patent App Opportunity</span> <span className="text-zinc-800 text-xs font-medium">{data.IP_Scan?.Patent_Application_Opportunity || "N/A"}</span></div>
                            <div><span className="font-bold text-zinc-500 uppercase text-[10px] block mb-1">Freedom to Operate</span> <span className="text-zinc-800 text-xs block">{data.IP_Scan?.Freedom_To_Operate_Risk || "N/A"}</span></div>
                            <div><span className="font-bold text-zinc-500 uppercase text-[10px] block mb-1">Key Patent Families</span> <span className="text-zinc-600 text-xs block">{data.IP_Scan?.Key_Patent_Families || "N/A"}</span></div>
                        </div>
                    </div>
                </div>
                </div>

                {/* Competitors Ribbon */}
                {(data.Market_Verification.Key_Competitors || []).length > 0 && (
                    <div className="pdf-section break-inside-avoid mt-6 pt-6 border-t border-zinc-100">
                        <h4 className="font-bold text-lg text-zinc-800 mb-4 uppercase tracking-widest text-xs">Direct Competitors</h4>
                        <div className="grid grid-cols-3 gap-4">
                            {data.Market_Verification.Key_Competitors?.map((comp, idx) => (
                                <div key={idx} className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                                    <p className="font-black text-cyan-900 mb-2">{comp.Name}</p>
                                    <p className="text-zinc-700 text-xs mb-2 leading-relaxed"><span className="font-bold text-zinc-400">Approach:</span> {comp.Approach}</p>
                                    <p className="text-zinc-700 text-xs leading-relaxed"><span className="font-bold text-zinc-400">Diff:</span> {comp.Differentiator}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* SECTION: Signals and Signposts */}
            {data.Signals_And_Signposts && (
                <div className="space-y-4">
                    <div className="pdf-section break-inside-avoid">
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-600 border-b-2 border-zinc-100 pb-2 mb-4 flex items-center gap-3">
                        <span className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><TrendingUp className="w-5 h-5" /></span>
                        Signals & Signposts
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        {/* Bullish */}
                        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5">
                            <h4 className="font-bold text-emerald-800 uppercase text-xs tracking-widest mb-4">Bullish Signals</h4>
                            <div className="space-y-3">
                                {(data.Signals_And_Signposts.Bullish_Signals || []).map((s, i) => (
                                    <div key={i} className="text-sm">
                                        <div className="font-bold text-emerald-900">{s.Signal}</div>
                                        <div className="text-emerald-700/80 leading-snug">{s.Implication}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Bearish */}
                        <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-5">
                            <h4 className="font-bold text-rose-800 uppercase text-xs tracking-widest mb-4">Bearish Signals</h4>
                            <div className="space-y-3">
                                {(data.Signals_And_Signposts.Bearish_Signals || []).map((s, i) => (
                                    <div key={i} className="text-sm">
                                        <div className="font-bold text-rose-900">{s.Signal}</div>
                                        <div className="text-rose-700/80 leading-snug">{s.Implication}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    </div>

                    {/* Signposts Table */}
                    {(data.Signals_And_Signposts.Strategic_Signposts || []).length > 0 && (
                        <div className="pdf-section break-inside-avoid bg-white border border-zinc-200 rounded-xl overflow-hidden mt-4">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500 font-bold tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3">Milestone</th>
                                        <th className="px-4 py-3 text-emerald-700">Bull Case</th>
                                        <th className="px-4 py-3 text-rose-700">Bear Case</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.Signals_And_Signposts.Strategic_Signposts?.map((sp, i) => (
                                        <tr key={i} className="border-b border-zinc-100 last:border-0">
                                            <td className="px-4 py-3 font-semibold text-zinc-900 align-top w-1/4">{sp.Milestone} <span className="block text-xs font-normal text-zinc-400 mt-1">By: {sp.Watch_By}</span></td>
                                            <td className="px-4 py-3 text-zinc-700 align-top w-3/8">{sp.Bull_Case}</td>
                                            <td className="px-4 py-3 text-zinc-700 align-top w-3/8">{sp.Bear_Case}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* SECTION: Risks */}
            {data.Top_3_Deal_Killing_Risks && data.Top_3_Deal_Killing_Risks.length > 0 && (
                <div className="space-y-4">
                    <div className="pdf-section break-inside-avoid">
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-600 border-b-2 border-zinc-100 pb-2 mb-4 flex items-center gap-3">
                            <span className="p-1.5 bg-red-100 text-red-600 rounded-lg"><ShieldAlert className="w-5 h-5" /></span>
                            Top Deal-Killing Risks
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {data.Top_3_Deal_Killing_Risks.map((risk, idx) => (
                            <div key={idx} className="pdf-section break-inside-avoid bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 p-6 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-red-500"></div>
                                <div className="flex items-center gap-3 mb-3">
                                    <h4 className="font-extrabold text-red-950 text-xl">{risk.Title}</h4>
                                    <span className="px-3 py-1 text-xs font-black uppercase tracking-wider rounded-md bg-red-600 text-white shadow-sm">
                                        {risk.Severity || "HIGH"} / {risk.Probability || "HIGH"}
                                    </span>
                                </div>
                                <p className="text-red-900/80 text-base mb-4 leading-relaxed font-medium">{risk.Description}</p>
                                <div className="bg-white/80 p-4 rounded-lg text-sm text-red-950 border border-red-100/50 shadow-sm flex gap-3 items-start">
                                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold uppercase tracking-widest text-xs text-red-700 block mb-1">Mitigation Strategy</span>
                                        {risk.Mitigation || "Requires immediate executive review."}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECTION: Financial Simulation */}
            {data.Financial_Simulation && data.Financial_Simulation.Profitability && (
                <div className="space-y-4">
                    <div className="pdf-section break-inside-avoid">
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-600 border-b-2 border-zinc-100 pb-2 mb-4 flex items-center gap-3">
                        <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><LineChart className="w-5 h-5" /></span>
                        Financial Projections
                    </h2>

                     {/* Headline Metrics Ribbon */}
                     <div className="flex gap-4 mb-6">
                        {[
                            { label: '5 Year NPV', val: `$${((data.Financial_Simulation.Profitability?.NPV_5yr_USD || 0) / 1e6).toFixed(1)}M`, color: 'bg-emerald-600' },
                            { label: 'Total Investment', val: `$${((data.Financial_Simulation.Profitability?.Total_Investment_USD || 0) / 1e6).toFixed(1)}M`, color: 'bg-blue-600' },
                            { label: 'EBITDA Breakeven', val: data.Financial_Simulation.Profitability?.EBITDA_Breakeven, color: 'bg-indigo-600' },
                            { label: 'IRR', val: `${data.Financial_Simulation.Profitability?.IRR_Pct}%`, color: 'bg-violet-600' }
                        ].map((m, i) => m.val && (
                            <div key={i} className={`flex-1 ${m.color} text-white rounded-xl p-4 shadow-md`}>
                                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">{m.label}</p>
                                <p className="text-2xl font-black mt-1">{m.val}</p>
                            </div>
                        ))}
                    </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pdf-section break-inside-avoid">
                        <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl">
                            <h4 className="font-bold text-zinc-800 mb-3 border-b border-zinc-200 pb-1 flex justify-between">
                                Pilot Stage
                                {data.Financial_Simulation.Pilot_CAPEX?.Total_Pilot_CAPEX_USD && (
                                    <span className="text-blue-600 font-black">${(data.Financial_Simulation.Pilot_CAPEX.Total_Pilot_CAPEX_USD / 1e6).toFixed(1)}M CAPEX</span>
                                )}
                            </h4>
                            <div className="space-y-3 text-sm">
                                {Object.entries(data.Financial_Simulation.Pilot_CAPEX || {}).map(([k, v]) => {
                                    if(k.includes("Total") || !v) return null;
                                    return <div key={k} className="flex justify-between border-b border-zinc-100 pb-1"><span className="text-zinc-500 capitalize">{k.replace(/_/g, ' ')}</span><span className="font-medium text-right max-w-[50%]">{String(v)}</span></div>
                                })}
                                <div className="pt-2 mt-4 text-xs font-bold uppercase text-zinc-400 tracking-widest">Pilot OPEX Breakdown</div>
                                {Object.entries(data.Financial_Simulation.Pilot_OPEX || {}).map(([k, v]) => {
                                    if(k.includes("Total") || !v) return null;
                                    return <div key={k} className="flex justify-between border-b border-zinc-100 pb-1"><span className="text-zinc-500 capitalize">{k.replace(/_/g, ' ')}</span><span className="font-medium text-right max-w-[50%]">{String(v)}</span></div>
                                })}
                            </div>
                        </div>

                        <div className="bg-zinc-50 border border-zinc-200 p-5 rounded-xl">
                            <h4 className="font-extrabold text-zinc-800 mb-4 border-b border-zinc-200 pb-2 flex justify-between">
                                Full Scale Stage
                                {data.Financial_Simulation.FullScale_CAPEX?.Total_FullScale_CAPEX_USD && (
                                    <span className="text-blue-600 font-black">${(data.Financial_Simulation.FullScale_CAPEX.Total_FullScale_CAPEX_USD / 1e6).toFixed(1)}M CAPEX</span>
                                )}
                            </h4>
                            <div className="space-y-3 text-sm">
                                {Object.entries(data.Financial_Simulation.FullScale_CAPEX || {}).map(([k, v]) => {
                                    if(k.includes("Total") || !v) return null;
                                    return <div key={k} className="flex justify-between border-b border-zinc-100 pb-1"><span className="text-zinc-500 capitalize">{k.replace(/_/g, ' ')}</span><span className="font-medium text-right max-w-[50%]">{String(v)}</span></div>
                                })}
                                <div className="pt-2 mt-4 text-xs font-bold uppercase text-zinc-400 tracking-widest">Full Scale OPEX Breakdown</div>
                                {Object.entries(data.Financial_Simulation.FullScale_OPEX || {}).map(([k, v]) => {
                                    if(k.includes("Total") || !v) return null;
                                    return <div key={k} className="flex justify-between border-b border-zinc-100 pb-1"><span className="text-zinc-500 capitalize">{k.replace(/_/g, ' ')}</span><span className="font-medium text-right max-w-[50%]">{String(v)}</span></div>
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 pdf-section break-inside-avoid">
                        <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl">
                            <h4 className="font-bold text-zinc-800 mb-3 border-b border-zinc-200 pb-1">Revenue Milestones</h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b border-zinc-100 pb-1"><span className="text-zinc-500">Year 1</span><span className="font-bold text-zinc-800">${((data.Financial_Simulation.Revenue_Projections?.Year_1_USD || 0) / 1e6).toFixed(1)}M</span></div>
                                <div className="flex justify-between border-b border-zinc-100 pb-1"><span className="text-zinc-500">Year 3</span><span className="font-bold text-zinc-800">${((data.Financial_Simulation.Revenue_Projections?.Year_3_USD || 0) / 1e6).toFixed(1)}M</span></div>
                                <div className="flex justify-between border-b border-zinc-100 pb-1"><span className="text-zinc-500">Year 5</span><span className="font-bold text-zinc-800">${((data.Financial_Simulation.Revenue_Projections?.Year_5_USD || 0) / 1e6).toFixed(1)}M</span></div>
                                <div className="flex justify-between pb-1"><span className="text-zinc-500">Revenue Model</span><span className="font-medium text-zinc-700 text-right max-w-[60%]">{data.Financial_Simulation.Revenue_Projections?.Revenue_Model || "N/A"}</span></div>
                            </div>
                        </div>
                        {data.Financial_Simulation.Monte_Carlo && (
                            <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl">
                                <h4 className="font-bold text-zinc-800 mb-3 border-b border-zinc-200 pb-1 flex items-center gap-2">
                                     Monte Carlo Simulation
                                </h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between border-b border-zinc-100 pb-1"><span className="text-zinc-500">Base Investment</span><span className="font-medium text-zinc-800">${((data.Financial_Simulation.Monte_Carlo.Base_Investment_USD || 0) / 1e6).toFixed(1)}M</span></div>
                                    <div className="flex justify-between border-b border-zinc-100 pb-1"><span className="text-zinc-500">Median Value</span><span className="font-bold text-blue-600">${((data.Financial_Simulation.Monte_Carlo.Median_Value || 0) / 1e6).toFixed(1)}M</span></div>
                                    <div className="flex justify-between border-b border-zinc-100 pb-1"><span className="text-zinc-500">5th Percentile (Risk)</span><span className="font-bold text-rose-600">${((data.Financial_Simulation.Monte_Carlo["5th_Percentile_Value"] || 0) / 1e6).toFixed(1)}M</span></div>
                                    <div className="text-zinc-600 italic bg-white p-3 rounded-lg border border-zinc-100 shadow-sm mt-3 leading-relaxed">
                                        "{data.Financial_Simulation.Monte_Carlo.Risk_Assessment}"
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {data.Financial_Simulation.Key_Assumptions && data.Financial_Simulation.Key_Assumptions.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-zinc-100 pdf-section break-inside-avoid">
                            <h4 className="font-bold text-zinc-800 text-sm uppercase tracking-widest mb-3">Key Assumptions</h4>
                            <ul className="list-disc list-inside text-sm text-zinc-600 space-y-2 font-medium">
                                {data.Financial_Simulation.Key_Assumptions.map((assump, idx) => (
                                    <li key={idx} className="pl-2 -indent-4 ml-4 leading-relaxed">{assump}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div className="pt-12 mt-12 text-center text-zinc-300 pointer-events-none">
                <div className="flex justify-center mb-2 opacity-50"><Zap className="w-6 h-6" /></div>
                <div className="text-xs font-black uppercase tracking-[0.3em]">End of Innovation Engine Report</div>
            </div>
            
        </div>
    );
}
