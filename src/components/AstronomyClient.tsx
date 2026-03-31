"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Star,
  Calendar,
  Filter,
  Shield,
  Clock,
  Activity,
  Zap,
  Radio,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface AstronomyEvent {
  id: number;
  event: string;
  type: string | null;
  intensity: string | null;
  source: string | null;
  impact_level: string | null;
  date: string | Date;
  extra_info: {
    title?: string;
    url?: string;
    hdurl?: string;
    media_type?: string;
    explanation?: string;
    messageID?: string;
    messageBody?: string;
  } | null;
  created_at: string | Date;
}

interface SpaceWeatherIndex {
  score: number;
  status: string;
  trend: number;
  color: string;
}

interface SolarActivity {
  flares: number;
  cmes: number;
  geomagneticStorms: number;
  radiationBelts: number;
  highestFlareClass: string | null;
  highestStormLevel: string | null;
}

interface EarthImpact {
  icon: string;
  text: string;
  severity: "info" | "warning" | "critical";
}

interface EnhancedMoonPhase {
  name: string;
  emoji: string;
  illumination: number;
  daysToFullMoon: number;
  daysToNewMoon: number;
  nextFullMoon: string;
  nextNewMoon: string;
  phaseProgress: number;
}

interface EventBreakdown {
  type: string;
  label: string;
  count: number;
  emoji: string;
}

interface DailyActivity {
  date: string;
  count: number;
}

interface SpaceInsight {
  icon: string;
  text: string;
  severity: "info" | "warning" | "critical";
}

interface SpaceImpactScore {
  score: number;
  level: "low" | "medium" | "high";
  description: string;
}

interface SpaceAnalytics {
  spaceWeatherIndex: SpaceWeatherIndex;
  solar: SolarActivity;
  earthImpact: EarthImpact[];
  breakdown: EventBreakdown[];
  moon: EnhancedMoonPhase;
  insights: SpaceInsight[];
  timeline: DailyActivity[];
  impact: SpaceImpactScore;
  lastUpdated: string;
}

// ── Type configs ───────────────────────────────────────────────────

const EVENT_TYPES = [
  { id: "all", label: "All Events", emoji: "🌌" },
  { id: "solar_flare", label: "Solar Flares", emoji: "☀️" },
  { id: "cme", label: "CMEs", emoji: "💫" },
  { id: "geomagnetic_storm", label: "Geo. Storms", emoji: "🌍" },
  { id: "radiation_belt", label: "Radiation", emoji: "☢️" },
  { id: "apod", label: "APOD", emoji: "🔭" },
];

const EVENT_TYPE_MAP: Record<string, string> = {
  FLR: "solar_flare",
  CME: "cme",
  GST: "geomagnetic_storm",
  IPS: "interplanetary_shock",
  SEP: "solar_energetic_particle",
  RBE: "radiation_belt",
  HSS: "high_speed_stream",
  DONKI_NOTIFICATION: "notification",
  APOD: "apod",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  solar_flare: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  cme: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  geomagnetic_storm: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  radiation_belt: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  interplanetary_shock: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  solar_energetic_particle: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  notification: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  apod: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const IMPACT_COLORS: Record<string, string> = {
  extreme: "bg-red-500/20 text-red-400 border-red-500/30",
  severe: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  moderate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  minor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  none: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const UPCOMING_ECLIPSES = [
  {
    date: "2026-08-12",
    type: "Total Solar Eclipse",
    region: "Arctic, Greenland, Iceland, Spain",
  },
  {
    date: "2027-02-06",
    type: "Annular Solar Eclipse",
    region: "South America, Antarctica",
  },
  {
    date: "2027-08-02",
    type: "Total Solar Eclipse",
    region: "North Africa, Middle East",
  },
  {
    date: "2028-01-26",
    type: "Annular Solar Eclipse",
    region: "South America, Spain",
  },
];

// ── Helper components ──────────────────────────────────────────────

function SpaceWeatherGauge({ index }: { index: SpaceWeatherIndex }) {
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (index.score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg className="w-40 h-40 -rotate-90">
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="currentColor"
          strokeWidth="10"
          fill="transparent"
          className="text-slate-800"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke={index.color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center mt-10">
        <span className="text-4xl font-black text-white">{index.score}</span>
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
          /100
        </span>
      </div>
    </div>
  );
}

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

function isEmbedVideo(url: string): boolean {
  return (
    url.includes("youtube") || url.includes("vimeo") || url.includes("youtu.be")
  );
}

// ── Main component ─────────────────────────────────────────────────

export default function AstronomyClient() {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<AstronomyEvent[]>([]);
  const [analytics, setAnalytics] = useState<SpaceAnalytics | null>(null);
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch("/api/data/astronomy");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setRawData(json.data || []);
        setAnalytics(json.analytics || null);
      } catch (err) {
        console.error("Astronomy fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filterType === "all") return rawData;
    return rawData.filter((e) => {
      const normalizedType =
        e.type || EVENT_TYPE_MAP[e.event] || "notification";
      return normalizedType === filterType;
    });
  }, [rawData, filterType]);

  const latestApod = rawData.find((e) => e.event === "APOD");

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8">
      {/* ── Header + Insights ── */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Radio className="w-4 h-4" />
              <span className="text-sm font-medium tracking-wide uppercase">
                Space Weather Intelligence
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
              Space Weather{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-violet-300">
                Intelligence
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl">
              Real-time solar monitoring, geomagnetic storm tracking, and Earth
              impact assessment powered by NASA DONKI.
            </p>
          </div>

          {/* AI Insights */}
          {analytics && analytics.insights.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl max-w-sm mt-4 md:mt-0">
              <h3 className="text-xs uppercase tracking-wider text-purple-400/80 font-bold mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Space Insights
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

      {/* ── Space Weather Index (Hero) ── */}
      {analytics && (
        <section className="relative overflow-hidden rounded-3xl bg-slate-900 border-2 border-slate-800 p-8 group hover:border-purple-500/30 transition-all">
          <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 via-transparent to-indigo-500/5 opacity-50" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              <SpaceWeatherGauge index={analytics.spaceWeatherIndex} />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-3xl font-black text-white">
                  Space Weather Index
                </h2>
                <p className="text-slate-400 mt-1">
                  Composite score from solar flares, CMEs, and geomagnetic
                  activity
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span
                  className="px-4 py-2 rounded-xl text-sm font-extrabold uppercase tracking-wider border"
                  style={{
                    color: analytics.spaceWeatherIndex.color,
                    borderColor: analytics.spaceWeatherIndex.color + "40",
                    backgroundColor: analytics.spaceWeatherIndex.color + "10",
                  }}
                >
                  {analytics.spaceWeatherIndex.status}
                </span>
                <span
                  className={`text-sm font-bold ${
                    analytics.spaceWeatherIndex.trend > 0
                      ? "text-emerald-400"
                      : analytics.spaceWeatherIndex.trend < 0
                        ? "text-red-400"
                        : "text-slate-400"
                  }`}
                >
                  {analytics.spaceWeatherIndex.trend > 0
                    ? "↑ +"
                    : analytics.spaceWeatherIndex.trend < 0
                      ? "↓ "
                      : "→ "}
                  {analytics.spaceWeatherIndex.trend} vs yesterday
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Key Metrics Row ── */}
      {analytics && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Solar Activity */}
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-orange-500/30">
            <div className="absolute inset-0 bg-linear-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-sm font-medium text-slate-400 mb-3">
              Solar Activity
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Solar Flares</span>
                <span className="text-white font-bold">
                  {analytics.solar.flares}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">CMEs Detected</span>
                <span className="text-white font-bold">
                  {analytics.solar.cmes}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Geo. Storms</span>
                <span className="text-white font-bold">
                  {analytics.solar.geomagneticStorms}
                </span>
              </div>
              {analytics.solar.highestFlareClass && (
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-500">Peak:</span>
                  <span className="text-orange-400 font-bold text-sm ml-1">
                    {analytics.solar.highestFlareClass}-class
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Geomagnetic Status */}
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-yellow-500/30">
            <div className="absolute inset-0 bg-linear-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-sm font-medium text-slate-400 mb-3">
              Geomagnetic Status
            </p>
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`px-3 py-1.5 rounded-xl text-sm font-extrabold uppercase tracking-wider border ${
                  analytics.solar.highestStormLevel
                    ? parseInt(
                        analytics.solar.highestStormLevel.replace("G", ""),
                      ) >= 3
                      ? "bg-red-500/10 text-red-400 border-red-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {analytics.solar.highestStormLevel || "Quiet"}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {analytics.solar.highestStormLevel
                ? `${analytics.solar.geomagneticStorms} storm${analytics.solar.geomagneticStorms !== 1 ? "s" : ""} detected this period`
                : "No significant geomagnetic activity"}
            </p>
          </div>

          {/* Enhanced Moon Phase */}
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-indigo-500/30">
            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-sm font-medium text-slate-400 mb-2">
              Moon Phase
            </p>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{analytics.moon.emoji}</span>
              <div>
                <p className="text-white font-bold">{analytics.moon.name}</p>
                <p className="text-xs text-slate-500">
                  {analytics.moon.illumination}% illuminated
                </p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Days to Full Moon</span>
                <span className="text-indigo-400 font-bold">
                  {analytics.moon.daysToFullMoon}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Next Full Moon</span>
                <span className="text-white font-medium">
                  {analytics.moon.nextFullMoon}
                </span>
              </div>
            </div>
            {/* Phase progress bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${analytics.moon.phaseProgress}%` }}
              />
            </div>
          </div>

          {/* Earth Impact Summary */}
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-blue-500/30">
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-sm font-medium text-slate-400 mb-3">
              Earth Impact
            </p>
            {analytics.earthImpact.length > 0 && (
              <div className="space-y-2">
                {analytics.earthImpact.slice(0, 3).map((imp, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="shrink-0 text-sm">{imp.icon}</span>
                    <p
                      className={`text-xs leading-snug ${
                        imp.severity === "critical"
                          ? "text-red-300"
                          : imp.severity === "warning"
                            ? "text-amber-300"
                            : "text-slate-400"
                      }`}
                    >
                      {imp.text.length > 60
                        ? imp.text.slice(0, 60) + "..."
                        : imp.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Earth Impact Panel (full width) ── */}
      {analytics && analytics.earthImpact.length > 0 && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            🌍 Earth Impact Assessment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {analytics.earthImpact.map((imp, i) => {
              const borderColor =
                imp.severity === "critical"
                  ? "border-red-500/30 bg-red-500/5"
                  : imp.severity === "warning"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-blue-500/30 bg-blue-500/5";
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-4 rounded-xl border ${borderColor} transition-all hover:scale-[1.01]`}
                >
                  <span className="text-xl mt-0.5">{imp.icon}</span>
                  <p className="text-sm text-slate-200 font-medium leading-snug">
                    {imp.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center bg-slate-900/40 p-3 rounded-2xl border border-slate-800/80">
        <div className="flex items-center gap-2 text-slate-400 ml-2">
          <Filter className="w-4 h-4" />
          <span className="text-xs uppercase font-bold tracking-wider">
            Events
          </span>
        </div>
        {EVENT_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilterType(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              filterType === t.id
                ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ── Main content: 2/3 + 1/3 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Event Stream */}
        <div className="lg:col-span-2">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Event Stream
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {filteredEvents.length} events
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center gap-3 text-slate-400">
                  <Activity className="w-5 h-5 animate-pulse" />
                  <span>Scanning space weather data...</span>
                </div>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No events match the current filter.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50 max-h-[800px] overflow-y-auto">
                {filteredEvents.slice(0, 30).map((event, idx) => {
                  const normalizedType =
                    event.type || EVENT_TYPE_MAP[event.event] || "notification";
                  const badgeColor =
                    TYPE_BADGE_COLORS[normalizedType] ||
                    TYPE_BADGE_COLORS.notification;
                  const impactColor =
                    IMPACT_COLORS[event.impact_level || "none"] ||
                    IMPACT_COLORS.none;
                  const title =
                    event.extra_info?.title ||
                    event.extra_info?.messageID ||
                    event.event;
                  const description =
                    event.extra_info?.explanation ||
                    event.extra_info?.messageBody;

                  return (
                    <div
                      key={idx}
                      className="p-4 sm:p-6 hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-12 h-12 rounded-full bg-purple-950/50 border border-purple-500/20 flex items-center justify-center text-xl shrink-0">
                          {EVENT_TYPES.find((t) => t.id === normalizedType)
                            ?.emoji || "📡"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${badgeColor}`}
                            >
                              {EVENT_TYPES.find((t) => t.id === normalizedType)
                                ?.label || event.event}
                            </span>
                            {event.intensity && (
                              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-800 text-white border border-slate-700">
                                {event.intensity}
                              </span>
                            )}
                            {event.impact_level &&
                              event.impact_level !== "none" && (
                                <span
                                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${impactColor}`}
                                >
                                  {event.impact_level}
                                </span>
                              )}
                            <span className="text-xs text-slate-600 flex items-center gap-1 ml-auto">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(new Date(event.date))}
                            </span>
                          </div>
                          <h3 className="text-slate-200 font-medium mb-1 line-clamp-2">
                            {title}
                          </h3>
                          {description && (
                            <p className="text-sm text-slate-500 line-clamp-3">
                              {description.slice(0, 300)}
                              {description.length > 300 ? "..." : ""}
                            </p>
                          )}
                          {event.source && (
                            <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-wider">
                              Source: {event.source}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          {/* Activity Timeline */}
          {analytics && analytics.timeline.length > 0 && (
            <section className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Activity (7 days)
              </h2>
              <div className="flex items-end gap-1 h-24">
                {analytics.timeline.map((d, i) => {
                  const maxCount = Math.max(
                    ...analytics.timeline.map((t) => t.count),
                    1,
                  );
                  const heightPct = (d.count / maxCount) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <span className="text-[10px] text-slate-500 font-bold">
                        {d.count}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-purple-500/40 transition-all duration-500 hover:bg-purple-500/70"
                        style={{ height: `${Math.max(4, heightPct)}%` }}
                      />
                      <span className="text-[9px] text-slate-600 font-mono">
                        {new Date(d.date)
                          .toLocaleDateString("en", { weekday: "short" })
                          .slice(0, 2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Event Breakdown */}
          {analytics && analytics.breakdown.length > 0 && (
            <section className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                📊 Event Breakdown
              </h2>
              <div className="space-y-2">
                {analytics.breakdown.slice(0, 6).map((b, i) => {
                  const maxCount = Math.max(
                    ...analytics.breakdown.map((bb) => bb.count),
                    1,
                  );
                  const pct = (b.count / maxCount) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-6 text-center">{b.emoji}</span>
                      <span className="text-slate-400 text-xs w-28 shrink-0 truncate">
                        {b.label}
                      </span>
                      <div className="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-500/50 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-slate-500 font-bold text-xs w-6 text-right">
                        {b.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Upcoming Eclipses */}
          <section className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              Upcoming Eclipses
            </h2>
            <div className="space-y-3">
              {UPCOMING_ECLIPSES.map((eclipse, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 rounded-xl bg-slate-800/40 border border-slate-700/50"
                >
                  <div>
                    <p className="text-white font-bold text-sm">
                      {eclipse.type}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-tight">
                      {eclipse.region}
                    </p>
                  </div>
                  <p className="text-purple-400 font-mono text-xs font-bold">
                    {eclipse.date}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* APOD Showcase */}
          {latestApod?.extra_info?.url && (
            <section className="bg-slate-900/50 border border-purple-900/30 rounded-3xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold text-white">
                  {latestApod.extra_info.media_type === "video"
                    ? "Video of the Day"
                    : "Picture of the Day"}
                </h2>
              </div>
              {latestApod.extra_info.media_type === "video" ? (
                isEmbedVideo(latestApod.extra_info.url) ? (
                  <iframe
                    src={latestApod.extra_info.url}
                    title={latestApod.extra_info.title || "APOD"}
                    className="w-full aspect-video"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={latestApod.extra_info.url}
                    controls
                    className="w-full aspect-video"
                  >
                    Your browser does not support the video tag.
                  </video>
                )
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={latestApod.extra_info.url}
                  alt={latestApod.extra_info.title || "APOD"}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="text-white font-bold text-sm mb-1">
                  {latestApod.extra_info.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-3">
                  {latestApod.extra_info.explanation?.slice(0, 150)}...
                </p>
              </div>
            </section>
          )}

          {/* Stability Impact */}
          {analytics && (
            <section className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
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
                    Space Impact Score
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {analytics.impact.description}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-wider font-bold">
                    Feeds into → Global Stability Index (15%)
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
