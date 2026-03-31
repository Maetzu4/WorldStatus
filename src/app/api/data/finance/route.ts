import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCache, setCache } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { getFinanceAnalytics } from "@/lib/finance-analytics";

interface FinanceRow {
  id: number;
  index_name: string;
  value: number;
  change: number | null;
  region: string | null;
  timestamp: string;
  created_at: string;
}

export async function GET() {
  const cacheKey = "finance:recent";

  try {
    // Try cache for raw data
    const cachedData = await getCache<{
      data: FinanceRow[];
      analytics: ReturnType<typeof getFinanceAnalytics> extends Promise<infer T> ? T : never;
    }>(cacheKey);
    if (cachedData) {
      return NextResponse.json({ source: "cache", ...cachedData });
    }

    // Fetch raw data and analytics in parallel
    const [rawRes, analytics] = await Promise.all([
      query<FinanceRow>(
        "SELECT * FROM finance_indices ORDER BY timestamp DESC LIMIT 200;",
      ),
      getFinanceAnalytics(),
    ]);

    const data = rawRes.rows;

    const payload = { data, analytics };

    if (data && data.length > 0) {
      await setCache(cacheKey, payload, 900); // 15 minutes
    }

    return NextResponse.json({ source: "db", ...payload });
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
