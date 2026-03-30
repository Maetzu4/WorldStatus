import { TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface FinanceIndex {
  id: number;
  index_name: string;
  value: number;
  change: number | null;
  timestamp: string | Date;
  created_at: string | Date;
}

async function getFinanceData(): Promise<FinanceIndex[]> {
  try {
    const res = await query<FinanceIndex>(
      "SELECT * FROM finance_indices ORDER BY timestamp DESC LIMIT 200;",
    );
    return res.rows;
  } catch (error) {
    console.warn("Failed to fetch finance data:", error);
    return [];
  }
}

function Sparkline({ data, color = "#fbbf24" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const width = 100;
  const height = 30;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible inline-block">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default async function FinancePage() {
  const indices = await getFinanceData();

  // Extract unique indices and prepare historical data
  const seen = new Set<string>();
  const latestIndices: FinanceIndex[] = [];
  const historyBySymbol: Record<string, number[]> = {};

  for (const idx of indices) {
    if (!seen.has(idx.index_name)) {
      seen.add(idx.index_name);
      latestIndices.push(idx);
    }
    if (!historyBySymbol[idx.index_name]) {
      historyBySymbol[idx.index_name] = [];
    }
    historyBySymbol[idx.index_name].push(Number(idx.value));
  }

  // Reverse so chronological order is left-to-right for sparklines
  Object.keys(historyBySymbol).forEach((k) => historyBySymbol[k].reverse());

  let topGainer: FinanceIndex | null = null;
  let topLoser: FinanceIndex | null = null;
  let mostVolatile: FinanceIndex | null = null;

  if (latestIndices.length > 0) {
    topGainer = latestIndices.reduce((prev, curr) =>
      Number(prev.change || 0) > Number(curr.change || 0) ? prev : curr
    );
    topLoser = latestIndices.reduce((prev, curr) =>
      Number(prev.change || 0) < Number(curr.change || 0) ? prev : curr
    );

    let maxVol = -1;
    for (const key in historyBySymbol) {
      const vals = historyBySymbol[key];
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      // Ensure we don't divide by zero
      const vol = min > 0 ? (max - min) / min : 0;
      if (vol > maxVol) {
        maxVol = vol;
        mostVolatile = latestIndices.find((idx) => idx.index_name === key) || null;
      }
    }
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <section className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium tracking-wide uppercase">
              Financial Indices
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Global{" "}
            <span className="text-transparent bg-clip-text from-yellow-400 to-amber-400">
              Markets
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Tracking major global financial indices with periodic updates.
          </p>
        </section>

        {/* Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top Gainer */}
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                <ArrowUpRight className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">Top Gainer</p>
            <p className="text-2xl font-bold text-slate-50 mb-1 truncate">
              {topGainer ? topGainer.index_name : "--"}
            </p>
            {topGainer && topGainer.change !== null && (
              <p className="text-emerald-400 font-semibold">
                +{Number(topGainer.change).toFixed(2)}%
              </p>
            )}
          </div>

          {/* Top Loser */}
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                <ArrowDownRight className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">Top Loser</p>
            <p className="text-2xl font-bold text-slate-50 mb-1 truncate">
              {topLoser ? topLoser.index_name : "--"}
            </p>
            {topLoser && topLoser.change !== null && (
              <p className="text-red-400 font-semibold">
                {Number(topLoser.change).toFixed(2)}%
              </p>
            )}
          </div>

          {/* Most Volatile */}
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
                <Zap className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">Most Volatile</p>
            <p className="text-2xl font-bold text-slate-50 mb-1 truncate">
              {mostVolatile ? mostVolatile.index_name : "--"}
            </p>
            <p className="text-purple-400 font-semibold opacity-70">
              High price variance
            </p>
          </div>
        </div>

        {/* Current Markets View (with Sparklines) */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">
              Market Trends (Recent)
            </h2>
          </div>
          <div className="divide-y divide-slate-800/50">
            {latestIndices.length > 0 ? (
              latestIndices.map((record, idx) => {
                const isPositive = record.change !== null && Number(record.change) >= 0;
                const trendData = historyBySymbol[record.index_name] || [];
                return (
                  <div
                    key={idx}
                    className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-[200px]">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-yellow-400">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-slate-200 font-medium">
                          {record.index_name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {new Date(record.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Sparkline */}
                    <div className="hidden md:block flex-1 max-w-[120px] mx-8 opacity-80">
                      <Sparkline
                        data={trendData}
                        color={isPositive ? "#10b981" : "#ef4444"}
                      />
                    </div>

                    <div className="flex items-center gap-6 text-sm flex-1 justify-end">
                      <div className="text-right">
                        <p className="text-slate-400">Value</p>
                        <p className="font-mono text-slate-200 text-lg font-semibold">
                          {Number(record.value).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      {record.change !== null && (
                        <div className="text-right min-w-[80px]">
                          <p className="text-slate-400">Change</p>
                          <p
                            className={`font-mono font-semibold flex items-center justify-end gap-1 ${
                              isPositive ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {isPositive ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            {isPositive ? "+" : ""}
                            {Number(record.change).toFixed(2)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-slate-500">
                No financial data available yet. Configure a finance sync cron
                job to collect data.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
