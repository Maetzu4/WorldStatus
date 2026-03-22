import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCache, setCache } from "@/lib/redis";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "general";
  const country = searchParams.get("country");
  const cacheKey = country ? `news:${category}:${country}` : `news:${category}`;

  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return NextResponse.json({ source: "cache", data: cachedData });
    }

    let data;
    if (country) {
      const res = await query(
        `
        SELECT * FROM news_articles 
        WHERE category = $1 AND country = $2 
        ORDER BY published_at DESC LIMIT 50;
      `,
        [category, country],
      );
      data = res.rows;
    } else {
      const res = await query(
        `
        SELECT * FROM news_articles 
        WHERE category = $1 
        ORDER BY published_at DESC LIMIT 50;
      `,
        [category],
      );
      data = res.rows;
    }

    if (data && data.length > 0) {
      await setCache(cacheKey, data, 3600); // 1 hr cache for news
    }

    return NextResponse.json({ source: "db", data });
  } catch (error) {
    logger.error({ err: error }, "Error fetching news data");
    return NextResponse.json(
      { error: true, type: "DatabaseError", message: "Failed to fetch news" },
      { status: 500 },
    );
  }
}
