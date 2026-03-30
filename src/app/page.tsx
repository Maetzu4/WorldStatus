import Link from "next/link";
import {
  CloudRain,
  ShieldAlert,
  Newspaper,
  TrendingUp,
  Moon,
  ArrowRight,
  Activity,
  Globe,
  Thermometer,
  Server,
  Zap,
  Info,
  MapPin,
  BarChart3,
  Satellite,
} from "lucide-react";
import { getTimelineData, getDashboardStats } from "@/lib/dashboard";
import TimelineFilter from "@/components/TimelineFilter";
import GlobalMap from "@/components/Map";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [timelineData, stats] = await Promise.all([
    getTimelineData(),
    getDashboardStats(),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <header className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white bg-clip-text from-white to-slate-400">
              World Status
            </h1>
            <p className="text-lg text-slate-300 max-w-3xl leading-relaxed">
              The state of the world in the last 24 hours. Real-time monitoring
              of{" "}
              <span className="text-blue-400 font-medium">global climate</span>,{" "}
              <span className="text-red-400 font-medium">
                natural disasters
              </span>
              ,{" "}
              <span className="text-emerald-400 font-medium">global news</span>,{" "}
              <span className="text-yellow-400 font-medium">
                market indices
              </span>
              , and{" "}
              <span className="text-purple-400 font-medium">
                astronomy events
              </span>
              .
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {stats.hotZones.length > 0 && (
              <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl backdrop-blur-sm">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Hot Zones
                </span>
                <div className="flex gap-2">
                  {stats.hotZones.map((zone) => (
                    <span
                      key={zone.country}
                      className="text-xs font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20"
                    >
                      {zone.country} ({zone.count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* AI Insights Banner */}
      {stats.insights.length > 0 && (
        <section className="animate-fade-slide-in">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
                AI Insights
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.insights.map((insight, i) => {
                const borderColor =
                  insight.severity === "critical"
                    ? "border-red-500/30 bg-red-500/5"
                    : insight.severity === "warning"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-blue-500/30 bg-blue-500/5";
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${borderColor} transition-all hover:scale-[1.01]`}
                  >
                    <span className="text-lg mt-0.5">{insight.icon}</span>
                    <p className="text-sm text-slate-200 font-medium leading-snug">
                      {insight.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Global Stability Index Section */}
      <section className="animate-fade-slide-in">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full -translate-y-48 translate-x-48 blur-3xl" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
            <div className="">
              <RiskIndexGauge
                score={stats.riskIndex.score}
                trend={stats.riskIndex.trend}
                riskLevel={stats.riskIndex.riskLevel}
              />
            </div>
            <div className="flex-1 space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-black text-white">
                    Global Stability Index
                  </h2>
                  <CalculationTooltip weights={stats.riskIndex.weights} />
                </div>
                <p className="text-slate-400 max-w-xl">
                  A high-level analytical metric aggregating real-time signals
                  from disasters, climate anomalies, market volatility, and
                  global sentiment.
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SeverityBadge
                  label="Disasters"
                  level={stats.riskIndex.disaster}
                  weight="30%"
                />
                <SeverityBadge
                  label="Climate"
                  level={stats.riskIndex.climate}
                  weight="25%"
                />
                <SeverityBadge
                  label="Markets"
                  level={stats.riskIndex.market}
                  weight="25%"
                />
                <SeverityBadge
                  label="News"
                  level={stats.riskIndex.news}
                  weight="20%"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Highlights Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          label="Global Temp"
          value={
            stats.temperatureAnomaly >= 0
              ? `+${stats.temperatureAnomaly.toFixed(1)}°C`
              : `${stats.temperatureAnomaly.toFixed(1)}°C`
          }
          icon={<Thermometer className="w-5 h-5 text-orange-400" />}
          trend="Anomaly"
          color="orange"
        />
        <StatsCard
          label="Active Alerts"
          value={stats.disasterCount}
          icon={
            <ShieldAlert
              className={`w-5 h-5 ${stats.disasterCount > 0 ? "text-red-400 animate-pulse" : "text-slate-400"}`}
            />
          }
          trend="Disasters 24h"
          color={stats.disasterCount > 0 ? "red" : "slate"}
        />
        <StatsCard
          label="News Sentiment"
          value={
            <div className="flex gap-1 items-center tracking-tight">
              <span className="text-emerald-400">
                {stats.newsSentiment.positive}%
              </span>
              <span className="text-slate-500 text-sm font-light">/</span>
              <span className="text-red-400">
                {stats.newsSentiment.negative}%
              </span>
            </div>
          }
          icon={<Newspaper className="w-5 h-5 text-emerald-400" />}
          trend="Pos/Neg Split"
          color="emerald"
        />
        <StatsCard
          label="Market Avg"
          value={`${stats.marketTrend > 0 ? "+" : ""}${stats.marketTrend.toFixed(2)}%`}
          subValue={stats.topMover?.name ? `${stats.topMover.name}` : ""}
          icon={
            <TrendingUp
              className={`w-5 h-5 ${stats.marketTrend >= 0 ? "text-emerald-400" : "text-red-400"}`}
            />
          }
          trend="Global Indices"
          color={stats.marketTrend >= 0 ? "emerald" : "red"}
        />
        <StatsCard
          label="Events Today"
          value={stats.astroCount}
          subValue={stats.astroEventsToday[0] || "None visible"}
          icon={<Moon className="w-5 h-5 text-purple-400" />}
          trend="Astronomy"
          color="purple"
        />
      </section>

      {/* Global Metrics + System Status + Data Freshness Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Global Metrics */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500">
              Global Metrics
            </span>
          </div>
          <div className="space-y-3">
            <MetricRow
              label="Tracked Locations"
              value={String(stats.trackedLocations)}
              icon={<MapPin className="w-3.5 h-3.5 text-indigo-400" />}
            />
            <MetricRow
              label="Active Disasters"
              value={String(stats.disasterCount)}
              icon={<ShieldAlert className="w-3.5 h-3.5 text-red-400" />}
            />
            <MetricRow
              label="News Articles"
              value={String(stats.totalArticles)}
              icon={<Newspaper className="w-3.5 h-3.5 text-emerald-400" />}
            />
            <MetricRow
              label="Astronomy Events"
              value={String(stats.astroCount)}
              icon={<Satellite className="w-3.5 h-3.5 text-purple-400" />}
            />
          </div>
        </div>

        {/* System Status */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-4 h-4 text-teal-400" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500">
              System Status
            </span>
          </div>
          <div className="space-y-3">
            <MetricRow
              label="API Latency"
              value={`${stats.systemStatus.apiLatency}ms`}
              icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
            />
            <MetricRow
              label="Cache Hit Rate"
              value={`${stats.systemStatus.cacheHitRate}%`}
              icon={<Activity className="w-3.5 h-3.5 text-blue-400" />}
            />
            <MetricRow
              label="Last Update"
              value={new Date(stats.systemStatus.lastUpdate).toLocaleTimeString(
                "en-US",
                { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }
              )}
              icon={<Globe className="w-3.5 h-3.5 text-slate-400" />}
            />
          </div>
        </div>

        {/* Data Freshness */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500">
              Data Freshness
            </span>
          </div>
          <div className="space-y-3">
            {(
              Object.entries(stats.dataFreshness) as [
                string,
                { status: string; delay: string },
              ][]
            ).map(([key, val]) => {
              const statusColor =
                val.status === "Live"
                  ? "text-emerald-400"
                  : val.status === "Recent"
                    ? "text-blue-400"
                    : val.status === "Delayed"
                      ? "text-amber-400"
                      : "text-red-400";
              return (
                <div
                  key={key}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-400 capitalize font-medium">
                    {key}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{val.delay}</span>
                    <span
                      className={`text-xs font-bold ${statusColor}`}
                    >
                      {val.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Global Risk Level Bar */}
      <section>
        <RiskLevelBar level={stats.riskIndex.riskLevel} score={stats.riskIndex.score} />
      </section>

      {/* Map Section */}
      <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -translate-y-32 translate-x-32 blur-3xl pointer-events-none" />
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-indigo-400" />
              Global Activity Map
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Live geographic tracker &middot;{" "}
              <span className="text-blue-400 font-semibold">
                {stats.mapPoints.length} events
              </span>
            </p>
          </div>
        </div>
        <GlobalMap points={stats.mapPoints} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <DashboardCard
          title="Climate"
          description="Conditions & alerts"
          href="/climate"
          icon={<CloudRain className="w-8 h-8 text-blue-400" />}
          bgClass="bg-blue-950/20 hover:bg-blue-900/30 border-blue-900/50"
        />
        <DashboardCard
          title="Disasters"
          description="Recent reports"
          href="/disasters"
          icon={<ShieldAlert className="w-8 h-8 text-red-400" />}
          bgClass="bg-red-950/20 hover:bg-red-900/30 border-red-900/50"
        />
        <DashboardCard
          title="News"
          description="Global headlines"
          href="/news"
          icon={<Newspaper className="w-8 h-8 text-emerald-400" />}
          bgClass="bg-emerald-950/20 hover:bg-emerald-900/30 border-emerald-900/50"
        />
        <DashboardCard
          title="Finance"
          description="Market indices"
          href="/finance"
          icon={<TrendingUp className="w-8 h-8 text-yellow-400" />}
          bgClass="bg-yellow-950/20 hover:bg-yellow-900/30 border-yellow-900/50"
        />
        <DashboardCard
          title="Astronomy"
          description="Alerts & phenomena"
          href="/astronomy"
          icon={<Moon className="w-8 h-8 text-purple-400" />}
          bgClass="bg-purple-950/20 hover:bg-purple-900/30 border-purple-900/50"
        />
      </section>

      <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-32 translate-x-32 blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-400" />
              Global Timeline
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Activity recorded in the last 24 hours
            </p>
          </div>
          <span className="flex items-center gap-2 text-xs px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full font-bold animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            LIVE
          </span>
        </div>

        <TimelineFilter data={timelineData} />
      </section>
    </div>
  );
}

/* ──────────────────────── Sub-components ──────────────────────── */

function MetricRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-slate-400 font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function CalculationTooltip({
  weights,
}: {
  weights: { disasters: number; climate: number; markets: number; news: number };
}) {
  return (
    <div className="group relative">
      <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 cursor-help hover:bg-slate-700/60 transition-colors">
        <Info className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest block mb-2">
          Calculation Weights
        </span>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-300">Disasters</span>
            <span className="font-bold text-red-400">{weights.disasters}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Climate Anomalies</span>
            <span className="font-bold text-blue-400">{weights.climate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Market Volatility</span>
            <span className="font-bold text-amber-400">{weights.markets}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">News Sentiment</span>
            <span className="font-bold text-emerald-400">{weights.news}%</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-slate-800 border-r border-b border-slate-700 rotate-45" />
      </div>
    </div>
  );
}

function RiskLevelBar({
  level,
  score,
}: {
  level: "Low" | "Moderate" | "High" | "Critical";
  score: number;
}) {
  const levels: { key: string; color: string; bg: string }[] = [
    { key: "Low", color: "text-emerald-400", bg: "bg-emerald-500" },
    { key: "Moderate", color: "text-amber-400", bg: "bg-amber-500" },
    { key: "High", color: "text-orange-400", bg: "bg-orange-500" },
    { key: "Critical", color: "text-red-400", bg: "bg-red-500" },
  ];

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500">
          Global Risk Level
        </span>
        <span className="text-xs font-bold text-slate-400">
          Score: {score}/100
        </span>
      </div>
      <div className="flex gap-2">
        {levels.map((l) => {
          const isActive = l.key === level;
          return (
            <div
              key={l.key}
              className={`flex-1 rounded-xl p-3 text-center transition-all border ${
                isActive
                  ? `${l.bg}/20 border-current ${l.color}`
                  : "bg-slate-800/30 border-slate-800 text-slate-600"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full mx-auto mb-1.5 ${
                  isActive ? `${l.bg} animate-pulse` : "bg-slate-700"
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider">
                {l.key}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsCard({
  label,
  value,
  subValue,
  icon,
  trend,
  color = "blue",
}: {
  label: string;
  value: React.ReactNode;
  subValue?: string;
  icon: React.ReactNode;
  trend: string;
  color?: string;
}) {
  const shadowColors: Record<string, string> = {
    orange:
      "hover:shadow-orange-500/10 group-hover:bg-orange-500/5 border-slate-800 hover:border-orange-500/50",
    red: "hover:shadow-red-500/10 group-hover:bg-red-500/5 border-slate-800 hover:border-red-500/50",
    emerald:
      "hover:shadow-emerald-500/10 group-hover:bg-emerald-500/5 border-slate-800 hover:border-emerald-500/50",
    blue: "hover:shadow-blue-500/10 group-hover:bg-blue-500/5 border-slate-800 hover:border-blue-500/50",
    purple:
      "hover:shadow-purple-500/10 group-hover:bg-purple-500/5 border-slate-800 hover:border-purple-500/50",
    slate:
      "hover:shadow-slate-500/10 group-hover:bg-white/5 border-slate-800 hover:border-slate-500/50",
  };

  const bgGradient = shadowColors[color] || shadowColors.blue;

  return (
    <div
      className={`bg-slate-900/40 border p-5 rounded-2xl flex flex-col justify-between transition-all group relative overflow-hidden shadow-lg hover:-translate-y-1 ${bgGradient}`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 from-white/5 to-transparent rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-500" />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div
          className={`p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/50 shadow-inner group-hover:scale-110 transition-transform`}
        >
          {icon}
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
          {trend}
        </span>
      </div>
      <div className="relative z-10">
        <div className="flex items-baseline gap-2 overflow-hidden">
          <h4 className="text-3xl font-extrabold text-white tracking-tight">
            {value}
          </h4>
          {subValue && (
            <span className="text-xs text-slate-400 font-medium truncate opacity-60 group-hover:opacity-100 transition-opacity">
              {subValue}
            </span>
          )}
        </div>
        <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
          {label}
        </p>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  href,
  icon,
  bgClass,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  bgClass: string;
}) {
  return (
    <Link
      href={href}
      className={`block group relative rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl overflow-hidden ${bgClass}`}
    >
      <div className="absolute inset-0 from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10 flex flex-col h-full justify-between space-y-4">
        <div className="flex justify-between items-start">
          <div className="p-3 bg-slate-900/50 rounded-xl rounded-tl-none border border-white/5">
            {icon}
          </div>
          <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0 text-white/50" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-100 transition-colors">
            {title}
          </h3>
          <p className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function SeverityBadge({
  label,
  level,
  weight,
}: {
  label: string;
  level: "low" | "medium" | "high";
  weight?: string;
}) {
  const configs = {
    low: {
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      dot: "bg-emerald-400",
    },
    medium: {
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      dot: "bg-amber-400",
    },
    high: {
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      dot: "bg-rose-400",
    },
  };
  const config = configs[level];

  return (
    <div
      className={`flex flex-col gap-1 p-3 rounded-2xl border ${config.bg} ${config.border} backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        {weight && (
          <span className="text-[9px] font-bold text-slate-600">{weight}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
        <span className={`text-sm font-black uppercase ${config.color}`}>
          {level}
        </span>
      </div>
    </div>
  );
}

function RiskIndexGauge({
  score,
  trend,
  riskLevel,
}: {
  score: number;
  trend: number;
  riskLevel: string;
}) {
  const color = score > 70 ? "#10b981" : score > 40 ? "#f59e0b" : "#f43f5e";
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg className="w-48 h-48 -rotate-90">
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          className="text-slate-800"
        />
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke={color}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out animate-ring-fill"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-5xl font-black text-white tracking-tighter">
          {score}
        </span>
        <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest mt-1">
          / 100
        </span>
      </div>
      {/* Trend and Risk Level below gauge */}
      <div className="flex items-center gap-3 mt-3">
        <span
          className={`text-sm font-bold ${
            trend > 0
              ? "text-emerald-400"
              : trend < 0
                ? "text-red-400"
                : "text-slate-400"
          }`}
        >
          {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"} {trend > 0 ? "+" : ""}
          {trend} vs yesterday
        </span>
      </div>
      <span
        className="text-xs font-extrabold uppercase tracking-widest mt-1"
        style={{ color }}
      >
        {riskLevel}
      </span>
    </div>
  );
}
