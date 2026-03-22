import { query } from "../src/lib/db";
import { logger } from "../src/lib/logger";
import { ExternalAPIError } from "../src/lib/errors";

const MARKETSTACK_API_KEY = process.env.MARKETSTACK_API_KEY;

// Major indices to track
const INDICES = [
  { symbol: "DJI.INDX", name: "Dow Jones" },
  { symbol: "SPX.INDX", name: "S&P 500" },
  { symbol: "IXIC.INDX", name: "NASDAQ" },
];

async function syncFinance() {
  if (!MARKETSTACK_API_KEY) {
    logger.error("MARKETSTACK_API_KEY is not defined");
    return;
  }

  logger.info("Starting finance sync job");

  for (const index of INDICES) {
    try {
      // Marketstack free tier uses HTTP only (no HTTPS)
      const url = `http://api.marketstack.com/v1/eod/latest?access_key=${MARKETSTACK_API_KEY}&symbols=${index.symbol}&limit=1`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new ExternalAPIError(
          `Marketstack API failed ${response.status}: ${errorText}`,
        );
      }

      const data = await response.json();
      const latest = data.data?.[0];

      if (!latest) {
        logger.warn({ index: index.name }, "No data returned for index");
        continue;
      }

      // Calculate percentage change
      const change =
        latest.open && latest.open !== 0
          ? ((latest.close - latest.open) / latest.open) * 100
          : null;

      await query(
        `
        INSERT INTO finance_indices (
          index_name, value, change, timestamp, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `,
        [index.name, latest.close, change, latest.date],
      );

      logger.info(
        { index: index.name, value: latest.close, change },
        "Finance index stored",
      );
    } catch (error) {
      logger.error({ index: index.name, error }, "Failed to sync finance data");
    }
  }

  logger.info("Finance sync job completed");
}

syncFinance().catch((err) => {
  logger.error({ err }, "Finance sync job unhandled error");
  process.exit(1);
});
