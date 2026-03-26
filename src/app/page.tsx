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
  Smile,
} from "lucide-react";
import { getTimelineData, getDashboardStats, getMapPoints } from "@/lib/dashboard";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import GlobalMap from "@/components/Map";
import TimelineClient from "@/components/TimelineClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const [timelineData, stats, mapPoints] = await Promise.all([
      getTimelineData(),
      getDashboardStats(),
      getMapPoints(),
    ]);

    return (
      <div className="p-8 max-w-7xl mx-auto space-y-12">
        <header className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white bg-clip-text">
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
            {stats.hotZones?.length > 0 && (
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
        </header>

        {/* Planet Control Center Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <MetricHighlight
            key="temp-anomaly"
            label="Global Temp Anomaly"
            value={`+${stats.tempAnomaly}°C`}
            subValue="Above 1850-1900 avg"
            icon={<Thermometer className="w-5 h-5 text-orange-400" />}
            colorClass="text-orange-400"
            trend="Climate Crisis"
            glowColor="bg-orange-500/20"
            magnitude={Math.min(100, stats.tempAnomaly * 50)}
            isCritical={stats.tempAnomaly > 1.2}
            accentBorder="border-t-orange-500"
          />
          <MetricHighlight
            key="disaster-alerts"
            label="Active Disaster Alerts"
            value={stats.disasterCount}
            subValue={`Severity Level ${stats.disasterSeverity}/5`}
            icon={<ShieldAlert className="w-5 h-5 text-red-400" />}
            colorClass="text-red-400"
            trend="Crisis Monitor"
            glowColor="bg-red-500/20"
            magnitude={Math.min(100, stats.disasterCount * 10)}
            isCritical={stats.disasterCount >= 3}
            accentBorder="border-t-red-500"
          />
          <MetricHighlight
            key="news-sentiment"
            label="Global Sentiment"
            value={`${stats.newsSentiment}%`}
            subValue="Overall News Mood"
            icon={<Smile className="w-5 h-5 text-emerald-400" />}
            colorClass="text-emerald-400"
            trend="Positive Pulse"
            glowColor="bg-emerald-500/20"
            magnitude={stats.newsSentiment}
            isCritical={stats.newsSentiment < 40}
            accentBorder="border-t-emerald-500"
          />
          <MetricHighlight
            key="market-trend"
            label="Market Trend"
            value={`${stats.marketTrend > 0 ? "+" : ""}${stats.marketTrend.toFixed(2)}%`}
            subValue="Avg. World Indices"
            icon={<TrendingUp className="w-5 h-5 text-yellow-400" />}
            colorClass="text-yellow-400"
            trend="24h Performance"
            glowColor="bg-yellow-500/20"
            magnitude={Math.min(100, Math.abs(stats.marketTrend) * 20)}
            isCritical={stats.marketTrend < -2}
            accentBorder="border-t-yellow-500"
          />
          <MetricHighlight
            key="astro-events"
            label="Astronomy Events"
            value={stats.astroCount}
            subValue="Observation alerts"
            icon={<Moon className="w-5 h-5 text-purple-400" />}
            colorClass="text-purple-400"
            trend="Cosmic Activity"
            glowColor="bg-purple-500/20"
            magnitude={Math.min(100, stats.astroCount * 15)}
            isCritical={false}
            accentBorder="border-t-purple-500"
          />
        </section>

        {/* Interactive Global Monitor */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Interactive Global Monitor</h2>
          </div>
          <GlobalMap points={mapPoints} />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <DashboardCard
            key="card-climate"
            title="Climate"
            description="Conditions & alerts"
            href="/climate"
            icon={<CloudRain className="w-8 h-8 text-blue-400" />}
            bgClass="bg-blue-950/20 hover:bg-blue-900/30 border-blue-900/50"
          />
          <DashboardCard
            key="card-disasters"
            title="Disasters"
            description="Recent reports"
            href="/disasters"
            icon={<ShieldAlert className="w-8 h-8 text-red-400" />}
            bgClass="bg-red-950/20 hover:bg-red-900/30 border-red-900/50"
          />
          <DashboardCard
            key="card-news"
            title="News"
            description="Global headlines"
            href="/news"
            icon={<Newspaper className="w-8 h-8 text-emerald-400" />}
            bgClass="bg-emerald-950/20 hover:bg-emerald-900/30 border-emerald-900/50"
          />
          <DashboardCard
            key="card-finance"
            title="Finance"
            description="Market indices"
            href="/finance"
            icon={<TrendingUp className="w-8 h-8 text-yellow-400" />}
            bgClass="bg-yellow-950/20 hover:bg-yellow-900/30 border-yellow-900/50"
          />
          <DashboardCard
            key="card-astronomy"
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

          <TimelineClient
            items={timelineData.map((item, idx) => ({
              id: `${item.category}-${item.id}-${idx}`,
              category: item.category,
              title: item.title,
              time: formatDistanceToNow(item.timestamp, {
                addSuffix: true,
                locale: enUS,
              }),
            }))}
          />
        </section>
      </div>
    );
  } catch (error) {
    console.error("Dashboard render error:", error);
    return (
      <div className="p-8 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h1 className="text-2xl font-bold text-white">Dashboard Unavailable</h1>
        <p className="text-slate-400">
          We encountered an error while loading the dashboard. Please check your
          database connection.
        </p>
      </div>
    );
  }
}

function MetricHighlight({
  label,
  value,
  subValue,
  icon,
  trend,
  colorClass,
  glowColor,
  magnitude,
  isCritical,
  accentBorder,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend: string;
  colorClass: string;
  glowColor: string;
  magnitude: number;
  isCritical?: boolean;
  accentBorder: string;
}) {
  return (
    <div className={`bg-slate-900/60 border border-slate-800 ${accentBorder} border-t-[3px] p-5 rounded-2xl flex flex-col justify-between min-h-[180px] hover:border-slate-700 transition-all group relative overflow-hidden backdrop-blur-md shadow-lg hover:shadow-cyan-500/5`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-current/5 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="relative">
          {/* Radial glow behind icon */}
          <div
            className={`absolute inset-0 ${glowColor} rounded-xl blur-xl scale-150`}
            style={{ animation: "glow-soft 3s ease-in-out infinite" }}
          />
          <div className={`relative p-2.5 bg-slate-800/90 rounded-xl border border-slate-700/50 shadow-inner group-hover:bg-slate-800 transition-colors ${isCritical ? "pulse-ring-wrapper" : ""}`}>
            {icon}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">
            {trend}
          </span>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="relative z-10">
        <div className="flex items-baseline gap-2 overflow-hidden">
          <h4 className={`text-3xl font-black ${colorClass} tracking-tighter tabular-nums`}>
            {value}
          </h4>
        </div>
        <p className="text-[11px] font-bold text-slate-300 mt-1 uppercase tracking-wider group-hover:text-white transition-colors">
          {label}
        </p>
        {subValue && (
          <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
            {subValue}
          </p>
        )}
        {/* Mini sparkline bar */}
        <div className="mt-3 w-full bg-slate-800/60 rounded-full h-1 overflow-hidden">
          <div
            className={`h-full rounded-full ${colorClass.replace("text-", "bg-")} opacity-60 transition-all duration-700`}
            style={{ width: `${Math.max(5, Math.min(100, magnitude))}%` }}
          />
        </div>
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

