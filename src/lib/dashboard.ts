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

export interface DashboardStats {
  newsCount: number;
  disasterCount: number;
  topMover: { name: string; change: number } | null;
  astroCount: number;
  climateAlerts: number;
  hotZones: { country: string; count: number }[];
}

export async function getTimelineData(): Promise<TimelineEntry[]> {
  // Last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

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

  const timeline: TimelineEntry[] = (newsRes.rows as unknown as NewsRow[]).map((row) => ({
    id: row.id,
    category: (categoryMap[row.category] || "noticia") as TimelineEntry["category"],
    title: row.title,
    timestamp: new Date(row.published_at || row.created_at),
  }));

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
      title: `${row.index_name} ${changeVal >= 0 ? 'gained' : 'lost'} ${Math.abs(changeVal)}%`,
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

    return {
      newsCount: parseInt(newsCount.rows[0].count),
      disasterCount: parseInt(disasterCount.rows[0].count),
      topMover: financeMover.rows[0] ? { name: financeMover.rows[0].index_name, change: parseFloat(financeMover.rows[0].change) } : null,
      astroCount: parseInt(astroCount.rows[0].count),
      climateAlerts: parseInt(climateAlerts.rows[0].count),
      hotZones: (hotZones.rows as unknown as { country: string; count: string }[]).map((r) => ({ country: r.country, count: parseInt(r.count) })),
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
    };
  }
}
