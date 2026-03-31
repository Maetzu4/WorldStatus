import { query } from "./db";
import { getCache, setCache } from "./redis";

export interface TimelineEntry {
  id: number;
  category: "weather" | "disaster" | "news" | "finance" | "astronomy";
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
  weights: {
    disasters: number;
    climate: number;
    markets: number;
    news: number;
  };
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
  marketSentiment: { label: string; advancers: number; decliners: number };
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
  range: "24h" | "7d" | "30d" = "24h",
): Promise<TimelineEntry[]> {
  const limit = range === "24h" ? 50 : range === "7d" ? 100 : 200;

  const categoryMap: Record<string, TimelineEntry["category"]> = {
    general: "news",
    clima: "weather",
    desastre: "disaster",
    finanzas: "finance",
    astronomia: "astronomy",
  };

  const timeline: TimelineEntry[] = [];

  // --- News (independent) ---
  try {
    const newsRes = await query(
      `SELECT id, category, title, published_at, created_at
       FROM news_articles
       ORDER BY published_at DESC NULLS LAST LIMIT $1`,
      [limit],
    );

    (newsRes.rows as unknown as NewsRow[]).forEach((row) => {
      timeline.push({
        id: row.id,
        category: (categoryMap[row.category] ||
          "news") as TimelineEntry["category"],
        title: row.title,
        timestamp: new Date(row.published_at || row.created_at),
      });
    });
  } catch (error) {
    console.error("Timeline: Error fetching news:", error);
  }

  // --- Disasters (independent) ---
  try {
    const disasterRes = await query(
      `SELECT id, title, published_at, created_at
       FROM disaster_events
       ORDER BY published_at DESC NULLS LAST LIMIT $1`,
      [limit],
    );

    (
      disasterRes.rows as unknown as {
        id: number;
        title: string;
        published_at: string;
        created_at: string;
      }[]
    ).forEach((row) => {
      timeline.push({
        id: row.id + 900000,
        category: "disaster",
        title: row.title,
        timestamp: new Date(row.published_at || row.created_at),
      });
    });
  } catch (error) {
    console.error("Timeline: Error fetching disasters:", error);
  }

  // --- Finance (independent) ---
  try {
    const financeRes = await query(
      `SELECT id, index_name, value, change, timestamp
       FROM finance_indices
       ORDER BY timestamp DESC NULLS LAST LIMIT 10`,
    );

    (financeRes.rows as unknown as FinanceRow[]).forEach((row) => {
      const changeVal = parseFloat(row.change);
      timeline.push({
        id: row.id,
        category: "finance",
        title: `${row.index_name} ${changeVal >= 0 ? "gained" : "lost"} ${Math.abs(changeVal).toFixed(2)}%`,
        timestamp: new Date(row.timestamp),
      });
    });
  } catch (error) {
    console.error("Timeline: Error fetching finance:", error);
  }

  // --- Astronomy (independent) ---
  try {
    const astroRes = await query(
      `SELECT id, event, date, extra_info
       FROM astronomy_events
       ORDER BY date DESC NULLS LAST LIMIT 10`,
    );

    (astroRes.rows as unknown as AstroRow[]).forEach((row) => {
      const eventDate = new Date(row.date);
      // Skip dates that are clearly invalid (before year 2000)
      if (eventDate.getFullYear() < 2000) return;
      timeline.push({
        id: row.id,
        category: "astronomy",
        title: `${row.event} detected`,
        timestamp: eventDate,
      });
    });
  } catch (error) {
    console.error("Timeline: Error fetching astronomy:", error);
  }

  // --- Weather alerts as timeline entries (independent) ---
  try {
    const weatherRes = await query(
      `SELECT location_id, temperature, weather_type, timestamp
       FROM weather_snapshots
       WHERE location_id != 'global'
       ORDER BY timestamp DESC NULLS LAST LIMIT 10`,
    );

    (
      weatherRes.rows as unknown as {
        location_id: string;
        temperature: string;
        weather_type: string;
        timestamp: string;
      }[]
    ).forEach((row, i) => {
      const temp = parseFloat(row.temperature);
      if (isNaN(temp)) return;
      timeline.push({
        id: 100000 + i,
        category: "weather",
        title: `${row.location_id.replace(/_/g, " ")} — ${temp}°C, ${row.weather_type || "update"}`,
        timestamp: new Date(row.timestamp),
      });
    });
  } catch (error) {
    console.error("Timeline: Error fetching weather:", error);
  }

  return timeline
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const cacheKey = "global_dashboard_stats";
  const cached = await getCache<DashboardStats>(cacheKey);
  if (cached) return cached;

  const requestStart = Date.now();

  // Safe query wrapper — returns empty rows on failure instead of throwing
  const safeQuery = async (text: string, params?: unknown[]) => {
    try {
      return await query(text, params);
    } catch (error) {
      console.error(`Dashboard query failed: ${text.slice(0, 80)}...`, error);
      return { rows: [] as Record<string, unknown>[], rowCount: 0 };
    }
  };

  // Run all queries in parallel — each one is independent
  const [
    newsCountRes,
    disasterCountRes,
    financeMover,
    astroCountRes,
    climateAlertsRes,
    financeAvgRes,
    astroEventsRes,
    tempAvgRes,
    hotZonesRes,
    newsMapRes,
    weatherMapRes,
    trackedLocationsRes,
    totalArticlesRes,
    weatherLatestRes,
    disasterLatestRes,
    newsLatestRes,
    marketLatestRes,
    astroLatestRes,
    newsImpactRes,
    marketBreadthRes,
  ] = await Promise.all([
    safeQuery("SELECT COUNT(*) FROM news_articles"),
    safeQuery("SELECT COUNT(*) FROM disaster_events"),
    safeQuery(
      "SELECT index_name, change FROM finance_indices ORDER BY ABS(change) DESC LIMIT 1",
    ),
    safeQuery("SELECT COUNT(*) FROM astronomy_events"),
    safeQuery("SELECT COUNT(*) FROM news_articles WHERE category = 'clima'"),
    safeQuery("SELECT AVG(change) FROM finance_indices"),
    safeQuery("SELECT event FROM astronomy_events ORDER BY date DESC LIMIT 5"),
    safeQuery("SELECT AVG(temperature) FROM weather_snapshots"),
    safeQuery(
      `SELECT country, COUNT(*) as count
       FROM news_articles
       WHERE country IS NOT NULL
       GROUP BY country
       ORDER BY count DESC LIMIT 3`,
    ),
    safeQuery(
      `SELECT id, category, title, description, url, lat, lon, country
       FROM news_articles
       WHERE lat IS NOT NULL OR country IS NOT NULL
       ORDER BY published_at DESC NULLS LAST
       LIMIT 50`,
    ),
    safeQuery(
      `SELECT location_id, temperature, humidity, wind_speed, weather_type
       FROM weather_snapshots
       WHERE location_id != 'global'
       ORDER BY timestamp DESC
       LIMIT 30`,
    ),
    safeQuery(
      "SELECT COUNT(DISTINCT location_id) FROM weather_snapshots WHERE location_id != 'global'",
    ),
    safeQuery("SELECT COUNT(*) FROM news_articles"),
    safeQuery("SELECT MAX(timestamp) as latest FROM weather_snapshots"),
    safeQuery("SELECT MAX(published_at) as latest FROM disaster_events"),
    safeQuery("SELECT MAX(published_at) as latest FROM news_articles"),
    safeQuery("SELECT MAX(timestamp) as latest FROM finance_indices"),
    safeQuery("SELECT MAX(date) as latest FROM astronomy_events"),
    safeQuery("SELECT MAX(impact_score) as max_impact FROM news_events WHERE created_at > NOW() - INTERVAL '24 hours'"),
    safeQuery(
      `SELECT
         SUM(CASE WHEN change > 0.01 THEN 1 ELSE 0 END) as advancers,
         SUM(CASE WHEN change < -0.01 THEN 1 ELSE 0 END) as decliners
       FROM (
         SELECT DISTINCT ON (index_name) change
         FROM finance_indices
         ORDER BY index_name, timestamp DESC
       ) latest`,
    ),
  ]);

  const totalNews = parseInt((newsCountRes.rows[0]?.count as string) || "0");
  const negativeNews =
    parseInt((disasterCountRes.rows[0]?.count as string) || "0") +
    parseInt((climateAlertsRes.rows[0]?.count as string) || "0");
  const positiveNews = totalNews > 0 ? totalNews - negativeNews : 0;
  const sentiment =
    totalNews > 0
      ? {
          positive: Math.round((positiveNews / totalNews) * 100),
          negative: Math.round((negativeNews / totalNews) * 100),
        }
      : { positive: 50, negative: 50 };

  const marketTrend = financeAvgRes.rows[0]?.avg
    ? parseFloat(financeAvgRes.rows[0].avg as string)
    : 0;

  const astroEventsToday = (
    astroEventsRes.rows as unknown as { event: string }[]
  ).map((r) => r.event);

  const currentTempAvg = tempAvgRes.rows[0]?.avg
    ? parseFloat(tempAvgRes.rows[0].avg as string)
    : 14;
  const temperatureAnomaly = currentTempAvg - 14;

  const disasterCount = parseInt(
    (disasterCountRes.rows[0]?.count as string) || "0",
  );
  const astroCount = parseInt((astroCountRes.rows[0]?.count as string) || "0");
  const trackedLocations = parseInt(
    (trackedLocationsRes.rows[0]?.count as string) || "0",
  );
  const totalArticles = parseInt(
    (totalArticlesRes.rows[0]?.count as string) || "0",
  );
  
  const newsImpactScore = parseInt(
    (newsImpactRes.rows[0]?.max_impact as string) || "0",
  );

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
      row.category === "disaster"
        ? "disaster"
        : row.category === "weather"
          ? "weather"
          : "news";

    const severity: MapPoint["severity"] =
      row.category === "disaster"
        ? "high"
        : row.category === "weather"
          ? "medium"
          : "low";

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

  const cityCoords: Record<string, [number, number]> = {
    New_York: [40.7128, -74.006],
    London: [51.5074, -0.1278],
    Tokyo: [35.6762, 139.6503],
    Paris: [48.8566, 2.3522],
    Sydney: [-33.8688, 151.2093],
    Dubai: [25.2048, 55.2708],
    Singapore: [1.3521, 103.8198],
    Hong_Kong: [22.3193, 114.1694],
    Berlin: [52.52, 13.405],
    Madrid: [40.4168, -3.7038],
    Rome: [41.9028, 12.4964],
    Moscow: [55.7558, 37.6173],
    Beijing: [39.9042, 116.4074],
    Shanghai: [31.2304, 121.4737],
    Cairo: [30.0444, 31.2357],
    Johannesburg: [-26.2041, 28.0473],
    Cape_Town: [-33.9249, 18.4241],
    Lagos: [6.5244, 3.3792],
    Nairobi: [-1.2921, 36.8219],
    Rio_de_Janeiro: [-22.9068, -43.1729],
    Sao_Paulo: [-23.5505, -46.6333],
    Buenos_Aires: [-34.6037, -58.3816],
    Santiago: [-33.4489, -70.6693],
    Lima: [-12.0464, -77.0428],
    Bogota: [4.711, -74.0721],
    Mexico_City: [19.4326, -99.1332],
    Toronto: [43.651, -79.347],
    Vancouver: [49.2827, -123.1207],
    Los_Angeles: [34.0522, -118.2437],
    Chicago: [41.8781, -87.6298],
    Miami: [25.7617, -80.1918],
    Seoul: [37.5665, 126.978],
    Mumbai: [19.076, 72.8777],
    Delhi: [28.7041, 77.1025],
    Bangkok: [13.7563, 100.5018],
    Jakarta: [-6.2088, 106.8456],
    Manila: [14.5995, 120.9842],
    Kuala_Lumpur: [3.139, 101.6869],
    Istanbul: [41.0082, 28.9784],
    Tehran: [35.6892, 51.389],
    Riyadh: [24.7136, 46.6753],
    Stockholm: [59.3293, 18.0686],
    Oslo: [59.9139, 10.7522],
    Copenhagen: [55.6761, 12.5683],
    Amsterdam: [52.3676, 4.9041],
    Brussels: [50.8503, 4.3517],
    Vienna: [48.2082, 16.3738],
    Zurich: [47.3769, 8.5417],
    Athens: [37.9838, 23.7275],
    Lisbon: [38.7223, -9.1393],
  };

  (
    weatherMapRes.rows as unknown as {
      location_id: string;
      temperature: string;
      humidity: string;
      wind_speed: string;
      weather_type: string;
    }[]
  ).forEach((row, i) => {
    let lat: number | null = null;
    let lon: number | null = null;

    if (row.location_id && row.location_id.includes(":")) {
      const parts = row.location_id.split(":");
      lat = parseFloat(parts[0]);
      lon = parseFloat(parts[1]);
    } else if (row.location_id && cityCoords[row.location_id]) {
      lat = cityCoords[row.location_id][0];
      lon = cityCoords[row.location_id][1];
    }

    if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
      mapPoints.push({
        id: `weather-${i}-${row.location_id}`,
        type: "weather",
        lat,
        lon,
        title: `${row.location_id.replace(/_/g, " ")}: ${row.temperature}°C`,
        description: row.weather_type || "Weather Update",
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
  });

  // ── AI Insights ─────────────────────────────────────────────
  const insights: AIInsight[] = [];

  if (disasterCount > 3) {
    insights.push({
      icon: "⚠",
      text: `${disasterCount} active disaster reports detected globally`,
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
  // Market breadth data
  const advancers = parseInt((marketBreadthRes.rows[0]?.advancers as string) || "0");
  const decliners = parseInt((marketBreadthRes.rows[0]?.decliners as string) || "0");
  const totalIndices = advancers + decliners;
  const marketSentimentLabel = totalIndices === 0 ? "Neutral" : advancers > decliners ? "Bullish" : advancers < decliners ? "Bearish" : "Neutral";

  if (Math.abs(marketTrend) > 2) {
    insights.push({
      icon: "📉",
      text: `Markets show ${Math.abs(marketTrend) > 3 ? "high" : "mild"} volatility (${marketTrend > 0 ? "+" : ""}${marketTrend.toFixed(2)}% avg) — ${marketSentimentLabel} sentiment`,
      severity: Math.abs(marketTrend) > 3 ? "critical" : "warning",
    });
  }
  if (decliners > 0 && advancers === 0) {
    insights.push({
      icon: "🔴",
      text: "All tracked market indices declining — broad selloff detected",
      severity: "critical",
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
      text: `${astroCount} astronomical event${astroCount > 1 ? "s" : ""} tracked`,
      severity: "info",
    });
  }
  if (totalArticles > 0) {
    insights.push({
      icon: "📰",
      text: `${totalArticles} news articles collected across all categories`,
      severity: "info",
    });
  }
  if (trackedLocations > 0) {
    insights.push({
      icon: "🌍",
      text: `Monitoring ${trackedLocations} locations worldwide`,
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
    latestStr: string | null | undefined,
  ): { status: string; delay: string } => {
    if (!latestStr) return { status: "Offline", delay: "No data" };
    const diff = Date.now() - new Date(latestStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 5) return { status: "Live", delay: "< 5 min" };
    if (mins < 30) return { status: "Recent", delay: `${mins} min delay` };
    if (mins < 60) return { status: "Delayed", delay: `${mins} min delay` };
    const hours = Math.floor(mins / 60);
    if (hours < 24) return { status: "Stale", delay: `${hours}h delay` };
    const days = Math.floor(hours / 24);
    return { status: "Stale", delay: `${days}d delay` };
  };

  const dataFreshness: DataFreshness = {
    weather: computeFreshness(
      weatherLatestRes.rows[0]?.latest as string | null,
    ),
    disasters: computeFreshness(
      disasterLatestRes.rows[0]?.latest as string | null,
    ),
    news: computeFreshness(newsLatestRes.rows[0]?.latest as string | null),
    markets: computeFreshness(marketLatestRes.rows[0]?.latest as string | null),
    astronomy: computeFreshness(
      astroLatestRes.rows[0]?.latest as string | null,
    ),
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
    sentiment,
    newsImpactScore
  );

  const result: DashboardStats = {
    newsCount: totalNews,
    disasterCount,
    topMover: financeMover.rows[0]
      ? {
          name: (
            financeMover.rows[0] as unknown as {
              index_name: string;
              change: string;
            }
          ).index_name,
          change: parseFloat(
            (
              financeMover.rows[0] as unknown as {
                index_name: string;
                change: string;
              }
            ).change,
          ),
        }
      : null,
    astroCount,
    climateAlerts: parseInt((climateAlertsRes.rows[0]?.count as string) || "0"),
    hotZones: (
      hotZonesRes.rows as unknown as { country: string; count: string }[]
    ).map((r) => ({ country: r.country, count: parseInt(r.count) })),
    temperatureAnomaly,
    newsSentiment: sentiment,
    marketTrend,
    marketSentiment: { label: marketSentimentLabel, advancers, decliners },
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
}

function calculateRiskIndex(
  disasterCount: number,
  tempAnomaly: number,
  marketTrend: number,
  sentiment: { positive: number; negative: number },
  newsImpactScore: number = 0
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

  // 4. News Risk (20%) - Impact based + Sentiment
  const baseNewsRisk = 20 - ((newsImpactScore / 100) * 15); // max 15 points lost due to raw impact
  const sentimentBonus = (sentiment.positive / 100) * 5; // up to 5 points back for positive sentiment
  const newsScore = Math.max(0, baseNewsRisk + sentimentBonus);
  
  const newsLevel: "low" | "medium" | "high" =
    newsImpactScore > 70 ? "high" : (newsImpactScore > 40 || sentiment.negative > 60) ? "medium" : "low";

  const totalScore = Math.round(
    disasterScore + climateScore + marketScore + newsScore,
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
