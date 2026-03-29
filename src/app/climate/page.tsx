import { MapPin, Droplets, ThermometerSun, Wind, TrendingUp, Sun, Snowflake, Zap, Bot, Navigation } from "lucide-react";
import { query } from "@/lib/db";
import ClimateChart from "@/components/ClimateChart";

export const dynamic = "force-dynamic";

interface WeatherSnapshot {
  location_id: string;
  timestamp: string | number | Date;
  temperature: number | string;
  humidity: number | string;
  pressure: number | string;
  wind_speed: number | string;
  uvi: number | string;
  weather_type: string;
  condition?: string;
  source: string;
}

async function getClimateData(): Promise<WeatherSnapshot[]> {
  try {
    const res = await query<WeatherSnapshot>(
      "SELECT * FROM weather_snapshots ORDER BY timestamp DESC LIMIT 500;"
    );
    return res.rows;
  } catch (error) {
    console.warn("Failed to fetch climate data:", error);
    return [];
  }
}

// Generate human-readable automated insight
function generateInsight(chartPoints: { time: string; temperature: number }[], globalAvgTemp: number): string {
  if (chartPoints.length < 2) return "Global temperatures remain stable within tracking limits.";
  
  const oldest = chartPoints[0].temperature;
  const newest = chartPoints[chartPoints.length - 1].temperature;
  const delta = newest - oldest;
  
  const absDelta = Math.abs(delta).toFixed(1);
  const trend = delta > 0 ? "risen" : "fallen";
  
  let insight = `Global temperatures have ${trend} by ${absDelta}°C over the tracking period.`;
  
  if (globalAvgTemp > 25) {
    insight += " A warming pattern is highly noticeable today.";
  } else if (globalAvgTemp < 10) {
    insight += " A widespread cooling phenomenon continues across monitored hemispheres.";
  } else if (Math.abs(delta) < 0.3) {
    insight = "Global temperatures remain steadily constrained within historical averages.";
  }
  
  return insight;
}

export default async function ClimatePage() {
  const climateData = await getClimateData();

  // 1. Group latest snapshot per city (filtering out "global")
  const latestCities = new Map<string, WeatherSnapshot>();
  climateData.forEach((row) => {
    if (row.location_id !== "global" && !latestCities.has(row.location_id)) {
      latestCities.set(row.location_id, row);
    }
  });

  const cityRecords = Array.from(latestCities.values());

  // 2. Compute Extremes
  let hottest = { city: "N/A", val: -999 };
  let coldest = { city: "N/A", val: 999 };
  let windiest = { city: "N/A", val: -1 };
  let mostHumid = { city: "N/A", val: -1 };

  cityRecords.forEach((r) => {
    const t = Number(r.temperature);
    if (!isNaN(t)) {
      if (t > hottest.val) hottest = { city: r.location_id, val: t };
      if (t < coldest.val) coldest = { city: r.location_id, val: t };
    }
    const w = Number(r.wind_speed);
    if (!isNaN(w) && w > windiest.val) windiest = { city: r.location_id, val: w };
    
    const h = Number(r.humidity);
    if (!isNaN(h) && h > mostHumid.val) mostHumid = { city: r.location_id, val: h };
  });

  // Handle empty database smoothly
  if (hottest.val === -999) hottest.val = 0;
  if (coldest.val === 999) coldest.val = 0;
  if (windiest.val === -1) windiest.val = 0;
  if (mostHumid.val === -1) mostHumid.val = 0;

  // 3. Global Stats
  let latestGlobal = climateData.find((r) => r.location_id === "global");
  if (!latestGlobal) {
    let tSum = 0, hSum = 0, wSum = 0, count = 0;
    cityRecords.forEach(r => {
      const t = Number(r.temperature);
      if (!isNaN(t)) { tSum += t; hSum += Number(r.humidity); wSum += Number(r.wind_speed); count++; }
    });
    
    if (count > 0) {
      latestGlobal = {
        location_id: "global",
        timestamp: new Date(),
        temperature: (tSum / count).toFixed(1),
        humidity: Math.round(hSum / count),
        wind_speed: (wSum / count).toFixed(1),
        pressure: "--",
        uvi: "--",
        weather_type: "computed",
        condition: "Computed Average",
        source: "system"
      };
    } else {
      latestGlobal = {
        location_id: "global",
        timestamp: new Date(),
        temperature: "--", humidity: "--", wind_speed: "--", 
        pressure: "--", uvi: "--", weather_type: "unknown", 
        condition: "Awaiting Data", source: "none"
      };
    }
  }

  // 4. Chart historical points
  let chartPoints = [];
  const globalHistory = climateData.filter(r => r.location_id === "global")
    .map(r => ({
      rawDate: new Date(r.timestamp),
      time: new Date(r.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      temperature: Number(r.temperature)
    }))
    .reverse(); // oldest to newest

  if (globalHistory.length > 0) {
    chartPoints = globalHistory;
  } else if (cityRecords.length > 0) {
    // If no global history, just create a mock shape from cities for visualization
    chartPoints = cityRecords.map(c => ({
      rawDate: new Date(c.timestamp),
      time: new Date(c.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      temperature: Number(c.temperature)
    })).sort((a,b) => a.rawDate.getTime() - b.rawDate.getTime()).slice(0, 15);
  }

  // 5. Automated Insight
  const avgTemp = Number(latestGlobal.temperature);
  const insightText = isNaN(avgTemp) 
    ? "Awaiting sensory data to generate predictive insights."
    : generateInsight(chartPoints, avgTemp);

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Section */}
        <section className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <ThermometerSun className="w-4 h-4" />
            <span className="text-sm font-medium tracking-wide uppercase">
              Global Climate Monitor
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
            Planetary{" "}
            <span className="text-transparent bg-clip-text from-blue-400 to-indigo-400">
              Operations Center
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Real-time planetary metrics leveraging high-altitude monitoring and atmospheric models.
          </p>
        </section>

        {/* AI Insight Bar */}
        <div className="bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-900/50 rounded-2xl p-5 shadow-[0_0_30px_rgba(59,130,246,0.05)] backdrop-blur-xl flex items-start sm:items-center gap-4 animate-[fadeIn_0.5s_ease-out]">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <Bot className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 block mb-1">
              Automated Insight
            </span>
            <p className="text-slate-200 font-medium leading-relaxed">
              {insightText}
            </p>
          </div>
        </div>

        {/* Hero KPIs - Global Aggregate */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900/50 border border-slate-800 p-6 transition-all hover:bg-slate-800/80 hover:border-slate-700">
            <div className="absolute inset-0 from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-400">
                <ThermometerSun className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
              Global Average
            </p>
            <p className="text-4xl font-black text-white tracking-tighter">
              {latestGlobal.temperature}°C
            </p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900/50 border border-slate-800 p-6 transition-all hover:bg-slate-800/80 hover:border-slate-700">
            <div className="absolute inset-0 from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                <Droplets className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
              Mean Humidity
            </p>
            <p className="text-4xl font-black text-white tracking-tighter">
              {latestGlobal.humidity}%
            </p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900/50 border border-slate-800 p-6 transition-all hover:bg-slate-800/80 hover:border-slate-700">
            <div className="absolute inset-0 from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-teal-500/10 rounded-2xl text-teal-400">
                <Wind className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
              Avg Wind Speed
            </p>
            <p className="text-4xl font-black text-white tracking-tighter">
              {latestGlobal.wind_speed} <span className="text-xl text-slate-500 font-semibold">km/h</span>
            </p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900/50 border border-slate-800 p-6 transition-all hover:bg-slate-800/80 hover:border-slate-700">
            <div className="absolute inset-0 from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                <MapPin className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
              Condition
            </p>
            <p className="text-3xl font-black text-white capitalize leading-tight">
              {latestGlobal.condition}
            </p>
          </div>
        </div>

        {/* Chart & Extremes Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Main Chart */}
          <section className="xl:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/40 p-6 relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Global Temperature (24h)
              </h2>
            </div>
            <div className="h-[300px] w-full relative z-10">
              <ClimateChart data={chartPoints} />
            </div>
          </section>

          {/* Extremes (Comparisons) Sidebar */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white px-2">Global Extremes</h2>
            
            <div className="grid grid-cols-2 xl:grid-cols-1 gap-4">
              {/* Hottest */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 hover:border-orange-500/30 transition-colors">
                <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Hottest City</p>
                  <p className="text-lg font-black text-slate-200 truncate capitalize">{hottest.city}</p>
                  <p className="text-orange-400 font-mono font-bold text-xl">{hottest.val}°C</p>
                </div>
              </div>

              {/* Coldest */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 hover:border-cyan-500/30 transition-colors">
                <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
                  <Snowflake className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Coldest City</p>
                  <p className="text-lg font-black text-slate-200 truncate capitalize">{coldest.city}</p>
                  <p className="text-cyan-400 font-mono font-bold text-xl">{coldest.val}°C</p>
                </div>
              </div>

              {/* Windiest */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 hover:border-teal-500/30 transition-colors">
                <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Windiest</p>
                  <p className="text-lg font-black text-slate-200 truncate capitalize">{windiest.city}</p>
                  <p className="text-teal-400 font-mono font-bold text-xl">{windiest.val} km/h</p>
                </div>
              </div>

              {/* Most Humid */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 hover:border-blue-500/30 transition-colors">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Most Humid</p>
                  <p className="text-lg font-black text-slate-200 truncate capitalize">{mostHumid.city}</p>
                  <p className="text-blue-400 font-mono font-bold text-xl">{mostHumid.val}%</p>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Data List for Reference */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/30 backdrop-blur-xl overflow-hidden mt-8">
          <div className="p-6 border-b border-slate-800/60 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Recent Records Explorer</h2>
          </div>
          <div className="divide-y divide-slate-800/30 max-h-[400px] overflow-y-auto">
            {climateData && climateData.length > 0 ? (
              climateData.slice(0, 50).map((record, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-slate-800/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-400">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-slate-200 font-bold capitalize tracking-wide">
                        {record.location_id === "global" ? "Global Aggregate" : record.location_id.replace(/_/g, " ")}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {new Date(record.timestamp).toLocaleString("en-US", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Temp</p>
                      <p className="font-mono font-bold text-slate-200">
                        {record.temperature}°C
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Humidity</p>
                      <p className="font-mono font-bold text-slate-200">
                        {record.humidity}%
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-slate-500">
                No climate data available yet. Make sure to run the collection agent.
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
