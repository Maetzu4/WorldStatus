import { ShieldAlert, AlertTriangle, Clock, Flame } from "lucide-react";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface DisasterArticle {
  id: number;
  source: string | null;
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  image_url: string | null;
  published_at: string | Date;
  category: string;
  country: string | null;
  severity: number | null;
  created_at: string | Date;
}

async function getDisasterData(): Promise<DisasterArticle[]> {
  try {
    const res = await query<DisasterArticle>(
      `SELECT * FROM news_articles
       WHERE category = 'desastre'
       ORDER BY published_at DESC LIMIT 100;`,
    );
    return res.rows;
  } catch (error) {
    console.warn("Failed to fetch disaster data:", error);
    return [];
  }
}

function severityLabel(severity: number | null): {
  text: string;
  className: string;
} {
  if (severity === null || severity === undefined)
    return {
      text: "Unclassified",
      className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };
  if (severity >= 4)
    return {
      text: `Critical (${severity})`,
      className: "bg-red-500/10 text-red-400 border-red-500/20",
    };
  if (severity >= 2)
    return {
      text: `Moderate (${severity})`,
      className: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    };
  return {
    text: `Low (${severity})`,
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  };
}

const COMMON_COUNTRIES = [
  "Indonesia", "California", "Japan", "Mexico", "Chile", "Turkey", "China",
  "India", "Philippines", "Italy", "Greece", "USA", "United States", "Brazil",
  "Australia", "New Zealand", "Pakistan", "Iran", "Colombia", "Peru", "Spain", "France"
];

function extractCountry(text: string): string | null {
  if (!text) return null;
  const lowerText = text.toLowerCase();
  for (const country of COMMON_COUNTRIES) {
    if (lowerText.includes(country.toLowerCase())) {
      return country === "USA" || country === "California" ? "United States" : country;
    }
  }
  return null;
}

type DisasterType = "Volcano" | "Hurricane" | "Flood" | "Wildfire" | "Earthquake" | "Other";

function classifyDisaster(title: string, description: string | null): DisasterType {
  const text = `${title} ${description || ""}`.toLowerCase();
  if (text.includes("volcan") || text.includes("eruption") || text.includes("magma")) return "Volcano";
  if (text.includes("huracan") || text.includes("hurricane") || text.includes("typhoon") || text.includes("cyclone") || text.includes("tornado") || text.includes("storm")) return "Hurricane";
  if (text.includes("flood") || text.includes("inundación") || text.includes("inundacion") || text.includes("tsunami")) return "Flood";
  if (text.includes("fire") || text.includes("wildfire") || text.includes("incendio") || text.includes("flames") || text.includes("fuego")) return "Wildfire";
  if (text.includes("earthquake") || text.includes("terremoto") || text.includes("sismo") || text.includes("quake") || text.includes("tremor")) return "Earthquake";
  return "Other";
}

const TYPE_EMOJIS: Record<DisasterType, string> = {
  Volcano: "🌋",
  Hurricane: "🌪",
  Flood: "🌊",
  Wildfire: "🔥",
  Earthquake: "🌍",
  Other: "⚠️"
};

export default async function DisastersPage() {
  const disasters = await getDisasterData();

  const totalReports = disasters.length;
  const criticalCount = disasters.filter(
    (d) => d.severity !== null && d.severity >= 4,
  ).length;
  const latestEvent = disasters[0]?.title || "No recent reports";

  // Data processing for new features
  const typeCounts: Record<string, number> = {
    Volcano: 0,
    Hurricane: 0,
    Flood: 0,
    Wildfire: 0,
    Earthquake: 0,
  };

  const countryHitMap: Record<string, number> = {};

  const processedDisasters = disasters.map((d) => {
    const dType = classifyDisaster(d.title, d.description);
    if (dType !== "Other") {
      typeCounts[dType] = (typeCounts[dType] || 0) + 1;
    }

    let country = d.country;
    if (!country) {
      country = extractCountry(d.title) || extractCountry(d.description || "");
    }

    if (country) {
      // Normalize common duplicates
      const normalized = country.toLowerCase() === "us" || country.toLowerCase() === "usa" ? "United States" : country;
      countryHitMap[normalized] = (countryHitMap[normalized] || 0) + 1;
    }

    return { ...d, dType, matchedCountry: country };
  });

  const topRegions = Object.entries(countryHitMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
    
  const rankingMedals = ["1️⃣", "2️⃣", "3️⃣"];

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <section className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-sm font-medium tracking-wide uppercase">
              Natural Disasters
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Global{" "}
            <span className="text-transparent bg-clip-text from-red-400 to-orange-400">
              Alerts
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Reports of natural disasters detected through intelligent filtering
            of global news. Updated every 30 minutes.
          </p>
        </section>

        {/* Existing General KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-red-500/10 rounded-2xl text-red-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Total Reports
            </p>
            <p className="text-3xl font-bold text-slate-50">{totalReports}</p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-400">
                <Flame className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Critical Events
            </p>
            <p className="text-3xl font-bold text-slate-50">{criticalCount}</p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Latest Event
            </p>
            <p className="text-lg font-bold text-slate-50 line-clamp-2">
              {latestEvent.length > 60
                ? latestEvent.slice(0, 60) + "..."
                : latestEvent}
            </p>
          </div>
        </div>

        {/* New Disaster Breakdown & Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-white px-2">Active Threats Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(typeCounts).map(([type, count]) => (
                <div key={type} className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{TYPE_EMOJIS[type as DisasterType]}</span>
                    <span className="text-sm font-bold text-slate-300">{type}s</span>
                  </div>
                  <span className="text-xl font-black text-slate-100">{count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white px-2">Top Affected Regions</h2>
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              {topRegions.length > 0 ? (
                 topRegions.map(([region, hits], idx) => (
                  <div key={region} className="flex items-center justify-between border-b border-slate-800/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{rankingMedals[idx] || "🔹"}</span>
                      <span className="text-slate-200 font-bold capitalize">{region}</span>
                    </div>
                    <span className="text-sm font-mono text-slate-400">{hits} alerts</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500 text-center py-4">No regional data available yet.</div>
              )}
            </div>
          </section>
        </div>

        {/* Disaster List */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">
              Recent Reports
            </h2>
          </div>
          <div className="divide-y divide-slate-800/50">
            {processedDisasters.length > 0 ? (
              processedDisasters.slice(0, 20).map((disaster, idx) => {
                const sev = severityLabel(disaster.severity);
                return (
                  <a
                    key={idx}
                    href={disaster.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 sm:p-6 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="w-12 h-12 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-2xl shrink-0">
                        {TYPE_EMOJIS[disaster.dType]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${sev.className}`}
                          >
                            {sev.text}
                          </span>
                          {disaster.source && (
                            <span className="text-xs text-slate-500">
                              {disaster.source}
                            </span>
                          )}
                           {disaster.matchedCountry && (
                            <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                              {disaster.matchedCountry}
                            </span>
                          )}
                          <span className="text-xs text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(disaster.published_at).toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-slate-200 font-medium mb-1 line-clamp-2">
                          {disaster.title}
                        </h3>
                        {disaster.description && (
                          <p className="text-sm text-slate-500 line-clamp-2">
                            {disaster.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </a>
                );
              })
            ) : (
              <div className="p-12 text-center text-slate-500">
                No disaster reports available yet. Run the cron job{" "}
                <code className="text-slate-400">news-sync.ts</code> to collect
                data.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
