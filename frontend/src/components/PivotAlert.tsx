import { RefreshCw, AlertTriangle } from "lucide-react";

interface PivotAlertProps {
  recommendation: string;
  justification: string;
}

export default function PivotAlert({ recommendation, justification }: PivotAlertProps) {
  // Only render if the backend programmatically set the Recommendation to PIVOT
  if (recommendation !== "PIVOT") return null;

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-4 bg-amber-500 px-6 py-3 text-white">
        <RefreshCw className="h-5 w-5 animate-spin-slow" />
        <h3 className="text-sm font-bold uppercase tracking-widest">
          Agentic Pivot Triggered
        </h3>
      </div>
      <div className="p-6">
        <div className="flex gap-4 items-start text-amber-900">
          <AlertTriangle className="h-6 w-6 mt-1 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-lg font-semibold mb-2 leading-snug">
              Strategic Course Correction Required
            </p>
            <p className="text-sm leading-relaxed opacity-90">
              {justification.replace("🔄 PIVOT TRIGGERED: ", "")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
