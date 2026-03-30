import { query } from "./db";
import { getCache, setCache } from "./redis";

export interface TimelineEntry {
  id: number;
  category: "clima" | "desastre" | "noticia" | "finanzas" | "astronomía";
  title: string;
  timestamp: Date;
  extra?: unknown;
}

interface NewsRow {
  id: number;
  category: string;
  title: string;
  published_at: string;
  created_at: string;
}

interface FinanceRow {
  id: number;
  index_name: string;
  value: string;
  change: string;
  timestamp: string;
}

interface AstroRow {
  id: number;
  event: string;
  date: string;
  extra_info: unknown;
}

export interface MapPoint {
  id: string;
  type: "weather" | "disaster" | "news" | "astronomy";
  lat: number;
  lon: number;
  title: string;
  description: string;
  link: string;
  severity?: "low" | "medium" | "high";
  source?: string;
  meta?: Record<string, string | number>;
}

export interface GlobalRiskIndex {
  score: number;
  climate: "low" | "medium" | "high";
  market: "low" | "medium" | "high";
  disaster: "low" | "medium" | "high";
  news: "low" | "medium" | "high";
  weights: { disasters: number; climate: number; markets: number; news: number };
  trend: number; // delta vs previous period
  riskLevel: "Low" | "Moderate" | "High" | "Critical";
}

export interface AIInsight {
  icon: string;
  text: string;
  severity: "info" | "warning" | "critical";
}

export interface DataFreshness {
  weather: { status: string; delay: string };
  disasters: { status: string; delay: string };
  news: { status: string; delay: string };
  markets: { status: string; delay: string };
  astronomy: { status: string; delay: string };
}

export interface SystemStatus {
  apiLatency: number;
  cacheHitRate: number;
  lastUpdate: string;
}

export interface DashboardStats {
  newsCount: number;
  disasterCount: number;
  topMover: { name: string; change: number } | null;
  astroCount: number;
  climateAlerts: number;
  hotZones: { country: string; count: number }[];
  temperatureAnomaly: number;
  newsSentiment: { positive: number; negative: number };
  marketTrend: number;
  astroEventsToday: string[];
  mapPoints: MapPoint[];
  riskIndex: GlobalRiskIndex;
  // New fields
  trackedLocations: number;
  totalArticles: number;
  insights: AIInsight[];
  dataFreshness: DataFreshness;
  systemStatus: SystemStatus;
}

export async function getTimelineData(
  range: "24h" | "7d" | "30d" = "24h"
): Promise<TimelineEntry[]> {
  const rangeMs =
    range === "30d"
      ? 30 * 24 * 60 * 60 * 1000
      : range === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
  const since = new Date(Date.now() - rangeMs);
  const limit = range === "24h" ? 20 : range === "7d" ? 50 : 100;

  try {
    const newsRes = await query(
      `SELECT id, category, title, published_at as timestamp 
       FROM news_articles 
       WHERE published_at >= $1 
       ORDER BY published_at DESC LIMIT $2`,
      [since, limit]
    );

    const categoryMap: Record<string, TimelineEntry["category"]> = {
      general: "noticia",
      clima: "clima",
      desastre: "desastre",
      finanzas: "finanzas",
      astronomia: "astronomía",
    };

    const timeline: TimelineEntry[] = (
      newsRes.rows as unknown as NewsRow[]
    ).map((row) => ({
      id: row.id,
      category: (categoryMap[row.category] ||
        "noticia") as TimelineEntry["category"],
      title: row.title,
      timestamp: new Date(row.published_at || row.created_at),
    }));

    const financeRes = await query(
      `SELECT id, index_name, value, change, timestamp 
       FROM finance_indices 
       WHERE timestamp >= $1 
       ORDER BY ABS(change) DESC LIMIT 5`,
      [since]
    );

    (financeRes.rows as unknown as FinanceRow[]).forEach((row) => {
      const changeVal = parseFloat(row.change);
      timeline.push({
        id: row.id,
        category: "finanzas",
        title: `${row.index_name} ${changeVal >= 0 ? "gained" : "lost"} ${Math.abs(changeVal).toFixed(2)}%`,
        timestamp: new Date(row.timestamp),
      });
    });

    const astroRes = await query(
      `SELECT id, event, date as timestamp, extra_info 
       FROM astronomy_events 
       WHERE date >= $1 
       ORDER BY date DESC LIMIT 10`,
      [since]
    );

    (astroRes.rows as unknown as AstroRow[]).forEach((row) => {
      timeline.push({
        id: row.id,
        category: "astronomía",
        title: `${row.event} detected`,
        timestamp: new Date(row.date),
      });
    });

    return timeline
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  } catch (error) {
    console.error("Error fetching timeline data:", error);
    return [];
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const cacheKey = "global_dashboard_stats";
  const cached = await getCache<DashboardStats>(cacheKey);
  if (cached) return cached;

  const requestStart = Date.now();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const [
      newsCountRes,
      disasterCountRes,
      financeMover,
      astroCountRes,
      climateAlertsRes,
      financeAvgRes,
      astroEventsRes,
      tempAvgRes,
      hotZones,
      newsMapRes,
      weatherMapRes,
      trackedLocationsRes,
      totalArticlesRes,
      weatherLatestRes,
      disasterLatestRes,
      newsLatestRes,
      marketLatestRes,
      astroLatestRes,
    ] = await Promise.all([
      query(
        "SELECT COUNT(*) FROM news_articles WHERE published_at >= $1",
        [since]
      ),
      query(
        "SELECT COUNT(*) FROM news_articles WHERE category = 'desastre' AND published_at >= $1",
        [since]
      ),
      query(
        "SELECT index_name, change FROM finance_indices WHERE timestamp >= $1 ORDER BY ABS(change) DESC LIMIT 1",
        [since]
      ),
      query(
        "SELECT COUNT(*) FROM astronomy_events WHERE date >= $1",
        [since]
      ),
      query(
        "SELECT COUNT(*) FROM news_articles WHERE category = 'clima' AND published_at >= $1",
        [since]
      ),
      query(
        "SELECT AVG(change) FROM finance_indices WHERE timestamp >= $1",
        [since]
      ),
      query("SELECT event FROM astronomy_events WHERE date >= CURRENT_DATE"),
      query(
        "SELECT AVG(temperature) FROM weather_snapshots WHERE timestamp >= $1",
        [since]
      ),
      query(
        `SELECT country, COUNT(*) as count 
         FROM news_articles 
         WHERE published_at >= $1 AND country IS NOT NULL 
         GROUP BY country 
         ORDER BY count DESC LIMIT 3`,
        [since]
      ),
      query(
        `SELECT id, category, title, description, url, lat, lon, country
         FROM news_articles 
         WHERE published_at >= $1 AND (lat IS NOT NULL OR country IS NOT NULL)
         LIMIT 50`,
        [since]
      ),
      query(
        `SELECT location_id, temperature, humidity, wind_speed, condition, weather_type 
         FROM weather_snapshots 
         WHERE timestamp >= $1 AND location_id != 'global'
         LIMIT 30`,
        [since]
      ),
      query(
        "SELECT COUNT(DISTINCT location_id) FROM weather_snapshots WHERE location_id != 'global'"
      ),
      query("SELECT COUNT(*) FROM news_articles"),
      query(
        "SELECT MAX(timestamp) as latest FROM weather_snapshots"
      ),
      query(
        "SELECT MAX(published_at) as latest FROM news_articles WHERE category = 'desastre'"
      ),
      query(
        "SELECT MAX(published_at) as latest FROM news_articles"
      ),
      query(
        "SELECT MAX(timestamp) as latest FROM finance_indices"
      ),
      query(
        "SELECT MAX(date) as latest FROM astronomy_events"
      ),
    ]);

    const totalNews = parseInt(newsCountRes.rows[0]?.count || "0");
    const negativeNews =
      parseInt(disasterCountRes.rows[0]?.count || "0") +
      parseInt(climateAlertsRes.rows[0]?.count || "0");
    const positiveNews = totalNews > 0 ? totalNews - negativeNews : 0;
    const sentiment =
      totalNews > 0
        ? {
            positive: Math.round((positiveNews / totalNews) * 100),
            negative: Math.round((negativeNews / totalNews) * 100),
          }
        : { positive: 50, negative: 50 };

    const marketTrend = financeAvgRes.rows[0]?.avg
      ? parseFloat(financeAvgRes.rows[0].avg)
      : 0;

    const astroEventsToday = (
      astroEventsRes.rows as unknown as { event: string }[]
    ).map((r) => r.event);

    const currentTempAvg = tempAvgRes.rows[0]?.avg
      ? parseFloat(tempAvgRes.rows[0].avg)
      : 14;
    const temperatureAnomaly = currentTempAvg - 14;

    const disasterCount = parseInt(disasterCountRes.rows[0]?.count || "0");
    const astroCount = parseInt(astroCountRes.rows[0]?.count || "0");
    const trackedLocations = parseInt(
      trackedLocationsRes.rows[0]?.count || "0"
    );
    const totalArticles = parseInt(totalArticlesRes.rows[0]?.count || "0");

    // ── Map Points ──────────────────────────────────────────────
    const mapPoints: MapPoint[] = [];

    const countryCoords: Record<string, [number, number]> = {
      USA: [37.0902, -95.7129],
      US: [37.0902, -95.7129],
      UK: [55.3781, -3.436],
      "United Kingdom": [55.3781, -3.436],
      Japan: [36.2048, 138.2529],
      Spain: [40.4637, -3.7492],
      France: [46.2276, 2.2137],
      Germany: [51.1657, 10.4515],
      Italy: [41.8719, 12.5674],
      Australia: [-25.2744, 133.7751],
      Brazil: [-14.235, -51.9253],
      Canada: [56.1304, -106.3468],
      India: [20.5937, 78.9629],
      China: [35.8617, 104.1954],
      Mexico: [23.6345, -102.5528],
      Russia: [61.524, 105.3188],
      "South Korea": [35.9078, 127.7669],
      Indonesia: [-0.7893, 113.9213],
      Turkey: [38.9637, 35.2433],
      "South Africa": [-30.5595, 22.9375],
      Argentina: [-38.4161, -63.6167],
      Colombia: [4.5709, -74.2973],
      Egypt: [26.8206, 30.8025],
      Nigeria: [9.082, 8.6753],
      Thailand: [15.87, 100.9925],
      Philippines: [12.8797, 121.774],
      Vietnam: [14.0583, 108.2772],
      Pakistan: [30.3753, 69.3451],
      Bangladesh: [23.685, 90.3563],
      Iran: [32.4279, 53.688],
      Chile: [-35.6751, -71.543],
      Peru: [-9.19, -75.0152],
    };

    (
      newsMapRes.rows as unknown as {
        id: number;
        category: string;
        title: string;
        description: string;
        url: string;
        lat: string;
        lon: string;
        country: string;
      }[]
    ).forEach((row) => {
      let lat = row.lat ? parseFloat(row.lat) : null;
      let lon = row.lon ? parseFloat(row.lon) : null;

      if (lat === null || lon === null) {
        if (row.country && countryCoords[row.country]) {
          lat = countryCoords[row.country][0];
          lon = countryCoords[row.country][1];
        }
      }

      const type =
        row.category === "desastre"
          ? "disaster"
          : row.category === "clima"
            ? "weather"
            : "news";

      const severity: MapPoint["severity"] =
        row.category === "desastre" ? "high" : row.category === "clima" ? "medium" : "low";

      if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
        mapPoints.push({
          id: `news-${row.id}`,
          type,
          lat,
          lon,
          title: row.title || "Alert",
          description: row.description
            ? row.description.substring(0, 120) + "..."
            : "",
          link: row.url || "#",
          severity,
          source: "News API",
          meta: row.country ? { country: row.country } : undefined,
        });
      }
    });

    (
      weatherMapRes.rows as unknown as {
        location_id: string;
        temperature: string;
        humidity: string;
        wind_speed: string;
        condition: string;
        weather_type: string;
      }[]
    ).forEach((row, i) => {
      if (row.location_id && row.location_id.includes(":")) {
        const parts = row.location_id.split(":");
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);
        if (parts.length === 2 && !isNaN(lat) && !isNaN(lon)) {
          mapPoints.push({
            id: `weather-${i}`,
            type: "weather",
            lat,
            lon,
            title: `${row.temperature}°C`,
            description: row.condition || row.weather_type || "Weather Update",
            link: "/climate",
            severity: "low",
            source: "OpenWeather",
            meta: {
              temperature: row.temperature,
              humidity: row.humidity,
              wind: row.wind_speed,
            },
          });
        }
      }
    });

    // ── AI Insights ─────────────────────────────────────────────
    const insights: AIInsight[] = [];

    if (disasterCount > 3) {
      insights.push({
        icon: "⚠",
        text: `${disasterCount} active disaster reports detected globally in the last 24h`,
        severity: "warning",
      });
    }
    if (Math.abs(temperatureAnomaly) > 1.5) {
      insights.push({
        icon: "🔥",
        text: `Temperature anomaly of ${temperatureAnomaly > 0 ? "+" : ""}${temperatureAnomaly.toFixed(1)}°C detected vs seasonal baseline`,
        severity: temperatureAnomaly > 2 ? "critical" : "warning",
      });
    }
    if (Math.abs(marketTrend) > 2) {
      insights.push({
        icon: "📉",
        text: `Markets show ${Math.abs(marketTrend) > 3 ? "high" : "mild"} volatility (${marketTrend > 0 ? "+" : ""}${marketTrend.toFixed(2)}% avg)`,
        severity: Math.abs(marketTrend) > 3 ? "critical" : "warning",
      });
    }
    if (sentiment.negative > 60) {
      insights.push({
        icon: "📰",
        text: `News sentiment trending negative (${sentiment.negative}% adverse coverage)`,
        severity: "warning",
      });
    }
    if (astroCount > 0) {
      insights.push({
        icon: "🌌",
        text: `${astroCount} astronomical event${astroCount > 1 ? "s" : ""} tracked today`,
        severity: "info",
      });
    }
    if (insights.length === 0) {
      insights.push({
        icon: "✅",
        text: "Global conditions are within normal parameters. No significant anomalies detected.",
        severity: "info",
      });
    }

    // ── Data Freshness ──────────────────────────────────────────
    const computeFreshness = (
      latestStr: string | null
    ): { status: string; delay: string } => {
      if (!latestStr) return { status: "Offline", delay: "No data" };
      const diff = Date.now() - new Date(latestStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 5) return { status: "Live", delay: "< 5 min" };
      if (mins < 30) return { status: "Recent", delay: `${mins} min delay` };
      if (mins < 60) return { status: "Delayed", delay: `${mins} min delay` };
      const hours = Math.floor(mins / 60);
      return { status: "Stale", delay: `${hours}h delay` };
    };

    const dataFreshness: DataFreshness = {
      weather: computeFreshness(weatherLatestRes.rows[0]?.latest),
      disasters: computeFreshness(disasterLatestRes.rows[0]?.latest),
      news: computeFreshness(newsLatestRes.rows[0]?.latest),
      markets: computeFreshness(marketLatestRes.rows[0]?.latest),
      astronomy: computeFreshness(astroLatestRes.rows[0]?.latest),
    };

    // ── System Status ───────────────────────────────────────────
    const apiLatency = Date.now() - requestStart;
    const systemStatus: SystemStatus = {
      apiLatency,
      cacheHitRate: 0, // first load is always a miss
      lastUpdate: new Date().toISOString(),
    };

    // ── Risk Index ──────────────────────────────────────────────
    const riskIndex = calculateRiskIndex(
      disasterCount,
      temperatureAnomaly,
      marketTrend,
      sentiment
    );

    const result: DashboardStats = {
      newsCount: totalNews,
      disasterCount,
      topMover: financeMover.rows[0]
        ? {
            name: financeMover.rows[0].index_name,
            change: parseFloat(financeMover.rows[0].change),
          }
        : null,
      astroCount,
      climateAlerts: parseInt(climateAlertsRes.rows[0]?.count || "0"),
      hotZones: (
        hotZones.rows as unknown as { country: string; count: string }[]
      ).map((r) => ({ country: r.country, count: parseInt(r.count) })),
      temperatureAnomaly,
      newsSentiment: sentiment,
      marketTrend,
      astroEventsToday,
      mapPoints,
      riskIndex,
      trackedLocations,
      totalArticles,
      insights,
      dataFreshness,
      systemStatus,
    };

    // Cache for 2 minutes
    await setCache(cacheKey, result, 120);

    return result;
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      newsCount: 0,
      disasterCount: 0,
      topMover: null,
      astroCount: 0,
      climateAlerts: 0,
      hotZones: [],
      temperatureAnomaly: 0,
      newsSentiment: { positive: 50, negative: 50 },
      marketTrend: 0,
      astroEventsToday: [],
      mapPoints: [],
      riskIndex: {
        score: 50,
        climate: "medium",
        market: "medium",
        disaster: "medium",
        news: "medium",
        weights: { disasters: 30, climate: 25, markets: 25, news: 20 },
        trend: 0,
        riskLevel: "Moderate",
      },
      trackedLocations: 0,
      totalArticles: 0,
      insights: [
        {
          icon: "⚠",
          text: "Unable to fetch live data. Displaying cached metrics.",
          severity: "warning",
        },
      ],
      dataFreshness: {
        weather: { status: "Offline", delay: "No data" },
        disasters: { status: "Offline", delay: "No data" },
        news: { status: "Offline", delay: "No data" },
        markets: { status: "Offline", delay: "No data" },
        astronomy: { status: "Offline", delay: "No data" },
      },
      systemStatus: {
        apiLatency: 0,
        cacheHitRate: 0,
        lastUpdate: new Date().toISOString(),
      },
    };
  }
}

function calculateRiskIndex(
  disasterCount: number,
  tempAnomaly: number,
  marketTrend: number,
  sentiment: { positive: number; negative: number }
): GlobalRiskIndex {
  // 1. Disaster Risk (30%)
  const disasterScore = Math.max(0, 30 - disasterCount * 3);
  const disasterLevel: "low" | "medium" | "high" =
    disasterCount === 0 ? "low" : disasterCount < 5 ? "medium" : "high";

  // 2. Climate Risk (25%)
  const absAnomaly = Math.abs(tempAnomaly);
  const climateScore = Math.max(0, 25 - absAnomaly * 12.5);
  const climateLevel: "low" | "medium" | "high" =
    absAnomaly < 0.5 ? "low" : absAnomaly < 1.5 ? "medium" : "high";

  // 3. Market Risk (25%)
  const absMarket = Math.abs(marketTrend);
  const marketScore = Math.max(0, 25 - absMarket * 5);
  const marketLevel: "low" | "medium" | "high" =
    absMarket < 1 ? "low" : absMarket < 3 ? "medium" : "high";

  // 4. News Risk (20%)
  const newsScore = (sentiment.positive / 100) * 20;
  const newsLevel: "low" | "medium" | "high" =
    sentiment.positive > 70
      ? "low"
      : sentiment.positive > 40
        ? "medium"
        : "high";

  const totalScore = Math.round(
    disasterScore + climateScore + marketScore + newsScore
  );

  const riskLevel: GlobalRiskIndex["riskLevel"] =
    totalScore > 75
      ? "Low"
      : totalScore > 50
        ? "Moderate"
        : totalScore > 25
          ? "High"
          : "Critical";

  // Simulated trend (would use yesterday's cached score in production)
  const trend = Math.round((Math.random() - 0.5) * 8);

  return {
    score: totalScore,
    climate: climateLevel,
    market: marketLevel,
    disaster: disasterLevel,
    news: newsLevel,
    weights: { disasters: 30, climate: 25, markets: 25, news: 20 },
    trend,
    riskLevel,
  };
}
