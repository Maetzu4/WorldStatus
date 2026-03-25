import { query } from "./db";

export interface TimelineEntry {
  id: number;
  category: "climate" | "disaster" | "news" | "finance" | "astronomy";
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

export interface DashboardStats {
  newsCount: number;
  disasterCount: number;
  topMover: { name: string; change: number } | null;
  astroCount: number;
  climateAlerts: number;
  hotZones: { country: string; count: number }[];
  tempAnomaly: number;
  newsSentiment: number; // 0 to 100
  marketTrend: number;
  disasterSeverity: number; // 0 to 5
}

export async function getTimelineData(): Promise<TimelineEntry[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // Fetch News (includes General, Climate, Disaster, Finance, Astronomy)
    const newsRes = await query(
      `SELECT id, category, title, published_at as timestamp 
       FROM news_articles 
       WHERE published_at >= $1 
       ORDER BY published_at DESC LIMIT 30`,
      [since]
    );

    // Map DB categories to UI categories (English)
    const categoryMap: Record<string, TimelineEntry["category"]> = {
      general: "news",
      clima: "climate",
      desastre: "disaster",
      finanzas: "finance",
      astronomia: "astronomy",
    };

    const timeline: TimelineEntry[] = (newsRes.rows as unknown as NewsRow[])
      .map((row) => {
        const date = new Date(row.published_at || row.created_at);
        if (isNaN(date.getTime())) return null; // Skip invalid dates
        return {
          id: row.id,
          category: (categoryMap[row.category] ||
            "news") as TimelineEntry["category"],
          title: row.title,
          timestamp: date,
        };
      })
      .filter((item): item is TimelineEntry => item !== null);

    // Fetch Finance specifically if significant
    const financeRes = await query(
      `SELECT id, index_name, value, change, timestamp 
       FROM finance_indices 
       WHERE timestamp >= $1 
       ORDER BY ABS(change) DESC LIMIT 5`,
      [since]
    );

    (financeRes.rows as unknown as FinanceRow[]).forEach((row) => {
      const changeVal = parseFloat(row.change);
      const date = new Date(row.timestamp);
      if (isNaN(date.getTime())) return;
      timeline.push({
        id: row.id,
        category: "finance",
        title: `${row.index_name} ${changeVal >= 0 ? "gained" : "lost"} ${Math.abs(changeVal)}%`,
        timestamp: date,
      });
    });

    // Fetch Astronomy events
    const astroRes = await query(
      `SELECT id, event, date as timestamp, extra_info 
       FROM astronomy_events 
       WHERE date >= $1 
       ORDER BY date DESC LIMIT 10`,
      [since]
    );

    (astroRes.rows as unknown as AstroRow[]).forEach((row) => {
      const date = new Date(row.date);
      if (isNaN(date.getTime())) return;
      timeline.push({
        id: row.id,
        category: "astronomy",
        title: `${row.event} detected`,
        timestamp: date,
      });
    });

    // Sort by timestamp desc and de-duplicate or just limit
    return timeline
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);
  } catch (error) {
    console.error("Error fetching timeline data:", error);
    return [];
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const newsCount = await query("SELECT COUNT(*) FROM news_articles WHERE published_at >= $1", [since]);
    const disasterCount = await query("SELECT COUNT(*) FROM news_articles WHERE category = 'desastre' AND published_at >= $1", [since]);
    const financeMover = await query("SELECT index_name, change FROM finance_indices WHERE timestamp >= $1 ORDER BY ABS(change) DESC LIMIT 1", [since]);
    const astroCount = await query("SELECT COUNT(*) FROM astronomy_events WHERE date >= $1", [since]);
    const climateAlerts = await query("SELECT COUNT(*) FROM news_articles WHERE category = 'clima' AND published_at >= $1", [since]);
    const hotZones = await query(
      `SELECT country, COUNT(*) as count 
       FROM news_articles 
       WHERE published_at >= $1 AND country IS NOT NULL 
       GROUP BY country 
       ORDER BY count DESC LIMIT 3`,
      [since]
    );

    // Calculate new metrics
    const marketTrend = await query("SELECT AVG(change) as trend FROM finance_indices WHERE timestamp >= $1", [since]);
    const maxSeverity = await query("SELECT MAX(severity) as severity FROM news_articles WHERE category = 'desastre' AND published_at >= $1", [since]);
    
    // Mock global temperature anomaly for now (+1.48 as a realistic reference)
    const tempAnomaly = 1.48;
    // Mock sentiment (randomized for visual variety in a range that looks realistic)
    const newsSentiment = Math.floor(Math.random() * 20) + 65; 

    return {
      newsCount: parseInt(newsCount.rows[0].count),
      disasterCount: parseInt(disasterCount.rows[0].count),
      topMover: financeMover.rows[0] ? { name: financeMover.rows[0].index_name, change: parseFloat(financeMover.rows[0].change) } : null,
      astroCount: parseInt(astroCount.rows[0].count),
      climateAlerts: parseInt(climateAlerts.rows[0].count),
      hotZones: (hotZones.rows as unknown as { country: string; count: string }[]).map((r) => ({ country: r.country, count: parseInt(r.count) })),
      tempAnomaly,
      newsSentiment,
      marketTrend: parseFloat(marketTrend.rows[0].trend || "0"),
      disasterSeverity: parseInt(maxSeverity.rows[0].severity || "0"),
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      newsCount: 0,
      disasterCount: 0,
      topMover: null,
      astroCount: 0,
      climateAlerts: 0,
      hotZones: [],
      tempAnomaly: 0,
      newsSentiment: 0,
      marketTrend: 0,
      disasterSeverity: 0,
    };
  }
}

export interface MapPoint {
  id: string;
  type: "weather" | "disaster" | "news";
  lat: number;
  lon: number;
  title: string;
  description: string;
  link: string;
}

export async function getMapPoints(): Promise<MapPoint[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const newsRes = await query(
      `SELECT id, category, title, description, lat, lon 
       FROM news_articles 
       WHERE published_at >= $1 AND lat IS NOT NULL AND lon IS NOT NULL 
       LIMIT 50`,
      [since]
    );

    const points: MapPoint[] = newsRes.rows.map((row) => ({
      id: `news-${row.id}`,
      type: row.category === 'desastre' ? 'disaster' : 'news',
      lat: parseFloat(row.lat as string),
      lon: parseFloat(row.lon as string),
      title: row.title as string,
      description: (row.description as string) || "No description available",
      link: `/news/${row.id}`
    }));

    // Add some major cities weather if not enough points
    if (points.length < 5) {
      const cityWeather = await query(
        `SELECT id, location_id, temperature, weather_type 
         FROM weather_snapshots 
         ORDER BY created_at DESC LIMIT 10`
      );

      cityWeather.rows.forEach((row) => {
        // location_id is expected to be "city_name" or "lat:lon"
        const locationId = row.location_id as string;
        if (locationId.includes(':')) {
          const [lat, lon] = locationId.split(':').map(parseFloat);
          points.push({
            id: `weather-${row.id}`,
            type: 'weather',
            lat,
            lon,
            title: `Weather in ${locationId}`,
            description: `${row.weather_type}, ${row.temperature}°C`,
            link: '/climate'
          });
        }
      });
    }

    return points;
  } catch (error) {
    console.error("Error fetching map points:", error);
    return [];
  }
}
