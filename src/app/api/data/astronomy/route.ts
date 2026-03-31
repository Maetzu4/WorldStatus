import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCache, setCache } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { getSpaceAnalytics } from "@/lib/space-analytics";

interface AstroRow {
  id: number;
  event: string;
  type: string | null;
  intensity: string | null;
  source: string | null;
  impact_level: string | null;
  date: string;
  extra_info: Record<string, unknown>;
  created_at: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all";
  const cacheKey = `astronomy:v2:${type}`;

  try {
    const cachedData = await getCache<{
      data: AstroRow[];
      analytics: Awaited<ReturnType<typeof getSpaceAnalytics>>;
    }>(cacheKey);
    if (cachedData) {
      return NextResponse.json({ source: "cache", ...cachedData });
    }

    // Fetch data based on type filter (use normalized 'type' column if available)
    let data: AstroRow[];
    if (type === "all") {
      const res = await query<AstroRow>(
        "SELECT * FROM astronomy_events ORDER BY date DESC LIMIT 100;",
      );
      data = res.rows;
    } else if (type === "apod") {
      const res = await query<AstroRow>(
        "SELECT * FROM astronomy_events WHERE event = 'APOD' ORDER BY date DESC LIMIT 20;",
      );
      data = res.rows;
    } else {
      // Try normalized type first, fallback to raw event field
      const res = await query<AstroRow>(
        `SELECT * FROM astronomy_events
         WHERE type = $1 OR event = $2
         ORDER BY date DESC LIMIT 30;`,
        [type, type.toUpperCase()],
      );
      data = res.rows;
    }

    // Get analytics in parallel
    const analytics = await getSpaceAnalytics();

    const payload = { data, analytics };

    if (data && data.length > 0) {
      await setCache(cacheKey, payload, 900); // 15 min
    }

    return NextResponse.json({ source: "db", ...payload });
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
