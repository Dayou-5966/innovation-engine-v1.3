"use client";

import {
    Sparkles, Workflow, WalletCards, ChevronRight,
    Brain, Globe, BarChart3, FileText, TrendingUp,
    AlertTriangle, CheckCircle2, Lightbulb, Clock,
    Zap, ShieldAlert, BookOpen, Info, Target, Layers,
    RefreshCw, RadarIcon, Users, LineChart, Search
} from "lucide-react";

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ id, title, icon, children }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <section id={id} className="scroll-mt-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">{icon}</div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
            </div>
            {children}
        </section>
    );
}

// ── Callout ──────────────────────────────────────────────────────────────────
function Callout({ type, children }: { type: "tip" | "warning" | "info" | "caution"; children: React.ReactNode }) {
    const styles = {
        tip: { bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40", icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />, label: "Tip", text: "text-emerald-900 dark:text-emerald-200" },
        warning: { bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40", icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />, label: "Note", text: "text-amber-900 dark:text-amber-200" },
        info: { bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40", icon: <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />, label: "Info", text: "text-blue-900 dark:text-blue-200" },
        caution: { bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40", icon: <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />, label: "Caution", text: "text-red-900 dark:text-red-200" },
    };
    const s = styles[type];
    return (
        <div className={`flex gap-3 rounded-xl p-4 border ${s.bg}`}>
            {s.icon}
            <div className={`text-sm font-light leading-relaxed ${s.text}`}>
                <span className="font-semibold">{s.label}: </span>{children}
            </div>
        </div>
    );
}

// ── Pipeline Step ────────────────────────────────────────────────────────────
function PipelineStep({ num, title, model, color, desc, outputs }: {
    num: number; title: string; model: string; color: string; desc: string; outputs: string[];
}) {
    return (
        <div className={`rounded-2xl border p-5 space-y-3 ${color}`}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                    <span className="text-2xl font-black opacity-30">{num}</span>
                    <h4 className="font-semibold text-sm">{title}</h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">{model}</span>
            </div>
            <p className="text-xs font-light leading-relaxed opacity-80">{desc}</p>
            <ul className="space-y-1">
                {outputs.map(o => (
                    <li key={o} className="flex items-center gap-2 text-xs opacity-70">
                        <ChevronRight className="h-3 w-3 shrink-0" />{o}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── Score Badge ──────────────────────────────────────────────────────────────
function ScoreBand({ range, label, color }: { range: string; label: string; color: string }) {
    return (
        <div className={`rounded-xl px-4 py-3 text-center border ${color}`}>
            <p className="text-lg font-bold">{range}</p>
            <p className="text-xs font-medium mt-0.5">{label}</p>
        </div>
    );
}

// ── Main Guide ───────────────────────────────────────────────────────────────
export function Guide({ aiModel }: { aiModel: string }) {
    return (
        <div className="min-h-screen p-8 md:p-12 max-w-4xl mx-auto space-y-16 pb-24">

            {/* Hero */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 text-xs font-mono text-primary/70 uppercase tracking-widest">
                    <BookOpen className="h-3.5 w-3.5" />
                    User Guide · v1.3
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    The Innovation Engine
                </h1>
                <p className="text-xl text-zinc-500 dark:text-zinc-400 font-light leading-relaxed max-w-2xl">
                    A 5-stage AI pipeline that evaluates new ideas against your strategic mandate using live web research, financial modelling, and probabilistic risk analysis — all powered by {aiModel}.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                    {[
                        { icon: <Brain className="h-3.5 w-3.5" />, label: "Deep Reasoning" },
                        { icon: <Globe className="h-3.5 w-3.5" />, label: "Live Web Research" },
                        { icon: <BarChart3 className="h-3.5 w-3.5" />, label: "Financial Modelling" },
                        { icon: <TrendingUp className="h-3.5 w-3.5" />, label: "Signals & Signposts" },
                        { icon: <Zap className="h-3.5 w-3.5" />, label: "Evaluation Templates" },
                        { icon: <RefreshCw className="h-3.5 w-3.5" />, label: "Re-Run with New Model" },
                    ].map(b => (
                        <span key={b.label} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {b.icon}{b.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── 1. Quick Start ─────────────────────────────────────────────── */}
            <Section id="quickstart" title="Quick Start" icon={<Zap className="h-5 w-5" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { step: "01", title: "Log in", desc: "Enter your clearance token at the Architect Gateway screen. Ask your administrator for the password.", icon: <ShieldAlert className="h-6 w-6" /> },
                        { step: "02", title: "Enter an idea", desc: "Go to Evaluation Funnel → type your idea in plain English. Optionally pick an Evaluation Template (Healthcare, B2B SaaS, etc.) to pre-load domain-specific prompt overrides before running.", icon: <Workflow className="h-6 w-6" /> },
                        { step: "03", title: "Read the report", desc: "Wait ~3–5 min while the 5-stage pipeline runs. The full Investment Evaluation Report auto-appears when complete.", icon: <FileText className="h-6 w-6" /> },
                    ].map(s => (
                        <div key={s.step} className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6 space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl font-black text-primary/20">{s.step}</span>
                                <div className="text-primary">{s.icon}</div>
                            </div>
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{s.title}</h4>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-light leading-relaxed">{s.desc}</p>
                        </div>
                    ))}
                </div>
                <Callout type="tip">
                    Write your idea as a one-sentence hypothesis: <em>"[Technology/Approach] to [solve Problem] for [Target Market] in [Industry]"</em>.
                    The more specific you are, the better the AI can research and evaluate it.
                </Callout>
            </Section>

            {/* ── 2. The Two Modes ───────────────────────────────────────────── */}
            <Section id="modes" title="Two Ways to Use the Engine" icon={<Layers className="h-5 w-5" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/20 p-6 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-blue-900 dark:text-blue-200">Genesis Mode</h3>
                        </div>
                        <p className="text-sm text-blue-800 dark:text-blue-300 font-light leading-relaxed">
                            <strong>Start here if you don&apos;t have a specific idea yet.</strong> Enter a few keywords (e.g. "offshore energy" or "AI diagnostics") and the engine generates 3 novel innovation concepts aligned to your mandate. Each card shows its core mechanism, opportunity, and barrier. Click <em>"Evaluate this →"</em> on any card to send it straight to the pipeline.
                        </p>
                        <div className="text-xs text-blue-700 dark:text-blue-400 font-mono bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-xl">
                            Keywords → 3 concepts → pick one → auto-evaluate
                        </div>
                    </div>
                    <div className="rounded-2xl border border-primary/20 dark:border-primary/10 bg-primary/5 dark:bg-primary/5 p-6 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Workflow className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Evaluation Funnel</h3>
                        </div>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 font-light leading-relaxed">
                            <strong>Start here if you already have an idea.</strong> Type or paste your idea directly into the text field and hit Evaluate. The 5-stage pipeline runs automatically, taking ~3–5 minutes. You can watch each stage complete in real-time on the progress tracker.
                        </p>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-xl">
                            Paste idea → Run pipeline → Full investment report
                        </div>
                    </div>
                </div>
            </Section>

            {/* ── 2b. Evaluation Templates ───────────────────────────────────── */}
            <Section id="templates" title="Evaluation Templates" icon={<Zap className="h-5 w-5" />}>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
                    Before running an evaluation, you can apply a <strong>Quick Template</strong> to pre-load domain-specific prompt overrides across all four pipeline stages. Templates are available inside the <em>Advanced Agent Overrides</em> drawer in the Evaluation Funnel.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        {
                            label: "Healthcare Focus",
                            color: "border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200",
                            badge: "text-rose-600 bg-rose-100 dark:bg-rose-900/30",
                            desc: "Prioritises regulatory pathway (FDA/CE), clinical evidence requirements, reimbursement models, and patient safety. Ideal for medtech, diagnostics, and digital health ideas."
                        },
                        {
                            label: "B2B SaaS Lens",
                            color: "border-sky-200 dark:border-sky-900/40 bg-sky-50 dark:bg-sky-950/20 text-sky-900 dark:text-sky-200",
                            badge: "text-sky-600 bg-sky-100 dark:bg-sky-900/30",
                            desc: "Focuses on ARR potential, CAC/LTV ratios, enterprise sales cycle length, integration complexity, and churn risk. Best for software-as-a-service and platform plays."
                        },
                        {
                            label: "Capital-Constrained",
                            color: "border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200",
                            badge: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
                            desc: "Frames all four stages around bootstrappable milestones, lean ops, capital efficiency, and early revenue. Use when burn rate and time-to-profitability are constraints."
                        },
                        {
                            label: "Deep Tech / IP",
                            color: "border-violet-200 dark:border-violet-900/40 bg-violet-50 dark:bg-violet-950/20 text-violet-900 dark:text-violet-200",
                            badge: "text-violet-600 bg-violet-100 dark:bg-violet-900/30",
                            desc: "Emphasises IP defensibility, Technology Readiness Level (TRL), research-to-market path, and patent landscape. Best for deep science, hardware, and materials innovations."
                        },
                    ].map(t => (
                        <div key={t.label} className={`rounded-2xl border p-5 space-y-2 ${t.color}`}>
                            <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-lg ${t.badge}`}>{t.label}</span>
                            <p className="text-sm font-light leading-relaxed opacity-80">{t.desc}</p>
                        </div>
                    ))}
                </div>
                <Callout type="tip">
                    Templates set all four stage overrides at once. You can still edit individual stage prompts after applying a template. Template buttons are disabled once an evaluation has started — select your template <em>before</em> clicking Evaluate.
                </Callout>
            </Section>

            {/* ── 3. The 5-Stage Pipeline ────────────────────────────────────── */}
            <Section id="pipeline" title="The 5-Stage Evaluation Pipeline & Data Flow" icon={<Brain className="h-5 w-5" />}>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed mb-2">
                    Every idea passes through five sequential AI agents, each with a distinct specialisation. No stage can be skipped — the architecture enforces a <strong>strict linear data flow</strong> where every agent directly consumes the output reports generated by the preceding agents to build upon their context.
                </p>
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400 font-light">Look for the</span>
                    <span className="inline-block text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50">
                        AI ✔️ Search ✔️
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400 font-light">badges in the UI to verify that an agent has successfully invoked both Deep Reasoning and live Google Search grounding for its specific step.</span>
                </div>

                {/* Visual pipeline flow */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                    <PipelineStep
                        num={1} title="Strategic Triage" model={aiModel}
                        color="bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40 text-violet-900 dark:text-violet-200"
                        desc="Reads your mandate documents and searches the web. Assesses whether the idea aligns with your strategic priorities. Issues a PASS or VETO."
                        outputs={["Kill Switch verdict", "SWOT analysis", "Strategic Alignment Score", "Strategic Signposts"]}
                    />
                    <PipelineStep
                        num={2} title="Feasibility Scans" model={aiModel}
                        color="bg-sky-50 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/40 text-sky-900 dark:text-sky-200"
                        desc="Live internet research: TAM/SAM/SOM sizing, competitor funding, patent filings, and 'White Space' mapping. Resolves data gaps via an Adversarial Duel."
                        outputs={["Market sizing (TAM/SAM/SOM)", "Competitor landscape", "IP Scan & White Space Map", "Bullish & Bearish Signals", "Adversarial Duel Transcript"]}
                    />
                    <PipelineStep
                        num={3} title="Stress Testing" model="gemini-flash"
                        color="bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40 text-rose-900 dark:text-rose-200"
                        desc="Quantitative risk specialist builds a full financial model: CAPEX, OPEX, 5-year revenue projections, NPV/IRR, and runs a Monte Carlo simulation. Also identifies a Golden Lever."
                        outputs={["CAPEX & OPEX breakdown", "Revenue projections (Y1/Y3/Y5)", "Monte Carlo risk range", "Golden Lever sensitivity"]}
                    />
                    <PipelineStep
                        num={4} title="Synthesis (Watchtower)" model="gemini-flash"
                        color="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200"
                        desc="Chief Innovation Officer synthesises all stages into a D0 Scorecard and final justification. The Agentic Watchtower runs a final override check if the Pivot flag is thrown."
                        outputs={["D0 Scorecard (out of 50)", "Top 3 deal-killing risks", "Agentic Pivot verification", "Final Recommendation"]}
                    />
                    <PipelineStep
                        num={5} title="Tactical Roadmap" model="gemini-flash"
                        color="bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 text-amber-900 dark:text-amber-200"
                        desc="Execution Lead generates day-one action plans if the verdict is PROCEED or PIVOT, reading the Golden Lever and Top 3 Risks."
                        outputs={["30/60/90-Day OKRs", "Top 3 Hiring Priorities"]}
                    />
                </div>

                {/* Connector arrows for desktop */}
                <Callout type="info">
                    Each stage uses <strong>Google Search grounding</strong> (Stages 1 & 2) so citations reference real, current web sources — not just the model&apos;s training data. Stage 3 uses a <strong>function-calling tool</strong> to execute the Monte Carlo simulation with real numbers.
                </Callout>
            </Section>

            {/* ── 4. Reading the Report ─────────────────────────────────────── */}
            <Section id="report" title="Reading the Evaluation Report" icon={<FileText className="h-5 w-5" />}>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
                    The report is structured top-to-bottom in order of decision importance. Here&apos;s how to read each section:
                </p>

                <div className="space-y-4">
                    {[
                        {
                            badge: "🛡️ Kill Switch", color: "border-l-4 border-red-400 dark:border-red-600 pl-4",
                            desc: "The first thing to check. If this says VETO, the idea conflicts with a core mandate clause and should not proceed regardless of other scores. Read the cited clause to understand why."
                        },
                        {
                            badge: "📊 D0 Scorecard (0–50)", color: "border-l-4 border-primary/60 pl-4",
                            desc: "Five dimensions scored 0–10 each: Strategic Alignment, Disruptive Potential, Technical Feasibility, Commercial Impact, Scalability. Total out of 50."
                        },
                        {
                            badge: "⚠️ Top 3 Deal-Killing Risks", color: "border-l-4 border-amber-400 dark:border-amber-600 pl-4",
                            desc: "The three risks most likely to kill the project. Each has Probability (Low/Medium/High), Severity (Low/Medium/High/Critical), and specific Mitigation steps."
                        },
                        {
                            badge: "🌍 Market Intelligence & White Space", color: "border-l-4 border-sky-400 dark:border-sky-600 pl-4",
                            desc: "TAM/SAM/SOM figures with citations. Competitor table with funding data. Generative IP White Space mapping via an interactive ScatterChart, supply chain dependencies, and regulatory environment."
                        },
                        {
                            badge: "🟢🔴 Signals & Signposts", color: "border-l-4 border-emerald-400 dark:border-emerald-600 pl-4",
                            desc: "Bullish signals are real market events happening NOW that support the idea (cited). Bearish signals are real threats. Signpost cards show future milestones to watch — with Bull case (what happens if it hits) and Bear case (what happens if it misses)."
                        },
                        {
                            badge: "💰 Financial Model — Pilot & Full-Scale", color: "border-l-4 border-violet-400 dark:border-violet-600 pl-4",
                            desc: "Two financial scenarios are shown side-by-side. Model A (blue) is the Pilot / Innovation Phase (Year 1–2): lean CAPEX, core team OPEX, early validation spend. Model B (purple) is the Full-Scale phase: production infrastructure, full team, sales & marketing. Each block shows itemised CAPEX and annual OPEX with totals. A combined investment summary sits at the top. Then Monte Carlo simulation showing the downside (5th percentile) and median return range across both scenarios."
                        },
                        {
                            badge: "🕸️ Radar Chart", color: "border-l-4 border-sky-400 dark:border-sky-600 pl-4",
                            desc: "A visual radar chart maps the five D0 scorecard dimensions (Strategic Alignment, Disruptive Potential, Technical Feasibility, Commercial Impact, Scalability) onto polar axes, making it easy to spot which dimensions are strong or weak at a glance."
                        },
                        {
                            badge: "🤖 Agent Summaries", color: "border-l-4 border-emerald-400 dark:border-emerald-600 pl-4",
                            desc: "Direct feedback and synthesis from the three core personas: Strategist (alignment), Market Researcher (desirability/feasibility), and Risk Specialist (financial viability)."
                        },
                        {
                            badge: "🕵️‍♂️ Detailed Agent Reports (New)", color: "border-l-4 border-indigo-400 dark:border-indigo-600 pl-4",
                            desc: "In addition to the Executive Summary, you can now swap to the 'Detailed Strategist Report', 'Market Intelligence', and 'Quant & Risk Report' tabs at the top of the report. These contain the exhaustive deep-dive logic produced by individual agents before the final synthesis. The Quant tab features an interactive Recharts distribution histogram of the Monte Carlo simulation."
                        },
                        {
                            badge: "⚔️ Adversarial Duel", color: "border-l-4 border-orange-400 dark:border-orange-600 pl-4",
                            desc: "If a Live Conflict Detected flag is raised during Stage 2, the pipeline triggers an automatic 3-turn debate between the Scout and Researcher agents. The duel transcript is streamed into your Logic Trace terminal."
                        },
                        {
                            badge: "🎯 Tactical Roadmap (OKRs)", color: "border-l-4 border-amber-400 dark:border-amber-600 pl-4",
                            desc: "At the bottom of the Executive Summary, if the engine approves the idea or suggests a Pivot, it auto-generates 30/60/90-Day OKRs based on the Golden Lever, alongside the top 3 critical hires needed on Day 1."
                        },
                        {
                            badge: "⚡ The Agentic Watchtower (Proactive Engine)", color: "border-l-4 border-amber-500 dark:border-amber-600 pl-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-r-xl py-1",
                            desc: "When evaluating complex ideas, the engine may discover a 'Black Swan' risk or structural flaw. Instead of just rejecting the idea, the Agentic Watchtower triggers a PIVOT. You will see a glowing alert block mapping out exactly how you should restructure the project model (e.g., Pivot from CAPEX to a Licensing IP model). The 'Golden Lever' widget will also isolate the single biggest financial sensitivity."
                        },
                        {
                            badge: "📥 High-Fidelity PDF Export", color: "border-l-4 border-zinc-400 dark:border-zinc-600 pl-4",
                            desc: "At the top right of any report, click 'Export PDF' to save a bespoke, visually perfect copy of the entire valuation dashboard directly to your local machine using the native File System Access API."
                        },
                    ].map(r => (
                        <div key={r.badge} className={`space-y-1 ${r.color}`}>
                            <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{r.badge}</p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">{r.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Score interpretation */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">D0 Score Interpretation</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <ScoreBand range="40–50" label="Strongly Proceed" color="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300" />
                        <ScoreBand range="30–39" label="Proceed with Conditions" color="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-300" />
                        <ScoreBand range="20–29" label="Requires Rethink" color="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300" />
                        <ScoreBand range="0–19" label="Likely Reject" color="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300" />
                    </div>
                </div>
            </Section>

            {/* ── 5. Mandate Documents ─────────────────────────────────────── */}
            <Section id="mandate" title="Using Mandate Documents" icon={<BookOpen className="h-5 w-5" />}>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
                    The engine evaluates each idea against your organisation&apos;s strategic mandate. Without a mandate document loaded, it uses a default set of generic priorities (technology leadership, ESG compliance, B2B scalability, capital efficiency).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-5 space-y-2">
                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> How to upload</h4>
                        <ol className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400 font-light">
                            <li className="flex gap-2"><span className="text-primary font-bold">1.</span>Open the <strong>Mandate Documents</strong> section in the left sidebar</li>
                            <li className="flex gap-2"><span className="text-primary font-bold">2.</span>Upload a PDF or TXT file of your mandate / strategy document</li>
                            <li className="flex gap-2"><span className="text-primary font-bold">3.</span>The document is automatically sent to Stage 1 for clause-level alignment analysis</li>
                        </ol>
                    </div>
                    <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-5 space-y-2">
                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> What works best</h4>
                        <ul className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400 font-light list-disc list-inside">
                            <li>Strategic plan, innovation charter, or investment thesis</li>
                            <li>Clearly numbered clauses or principles the AI can quote</li>
                            <li>2–10 pages — longer documents may exceed context</li>
                        </ul>
                    </div>
                </div>
                <Callout type="warning">
                    The Stage 1 AI will explicitly quote the mandate clause when issuing a VETO. If you see a VETO you disagree with, the mandate document may have a clause that needs revisiting — not the idea.
                </Callout>
            </Section>

            {/* ── 6. Multimodal PDF Analysis ─────────────────────────────────── */}
            <Section id="multimodal" title="Multimodal PDF Analysis" icon={<Brain className="h-5 w-5" />}>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
                    The Innovation Engine supports fully <strong>Multimodal Deferred Extraction</strong> for Mandate Documents via the Gemini File API.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 space-y-1.5">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-500" />
                            Gemini File API Extraction
                        </p>
                        <p className="text-zinc-500 dark:text-zinc-400 font-light leading-relaxed">
                            When you upload a PDF, it is sent to the Gemini File API for deep multimodal transcription — extracting text, tables, and chart descriptions. Large PDFs may take a moment to process.
                        </p>
                    </div>
                    <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 space-y-1.5">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            Full Visual Parsing
                        </p>
                        <p className="text-zinc-500 dark:text-zinc-400 font-light leading-relaxed">
                            The AI reads tables, charts, graphs, and images within your PDF, producing detailed textual descriptions of visual data so the evaluation pipeline has full context.
                        </p>
                    </div>
                </div>
            </Section>

            {/* ── 7. Selecting Your AI Engine ────────────────────────────────── */}
            <Section id="models" title="Selecting Your AI Engine" icon={<Globe className="h-5 w-5" />}>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
                    You can switch the foundational intelligence powering all Innovation Engine agents at any time using the global selector at the bottom of the navigation sidebar.
                </p>
                <div className="space-y-3">
                    <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-5">
                        <p className="font-semibold text-sm mb-3">Model Cost Tiers (Input / Output per 1M)</p>
                        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 font-light">
                            <li className="flex gap-2 items-start"><span className="text-primary mt-0.5">🟢</span> <strong>Low Cost ($0.075 / $0.30):</strong> (e.g. Flash-Lite, 2.0 Flash) Extremely cost-efficient models perfect for high-volume analysis or quick ideation runs.</li>
                            <li className="flex gap-2 items-start"><span className="text-primary mt-0.5">🟡</span> <strong>Standard Cost ($0.30 / $2.50):</strong> (e.g. 2.5 Flash) Balanced cost and performance capabilities for rapid iterative triage.</li>
                            <li className="flex gap-2 items-start"><span className="text-primary mt-0.5">🔴</span> <strong>Premium Cost ($1.25 / $10.00):</strong> (e.g. Pro Models) High intelligence tier with robust reasoning and structural capability. Reserve for deep, complete funnel evaluations.</li>
                        </ul>
                    </div>
                    <Callout type="info">
                        Model switches happen immediately. Any evaluations initiated after changing the dropdown will utilize the new Agent architecture natively.
                    </Callout>
                </div>
            </Section>

            {/* ── 7b. Deep Research Integration ──────────────────────────────── */}
            <Section id="deep-research" title="Deep Research Integration" icon={<Search className="h-5 w-5" />}>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
                    Version 1.3 introduces genuine Deep Research capabilities to the Innovation Engine, bypassing standard search grounding for asynchronous, exhaustive internet exploration.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-5 space-y-2">
                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><Workflow className="h-4 w-4 text-primary" /> How to Enable</h4>
                        <ol className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400 font-light">
                            <li className="flex gap-2"><span className="text-primary font-bold">1.</span>Locate the <strong>Deep Research</strong> toggle at the bottom of the sidebar.</li>
                            <li className="flex gap-2"><span className="text-primary font-bold">2.</span>Switch it on to reveal the Deep Research model selector.</li>
                            <li className="flex gap-2"><span className="text-primary font-bold">3.</span>Select the <code className="font-mono text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded">deep-research-pro-preview-12-2025</code> agent (or newer).</li>
                        </ol>
                    </div>
                    <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-5 space-y-2">
                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> How it Works</h4>
                        <ul className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400 font-light list-disc list-inside">
                            <li>Replaces standard Google Search Grounding with long-running, multi-step reasoning web navigation.</li>
                            <li>Ideal for complex technical feasibility or obscure patent/market searches.</li>
                            <li><strong>Note:</strong> Evaluations using Deep Research will take significantly longer (up to 15-20+ minutes) due to the depth of exploration.</li>
                        </ul>
                    </div>
                </div>
            </Section>

            {/* ── 8. Portfolio Archive ─────────────────────────────────────── */}
            <Section id="portfolio" title="Portfolio Archive" icon={<WalletCards className="h-5 w-5" />}>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
                    Every completed evaluation is automatically saved to a persistent database. Your portfolio survives app restarts and is scoped to your account in multi-user mode.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {[
                        { title: "Sort & Filter", icon: <BarChart3 className="h-4 w-4 text-primary" />, desc: "Click any column header to sort by score, date, or recommendation. Use the search bar to find ideas by keyword." },
                        { title: "Full Report Modal", icon: <FileText className="h-4 w-4 text-primary" />, desc: "Click any row to re-open the complete evaluation report for that idea, including the full dual financial model and all stage outputs." },
                        { title: "Score Trend Chart", icon: <LineChart className="h-4 w-4 text-primary" />, desc: "A line chart shows your evaluation scores over time in chronological order, with a reference line at 70 (the PROCEED threshold). Track how your ideas are improving across sessions." },
                        { title: "Radar Comparison Chart", icon: <RadarIcon className="h-4 w-4 text-primary" />, desc: "Each full report includes a radar chart mapping all five D0 scorecard dimensions onto polar axes — instantly see which dimensions are strong or weak without reading the numbers." },
                        { title: "Re-Run with Different Model", icon: <RefreshCw className="h-4 w-4 text-primary" />, desc: "Click the Re-Run button on any archived idea to re-evaluate it with a different AI model (e.g. upgrade from Flash-Lite to Pro for a deeper pass). Results are saved as a new portfolio entry." },
                        { title: "Delete Entries", icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, desc: "Remove any evaluation from your portfolio via the delete action on the row. Deletions are permanent — the entry cannot be recovered." },
                    ].map(f => (
                        <div key={f.title} className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 space-y-1.5">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">{f.icon}{f.title}</p>
                            <p className="text-zinc-500 dark:text-zinc-400 font-light leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
                <Callout type="info">
                    The Re-Run modal lets you select the model before launching. The pipeline runs asynchronously — you can navigate away and come back; progress is persisted on the server.
                </Callout>
            </Section>



            {/* ── 9. Tips ──────────────────────────────────────────────────── */}
            <Section id="tips" title="Tips for Better Evaluations" icon={<Lightbulb className="h-5 w-5" />}>
                <div className="space-y-3">
                    {[
                        { tip: "Be specific with your idea", detail: "\"AI-powered corrosion monitoring for subsea pipelines using computer vision\" evaluates far better than \"AI for oil and gas\". The model can search for real market data only if the domain is precise." },
                        { tip: "Run the same idea twice for calibration", detail: "AI outputs have natural variance. If an idea scores 38/50 and 42/50 across two runs, the true signal is in the overlap, not the outlier." },
                        { tip: "Watch the Signposts section", detail: "The most actionable output is often the Strategic Signposts — specific future events that tell you when to re-evaluate or accelerate. Track these in your own quarterly reviews." },
                        { tip: "Don't dismiss VETOs immediately", detail: "A VETO means the idea conflicts with your mandate as written. It's a prompt to either (a) update the mandate, or (b) rethink the idea's framing — not necessarily to kill the idea." },
                        { tip: "Use Genesis Mode for ideation sessions", detail: "In workshops, use Genesis Mode with broad keywords to rapidly generate 3 novel concepts per topic area. Teams can then vote on which to send through the full pipeline." },
                    ].map(t => (
                        <div key={t.tip} className="flex gap-4 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.tip}</p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-light mt-0.5 leading-relaxed">{t.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── 10. Troubleshooting & Limitations ──────────────────────────── */}
            <Section id="limitations" title="Troubleshooting & Limitations" icon={<AlertTriangle className="h-5 w-5" />}>
                <Callout type="caution">
                    The Innovation Engine is a <strong>decision-support tool</strong>, not a replacement for human judgement, domain expertise, or formal due diligence. All outputs should be critically reviewed.
                </Callout>
                
                {/* Launch Script / Hard Restart */}
                <div className="mb-6 rounded-2xl border border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/10 p-5 space-y-3">
                    <h4 className="font-semibold text-sm text-red-900 dark:text-red-200 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-red-600" /> Hard Reset & The Launch Button
                    </h4>
                    <p className="text-sm text-red-800/80 dark:text-red-300 font-light leading-relaxed">
                        If the Evaluation Funnel gets stuck polling ("Waiting for orchestrated AI agents...") or if you suspect port conflicts, you can execute a full tear-down and restart using the included launch script. 
                    </p>
                    <div className="text-xs bg-red-900 text-red-100 dark:bg-black p-3 rounded-xl font-mono">
                        $ ./launch.sh
                    </div>
                    <ul className="text-sm text-red-800/80 dark:text-red-300 font-light list-disc list-inside space-y-1">
                        <li>Kills all existing <code>uvicorn</code> and <code>next dev</code> processes</li>
                        <li>Force-clears ports 8000 (Backend) and 3000 (Frontend)</li>
                        <li>Purges the Next.js cache to prevent Turbopack corruption</li>
                        <li>Restarts all services clean</li>
                    </ul>
                </div>

                <div className="space-y-3">
                    {[
                        { title: "Financial figures are directional, not audited", warn: true, desc: "The financial model (CAPEX, OPEX, NPV, IRR) is generated by an AI based on analogous data and stated assumptions. Treat all dollar figures as order-of-magnitude estimates requiring validation by a CFO or finance team before any investment decision." },
                        { title: "Web citations may be imperfect", warn: true, desc: "Google Search grounding retrieves real URLs, but the AI may occasionally misattribute a figure or cite a source that partially supports a claim. Spot-check any figure that materially impacts a decision." },
                        { title: "Knowledge cutoff vs. live search", warn: false, desc: "Stages 1 and 2 use live Google Search to find current information. However, Stage 3 (financial modelling) and Stage 4 (synthesis) synthesise from the earlier stages and the model's training knowledge, which has a cutoff date." },
                        { title: "Not a replacement for patent search", warn: false, desc: "The IP Scan is indicative only. For any serious IP freedom-to-operate assessment or filing strategy, consult a qualified IP attorney and conduct a formal patent search." },
                        { title: "Evaluation time varies", warn: false, desc: "Each run takes 3–8 minutes depending on idea complexity and API response times. Evaluation jobs run asynchronously on the server — the UI polls for progress every few seconds. If you navigate away and return, the status will still be tracked." },
                    ].map(l => (
                        <div key={l.title} className={`flex gap-4 p-4 rounded-xl border ${l.warn ? "border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/10" : "border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50"}`}>
                            <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${l.warn ? "text-red-500" : "text-amber-500"}`} />
                            <div>
                                <p className={`text-sm font-semibold ${l.warn ? "text-red-900 dark:text-red-200" : "text-zinc-900 dark:text-zinc-100"}`}>{l.title}</p>
                                <p className={`text-sm font-light mt-0.5 leading-relaxed ${l.warn ? "text-red-700 dark:text-red-300" : "text-zinc-500 dark:text-zinc-400"}`}>{l.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── 11. Design Logic ──────────────────────────────────────────── */}
            <Section id="design" title="Design Logic & Architecture" icon={<Brain className="h-5 w-5" />}>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
                    The engine is built on a deliberate architectural principle: <strong>separation of concerns across specialist agents</strong>. A single monolithic prompt asking one AI to do everything produces mediocre results. Instead:
                </p>
                <div className="space-y-4">
                    {[
                        { principle: "Sequential multi-agent design", detail: "Each stage reads the output of the previous one. Stage 2 has the Stage 1 strategic brief so market sizing is done through the lens of strategic alignment — not in isolation." },
                        { principle: "Tool-using AI for financial simulation", detail: "Stage 3 doesn't \"hallucinate\" financial numbers — it calls a real Monte Carlo function (implemented in Python/numpy) with AI-determined inputs. The simulation math is deterministic." },
                        { principle: "Google Search grounding = live data, not stale training", detail: "Gemini's Google Search tool retrieves and reads real URLs at evaluation time. This is why competitor funding rounds and regulatory changes reflect today's reality." },
                        { principle: "Structured JSON output = UI-ready data", detail: "Stage 4 synthesises everything into a strict JSON schema. This means the dashboard can render structured tables, charts, and cards rather than just displaying raw text." },
                        { principle: "SQLite persistence = your institutional memory", detail: "The portfolio database stores every evaluation permanently, making the tool a growing institutional knowledge base — not a stateless chatbot that forgets everything." },
                        { principle: "Async job system = resilient long-running evaluations", detail: "Evaluations run as persistent background jobs stored in the database. Each job tracks its stage, progress %, intermediate outputs, and final result. The UI polls every few seconds — no WebSocket required, and jobs survive backend restarts." },
                        { principle: "Rate limiting = fair use under shared API quota", detail: "All evaluation and generation endpoints are rate-limited per IP address (configurable by the administrator). This prevents any single user from exhausting the shared Gemini API quota in a burst." },
                    ].map(p => (
                        <div key={p.principle} className="flex gap-4">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">→</div>
                            <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{p.principle}</p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-light mt-0.5 leading-relaxed">{p.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── 12. Timing ───────────────────────────────────────────────── */}
            <Section id="timing" title="Expected Timing" icon={<Clock className="h-5 w-5" />}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                    {[
                        { stage: "Stage 1", time: "45–90s", note: "Strategic Triage" },
                        { stage: "Stage 2", time: "60–120s", note: "Market + IP Scan" },
                        { stage: "Stage 3", time: "30–60s", note: "Financial Model" },
                        { stage: "Stage 4", time: "30–60s", note: "Report Synthesis" },
                        { stage: "Stage 5", time: "10–20s", note: "Tactical Roadmap" },
                    ].map(t => (
                        <div key={t.stage} className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 space-y-1">
                            <p className="text-xs font-mono text-zinc-400">{t.stage}</p>
                            <p className="text-2xl font-bold text-primary">{t.time}</p>
                            <p className="text-xs text-zinc-500 font-light">{t.note}</p>
                        </div>
                    ))}
                </div>
                <Callout type="warning">
                    Total evaluation time is typically <strong>3–5 minutes</strong> with {aiModel}. Complex ideas with many competitors and regulatory layers may take up to 8 minutes. Do not refresh the page mid-run.
                </Callout>
            </Section>

            {/* Footer */}
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-8 text-center space-y-2">
                <p className="text-sm text-zinc-400 font-light">The Innovation Engine v1.3 · Built on {aiModel} · Powered by Google Search Grounding</p>
                <p className="text-xs text-zinc-300 dark:text-zinc-600">All evaluations are AI-generated research support tools. Not financial advice.</p>
            </div>
        </div>
    );
}
