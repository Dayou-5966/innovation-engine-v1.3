"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { GenesisMode } from "@/components/genesis-mode";
import { EvaluationFunnel } from "@/components/evaluation-funnel";
import { PortfolioArchive } from "@/components/portfolio-archive";
import { Guide } from "@/components/guide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Loader2, ShieldCheck } from "lucide-react";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<"genesis" | "evaluation" | "portfolio" | "guide">("genesis");
  const [seedConcept, setSeedConcept] = useState<string | null>(null);
  const [seedEvaluationResult, setSeedEvaluationResult] = useState<any | null>(null);
  const [aiModel, setAiModel] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL || "gemini-2.5-flash-lite");
  const [deepResearchEnabled, setDeepResearchEnabled] = useState<boolean>(false);
  const [deepResearchModel, setDeepResearchModel] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_DEEP_RESEARCH_MODEL || "deep-research-pro-preview-12-2025");
  const [mandateDocs, setMandateDocs] = useState<{ filename: string }[]>([]);

  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      try {
        // Normalize Base64URL → Base64 before decoding (JWTs use URL-safe alphabet with no padding)
        let b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        // Pad with '=' so length is a multiple of 4 to prevent atob() DOMException
        const pad = b64.length % 4;
        if (pad) {
          b64 += '='.repeat(4 - pad);
        }
        const payload = JSON.parse(atob(b64));
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("auth_token");
        }
      } catch (e) {
        localStorage.removeItem("auth_token");
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setIsAuthenticating(true);
    setAuthError("");
    try {
      const API_URL = "";
      const res = await fetch(`${API_URL}/api/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("auth_token", data.access_token);
        setIsAuthenticated(true);
      } else {
        setAuthError("Unauthorized: Invalid gateway credential.");
      }
    } catch (err) {
      setAuthError("Network error: Backend unreachable.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-black selection:bg-primary/30 p-4 relative overflow-hidden">
        {/* Background Gradients for Premium Feel */}
        <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

        <div className="z-10 w-full max-w-md bg-white/70 dark:bg-zinc-900/50 backdrop-blur-2xl rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 sm:p-12 shadow-2xl shadow-black/5">
          <div className="flex flex-col items-center text-center space-y-6 mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6095FA] to-indigo-500 text-white shadow-lg shadow-primary/20">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
                The Innovation Engine (TIE) <span className="text-lg text-zinc-400 dark:text-zinc-500 font-normal ml-1">(Ver 1.3-DEV)</span>
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Enter your secure credentials to command the engine.</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2 text-left">
              <Input
                type="password"
                placeholder="Enter clearance token..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 px-4 text-center tracking-widest text-lg border-zinc-200 bg-zinc-50 hover:bg-white shadow-inner focus-visible:ring-primary dark:border-zinc-800 dark:bg-black transition-all rounded-xl"
              />
            </div>

            {authError && (
              <p className="text-sm text-red-500 font-medium text-center bg-red-500/10 px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-2">
                {authError}
              </p>
            )}

            <Button
              type="submit"
              className="h-14 w-full font-medium text-base rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-black transition-all"
              disabled={isAuthenticating || !password}
            >
              {isAuthenticating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Lock className="mr-2 h-5 w-5" />}
              {isAuthenticating ? "Verifying..." : "Authenticate"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const handleSelectConcept = (conceptText: string) => {
    setSeedConcept(conceptText);
    setCurrentView("evaluation");
  };

  return (
    <div className="flex h-screen w-full bg-zinc-50 font-sans dark:bg-black overflow-hidden selection:bg-primary/30">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        aiModel={aiModel}
        setAiModel={setAiModel}
        deepResearchEnabled={deepResearchEnabled}
        setDeepResearchEnabled={setDeepResearchEnabled}
        deepResearchModel={deepResearchModel}
        setDeepResearchModel={setDeepResearchModel}
        setMandateDocs={setMandateDocs}
      />
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div className="absolute top-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="relative z-10 w-full max-w-[1600px] mx-auto min-h-full">
          {/* Keep all views mounted so Genesis concepts survive navigation */}
          <div className={currentView === "genesis" ? "block" : "hidden"}>
            <GenesisMode onSelectConcept={handleSelectConcept} aiModel={aiModel} />
          </div>
          <div className={currentView === "evaluation" ? "block" : "hidden"}>
            <EvaluationFunnel
              seedConcept={seedConcept}
              seedEvaluationResult={seedEvaluationResult}
              onSeedConsumed={() => {
                setSeedConcept(null);
                setSeedEvaluationResult(null);
              }}
              onBackToGenesis={() => setCurrentView("genesis")}
              aiModel={aiModel}
              deepResearchEnabled={deepResearchEnabled}
              deepResearchModel={deepResearchModel}
              mandateDocs={mandateDocs}
            />
          </div>
          <div className={currentView === "portfolio" ? "block" : "hidden"}>
            <PortfolioArchive
              onRerun={(idea, model, result) => {
                setSeedConcept(idea);
                setAiModel(model);
                if (result) setSeedEvaluationResult(result);
                setCurrentView("evaluation");
              }}
            />
          </div>
          <div className={currentView === "guide" ? "block" : "hidden"}>
            <Guide aiModel={aiModel} />
          </div>
        </div>
      </main>
    </div>
  );
}
