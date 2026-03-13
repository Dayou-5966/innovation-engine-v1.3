"use client";

import { useState, useEffect, useRef } from "react";
import { UploadCloud, FileText, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface MandateDoc {
    id: number;
    filename: string;
    preview: string;
    char_count: number;
    created_at: string;
}

interface Props {
    onDocsChange?: (docs: { filename: string }[]) => void;
}

export function MandateDocumentPanel({ onDocsChange }: Props) {
    const [docs, setDocs] = useState<MandateDoc[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const API_URL = "";

    const token = () => localStorage.getItem("auth_token") ?? "";

    const fetchDocs = async () => {
        try {
            const res = await fetch(`${API_URL}/api/mandate-documents`, {
                headers: { Authorization: `Bearer ${token()}` },
            });
            if (res.ok) {
                const data = await res.json();
                setDocs(data.documents);
                onDocsChange?.(data.documents);
            }
        } catch {
            // silently ignore — panel is optional
        }
    };

    useEffect(() => {
        fetchDocs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${API_URL}/api/mandate-documents`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token()}` },
                body: formData,
            });
            if (!res.ok) {
                // Safely try to parse JSON, fallback to text if it's an HTML error page
                let errText = "Upload failed.";
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const err = await res.json();
                    errText = err.detail ?? errText;
                } else {
                    const text = await res.text();
                    errText = `Upload failed (${res.status}): ${text.slice(0, 100)}...`;
                }
                setUploadError(errText);
            } else {
                await fetchDocs();
                setIsOpen(true);
            }
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Upload failed.");
        } finally {
            setIsUploading(false);
            // Reset input so same file can be re-uploaded
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await fetch(`${API_URL}/api/mandate-documents/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token()}` },
            });
            setDocs((prev) => {
                const next = prev.filter((d) => d.id !== id);
                onDocsChange?.(next);
                return next;
            });
        } catch {
            // ignore
        }
    };

    return (
        <div className="rounded-2xl border border-zinc-100 bg-white/60 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/40 overflow-hidden">
            {/* Header — always visible */}
            <button
                onClick={() => setIsOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
                <div className="flex items-center gap-2.5">
                    <FileText size={16} className="text-[#6095FA]" />
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        Mandate Documents
                    </span>
                    {docs.length > 0 && (
                        <span className="ml-1 rounded-full bg-[#6095FA]/15 px-2 py-0.5 text-xs font-semibold text-[#6095FA]">
                            {docs.length}
                        </span>
                    )}
                </div>
                {isOpen ? (
                    <ChevronUp size={15} className="text-zinc-400" />
                ) : (
                    <ChevronDown size={15} className="text-zinc-400" />
                )}
            </button>

            {isOpen && (
                <div className="px-5 pb-5 space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                    {/* Upload zone */}
                    <label className="flex flex-col items-center justify-center gap-2 w-full h-24 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-[#6095FA]/50 hover:bg-[#6095FA]/5 transition-all group">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.txt,.md"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={isUploading}
                        />
                        {isUploading ? (
                            <Loader2 size={20} className="animate-spin text-[#6095FA]" />
                        ) : (
                            <UploadCloud size={20} className="text-zinc-300 group-hover:text-[#6095FA] transition-colors" />
                        )}
                        <span className="text-xs text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                            {isUploading ? "Uploading file…" : "Drop PDF or TXT — click to browse"}
                        </span>
                    </label>

                    {uploadError && (
                        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                            {uploadError}
                        </p>
                    )}

                    {/* Document list */}
                    {docs.length === 0 ? (
                        <p className="text-xs text-zinc-400 text-center py-2">
                            No mandate documents uploaded yet. The Strategist will use generic criteria.
                        </p>
                    ) : (
                        <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {docs.map((doc) => (
                                <li
                                    key={doc.id}
                                    className="flex items-start gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3"
                                >
                                    <FileText size={15} className="mt-0.5 shrink-0 text-[#6095FA]" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate">
                                            {doc.filename}
                                        </p>
                                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{doc.preview}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                                                {(doc.char_count / 1024).toFixed(1)} KB
                                            </p>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    window.open(`/api/mandate-documents/${doc.id}/content?token=${token()}`, '_blank');
                                                }}
                                                className="text-[10px] text-primary hover:text-primary/80 font-semibold transition-colors under"
                                            >
                                                View Document
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(doc.id)}
                                        className="shrink-0 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-300 hover:text-red-500 transition-colors"
                                        title="Remove document"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {docs.length > 0 && (
                        <p className="text-[11px] text-[#6095FA]/80 text-center font-medium">
                            ✓ Strategist will read and cite these {docs.length} document{docs.length > 1 ? "s" : ""} during evaluation
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
