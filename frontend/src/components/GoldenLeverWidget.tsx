import { Target, TrendingDown, ShieldCheck } from "lucide-react";

interface GoldenLeverProps {
  goldenLever: string;
}

export default function GoldenLeverWidget({ goldenLever }: GoldenLeverProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:bg-zinc-900/50 dark:border-zinc-800 p-6 shadow-sm transition-all hover:shadow-md h-full flex flex-col">
      <div className="flex items-start justify-between">
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/40 p-2 text-blue-600 dark:text-blue-400">
          <Target className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
          <TrendingDown className="h-3 w-3" /> Sensitivity Risk
        </div>
      </div>

      <div className="mt-8 flex-1">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-tighter">
          Primary Failure Lever
        </h4>
        <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-50 decoration-blue-500/30 underline decoration-4 underline-offset-4 group-hover:decoration-blue-500 transition-colors">
          {goldenLever}
        </p>
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 p-4 border border-slate-100 dark:border-zinc-700/50">
        <ShieldCheck className="h-5 w-5 text-slate-400 dark:text-zinc-500 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] leading-relaxed text-slate-600 dark:text-zinc-400 italic">
          This variable determines **70%+ of the project's volatility**. Management focus 
          should be prioritized on stabilizing this metric above all server-level technicalities.
        </p>
      </div>
    </div>
  );
}
