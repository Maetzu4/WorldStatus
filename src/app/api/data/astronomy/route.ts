import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCache, setCache } from "@/lib/redis";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all"; // e.g., 'APOD', 'DONKI'
  const cacheKey = `astronomy:${type}`;

  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return NextResponse.json({ source: "cache", data: cachedData });
    }

    let data;
    if (type === "all") {
      const res = await query(
        "SELECT * FROM astronomy_events ORDER BY date DESC LIMIT 50;",
      );
      data = res.rows;
    } else {
      const res = await query(
        "SELECT * FROM astronomy_events WHERE event = $1 ORDER BY date DESC LIMIT 20;",
        [type],
      );
      data = res.rows;
    }

    if (data && data.length > 0) {
      await setCache(cacheKey, data, 21600); // 6 hours cache
    }

    return NextResponse.json({ source: "db", data });
  } catch (error) {
    logger.error({ err: error }, "Error fetching astronomy data");
    return NextResponse.json(
      {
        error: true,
        type: "DatabaseError",
        message: "Failed to fetch astronomy data",
      },
      { status: 500 },
    );
  }
}
