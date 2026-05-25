import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, AlertTriangle, Lightbulb, RefreshCw } from "lucide-react";

interface Insight {
  text: string;
  severity: "warning" | "caution" | "positive";
}

interface InsightsPanelProps {
  sourceYear: string;
  segment: "overview" | "centre" | "school" | "research";
  unit?: string;
}

const SEVERITY_CONFIG = {
  warning: {
    bg:     "bg-red-50 border-red-200",
    text:   "text-red-800",
    icon:   <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />,
    dot:    "bg-red-500",
  },
  caution: {
    bg:     "bg-amber-50 border-amber-200",
    text:   "text-amber-800",
    icon:   <TrendingDown size={15} className="text-amber-500 shrink-0 mt-0.5" />,
    dot:    "bg-amber-500",
  },
  positive: {
    bg:     "bg-green-50 border-green-200",
    text:   "text-green-800",
    icon:   <TrendingUp size={15} className="text-green-500 shrink-0 mt-0.5" />,
    dot:    "bg-green-500",
  },
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function InsightsPanel({ sourceYear, segment, unit = "Lakhs" }: InsightsPanelProps) {
  const [insights, setInsights]   = useState<Insight[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [lastYear, setLastYear]   = useState("");
  const [lastSeg, setLastSeg]     = useState("");

  const fetchInsights = async (year: string, seg: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `${API_BASE}/api/insights?source_year=${year}&segment=${seg}&unit=${unit}`
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setInsights(data.insights || []);
      setLastYear(year);
      setLastSeg(seg);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when year changes
  useEffect(() => {
    if (sourceYear !== lastYear || segment !== lastSeg) {
      fetchInsights(sourceYear, segment);
    }
  }, [sourceYear, segment]);

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="w-32 h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2">
              <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse w-full" />
                <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse w-3/4" />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">Generating AI insights...</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">AI Insights</span>
          </div>
          <button
            onClick={() => fetchInsights(sourceYear, segment)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
        <p className="text-sm text-gray-400">Could not load insights right now.</p>
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (insights.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb size={16} className="text-blue-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Insights</span>
        </div>
        <p className="text-sm text-gray-400">No significant trends detected for this period.</p>
      </div>
    );
  }

  // ── Insights ──────────────────────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-blue-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">AI Insights</span>
        </div>
        <button
          onClick={() => fetchInsights(sourceYear, segment)}
          className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 transition-colors"
          title="Refresh insights"
        >
          <RefreshCw size={11} />
        </button>
      </div>

      {/* Bullet list */}
      <ul className="space-y-2.5">
        {insights.map((ins, i) => {
          const cfg = SEVERITY_CONFIG[ins.severity] ?? SEVERITY_CONFIG.caution;
          return (
            <li
              key={i}
              className={`flex gap-2.5 items-start rounded-lg border px-3 py-2.5 ${cfg.bg}`}
            >
              {cfg.icon}
              <span className={`text-sm leading-snug ${cfg.text}`}>{ins.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}