"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Loader, Database, FolderArchive, ArrowUpRight, X, ShieldAlert,
    ArrowUpDown, TrendingUp, Star, Archive, Trash2, BarChart2,
    PlusCircle, MinusCircle, ChevronDown, ChevronUp, Download,
    RefreshCw, LineChart as LineChartIcon
} from "lucide-react";
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Legend, Tooltip,
    LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine
} from "recharts";
import { jsPDF } from "jspdf";
import { toJpeg } from "html-to-image";
import { VisualOutputDashboard, EvaluationResult } from "./dashboard";
import { PrintableReport } from "./printable-report";

/* ─────────────────────── Types ─────────────────────── */
interface ScoreEntry { Score: number; Rationale: string; }
interface Risk { Title: string; Description: string; }
interface FullReport {
    Title?: string; Eureka_Moment?: string;
    D0_Scorecard?: {
        Total_Score?: number;
        Strategic_Alignment?: ScoreEntry; Disruptive_Potential?: ScoreEntry;
        Technical_Feasibility?: ScoreEntry; Commercial_Impact?: ScoreEntry;
        Scalability?: ScoreEntry;
    };
    Top_3_Deal_Killing_Risks?: Risk[];
    Market_Verification?: Record<string, any>;
    IP_Scan?: Record<string, any>;
    Recommendation?: string; Justification?: string;
}
interface EvaluationRecord {
    id: number; idea: string; concept_title: string;
    total_score: number; recommendation: string;
    model_used: string; created_at: string; full_json: FullReport;
}

/* ─────────────────────── Constants ─────────────────────── */
const SUB_KEYS = ["Strategic_Alignment", "Disruptive_Potential", "Technical_Feasibility", "Commercial_Impact", "Scalability"] as const;
const SUB_LABELS: Record<string, string> = {
    Strategic_Alignment: "Strategic", Disruptive_Potential: "Disruptive",
    Technical_Feasibility: "Technical", Commercial_Impact: "Commercial", Scalability: "Scalability",
};
const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const STORAGE_FAV = "ie_favorites";
const STORAGE_ARC = "ie_archived";

/* ─────────────────────── Helpers ─────────────────────── */
function loadSet(key: string): Set<number> {
    try { return new Set(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { return new Set(); }
}
function saveSet(key: string, s: Set<number>) {
    localStorage.setItem(key, JSON.stringify([...s]));
}

/* ─────────────────────── Props ─────────────────────── */
interface PortfolioArchiveProps {
    onRerun?: (idea: string, model: string) => void;
}

/* ─────────────────────── Re-run state ─────────────────────── */
const AVAILABLE_MODELS = [
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
];

/* ─────────────────────── Component ─────────────────────── */
export function PortfolioArchive({ onRerun }: PortfolioArchiveProps) {
    const [records, setRecords] = useState<EvaluationRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<EvaluationRecord | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const reportRef = React.useRef<HTMLDivElement>(null);
    type SortKey = 'name' | 'total_score' | 'Strategic_Alignment' | 'Disruptive_Potential' | 'Technical_Feasibility' | 'Commercial_Impact' | 'Scalability' | 'verdict' | 'date' | 'engine';
    const [sortKey, setSortKey] = useState<SortKey>('total_score');
    const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
    const [favorites, setFavorites] = useState<Set<number>>(new Set());
    const [archived, setArchived] = useState<Set<number>>(new Set());
    const [compareIds, setCompareIds] = useState<number[]>([]);
    const [showArchived, setShowArchived] = useState(false);
    const [showCompare, setShowCompare] = useState(true);
    const [showTrend, setShowTrend] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Re-run state
    const [rerunRecord, setRerunRecord] = useState<EvaluationRecord | null>(null);
    const [rerunModel, setRerunModel] = useState("gemini-2.5-flash-lite");
    const [rerunJobId, setRerunJobId] = useState<string | null>(null);
    const [rerunStatus, setRerunStatus] = useState<"idle" | "running" | "done" | "error">("idle");
    const [rerunError, setRerunError] = useState<string | null>(null);
    const rerunPollRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setFavorites(loadSet(STORAGE_FAV));
        setArchived(loadSet(STORAGE_ARC));
        fetchHistory();
    }, []);

    async function fetchHistory() {
        try {
            const token = localStorage.getItem("auth_token");
            const API_URL = "";
            const res = await fetch(`${API_URL}/api/history`, { headers: { "Authorization": `Bearer ${token}` } });
            if (res.ok) { const data = await res.json(); setRecords(data.history); }
            else if (res.status === 401) { localStorage.removeItem("auth_token"); window.location.reload(); }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }

    function toggleFav(id: number) {
        setFavorites(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            saveSet(STORAGE_FAV, next); return next;
        });
    }

    function toggleArchive(id: number) {
        setArchived(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            saveSet(STORAGE_ARC, next); return next;
        });
        // Also remove from comparison if archived
        setCompareIds(prev => prev.filter(c => c !== id));
    }

    async function handleExportPDF() {
        if (!selectedRecord || !reportRef.current) return;
        try {
            setIsExporting(true);
            await new Promise(r => setTimeout(r, 100));

            // Target the hidden, formatted printable report instead of the visual UI dashboard
            const wrapper = document.getElementById('pdf-print-document');
            if (!wrapper) throw new Error("Could not locate printable document wrapper.");
            
            // Extract predefined sections from the report component
            const sections = Array.from(wrapper.querySelectorAll('.pdf-section')) as HTMLElement[];

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const marginX = 20;
            const marginY = 30;
            const contentWidth = pdfWidth - 2 * marginX;
            let currentY = marginY;

            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                
                const dataUrl = await toJpeg(section, {
                    quality: 0.95,
                    backgroundColor: '#ffffff',
                    style: { transform: 'scale(1)', transformOrigin: 'top left', maxHeight: 'none', overflow: 'visible' },
                    pixelRatio: 2
                });

                const imgProps = pdf.getImageProperties(dataUrl);
                const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

                if (currentY + imgHeight <= pdfHeight - marginY) {
                    pdf.addImage(dataUrl, 'JPEG', marginX, currentY, contentWidth, imgHeight);
                    currentY += imgHeight + 20; 
                } else {
                    if (currentY > marginY) {
                        pdf.addPage();
                        currentY = marginY;
                    }

                    if (imgHeight <= pdfHeight - 2 * marginY) {
                        pdf.addImage(dataUrl, 'JPEG', marginX, currentY, contentWidth, imgHeight);
                        currentY += imgHeight + 20;
                    } else {
                        // Slicing massive sections
                        let yOffset = 0;
                        let unrenderedHeight = imgHeight;
                        
                        while (unrenderedHeight > 0) {
                            pdf.addImage(dataUrl, 'JPEG', marginX, currentY - yOffset, contentWidth, imgHeight);
                            const availablePageHeight = pdfHeight - currentY;
                            
                            if (unrenderedHeight > availablePageHeight) {
                                pdf.addPage();
                                unrenderedHeight -= availablePageHeight;
                                yOffset += availablePageHeight;
                                currentY = marginY;
                            } else {
                                currentY = currentY + unrenderedHeight + 20;
                                unrenderedHeight = 0;
                            }
                        }
                    }
                }
            }

            const title = selectedRecord.concept_title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `tie_report_${title}.pdf`;

            try {
                if ('showSaveFilePicker' in window) {
                    const handle = await (window as any).showSaveFilePicker({
                        suggestedName: filename,
                        types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }]
                    });
                    const writable = await handle.createWritable();
                    const pdfBlob = pdf.output('blob');
                    await writable.write(pdfBlob);
                    await writable.close();
                } else {
                    pdf.save(filename);
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') throw err; 
            }
            
        } catch (error) {
            console.error("Failed to generate PDF:", error);
        } finally {
            setIsExporting(false);
        }
    }

    async function deleteRecord(id: number) {
        setDeletingId(id);
        try {
            const token = localStorage.getItem("auth_token");
            const API_URL = "";
            const res = await fetch(`${API_URL}/api/evaluations/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                setRecords(prev => prev.filter(r => r.id !== id));
                setCompareIds(prev => prev.filter(c => c !== id));
                const newFav = new Set(favorites); newFav.delete(id); setFavorites(newFav); saveSet(STORAGE_FAV, newFav);
                const newArc = new Set(archived); newArc.delete(id); setArchived(newArc); saveSet(STORAGE_ARC, newArc);
            } else if (res.status === 401) {
                localStorage.removeItem("auth_token");
                window.location.reload();
            }
        } catch (e) { console.error(e); }
        finally { setDeletingId(null); }
    }

    function toggleCompare(id: number) {
        setCompareIds(prev => {
            if (prev.includes(id)) return prev.filter(c => c !== id);
            if (prev.length >= 5) return prev;
            return [...prev, id];
        });
    }

    async function startRerun(record: EvaluationRecord, model: string) {
        setRerunStatus("running");
        setRerunError(null);
        try {
            const token = localStorage.getItem("auth_token");
            const res = await fetch(`/api/evaluations/${record.id}/rerun`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ model }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { job_id } = await res.json();
            setRerunJobId(job_id);

            const poll = async () => {
                const sr = await fetch(`/api/evaluate/status/${job_id}`, {
                    headers: { "Authorization": `Bearer ${token}` },
                });
                if (!sr.ok) { setRerunStatus("error"); setRerunError(`HTTP ${sr.status}`); return; }
                const st = await sr.json();
                if (st.status === "done") {
                    setRerunStatus("done");
                    fetchHistory(); // refresh archive with new entry
                    if (onRerun && st.result) onRerun(record.idea, model);
                } else if (st.status === "error") {
                    setRerunStatus("error");
                    setRerunError(st.error ?? "Pipeline error");
                } else {
                    rerunPollRef.current = setTimeout(poll, 3000);
                }
            };
            poll();
        } catch (e) {
            setRerunStatus("error");
            setRerunError(e instanceof Error ? e.message : "Unknown error");
        }
    }

    async function cancelRerun() {
        if (rerunJobId) {
            try {
                const token = localStorage.getItem("auth_token");
                await fetch(`/api/evaluate/cancel/${rerunJobId}`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` },
                });
            } catch (e) {
                console.error("Failed to cancel rerun job", e);
            }
        }
        if (rerunPollRef.current) clearTimeout(rerunPollRef.current);
        setRerunRecord(null);
        setRerunJobId(null);
        setRerunStatus("idle");
        setRerunError(null);
    }

    /* ── Derived ── */
    const activeRecords = useMemo(() => records.filter(r => !archived.has(r.id)), [records, archived]);
    const archivedRecords = useMemo(() => records.filter(r => archived.has(r.id)), [records, archived]);

    // Score trend: all records sorted chronologically for line chart
    const trendData = useMemo(() =>
        [...records]
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((r, i) => ({
                idx: i + 1,
                label: new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                score: r.total_score,
                title: r.concept_title.length > 20 ? r.concept_title.slice(0, 20) + "…" : r.concept_title,
            })),
        [records]);

    function getRecordSortValue(r: EvaluationRecord, key: SortKey): string | number {
        switch (key) {
            case 'name': return (r.full_json?.Title || r.concept_title).toLowerCase();
            case 'total_score': return r.total_score;
            case 'verdict': return (r.recommendation || '').toLowerCase();
            case 'engine': return (r.model_used || 'unknown').toLowerCase();
            case 'date': return new Date(r.created_at).getTime();
            default: return (r.full_json?.D0_Scorecard?.[key as keyof typeof r.full_json.D0_Scorecard] as ScoreEntry | undefined)?.Score ?? 0;
        }
    }

    function handleSort(key: SortKey) {
        if (sortKey === key) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        } else {
            setSortKey(key);
            setSortDir(key === 'name' ? 'asc' : 'desc');
        }
    }

    const sortedActive = useMemo(() =>
        [...activeRecords].sort((a, b) => {
            const favA = favorites.has(a.id) ? 1 : 0;
            const favB = favorites.has(b.id) ? 1 : 0;
            if (favB !== favA) return favB - favA;
            const valA = getRecordSortValue(a, sortKey);
            const valB = getRecordSortValue(b, sortKey);
            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortDir === 'desc' ? (valB as number) - (valA as number) : (valA as number) - (valB as number);
        }), [activeRecords, favorites, sortDir, sortKey]);

    const compareRecords = useMemo(() => records.filter(r => compareIds.includes(r.id)), [records, compareIds]);

    const radarData = useMemo(() => SUB_KEYS.map(key => ({
        dimension: SUB_LABELS[key],
        ...Object.fromEntries(compareRecords.map(r => [
            r.id,
            (r.full_json?.D0_Scorecard?.[key] as ScoreEntry | undefined)?.Score ?? 0
        ]))
    })), [compareRecords]);

    /* ── Style helpers ── */
    const scoreColor = (s: number) => s >= 40 ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : s >= 25 ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "text-red-500 bg-red-500/10 border-red-500/20";
    const barColor = (s: number) => s >= 40 ? "bg-emerald-400" : s >= 25 ? "bg-amber-400" : "bg-red-400";
    const subStyle = (s: number) => s >= 8 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" : s >= 5 ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";

    /* ── Action buttons component (re-used in table + cards) ── */
    function ActionButtons({ record, compact = false }: { record: EvaluationRecord; compact?: boolean }) {
        const btnBase = compact
            ? "p-1.5 rounded-lg transition-colors"
            : "p-2 rounded-xl transition-colors";
        const inCompare = compareIds.includes(record.id);
        return (
            <div className="flex items-center gap-1">
                <button title="Re-run with different model"
                    onClick={() => { setRerunRecord(record); setRerunModel(record.model_used || "gemini-2.5-flash-lite"); setRerunStatus("idle"); setRerunError(null); }}
                    className={`${btnBase} text-zinc-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20`}>
                    <RefreshCw size={compact ? 14 : 16} />
                </button>
                <button title="Add to comparison chart" onClick={() => toggleCompare(record.id)}
                    className={`${btnBase} ${inCompare ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"} ${compareIds.length >= 5 && !inCompare ? "opacity-40 cursor-not-allowed" : ""}`}
                    disabled={compareIds.length >= 5 && !inCompare}>
                    {inCompare ? <MinusCircle size={compact ? 14 : 16} /> : <BarChart2 size={compact ? 14 : 16} />}
                </button>
                <button title={favorites.has(record.id) ? "Unfavorite" : "Favorite"}
                    onClick={() => toggleFav(record.id)}
                    className={`${btnBase} ${favorites.has(record.id) ? "text-amber-500 bg-amber-50 dark:bg-amber-900/20" : "text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"}`}>
                    <Star size={compact ? 14 : 16} fill={favorites.has(record.id) ? "currentColor" : "none"} />
                </button>
                <button title={archived.has(record.id) ? "Unarchive" : "Archive"}
                    onClick={() => toggleArchive(record.id)}
                    className={`${btnBase} ${archived.has(record.id) ? "text-blue-500 bg-blue-50 dark:bg-blue-900/20" : "text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"}`}>
                    <Archive size={compact ? 14 : 16} />
                </button>
                <button title="Delete permanently"
                    onClick={() => { if (confirm(`Delete "${record.concept_title}"? This cannot be undone.`)) deleteRecord(record.id); }}
                    disabled={deletingId === record.id}
                    className={`${btnBase} text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ${deletingId === record.id ? "animate-pulse" : ""}`}>
                    <Trash2 size={compact ? 14 : 16} />
                </button>
            </div>
        );
    }

    /* ── Table row ── */
    function TableRow({ record, rank }: { record: EvaluationRecord; rank: number }) {
        const scorecard = record.full_json?.D0_Scorecard;
        const isTop = rank === 1;
        const inCompare = compareIds.includes(record.id);
        return (
            <tr className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group ${isTop ? "bg-emerald-50/30 dark:bg-emerald-900/10" : ""} ${inCompare ? "ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800/40" : ""}`}>
                <td className="px-5 py-3.5 text-xs font-mono text-zinc-400">{isTop ? <span className="text-emerald-500 font-bold">★</span> : rank}</td>
                <td className="px-4 py-3.5 max-w-[180px]">
                    <div className="flex items-center gap-1.5">
                        {favorites.has(record.id) && <Star size={11} className="text-amber-400 flex-shrink-0" fill="currentColor" />}
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate text-sm" title={record.concept_title}>{record.concept_title}</p>
                    </div>
                    <p className="text-xs text-zinc-400 truncate mt-0.5" title={record.idea}>{record.idea}</p>
                </td>
                {SUB_KEYS.map(k => {
                    const entry = scorecard?.[k] as ScoreEntry | undefined;
                    const s = entry?.Score ?? null;
                    return (
                        <td key={k} className="px-3 py-3.5 text-center hidden lg:table-cell" title={entry?.Rationale ?? ""}>
                            {s !== null ? <span className={`inline-flex items-center justify-center text-xs font-bold w-7 h-7 rounded-lg ${subStyle(s)}`}>{s}</span> : <span className="text-zinc-300">—</span>}
                        </td>
                    );
                })}
                <td className="px-4 py-3.5 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                        <span className={`text-sm font-bold ${record.total_score >= 40 ? "text-emerald-500" : record.total_score >= 25 ? "text-amber-500" : "text-red-500"}`}>
                            {record.total_score}<span className="text-xs font-normal text-zinc-400">/50</span>
                        </span>
                        <div className="w-14 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
                            <div className={`h-full rounded-full ${barColor(record.total_score)}`} style={{ width: `${(record.total_score / 50) * 100}%` }} />
                        </div>
                    </div>
                </td>
                <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                    <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-lg ${record.recommendation === "PROCEED TO INCUBATION" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
                        {record.recommendation === "PROCEED TO INCUBATION" ? "PROCEED" : "REJECT"}
                    </span>
                </td>
                <td className="px-3 py-3.5 hidden md:table-cell text-center">
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 whitespace-nowrap">
                        {(record.model_used || 'unknown').replace('gemini-', '').replace('models/', '')}
                    </span>
                </td>
                <td className="px-3 py-3.5 hidden md:table-cell text-xs text-zinc-400 text-center whitespace-nowrap">
                    {new Date(record.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                        <ActionButtons record={record} compact />
                        <button onClick={() => setSelectedRecord(record)} className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 font-medium whitespace-nowrap">
                            Report <ArrowUpRight size={11} />
                        </button>
                    </div>
                </td>
            </tr>
        );
    }

    /* ── Card ── */
    function RecordCard({ record }: { record: EvaluationRecord }) {
        const inCompare = compareIds.includes(record.id);
        return (
            <Card className={`group relative overflow-hidden rounded-2xl border-zinc-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-900/50 flex flex-col h-full ${inCompare ? "ring-2 ring-indigo-400 dark:ring-indigo-600" : ""}`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity dark:from-zinc-800 dark:via-zinc-600 dark:to-zinc-800" />
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className={`font-mono text-xs ${scoreColor(record.total_score)}`}>
                            {record.total_score}/50
                        </Badge>
                        <div className="flex items-center gap-1.5">
                            <ActionButtons record={record} compact />
                        </div>
                    </div>
                    <CardTitle className="text-lg leading-tight line-clamp-2">
                        {favorites.has(record.id) && <Star size={12} className="inline text-amber-400 mr-1 mb-0.5" fill="currentColor" />}
                        {record.concept_title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">Seed:</span> {record.idea}
                    </p>
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
                        <Badge variant="secondary" className={`font-medium rounded-lg text-xs ${record.recommendation === "PROCEED TO INCUBATION" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
                            {record.recommendation}
                        </Badge>
                    </div>
                </CardContent>
                <CardFooter className="pt-0 pb-5 px-6">
                    <button onClick={() => setSelectedRecord(record)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors">
                        View Full Report <ArrowUpRight size={15} />
                    </button>
                </CardFooter>
            </Card>
        );
    }

    /* ──────────────────────────────────────── Render ──────────────────────────────────────── */
    return (
        <div className="flex h-full w-full flex-col p-8 sm:p-12 animate-in fade-in zoom-in-95 duration-500 overflow-y-auto">

            {/* Page Header */}
            <div className="mb-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 mb-4 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    <Database size={14} /> Persistent Storage
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">Portfolio Archive</h1>
                <p className="text-lg font-light text-zinc-500 dark:text-zinc-400">
                    A historical ledger of all evaluated concepts. Review, compare, and manage your architectural decisions.
                </p>
            </div>

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 space-y-4">
                    <Loader className="animate-spin" size={32} /> <p>Loading encrypted archives...</p>
                </div>
            ) : records.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 space-y-4 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-12">
                    <FolderArchive size={48} className="text-zinc-300 dark:text-zinc-700" />
                    <h3 className="text-xl font-medium text-zinc-700 dark:text-zinc-300">No evaluations found</h3>
                    <p className="max-w-md text-center">Run an idea through the Evaluation Funnel to permanently store its blueprint here.</p>
                </div>
            ) : (
                <div className="space-y-10">

                    {/* ── Comparison Chart Panel ── */}
                    {compareIds.length > 0 && (
                        <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-white dark:bg-zinc-900/50 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-100 dark:border-indigo-900/40">
                                <div className="flex items-center gap-2.5">
                                    <BarChart2 size={15} className="text-indigo-500" />
                                    <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Performance Comparison</h2>
                                    <div className="flex gap-1.5">
                                        {compareRecords.map((r, i) => (
                                            <span key={r.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${CHART_COLORS[compareIds.indexOf(r.id)]}18`, color: CHART_COLORS[compareIds.indexOf(r.id)] }}>
                                                {r.concept_title.slice(0, 16)}…
                                                <button onClick={() => toggleCompare(r.id)} className="opacity-60 hover:opacity-100"><X size={10} /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => setShowCompare(v => !v)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                                    {showCompare ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                            </div>
                            {showCompare && (
                                <div className="p-6">
                                    <p className="text-xs text-zinc-400 mb-4 text-center">
                                        Comparing {compareIds.length} project{compareIds.length > 1 ? "s" : ""} across 5 dimensions · Use <BarChart2 size={11} className="inline" /> on any card/row to add (max 5)
                                    </p>
                                    <ResponsiveContainer width="100%" height={360}>
                                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                            <PolarGrid stroke="#e4e4e7" />
                                            <PolarAngleAxis dataKey="dimension" tick={{ fill: "#71717a", fontSize: 12, fontWeight: 500 }} />
                                            <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: "#a1a1aa", fontSize: 10 }} tickCount={6} />
                                            {compareRecords.map((r, i) => {
                                                const color = CHART_COLORS[compareIds.indexOf(r.id)];
                                                return (
                                                    <Radar
                                                        key={r.id}
                                                        name={r.concept_title}
                                                        dataKey={String(r.id)}
                                                        stroke={color}
                                                        fill={color}
                                                        fillOpacity={0.12}
                                                        strokeWidth={2}
                                                    />
                                                );
                                            })}
                                            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 12 }}
                                                formatter={(val, name) => [`${val}/10`, name]}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Score Trend Chart ── */}
                    {records.length > 1 && (
                        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-2.5">
                                    <LineChartIcon size={15} className="text-zinc-400" />
                                    <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Score Trend</h2>
                                    <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full px-2 py-0.5">{records.length} evaluations</span>
                                </div>
                                <button onClick={() => setShowTrend(v => !v)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                                    {showTrend ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                            </div>
                            {showTrend && (
                                <div className="p-6">
                                    <p className="text-xs text-zinc-400 mb-4 text-center">D0 total score (out of 50) across all evaluations in chronological order</p>
                                    <ResponsiveContainer width="100%" height={240}>
                                        <LineChart data={trendData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                                            <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} />
                                            <YAxis domain={[0, 50]} tick={{ fill: "#a1a1aa", fontSize: 11 }} tickCount={6} />
                                            <ReferenceLine y={40} stroke="#10b981" strokeDasharray="4 2" label={{ value: "PROCEED", fill: "#10b981", fontSize: 10, position: "right" }} />
                                            <ReferenceLine y={25} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "BORDERLINE", fill: "#f59e0b", fontSize: 10, position: "right" }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: 10, border: "1px solid #e4e4e7", fontSize: 12 }}
                                                formatter={(val: number | undefined) => [`${val ?? "—"}/50`, "Score"] as [string, string]}
                                                labelFormatter={(_label: unknown, payload: readonly { payload?: { title?: string } }[]) =>
                                                    (payload as { payload?: { title?: string } }[])?.[0]?.payload?.title ?? ""}
                                            />
                                            <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Comparison hint when none selected ── */}
                    {compareIds.length === 0 && activeRecords.length > 1 && (
                        <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-900/10 text-sm text-indigo-500">
                            <BarChart2 size={15} /> Click <BarChart2 size={13} className="inline" /> on any project to add it to the radar comparison chart (up to 5 projects).
                        </div>
                    )}

                    {/* ── Summary Table ── */}
                    <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2.5">
                                <TrendingUp size={15} className="text-zinc-400" />
                                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Portfolio Comparison</h2>
                                <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full px-2 py-0.5">
                                    {activeRecords.length} active
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                {archivedRecords.length > 0 && (
                                    <button onClick={() => setShowArchived(v => !v)} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-medium flex items-center gap-1">
                                        <Archive size={12} /> {showArchived ? "Hide" : "Show"} archived ({archivedRecords.length})
                                    </button>
                                )}
                                <span className="text-xs text-zinc-400 font-medium">Click column headers to sort</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-zinc-400 font-semibold uppercase tracking-wider bg-zinc-50/70 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800">
                                        <th className="text-left px-5 py-3 w-10">#</th>
                                        <th onClick={() => handleSort('name')} className="text-left px-4 py-3 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors select-none">
                                            <span className="inline-flex items-center gap-1">Project {sortKey === 'name' && <ArrowUpDown size={11} className={sortDir === 'asc' ? '' : 'rotate-180'} />}</span>
                                        </th>
                                        {SUB_KEYS.map(k => (
                                            <th key={k} onClick={() => handleSort(k)} className="text-center px-3 py-3 hidden lg:table-cell cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors select-none">
                                                <span className="inline-flex items-center justify-center gap-1">{SUB_LABELS[k]} {sortKey === k && <ArrowUpDown size={11} className={sortDir === 'asc' ? '' : 'rotate-180'} />}</span>
                                            </th>
                                        ))}
                                        <th onClick={() => handleSort('total_score')} className="text-center px-4 py-3 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors select-none">
                                            <span className="inline-flex items-center justify-center gap-1">Score {sortKey === 'total_score' && <ArrowUpDown size={11} className={sortDir === 'asc' ? '' : 'rotate-180'} />}</span>
                                        </th>
                                        <th onClick={() => handleSort('verdict')} className="text-center px-4 py-3 hidden sm:table-cell cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors select-none">
                                            <span className="inline-flex items-center justify-center gap-1">Verdict {sortKey === 'verdict' && <ArrowUpDown size={11} className={sortDir === 'asc' ? '' : 'rotate-180'} />}</span>
                                        </th>
                                        <th onClick={() => handleSort('engine')} className="text-center px-4 py-3 hidden md:table-cell cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors select-none">
                                            <span className="inline-flex items-center justify-center gap-1">Engine {sortKey === 'engine' && <ArrowUpDown size={11} className={sortDir === 'asc' ? '' : 'rotate-180'} />}</span>
                                        </th>
                                        <th onClick={() => handleSort('date')} className="text-center px-4 py-3 hidden md:table-cell cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors select-none">
                                            <span className="inline-flex items-center justify-center gap-1">Date {sortKey === 'date' && <ArrowUpDown size={11} className={sortDir === 'asc' ? '' : 'rotate-180'} />}</span>
                                        </th>
                                        <th className="px-3 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                                    {sortedActive.map((r, i) => <TableRow key={r.id} record={r} rank={i + 1} />)}
                                    {showArchived && archivedRecords.map((r, i) => (
                                        <tr key={r.id} className="bg-zinc-50/60 dark:bg-zinc-800/10 opacity-60 hover:opacity-90 transition-opacity">
                                            <td className="px-5 py-3 text-xs font-mono text-zinc-400"><Archive size={12} /></td>
                                            <td className="px-4 py-3 max-w-[180px]">
                                                <p className="font-medium text-zinc-500 truncate text-sm">{r.concept_title}</p>
                                                <p className="text-xs text-zinc-400 truncate">{r.idea}</p>
                                            </td>
                                            {SUB_KEYS.map(k => <td key={k} className="hidden lg:table-cell" />)}
                                            <td className="px-4 py-3 text-center text-xs text-zinc-400">{r.total_score}/50</td>
                                            <td className="hidden sm:table-cell" />
                                            <td className="hidden md:table-cell" />
                                            <td className="px-3 py-3"><ActionButtons record={r} compact /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── Cards Grid ── */}
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-5">Project Cards</h2>
                        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
                            {sortedActive.map(r => <RecordCard key={r.id} record={r} />)}
                        </div>
                    </div>

                    {/* ── Archived section ── */}
                    {showArchived && archivedRecords.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-5 flex items-center gap-2">
                                <Archive size={14} /> Archived Projects
                            </h2>
                            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5 opacity-60">
                                {archivedRecords.map(r => <RecordCard key={r.id} record={r} />)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Re-run Modal ── */}
            {rerunRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md">
                        <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-1">Re-evaluate with Different Model</p>
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 leading-tight line-clamp-2">
                                    {rerunRecord.concept_title}
                                </h2>
                            </div>
                            <button onClick={cancelRerun} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 transition-colors flex-shrink-0 ml-3">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-8 py-6 space-y-5">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 italic">"{rerunRecord.idea}"</p>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Select Model</label>
                                <div className="space-y-2">
                                    {AVAILABLE_MODELS.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setRerunModel(m.id)}
                                            disabled={rerunStatus === "running"}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${rerunModel === m.id
                                                    ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
                                                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
                                                } disabled:opacity-50`}
                                        >
                                            {m.label}
                                            {rerunModel === m.id && <span className="w-2 h-2 rounded-full bg-violet-500" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {rerunStatus === "error" && (
                                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-sm text-red-600 dark:text-red-400">
                                    <ShieldAlert size={15} className="flex-shrink-0 mt-0.5" />
                                    {rerunError ?? "An error occurred"}
                                </div>
                            )}

                            {rerunStatus === "done" && (
                                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                    <TrendingUp size={15} /> Re-evaluation complete — archive refreshed
                                </div>
                            )}

                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={cancelRerun}
                                    className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    {rerunStatus === "done" ? "Close" : "Cancel"}
                                </button>
                                <button
                                    onClick={() => startRerun(rerunRecord, rerunModel)}
                                    disabled={rerunStatus === "running" || rerunStatus === "done"}
                                    className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                                >
                                    {rerunStatus === "running"
                                        ? <><Loader size={14} className="animate-spin" /> Running…</>
                                        : <><RefreshCw size={14} /> Re-run</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Full Report Modal ── */}
            {selectedRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div ref={reportRef} className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-8 py-5 flex items-start justify-between rounded-t-3xl z-10">
                            <div>
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-1">Full Evaluation Report</p>
                                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 leading-tight">
                                    {selectedRecord.full_json?.Title || selectedRecord.concept_title}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <button
                                    onClick={handleExportPDF}
                                    disabled={isExporting}
                                    data-html2canvas-ignore // Don't render this button in the PDF itself
                                    className="px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
                                >
                                    {isExporting ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
                                    {isExporting ? "Exporting..." : "Export PDF"}
                                </button>
                                <button
                                    onClick={() => setSelectedRecord(null)}
                                    data-html2canvas-ignore
                                    className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex-shrink-0"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="px-8 py-6">
                            <VisualOutputDashboard data={selectedRecord.full_json as EvaluationResult} />
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden component for high-fidelity PDF export generation (Moved to ROOT to avoid overflow clipping) */}
            {selectedRecord && (
                <div className="absolute opacity-0 pointer-events-none -left-[9999px] top-0 w-[800px]">
                    <PrintableReport data={selectedRecord.full_json as EvaluationResult} />
                </div>
            )}
        </div>
    );
}
