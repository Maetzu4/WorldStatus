import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCache, setCache } from "@/lib/redis";
import { logger } from "@/lib/logger";

export async function GET() {
  const cacheKey = "finance:recent";

  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return NextResponse.json({ source: "cache", data: cachedData });
    }

    const res = await query(
      "SELECT * FROM finance_indices ORDER BY timestamp DESC LIMIT 50;",
    );
    const data = res.rows;

    if (data && data.length > 0) {
      await setCache(cacheKey, data, 21600); // 6 hours
    }

    return NextResponse.json({ source: "db", data });
  } catch (error) {
    logger.error({ err: error }, "Error fetching finance data");
    return NextResponse.json(
      {
        error: true,
        type: "DatabaseError",
        message: "Failed to fetch finance data",
      },
      { status: 500 },
    );
  }
}
