import { query } from "./db";

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
  type: "weather" | "disaster" | "news";
  lat: number;
  lon: number;
  title: string;
  description: string;
  link: string;
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

    // Map DB categories to UI categories
    const categoryMap: Record<string, TimelineEntry["category"]> = {
      general: "noticia",
      clima: "clima",
      desastre: "desastre",
      finanzas: "finanzas",
      astronomia: "astronomía",
    };

    const timeline: TimelineEntry[] = (newsRes.rows as unknown as NewsRow[]).map(
      (row) => ({
        id: row.id,
        category: (categoryMap[row.category] ||
          "noticia") as TimelineEntry["category"],
        title: row.title,
        timestamp: new Date(row.published_at || row.created_at),
      })
    );

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
      timeline.push({
        id: row.id,
        category: "finanzas",
        title: `${row.index_name} ${changeVal >= 0 ? "gained" : "lost"} ${Math.abs(changeVal)}%`,
        timestamp: new Date(row.timestamp),
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
      timeline.push({
        id: row.id,
        category: "astronomía",
        title: `${row.event} detected`,
        timestamp: new Date(row.date),
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
    const newsCountRes = await query("SELECT COUNT(*) FROM news_articles WHERE published_at >= $1", [since]);
    const disasterCountRes = await query("SELECT COUNT(*) FROM news_articles WHERE category = 'desastre' AND published_at >= $1", [since]);
    const financeMover = await query("SELECT index_name, change FROM finance_indices WHERE timestamp >= $1 ORDER BY ABS(change) DESC LIMIT 1", [since]);
    const astroCountRes = await query("SELECT COUNT(*) FROM astronomy_events WHERE date >= $1", [since]);
    const climateAlertsRes = await query("SELECT COUNT(*) FROM news_articles WHERE category = 'clima' AND published_at >= $1", [since]);
    
    // New metrics calculation
    const totalNews = parseInt(newsCountRes.rows[0]?.count || '0');
    const negativeNews = parseInt(disasterCountRes.rows[0]?.count || '0') + parseInt(climateAlertsRes.rows[0]?.count || '0');
    const positiveNews = totalNews > 0 ? totalNews - negativeNews : 0;
    const sentiment = totalNews > 0 ? {
       positive: Math.round((positiveNews / totalNews) * 100),
       negative: Math.round((negativeNews / totalNews) * 100)
    } : { positive: 50, negative: 50 };

    const financeAvgRes = await query("SELECT AVG(change) FROM finance_indices WHERE timestamp >= $1", [since]);
    const marketTrend = financeAvgRes.rows[0]?.avg ? parseFloat(financeAvgRes.rows[0].avg) : 0;

    const astroEventsRes = await query("SELECT event FROM astronomy_events WHERE date >= CURRENT_DATE");
    const astroEventsToday = (astroEventsRes.rows as unknown as {event: string}[]).map(r => r.event);

    const tempAvgRes = await query("SELECT AVG(temperature) FROM weather_snapshots WHERE timestamp >= $1", [since]);
    const currentTempAvg = tempAvgRes.rows[0]?.avg ? parseFloat(tempAvgRes.rows[0].avg) : 14;
    const temperatureAnomaly = currentTempAvg - 14;

    const hotZones = await query(
      `SELECT country, COUNT(*) as count 
       FROM news_articles 
       WHERE published_at >= $1 AND country IS NOT NULL 
       GROUP BY country 
       ORDER BY count DESC LIMIT 3`,
      [since]
    );

    // Map Points
    const mapPoints: MapPoint[] = [];
    
    const newsMapRes = await query(`
       SELECT id, category, title, description, url, lat, lon, country
       FROM news_articles 
       WHERE published_at >= $1 AND (lat IS NOT NULL OR country IS NOT NULL)
       LIMIT 50`, [since]);
       
    const countryCoords: Record<string, [number, number]> = {
      'USA': [37.0902, -95.7129], 'US': [37.0902, -95.7129],
      'UK': [55.3781, -3.4360], 'United Kingdom': [55.3781, -3.4360],
      'Japan': [36.2048, 138.2529],
      'Spain': [40.4637, -3.7492],
      'France': [46.2276, 2.2137],
      'Germany': [51.1657, 10.4515],
      'Italy': [41.8719, 12.5674],
      'Australia': [-25.2744, 133.7751],
      'Brazil': [-14.2350, -51.9253],
      'Canada': [56.1304, -106.3468],
      'India': [20.5937, 78.9629],
      'China': [35.8617, 104.1954],
      'Mexico': [23.6345, -102.5528]
    };

    (newsMapRes.rows as unknown as { id: number; category: string; title: string; description: string; url: string; lat: string; lon: string; country: string }[]).forEach((row) => {
      let lat = row.lat ? parseFloat(row.lat) : null;
      let lon = row.lon ? parseFloat(row.lon) : null;
      
      if (lat === null || lon === null) {
        if (row.country && countryCoords[row.country]) {
          lat = countryCoords[row.country][0];
          lon = countryCoords[row.country][1];
        }
      }

      const type = row.category === 'desastre' ? 'disaster' : row.category === 'clima' ? 'weather' : 'news';

      if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
        mapPoints.push({
          id: `news-${row.id}`,
          type,
          lat,
          lon,
          title: row.title || 'Alert',
          description: row.description ? row.description.substring(0, 100) + '...' : '',
          link: row.url || '#'
        });
      }
    });

    const weatherMapRes = await query(`
      SELECT location_id, temperature, condition, weather_type 
      FROM weather_snapshots 
      WHERE timestamp >= $1
      LIMIT 20`, [since]);
      
    (weatherMapRes.rows as unknown as { location_id: string; temperature: string; condition: string; weather_type: string }[]).forEach((row, i) => {
       if (row.location_id && row.location_id.includes(':')) {
         const parts = row.location_id.split(':');
         const lat = parseFloat(parts[0]);
         const lon = parseFloat(parts[1]);
         if (parts.length === 2 && !isNaN(lat) && !isNaN(lon)) {
            mapPoints.push({
               id: `weather-${i}`,
               type: 'weather',
               lat,
               lon,
               title: `Weather: ${row.temperature}°C`,
               description: row.condition || row.weather_type || 'Status Update',
               link: '/climate'
            });
         }
       }
    });

    return {
      newsCount: totalNews,
      disasterCount: parseInt(disasterCountRes.rows[0]?.count || '0'),
      topMover: financeMover.rows[0] ? { name: financeMover.rows[0].index_name, change: parseFloat(financeMover.rows[0].change) } : null,
      astroCount: parseInt(astroCountRes.rows[0]?.count || '0'),
      climateAlerts: parseInt(climateAlertsRes.rows[0]?.count || '0'),
      hotZones: (hotZones.rows as unknown as { country: string; count: string }[]).map((r) => ({ country: r.country, count: parseInt(r.count) })),
      temperatureAnomaly,
      newsSentiment: sentiment,
      marketTrend,
      astroEventsToday,
      mapPoints
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
      temperatureAnomaly: 0,
      newsSentiment: { positive: 50, negative: 50 },
      marketTrend: 0,
      astroEventsToday: [],
      mapPoints: []
    };
  }
}
