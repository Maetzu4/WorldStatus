"use client";

import { useState } from "react";
import { ShieldAlert, Clock, MapPin } from "lucide-react";

export interface DisasterEvent {
  id: number;
  title: string;
  description: string | null;
  type: string;
  severity: "Low" | "Moderate" | "High" | "Critical";
  impact_score: number;
  location: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string | null;
  url: string;
  published_at: string | Date;
  created_at: string | Date;
}

const TYPE_EMOJIS: Record<string, string> = {
  Volcano: "🌋",
  Hurricane: "🌪",
  Flood: "🌊",
  Wildfire: "🔥",
  Earthquake: "🌍",
  Other: "⚠️",
};

const TYPE_COLORS: Record<string, string> = {
  Volcano: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Hurricane: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Flood: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Wildfire: "bg-red-500/10 text-red-400 border-red-500/20",
  Earthquake: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Other: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "bg-red-500/10 text-red-500 border-red-500/30 font-bold",
  High: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  Moderate: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  Low: "bg-slate-500/10 text-slate-400 border-slate-500/30",
};

export default function DisasterClient({ data }: { data: DisasterEvent[] }) {
  const [filterType, setFilterType] = useState<string>("All");
  const [filterSeverity, setFilterSeverity] = useState<string>("All");

  const totalReports = data.length;
  const criticalCount = data.filter((d) => d.severity === "Critical").length;

  // AI Most Critical Event
  const latestEvent = data.sort((a, b) => b.impact_score - a.impact_score)[0];

  // AI Insights Generation
  const typeCounts = data.reduce(
    (acc, d) => {
      acc[d.type] = (acc[d.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const insights = [];
  if (typeCounts["Wildfire"] > 3)
    insights.push("🔥 Wildfires increasing significantly globally.");
  if (typeCounts["Earthquake"] > 2)
    insights.push("🌍 Seismic activity cluster detected in active zones.");
  if (typeCounts["Flood"] > 3)
    insights.push("🌊 Major flooding events ongoing in multiple regions.");
  if (insights.length === 0)
    insights.push("✅ No immediate global severity clusters detected.");

  // Top Regions
  const countryHitMap = data.reduce(
    (acc, d) => {
      if (d.country) {
        if (!acc[d.country]) acc[d.country] = { total: 0, highCount: 0 };
        acc[d.country].total += 1;
        if (d.severity === "High" || d.severity === "Critical")
          acc[d.country].highCount += 1;
      }
      return acc;
    },
    {} as Record<string, { total: number; highCount: number }>,
  );

  const topRegions = Object.entries(countryHitMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3);

  // Filter Data
  const filteredData = data.filter((d) => {
    const typeMatch = filterType === "All" || d.type === filterType;
    const sevMatch = filterSeverity === "All" || d.severity === filterSeverity;
    return typeMatch && sevMatch;
  });

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header & AI Insights */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-sm font-medium tracking-wide uppercase">
                  Global Intelligence Center
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mt-4">
                Global{" "}
                <span className="text-transparent bg-clip-text from-red-400 to-orange-400">
                  Threat Alerts
                </span>
              </h1>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl max-w-sm mt-4 md:mt-0">
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
                AI Insights
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                {insights.map((ins, i) => (
                  <li key={i}>{ins}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all">
            <p className="text-sm font-medium text-slate-400 mb-1">
              Total Active Events
            </p>
            <p className="text-3xl font-bold text-slate-50">{totalReports}</p>
          </div>
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all">
            <p className="text-sm font-medium text-slate-400 mb-1">
              Critical Severity
            </p>
            <p className="text-3xl font-bold text-red-500">{criticalCount}</p>
          </div>
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 blur-xl bg-red-500 w-full h-full pointer-events-none"></div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Most Critical Event
            </p>
            <p className="text-lg font-bold text-slate-50 line-clamp-2">
              {latestEvent
                ? `${TYPE_EMOJIS[latestEvent.type] || "⚠️"} ${latestEvent.title}`
                : "System Normal"}
            </p>
            {latestEvent && (
              <p className="text-xs text-red-400 mt-2 font-mono">
                Impact Score: {latestEvent.impact_score}/100
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center bg-slate-900/40 p-3 rounded-2xl border border-slate-800/80">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-bold ml-2">
            Filters:
          </span>
          <select
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-500 text-slate-200"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Earthquake">Earthquakes</option>
            <option value="Flood">Floods</option>
            <option value="Wildfire">Wildfires</option>
            <option value="Hurricane">Hurricanes</option>
            <option value="Volcano">Volcanos</option>
          </select>

          <select
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-500 text-slate-200"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="All">All Severities</option>
            <option value="Low">Low</option>
            <option value="Moderate">Moderate</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        {/* Content list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">
                  Live Intelligence Stream
                </h2>
              </div>
              <div className="divide-y divide-slate-800/50 max-h-[800px] overflow-y-auto">
                {filteredData.length > 0 ? (
                  filteredData.map((d, i) => {
                    const timeStr = formatRelativeTime(
                      new Date(d.published_at),
                    );
                    const badgeColor = TYPE_COLORS[d.type] || TYPE_COLORS.Other;
                    const sevColor = SEVERITY_COLORS[d.severity];

                    return (
                      <a
                        key={i}
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block p-4 sm:p-6 hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="flex gap-4 items-start">
                          <div className="w-12 h-12 rounded-full bg-slate-800/50 border border-slate-700/50 flex flex-col items-center justify-center text-2xl shrink-0">
                            {TYPE_EMOJIS[d.type] || "⚠️"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${sevColor}`}
                              >
                                {d.severity}
                              </span>
                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${badgeColor}`}
                              >
                                {d.type}
                              </span>
                              {d.country && (
                                <span className="text-[10px] uppercase text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />{" "}
                                  {d.country}
                                </span>
                              )}
                              <span className="text-xs font-mono text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">
                                Impact: {d.impact_score}
                              </span>
                              <span className="text-xs text-slate-500 flex items-center gap-1 ml-auto">
                                <Clock className="w-3 h-3" /> {timeStr}
                              </span>
                            </div>
                            <h3 className="text-slate-200 font-medium mb-1 line-clamp-2 md:line-clamp-1">
                              {d.title}
                            </h3>
                            {d.description && (
                              <p className="text-xs text-slate-500 line-clamp-2">
                                {d.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </a>
                    );
                  })
                ) : (
                  <div className="p-12 text-center text-slate-500">
                    No events match your filters.
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">
                Top Affected Regions
              </h2>
              <div className="space-y-4">
                {topRegions.map(([country, stats], i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-slate-800/30 p-3 rounded-lg border border-slate-700/40"
                  >
                    <span className="text-slate-200 font-bold">{country}</span>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">
                        {stats.total} total events
                      </div>
                      <div className="text-xs text-red-400 font-semibold">
                        {stats.highCount} high/critical
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">
                Threat Summary
              </h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(typeCounts).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex-1 min-w-[120px] bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center"
                  >
                    <span className="text-slate-400 text-xs font-bold uppercase">
                      {type}
                    </span>
                    <span className="text-2xl font-black text-white mt-1">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date) {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;

  const elapsed = date.getTime() - new Date().getTime();

  if (Math.abs(elapsed) < msPerHour) {
    return rtf.format(Math.round(elapsed / msPerMinute), "minute");
  } else if (Math.abs(elapsed) < msPerDay) {
    return rtf.format(Math.round(elapsed / msPerHour), "hour");
  } else {
    return rtf.format(Math.round(elapsed / msPerDay), "day");
  }
}
