import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCache, setCache } from "@/lib/redis";
import { logger } from "@/lib/logger";

export async function GET() {
  const cacheKey = "disasters:recent";

  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return NextResponse.json({ source: "cache", data: cachedData });
    }

    // Disasters are modeled as news articles with category='desastre'
    const res = await query(`
      SELECT * FROM news_articles 
      WHERE category = 'desastre' 
      ORDER BY published_at DESC 
      LIMIT 100;
    `);

    const data = res.rows;

    if (data && data.length > 0) {
      await setCache(cacheKey, data, 3600); // 1 hour internal cache for highly active events
    }

    return NextResponse.json({ source: "db", data });
  } catch (error) {
    logger.error({ err: error }, "Error fetching disaster data");
    return NextResponse.json(
      {
        error: true,
        type: "DatabaseError",
        message: "Failed to fetch disasters",
      },
      { status: 500 },
    );
  }
}
