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
} from "lucide-react";
import { getTimelineData, getDashboardStats } from "@/lib/dashboard";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [timelineData, stats] = await Promise.all([
    getTimelineData(),
    getDashboardStats(),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
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
      </header>

      {/* Global Highlights Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="News Volume"
          value={stats.newsCount}
          icon={<Newspaper className="w-5 h-5 text-emerald-400" />}
          trend="Global Headlines"
        />
        <StatsCard
          label="Disaster Alerts"
          value={stats.disasterCount}
          icon={<ShieldAlert className="w-5 h-5 text-red-400" />}
          trend="Recent Reports"
        />
        <StatsCard
          label="Market Pulse"
          value={
            stats.topMover
              ? `${stats.topMover.change > 0 ? "+" : ""}${stats.topMover.change}%`
              : "0%"
          }
          subValue={stats.topMover?.name}
          icon={<TrendingUp className="w-5 h-5 text-yellow-400" />}
          trend="Top Index Mover"
        />
        <StatsCard
          label="Astro Events"
          value={stats.astroCount}
          icon={<Moon className="w-5 h-5 text-purple-400" />}
          trend="Atmospheric Activity"
        />
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

        <div className="space-y-1 relative">
          <div className="absolute left-[21px] top-4 bottom-4 w-px bg-slate-800 z-0" />
          {timelineData.length > 0 ? (
            timelineData.map((item, idx) => (
              <TimelineItem
                key={`${item.category}-${item.id}-${idx}`}
                category={item.category}
                title={item.title}
                time={formatDistanceToNow(item.timestamp, {
                  addSuffix: true,
                  locale: enUS,
                })}
              />
            ))
          ) : (
            <div className="text-center py-12 space-y-4">
              <Globe className="w-12 h-12 text-slate-700 mx-auto opacity-50" />
              <p className="text-slate-500 font-medium">
                No significant events recorded in the last 24 hours.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatsCard({
  label,
  value,
  subValue,
  icon,
  trend,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend: string;
}) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all group relative overflow-hidden shadow-lg hover:shadow-blue-500/5">
      <div className="absolute top-0 right-0 w-24 h-24 from-white/5 to-transparent rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-500" />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/50 shadow-inner group-hover:scale-110 transition-transform">
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

function TimelineItem({
  category,
  title,
  time,
}: {
  category: string;
  title: string;
  time: string;
}) {
  const badgeColors: Record<string, string> = {
    clima: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    desastre: "bg-red-500/10 text-red-400 border-red-500/20",
    noticia: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    finanzas: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    astronomía: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  return (
    <div className="flex gap-4 p-4 rounded-xl hover:bg-slate-800/40 transition-all group cursor-pointer border border-transparent hover:border-slate-700/50 relative z-10">
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full border-2 border-slate-700 bg-slate-900 group-hover:border-blue-400 group-hover:scale-125 mt-2 transition-all shadow-sm" />
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3 mb-1.5">
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border tracking-wider ${badgeColors[category] || "bg-slate-800 text-slate-300"}`}
          >
            {category.toUpperCase()}
          </span>
          <span className="text-xs text-slate-500 font-semibold">{time}</span>
        </div>
        <p className="text-slate-200 font-medium group-hover:text-white transition-colors leading-snug">
          {title}
        </p>
      </div>
    </div>
  );
}
