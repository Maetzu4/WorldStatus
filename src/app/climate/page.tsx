import {
  MapPin,
  Droplets,
  ThermometerSun,
  Wind,
  TrendingUp,
  Sun,
  Snowflake,
  Zap,
  Bot,
  Navigation,
  Gauge,
  CloudRain,
  Eye,
  Thermometer,
  ArrowUpDown,
  CloudSun,
} from "lucide-react";
import { query } from "@/lib/db";
import ClimateChart from "@/components/ClimateChart";
import TemperatureDistribution from "@/components/TemperatureDistribution";

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
      "SELECT * FROM weather_snapshots ORDER BY timestamp DESC LIMIT 500;",
    );
    return res.rows;
  } catch (error) {
    console.warn("Failed to fetch climate data:", error);
    return [];
  }
}

function generateInsights(
  chartPoints: { time: string; temperature: number }[],
  globalAvgTemp: number,
  extremes: {
    hottest: { city: string; val: number };
    coldest: { city: string; val: number };
    windiest: { city: string; val: number };
    mostHumid: { city: string; val: number };
  },
  thermalRange: number,
): { icon: string; text: string; severity: "info" | "warning" | "critical" }[] {
  const insights: {
    icon: string;
    text: string;
    severity: "info" | "warning" | "critical";
  }[] = [];

  if (chartPoints.length >= 2) {
    const oldest = chartPoints[0].temperature;
    const newest = chartPoints[chartPoints.length - 1].temperature;
    const delta = newest - oldest;
    const absDelta = Math.abs(delta).toFixed(1);

    if (Math.abs(delta) > 2) {
      insights.push({
        icon: delta > 0 ? "🔥" : "❄️",
        text: `Global temperatures have ${delta > 0 ? "risen" : "fallen"} by ${absDelta}°C over the tracking period`,
        severity: Math.abs(delta) > 4 ? "critical" : "warning",
      });
    }
  }

  if (globalAvgTemp > 25) {
    insights.push({
      icon: "🌡",
      text: "A warming pattern is highly noticeable today across monitored regions",
      severity: "warning",
    });
  } else if (globalAvgTemp < 10) {
    insights.push({
      icon: "❄️",
      text: "Widespread cooling continues across monitored hemispheres",
      severity: "info",
    });
  }

  if (extremes.hottest.val > 40) {
    insights.push({
      icon: "🔥",
      text: `Extreme heat detected in ${extremes.hottest.city.replace(/_/g, " ")} at ${extremes.hottest.val}°C`,
      severity: "critical",
    });
  }

  if (extremes.windiest.val > 50) {
    insights.push({
      icon: "🌬",
      text: `High wind speeds of ${extremes.windiest.val} km/h recorded in ${extremes.windiest.city.replace(/_/g, " ")}`,
      severity: "warning",
    });
  }

  if (thermalRange > 50) {
    insights.push({
      icon: "🌍",
      text: `Global thermal range of ${thermalRange}°C indicates significant climate diversity`,
      severity: "info",
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: "✅",
      text: "Global temperatures remain stable within normal tracking limits",
      severity: "info",
    });
  }

  return insights;
}

function computeAnomaly(currentAvg: number): { value: number; label: string } {
  // Seasonal baseline approximation (~14°C global average)
  const seasonalBaseline = 14;
  const anomaly = currentAvg - seasonalBaseline;
  return {
    value: anomaly,
    label:
      anomaly >= 0 ? `+${anomaly.toFixed(1)}°C` : `${anomaly.toFixed(1)}°C`,
  };
}

function computeForecast(
  chartPoints: { temperature: number }[],
  avgTemp: number,
  windAvg: number,
): { tempTrend: string; stormProb: string; windIntensity: string } {
  if (chartPoints.length < 2)
    return { tempTrend: "Stable", stormProb: "Low", windIntensity: "Stable" };

  const recent = chartPoints.slice(-5);
  const older = chartPoints.slice(0, 5);
  const recentAvg =
    recent.reduce((s, p) => s + p.temperature, 0) / recent.length;
  const olderAvg = older.reduce((s, p) => s + p.temperature, 0) / older.length;
  const delta = recentAvg - olderAvg;

  const tempTrend =
    delta > 0.5 ? "Rising" : delta < -0.5 ? "Falling" : "Stable";
  const stormProb =
    avgTemp > 28 && windAvg > 20 ? "High" : windAvg > 15 ? "Medium" : "Low";
  const windIntensity =
    windAvg > 25 ? "Increasing" : windAvg < 10 ? "Calm" : "Stable";

  return { tempTrend, stormProb, windIntensity };
}

export default async function ClimatePage() {
  const climateData = await getClimateData();

  // 1. Group latest snapshot per city
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
  let highestUV = { city: "N/A", val: -1 };
  let rainiest = { city: "N/A", val: "" };

  cityRecords.forEach((r) => {
    const t = Number(r.temperature);
    if (!isNaN(t)) {
      if (t > hottest.val) hottest = { city: r.location_id, val: t };
      if (t < coldest.val) coldest = { city: r.location_id, val: t };
    }
    const w = Number(r.wind_speed);
    if (!isNaN(w) && w > windiest.val)
      windiest = { city: r.location_id, val: w };
    const h = Number(r.humidity);
    if (!isNaN(h) && h > mostHumid.val)
      mostHumid = { city: r.location_id, val: h };
    const uv = Number(r.uvi);
    if (!isNaN(uv) && uv > highestUV.val)
      highestUV = { city: r.location_id, val: uv };
    if (
      r.weather_type?.toLowerCase().includes("rain") ||
      r.condition?.toLowerCase().includes("rain")
    ) {
      rainiest = { city: r.location_id, val: r.condition || r.weather_type };
    }
  });

  if (hottest.val === -999) hottest.val = 0;
  if (coldest.val === 999) coldest.val = 0;
  if (windiest.val === -1) windiest.val = 0;
  if (mostHumid.val === -1) mostHumid.val = 0;
  if (highestUV.val === -1) highestUV.val = 0;

  // 3. Global Stats
  let latestGlobal = climateData.find((r) => r.location_id === "global");
  if (!latestGlobal) {
    let tSum = 0,
      hSum = 0,
      wSum = 0,
      pSum = 0,
      uvSum = 0,
      count = 0;
    cityRecords.forEach((r) => {
      const t = Number(r.temperature);
      if (!isNaN(t)) {
        tSum += t;
        hSum += Number(r.humidity) || 0;
        wSum += Number(r.wind_speed) || 0;
        pSum += Number(r.pressure) || 0;
        uvSum += Number(r.uvi) || 0;
        count++;
      }
    });

    if (count > 0) {
      latestGlobal = {
        location_id: "global",
        timestamp: new Date(),
        temperature: (tSum / count).toFixed(1),
        humidity: Math.round(hSum / count),
        wind_speed: (wSum / count).toFixed(1),
        pressure: pSum > 0 ? Math.round(pSum / count) : "--",
        uvi: uvSum > 0 ? (uvSum / count).toFixed(1) : "--",
        weather_type: "computed",
        condition: "Computed Average",
        source: "system",
      };
    } else {
      latestGlobal = {
        location_id: "global",
        timestamp: new Date(),
        temperature: "--",
        humidity: "--",
        wind_speed: "--",
        pressure: "--",
        uvi: "--",
        weather_type: "unknown",
        condition: "Awaiting Data",
        source: "none",
      };
    }
  }

  // 4. Chart historical points
  let chartPoints: { rawDate: Date; time: string; temperature: number }[] = [];
  const globalHistory = climateData
    .filter((r) => r.location_id === "global")
    .map((r) => ({
      rawDate: new Date(r.timestamp),
      time: new Date(r.timestamp).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      temperature: Number(r.temperature),
    }))
    .reverse();

  if (globalHistory.length > 0) {
    chartPoints = globalHistory;
  } else if (cityRecords.length > 0) {
    chartPoints = cityRecords
      .map((c) => ({
        rawDate: new Date(c.timestamp),
        time: new Date(c.timestamp).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        temperature: Number(c.temperature),
      }))
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime())
      .slice(0, 15);
  }

  // 5. Additional metrics
  const avgTemp = Number(latestGlobal.temperature);
  const avgWind = Number(latestGlobal.wind_speed) || 0;
  const anomaly = !isNaN(avgTemp)
    ? computeAnomaly(avgTemp)
    : { value: 0, label: "--" };
  const thermalRange = hottest.val - coldest.val;
  const forecast = computeForecast(
    chartPoints,
    isNaN(avgTemp) ? 14 : avgTemp,
    avgWind,
  );

  // Temperature distribution bins
  const tempBins = {
    below0: 0,
    from0to10: 0,
    from10to20: 0,
    from20to30: 0,
    above30: 0,
  };
  cityRecords.forEach((r) => {
    const t = Number(r.temperature);
    if (isNaN(t)) return;
    if (t < 0) tempBins.below0++;
    else if (t < 10) tempBins.from0to10++;
    else if (t < 20) tempBins.from10to20++;
    else if (t < 30) tempBins.from20to30++;
    else tempBins.above30++;
  });

  // Rain probability approximated from weather types
  const rainCount = cityRecords.filter(
    (r) =>
      r.weather_type?.toLowerCase().includes("rain") ||
      r.condition?.toLowerCase().includes("rain") ||
      r.weather_type?.toLowerCase().includes("drizzle"),
  ).length;
  const rainProbability =
    cityRecords.length > 0
      ? Math.round((rainCount / cityRecords.length) * 100)
      : 0;

  // 6. Insights
  const insights = isNaN(avgTemp)
    ? [
        {
          icon: "⏳",
          text: "Awaiting sensory data to generate predictive insights.",
          severity: "info" as const,
        },
      ]
    : generateInsights(
        chartPoints,
        avgTemp,
        { hottest, coldest, windiest, mostHumid },
        thermalRange,
      );

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full">
      <div className="max-w-7xl mx-auto space-y-10">
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
            Real-time planetary metrics leveraging high-altitude monitoring and
            atmospheric models.
          </p>
        </section>

        {/* AI Insights Bar */}
        <section className="bg-slate-900/50 border border-blue-900/50 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-blue-400" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
              Automated Insights
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, i) => {
              const borderColor =
                insight.severity === "critical"
                  ? "border-red-500/30 bg-red-500/5"
                  : insight.severity === "warning"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-blue-500/30 bg-blue-500/5";
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${borderColor}`}
                >
                  <span className="text-lg mt-0.5">{insight.icon}</span>
                  <p className="text-sm text-slate-200 font-medium leading-snug">
                    {insight.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Hero KPIs - Global Aggregate */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <ClimateKPI
            icon={<ThermometerSun className="w-6 h-6" />}
            iconColor="text-orange-400"
            iconBg="bg-orange-500/10"
            label="Global Average"
            value={`${latestGlobal.temperature}°C`}
          />
          <ClimateKPI
            icon={<Droplets className="w-6 h-6" />}
            iconColor="text-blue-400"
            iconBg="bg-blue-500/10"
            label="Mean Humidity"
            value={`${latestGlobal.humidity}%`}
          />
          <ClimateKPI
            icon={<Wind className="w-6 h-6" />}
            iconColor="text-teal-400"
            iconBg="bg-teal-500/10"
            label="Avg Wind Speed"
            value={`${latestGlobal.wind_speed} km/h`}
          />
          <ClimateKPI
            icon={<Eye className="w-6 h-6" />}
            iconColor="text-yellow-400"
            iconBg="bg-yellow-500/10"
            label="UV Index"
            value={String(latestGlobal.uvi)}
            sub={
              Number(latestGlobal.uvi) > 6
                ? "High exposure"
                : Number(latestGlobal.uvi) > 3
                  ? "Moderate"
                  : "Low exposure"
            }
          />
          <ClimateKPI
            icon={<Gauge className="w-6 h-6" />}
            iconColor="text-indigo-400"
            iconBg="bg-indigo-500/10"
            label="Mean Pressure"
            value={`${latestGlobal.pressure} hPa`}
          />
          <ClimateKPI
            icon={<CloudRain className="w-6 h-6" />}
            iconColor="text-cyan-400"
            iconBg="bg-cyan-500/10"
            label="Rain Probability"
            value={`${rainProbability}%`}
          />
        </div>

        {/* Anomaly + Thermal Range + Forecast + Cities Tracked Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Climate Anomaly */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-orange-500/30 transition-colors">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full -translate-y-10 translate-x-10 blur-2xl" />
            <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-widest block mb-3">
              Temperature Anomaly
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-4xl font-black tracking-tighter ${
                  anomaly.value >= 0 ? "text-orange-400" : "text-cyan-400"
                }`}
              >
                {anomaly.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              vs seasonal average (14°C)
            </p>
          </div>

          {/* Thermal Range */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full -translate-y-10 translate-x-10 blur-2xl" />
            <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-widest block mb-3">
              <ArrowUpDown className="w-3 h-3 inline mr-1" />
              Thermal Range
            </span>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Min</span>
                <span className="font-bold text-cyan-400">{coldest.val}°C</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Max</span>
                <span className="font-bold text-orange-400">
                  {hottest.val}°C
                </span>
              </div>
              <div className="h-px bg-slate-700 my-1" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Range</span>
                <span className="font-extrabold text-white">
                  {thermalRange.toFixed(1)}°C
                </span>
              </div>
            </div>
          </div>

          {/* Global Forecast */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full -translate-y-10 translate-x-10 blur-2xl" />
            <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-widest block mb-3">
              <CloudSun className="w-3 h-3 inline mr-1" />
              Forecast (Next 24h)
            </span>
            <div className="space-y-2">
              <ForecastRow label="Temp Trend" value={forecast.tempTrend} />
              <ForecastRow label="Storm Prob." value={forecast.stormProb} />
              <ForecastRow label="Wind" value={forecast.windIntensity} />
            </div>
          </div>

          {/* Tracked Cities */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
            <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full -translate-y-10 translate-x-10 blur-2xl" />
            <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-widest block mb-3">
              <MapPin className="w-3 h-3 inline mr-1" />
              Tracking Coverage
            </span>
            <p className="text-4xl font-black text-white tracking-tighter">
              {cityRecords.length}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Monitored cities worldwide
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
                Global Temperature Trend
              </h2>
            </div>
            <div className="h-[300px] w-full relative z-10">
              <ClimateChart data={chartPoints} />
            </div>
          </section>

          {/* Extremes Sidebar */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white px-2">
              Global Extremes
            </h2>

            <div className="grid grid-cols-2 xl:grid-cols-1 gap-3">
              <ExtremeCard
                icon={<Sun className="w-5 h-5" />}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
                label="Hottest City"
                city={hottest.city}
                value={`${hottest.val}°C`}
                valueColor="text-orange-400"
                hoverBorder="hover:border-orange-500/30"
              />
              <ExtremeCard
                icon={<Snowflake className="w-5 h-5" />}
                iconBg="bg-cyan-500/10"
                iconColor="text-cyan-400"
                label="Coldest City"
                city={coldest.city}
                value={`${coldest.val}°C`}
                valueColor="text-cyan-400"
                hoverBorder="hover:border-cyan-500/30"
              />
              <ExtremeCard
                icon={<Navigation className="w-5 h-5" />}
                iconBg="bg-teal-500/10"
                iconColor="text-teal-400"
                label="Windiest"
                city={windiest.city}
                value={`${windiest.val} km/h`}
                valueColor="text-teal-400"
                hoverBorder="hover:border-teal-500/30"
              />
              <ExtremeCard
                icon={<Droplets className="w-5 h-5" />}
                iconBg="bg-blue-500/10"
                iconColor="text-blue-400"
                label="Most Humid"
                city={mostHumid.city}
                value={`${mostHumid.val}%`}
                valueColor="text-blue-400"
                hoverBorder="hover:border-blue-500/30"
              />
              <ExtremeCard
                icon={<Eye className="w-5 h-5" />}
                iconBg="bg-yellow-500/10"
                iconColor="text-yellow-400"
                label="Highest UV"
                city={highestUV.city}
                value={String(highestUV.val)}
                valueColor="text-yellow-400"
                hoverBorder="hover:border-yellow-500/30"
              />
              {rainiest.val && (
                <ExtremeCard
                  icon={<CloudRain className="w-5 h-5" />}
                  iconBg="bg-cyan-500/10"
                  iconColor="text-cyan-400"
                  label="Rainiest"
                  city={rainiest.city}
                  value={String(rainiest.val)}
                  valueColor="text-cyan-400"
                  hoverBorder="hover:border-cyan-500/30"
                />
              )}
            </div>
          </section>
        </div>

        {/* Temperature Distribution */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
          <h2 className="text-xl font-bold flex items-center gap-2 text-white mb-6 relative z-10">
            <Thermometer className="w-5 h-5 text-indigo-400" />
            Temperature Distribution
          </h2>
          <div className="h-[250px] w-full relative z-10">
            <TemperatureDistribution bins={tempBins} />
          </div>
        </section>

        {/* Data List (Recent Records Explorer) */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/30 backdrop-blur-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800/60 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">
              Recent Records Explorer
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Showing latest {Math.min(climateData.length, 50)} records
            </span>
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
                        {record.location_id === "global"
                          ? "Global Aggregate"
                          : record.location_id.replace(/_/g, " ")}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {new Date(record.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Temp
                      </p>
                      <p className="font-mono font-bold text-slate-200">
                        {record.temperature}°C
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Humidity
                      </p>
                      <p className="font-mono font-bold text-slate-200">
                        {record.humidity}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Wind
                      </p>
                      <p className="font-mono font-bold text-slate-200">
                        {record.wind_speed} km/h
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-slate-500">
                No climate data available yet. Make sure to run the collection
                agent.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ──────────────────────── Sub-components ──────────────────────── */

function ClimateKPI({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="relative group overflow-hidden rounded-2xl bg-slate-900/50 border border-slate-800 p-5 transition-all hover:bg-slate-800/80 hover:border-slate-700">
      <div className={`p-2.5 ${iconBg} rounded-xl ${iconColor} w-fit mb-3`}>
        {icon}
      </div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-2xl font-black text-white tracking-tighter">{value}</p>
      {sub && (
        <p className="text-xs text-slate-500 mt-0.5 font-medium">{sub}</p>
      )}
    </div>
  );
}

function ExtremeCard({
  icon,
  iconBg,
  iconColor,
  label,
  city,
  value,
  valueColor,
  hoverBorder,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  city: string;
  value: string;
  valueColor: string;
  hoverBorder: string;
}) {
  return (
    <div
      className={`bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 ${hoverBorder} transition-colors`}
    >
      <div className={`p-2.5 ${iconBg} rounded-xl ${iconColor}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
          {label}
        </p>
        <p className="text-sm font-black text-slate-200 truncate capitalize">
          {city.replace(/_/g, " ")}
        </p>
        <p className={`${valueColor} font-mono font-bold text-lg`}>{value}</p>
      </div>
    </div>
  );
}

function ForecastRow({ label, value }: { label: string; value: string }) {
  const color =
    value === "Rising" || value === "High" || value === "Increasing"
      ? "text-orange-400"
      : value === "Falling" || value === "Low" || value === "Calm"
        ? "text-emerald-400"
        : "text-amber-400";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}
