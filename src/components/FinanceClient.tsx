"use client";

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Brain,
  Filter,
  BarChart3,
  Shield,
  Clock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface FinanceIndex {
  id: number;
  index_name: string;
  value: number;
  change: number | null;
  region: string | null;
  timestamp: string | Date;
  created_at: string | Date;
}

interface MarketSentiment {
  label: "Bullish" | "Bearish" | "Neutral";
  score: number;
  description: string;
}

interface MarketBreadth {
  advancers: number;
  decliners: number;
  unchanged: number;
  ratio: number;
}

interface VolatilityIndex {
  level: "Low" | "Medium" | "High";
  value: number;
  changeVsYesterday: number;
}

interface RegionalPerformance {
  region: string;
  avgChange: number;
  indices: { name: string; change: number; value: number }[];
  emoji: string;
}

interface ChangeDistribution {
  range: string;
  count: number;
}

interface MarketInsight {
  icon: string;
  text: string;
  severity: "info" | "warning" | "critical";
}

interface MarketImpactScore {
  score: number;
  level: "low" | "medium" | "high";
  description: string;
}

interface FinanceAnalytics {
  sentiment: MarketSentiment;
  trend: { change: number; direction: "up" | "down" | "flat" };
  breadth: MarketBreadth;
  volatility: VolatilityIndex;
  topGainers: { name: string; change: number; value: number; region: string }[];
  topLosers: { name: string; change: number; value: number; region: string }[];
  regions: RegionalPerformance[];
  insights: MarketInsight[];
  distribution: ChangeDistribution[];
  impact: MarketImpactScore;
  lastUpdated: string;
}

// ── Region config ──────────────────────────────────────────────────
const REGION_MAP: Record<string, string> = {
  "S&P 500": "US",
  "Dow Jones": "US",
  NASDAQ: "US",
  "Nikkei (EWJ)": "Asia",
  "FTSE (EWU)": "Europe",
  "DAX (EWG)": "Europe",
};

const REGIONS = [
  { id: "All", label: "All Regions", emoji: "🌍" },
  { id: "US", label: "US Markets", emoji: "🇺🇸" },
  { id: "Europe", label: "Europe", emoji: "🇪🇺" },
  { id: "Asia", label: "Asia", emoji: "🇯🇵" },
];

const SORT_OPTIONS = [
  { id: "change", label: "By Change" },
  { id: "value", label: "By Value" },
  { id: "name", label: "By Name" },
];

// ── Sparkline component ────────────────────────────────────────────
function Sparkline({
  data,
  color = "#fbbf24",
}: {
  data: number[];
  color?: string;
}) {
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
      const y =
        height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible inline-block"
    >
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

// ── Sentiment Gauge ────────────────────────────────────────────────
function SentimentGauge({ score, label }: { score: number; label: string }) {
  const radius = 40;
  const circumference = Math.PI * radius; // half-circle
  const offset = circumference - (score / 100) * circumference;
  const color =
    label === "Bullish"
      ? "#10b981"
      : label === "Bearish"
        ? "#f43f5e"
        : "#f59e0b";

  return (
    <div className="flex flex-col items-center">
      <svg className="w-28 h-16 rotate-0" viewBox="0 0 100 55">
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-800"
        />
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <span className="text-2xl font-black text-white -mt-3">{score}</span>
      <span
        className="text-xs font-extrabold uppercase tracking-widest mt-0.5"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Relative time formatter ────────────────────────────────────────
function formatRelativeTime(date: Date) {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Main component ─────────────────────────────────────────────────
export default function FinanceClient() {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<FinanceIndex[]>([]);
  const [analytics, setAnalytics] = useState<FinanceAnalytics | null>(null);
  const [filterRegion, setFilterRegion] = useState("All");
  const [sortBy, setSortBy] = useState("change");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch("/api/data/finance");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setRawData(json.data || []);
        setAnalytics(json.analytics || null);
      } catch (err) {
        console.error("Finance fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Derive latest unique indices
  const { latestIndices, historyBySymbol } = useMemo(() => {
    const seen = new Set<string>();
    const latest: FinanceIndex[] = [];
    const history: Record<string, number[]> = {};

    for (const idx of rawData) {
      if (!seen.has(idx.index_name)) {
        seen.add(idx.index_name);
        latest.push(idx);
      }
      if (!history[idx.index_name]) history[idx.index_name] = [];
      history[idx.index_name].push(Number(idx.value));
    }

    // Reverse for left-to-right chronological order
    Object.keys(history).forEach((k) => history[k].reverse());

    return { latestIndices: latest, historyBySymbol: history };
  }, [rawData]);

  // Filtered + sorted
  const displayIndices = useMemo(() => {
    let filtered = latestIndices;
    if (filterRegion !== "All") {
      filtered = filtered.filter((idx) => {
        const region =
          idx.region || REGION_MAP[idx.index_name] || "Other";
        return region === filterRegion;
      });
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === "change")
        return Math.abs(Number(b.change || 0)) - Math.abs(Number(a.change || 0));
      if (sortBy === "value") return Number(b.value) - Number(a.value);
      return a.index_name.localeCompare(b.index_name);
    });
  }, [latestIndices, filterRegion, sortBy]);

  // Group by region for display
  const groupedByRegion = useMemo(() => {
    const groups: Record<string, FinanceIndex[]> = {};
    for (const idx of displayIndices) {
      const region = idx.region || REGION_MAP[idx.index_name] || "Other";
      if (!groups[region]) groups[region] = [];
      groups[region].push(idx);
    }
    return groups;
  }, [displayIndices]);

  const regionOrder = ["US", "Europe", "Asia", "Other"];
  const regionEmojis: Record<string, string> = {
    US: "🇺🇸",
    Europe: "🇪🇺",
    Asia: "🇯🇵",
    Other: "🌍",
  };
  const regionLabels: Record<string, string> = {
    US: "US Markets",
    Europe: "European Markets",
    Asia: "Asian Markets",
    Other: "Other Markets",
  };

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8">
      {/* ── Header ── */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Brain className="w-4 h-4" />
              <span className="text-sm font-medium tracking-wide uppercase">
                Market Intelligence Center
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
              Global{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-400 to-yellow-300">
                Markets
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl">
              Real-time market intelligence with derived analytics, sentiment
              scoring, and volatility tracking across global indices.
            </p>
          </div>

          {/* AI Insights */}
          {analytics && analytics.insights.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl max-w-sm mt-4 md:mt-0">
              <h3 className="text-xs uppercase tracking-wider text-amber-400/80 font-bold mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> AI Insights
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                {analytics.insights.map((ins, i) => (
                  <li
                    key={i}
                    className={`flex items-start gap-2 ${
                      ins.severity === "critical"
                        ? "text-red-300"
                        : ins.severity === "warning"
                          ? "text-amber-300"
                          : "text-slate-300"
                    }`}
                  >
                    <span className="shrink-0">{ins.icon}</span>
                    <span>{ins.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ── Key Metrics Row ── */}
      {analytics && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Market Sentiment */}
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-amber-500/30">
            <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-sm font-medium text-slate-400 mb-3">
              Market Sentiment
            </p>
            <SentimentGauge
              score={analytics.sentiment.score}
              label={analytics.sentiment.label}
            />
            <p className="text-xs text-slate-500 mt-2 text-center leading-snug">
              {analytics.sentiment.description}
            </p>
          </div>

          {/* Global Market Trend */}
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-sm font-medium text-slate-400 mb-1">
              Global Market Trend
            </p>
            <div className="flex items-center gap-2 mt-4">
              {analytics.trend.direction === "up" ? (
                <ArrowUpRight className="w-8 h-8 text-emerald-400" />
              ) : analytics.trend.direction === "down" ? (
                <ArrowDownRight className="w-8 h-8 text-red-400" />
              ) : (
                <Activity className="w-8 h-8 text-slate-400" />
              )}
              <span
                className={`text-3xl font-black ${
                  analytics.trend.change > 0
                    ? "text-emerald-400"
                    : analytics.trend.change < 0
                      ? "text-red-400"
                      : "text-slate-300"
                }`}
              >
                {analytics.trend.change > 0 ? "+" : ""}
                {analytics.trend.change.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Average across all tracked indices
            </p>
          </div>

          {/* Market Breadth */}
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-sm font-medium text-slate-400 mb-3">
              Market Breadth
            </p>
            <div className="flex items-center justify-between mb-3">
              <div className="text-center">
                <span className="text-2xl font-black text-emerald-400">
                  {analytics.breadth.advancers}
                </span>
                <p className="text-[10px] uppercase font-bold text-emerald-500/60 tracking-wider">
                  Advancers
                </p>
              </div>
              <div className="text-center px-3">
                <span className="text-lg font-bold text-slate-600">vs</span>
              </div>
              <div className="text-center">
                <span className="text-2xl font-black text-red-400">
                  {analytics.breadth.decliners}
                </span>
                <p className="text-[10px] uppercase font-bold text-red-500/60 tracking-wider">
                  Decliners
                </p>
              </div>
            </div>
            {/* Breadth bar */}
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-800">
              <div
                className="bg-emerald-500 transition-all duration-700"
                style={{
                  width: `${analytics.breadth.ratio * 100}%`,
                }}
              />
              <div className="bg-red-500 flex-1" />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              {analytics.breadth.ratio >= 0.5
                ? "Healthy market breadth"
                : "Weak market breadth"}
            </p>
          </div>

          {/* Market Volatility */}
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-sm font-medium text-slate-400 mb-1">
              Market Volatility
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div
                className={`px-3 py-1.5 rounded-xl text-sm font-extrabold uppercase tracking-wider border ${
                  analytics.volatility.level === "High"
                    ? "bg-red-500/10 text-red-400 border-red-500/30"
                    : analytics.volatility.level === "Medium"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {analytics.volatility.level}
              </div>
              <span className="text-sm text-slate-500 font-mono">
                σ = {analytics.volatility.value}
              </span>
            </div>
            {analytics.volatility.changeVsYesterday !== 0 && (
              <p
                className={`text-xs mt-3 font-semibold ${
                  analytics.volatility.changeVsYesterday > 0
                    ? "text-red-400"
                    : "text-emerald-400"
                }`}
              >
                {analytics.volatility.changeVsYesterday > 0 ? "↑" : "↓"}{" "}
                {Math.abs(analytics.volatility.changeVsYesterday)}% vs previous
                period
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-4 items-center bg-slate-900/40 p-3 rounded-2xl border border-slate-800/80">
        <div className="flex items-center gap-2 text-slate-400 ml-2">
          <Filter className="w-4 h-4" />
          <span className="text-xs uppercase font-bold tracking-wider">
            Filters
          </span>
        </div>

        {/* Region buttons */}
        <div className="flex gap-2">
          {REGIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setFilterRegion(r.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                filterRegion === r.id
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              {r.emoji} {r.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-500 text-slate-200"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Main content: 2/3 + 1/3 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Market indices table */}
        <div className="lg:col-span-2">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                Market Indices
              </h2>
              {analytics && (
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(new Date(analytics.lastUpdated))}
                </span>
              )}
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center gap-3 text-slate-400">
                  <Activity className="w-5 h-5 animate-pulse" />
                  <span>Loading market data...</span>
                </div>
              </div>
            ) : displayIndices.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No financial data available yet. Configure a finance sync cron
                job to collect data.
              </div>
            ) : (
              <div>
                {filterRegion === "All"
                  ? // Grouped by region
                    regionOrder
                      .filter((r) => groupedByRegion[r])
                      .map((region) => (
                        <div key={region}>
                          <div className="px-6 py-3 bg-slate-800/30 border-y border-slate-800/50 flex items-center gap-2">
                            <span className="text-lg">
                              {regionEmojis[region]}
                            </span>
                            <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                              {regionLabels[region]}
                            </span>
                            {analytics && (
                              <span
                                className={`ml-auto text-xs font-bold ${
                                  (analytics.regions.find(
                                    (r) => r.region === region,
                                  )?.avgChange ?? 0) >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                }`}
                              >
                                Avg:{" "}
                                {(
                                  analytics.regions.find(
                                    (r) => r.region === region,
                                  )?.avgChange ?? 0
                                ) >= 0
                                  ? "+"
                                  : ""}
                                {(
                                  analytics.regions.find(
                                    (r) => r.region === region,
                                  )?.avgChange ?? 0
                                ).toFixed(2)}
                                %
                              </span>
                            )}
                          </div>
                          {groupedByRegion[region].map((record) =>
                            renderIndexRow(record, historyBySymbol),
                          )}
                        </div>
                      ))
                  : // Flat list when filtered
                    displayIndices.map((record) =>
                      renderIndexRow(record, historyBySymbol),
                    )}
              </div>
            )}
          </section>
        </div>

        {/* Right: Sidebar panels */}
        <div className="space-y-6">
          {/* Top Gainers */}
          {analytics && analytics.topGainers.length > 0 && (
            <section className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                Top Gainers
              </h2>
              <div className="space-y-3">
                {analytics.topGainers.map((g, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10"
                  >
                    <div>
                      <span className="text-slate-200 font-bold text-sm">
                        {g.name}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-2 uppercase">
                        {g.region}
                      </span>
                    </div>
                    <span className="text-emerald-400 font-mono font-bold text-sm">
                      +{g.change.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Top Losers */}
          {analytics && analytics.topLosers.length > 0 && (
            <section className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-red-400" />
                Top Losers
              </h2>
              <div className="space-y-3">
                {analytics.topLosers.map((l, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-red-500/5 p-3 rounded-xl border border-red-500/10"
                  >
                    <div>
                      <span className="text-slate-200 font-bold text-sm">
                        {l.name}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-2 uppercase">
                        {l.region}
                      </span>
                    </div>
                    <span className="text-red-400 font-mono font-bold text-sm">
                      {l.change.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Regional Heatmap */}
          {analytics && analytics.regions.length > 0 && (
            <section className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                🗺️ Regional Heatmap
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {analytics.regions.map((r, i) => {
                  const heatColor =
                    r.avgChange > 0.5
                      ? "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30"
                      : r.avgChange < -0.5
                        ? "from-red-500/20 to-red-500/5 border-red-500/30"
                        : "from-amber-500/10 to-amber-500/5 border-amber-500/20";

                  return (
                    <div
                      key={i}
                      className={`bg-linear-to-r ${heatColor} border rounded-xl p-4 flex justify-between items-center`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{r.emoji}</span>
                        <div>
                          <span className="text-slate-200 font-bold">
                            {r.region}
                          </span>
                          <p className="text-[10px] text-slate-500">
                            {r.indices.length} indices
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-mono font-black text-lg ${
                          r.avgChange >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {r.avgChange >= 0 ? "+" : ""}
                        {r.avgChange.toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Change Distribution */}
          {analytics && (
            <section className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                Change Distribution
              </h2>
              <div className="space-y-2">
                {analytics.distribution.map((d, i) => {
                  const maxCount = Math.max(
                    ...analytics.distribution.map((dd) => dd.count),
                    1,
                  );
                  const pct = (d.count / maxCount) * 100;
                  const isPositive = d.range.startsWith("+") || d.range.startsWith("0%");

                  return (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="text-slate-400 font-mono text-xs w-24 shrink-0 text-right">
                        {d.range}
                      </span>
                      <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isPositive ? "bg-emerald-500/60" : "bg-red-500/60"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-slate-500 font-bold text-xs w-6">
                        {d.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Market Impact Score */}
          {analytics && (
            <section className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                Stability Impact
              </h2>
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${
                    analytics.impact.level === "high"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : analytics.impact.level === "medium"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {analytics.impact.score}
                </div>
                <div>
                  <p className="text-slate-300 font-semibold text-sm">
                    Market Impact Score
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {analytics.impact.description}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-wider font-bold">
                    Feeds into → Global Stability Index
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Index row renderer ─────────────────────────────────────────────
function renderIndexRow(
  record: FinanceIndex,
  historyBySymbol: Record<string, number[]>,
) {
  const isPositive =
    record.change !== null && Number(record.change) >= 0;
  const trendData = historyBySymbol[record.index_name] || [];
  const region = record.region || REGION_MAP[record.index_name] || "Other";

  return (
    <div
      key={`${record.index_name}-${record.timestamp}`}
      className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-slate-800/30 transition-colors border-b border-slate-800/30 last:border-b-0"
    >
      <div className="flex items-center gap-4 min-w-[200px]">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${
            isPositive
              ? "bg-emerald-500/10 border border-emerald-500/20"
              : "bg-red-500/10 border border-red-500/20"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-400" />
          )}
        </div>
        <div>
          <h3 className="text-slate-200 font-medium flex items-center gap-2">
            {record.index_name}
            <span className="text-[10px] text-slate-600 uppercase font-bold px-1.5 py-0.5 bg-slate-800 rounded">
              {region}
            </span>
          </h3>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(new Date(record.timestamp))}
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
          <p className="text-slate-400 text-xs">Value</p>
          <p className="font-mono text-slate-200 text-lg font-semibold">
            {Number(record.value).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        {record.change !== null && (
          <div className="text-right min-w-[80px]">
            <p className="text-slate-400 text-xs">Change</p>
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
}
