import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCache, setCache } from "@/lib/redis";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") || "global";
  const cacheKey = `climate:${region}`;

  try {
    // 1. Check Cache
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return NextResponse.json({ source: "cache", data: cachedData });
    }

    // 2. Query DB
    let data;
    if (region === "global") {
      const res = await query(
        "SELECT * FROM weather_snapshots ORDER BY timestamp DESC LIMIT 100;",
      );
      data = res.rows;
    } else {
      const res = await query(
        "SELECT * FROM weather_snapshots WHERE location_id = $1 ORDER BY timestamp DESC LIMIT 24;",
        [region],
      );
      data = res.rows;
    }

    // 3. Set Cache
    if (data && data.length > 0) {
      await setCache(cacheKey, data, 21600); // 6 hours
    }

    return NextResponse.json({ source: "db", data });
  } catch (error) {
    logger.error({ err: error }, "Error fetching climate data");
    return NextResponse.json(
      {
        error: true,
        type: "DatabaseError",
        message: "Failed to fetch climate data",
      },
      { status: 500 },
    );
  }
}
