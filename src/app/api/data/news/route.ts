import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCache, setCache } from "@/lib/redis";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "all";
  const sentiment = searchParams.get("sentiment") || "all"; // all, positive, neutral, negative
  const time = searchParams.get("time") || "24h"; // 1h, 24h, 7d
  const sourceParam = searchParams.get("source") || "all";
  const cacheKey = `news_intelligent:${category}:${sentiment}:${time}:${sourceParam}`;

  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return NextResponse.json({ source: "cache", ...cachedData });
    }

    let timeInterval = "24 hours";
    if (time === "7d") timeInterval = "7 days";
    if (time === "1h") timeInterval = "1 hour";

    // 1. Fetch Events
    let eventsQuery = `SELECT * FROM news_events WHERE created_at > NOW() - INTERVAL '${timeInterval}'`;
    const eventsParams: any[] = [];
    
    if (category !== "all") {
       eventsParams.push(category);
       eventsQuery += ` AND category = $1`;
    }
    eventsQuery += ` ORDER BY impact_score DESC, article_count DESC LIMIT 15`;
    const eventsRes = await query(eventsQuery, eventsParams);

    // 2. Fetch Articles
    let articlesQuery = `
      SELECT id, title, description, source, url, published_at, category, relevance_score, sentiment_score, impact_score 
      FROM news_articles 
      WHERE published_at > NOW() - INTERVAL '${timeInterval}'
    `;
    const articleParams: any[] = [];
    
    if (category !== "all") {
      articleParams.push(category);
      articlesQuery += ` AND category = $${articleParams.length}`;
    }
    
    if (sentiment !== "all") {
      if (sentiment === "positive") {
         articlesQuery += ` AND sentiment_score >= 0.1`;
      } else if (sentiment === "negative") {
         articlesQuery += ` AND sentiment_score <= -0.1`;
      } else if (sentiment === "neutral") {
         articlesQuery += ` AND sentiment_score > -0.1 AND sentiment_score < 0.1`;
      }
    }

    if (sourceParam !== "all") {
      articleParams.push(sourceParam);
      articlesQuery += ` AND source = $${articleParams.length}`;
    }
    
    articlesQuery += ` ORDER BY relevance_score DESC, published_at DESC LIMIT 50`;
    const articlesRes = await query(articlesQuery, articleParams);
    
    // 3. Overall stats
    const totalArticlesRes = await query(`SELECT COUNT(*) as count FROM news_articles WHERE published_at > NOW() - INTERVAL '${timeInterval}'`);
    const totalCount = parseInt(totalArticlesRes.rows[0]?.count || "0", 10);

    const responseData = { 
       events: eventsRes.rows, 
       articles: articlesRes.rows,
       stats: { totalArticles: totalCount }
    };

    if (responseData.articles.length > 0 || responseData.events.length > 0) {
      await setCache(cacheKey, responseData, 600); // 10 min cache
    }

    return NextResponse.json({ source: "db", ...responseData });
  } catch (error) {
    logger.error({ err: error }, "Error fetching intelligent news data");
    return NextResponse.json(
      { error: true, type: "DatabaseError", message: "Failed to fetch intelligent news" },
      { status: 500 },
    );
  }
}
