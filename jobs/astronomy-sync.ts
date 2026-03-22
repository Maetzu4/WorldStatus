import { query } from "../src/lib/db";
import { logger } from "../src/lib/logger";

const NASA_API_KEY = process.env.NASA_API_KEY || "DEMO_KEY";

async function syncAstronomy() {
  logger.info("Starting astronomy sync job");

  try {
    // 1. Fetch APOD
    const apodUrl = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;
    const apodRes = await fetch(apodUrl);
    if (apodRes.ok) {
      const apodData = await apodRes.json();
      await query(
        `
        INSERT INTO astronomy_events (event, date, extra_info, created_at)
        VALUES ($1, $2, $3, NOW())
      `,
        [
          "APOD",
          apodData.date,
          JSON.stringify({
            title: apodData.title,
            url: apodData.url,
            hdurl: apodData.hdurl || null,
            media_type: apodData.media_type || "image",
            explanation: apodData.explanation,
          }),
        ],
      );
      logger.info("APOD data synced");
    } else {
      logger.error(`APOD API failed: ${apodRes.status}`);
    }

    // 2. Fetch DONKI Notifications
    const donkiUrl = `https://api.nasa.gov/DONKI/notifications?type=all&api_key=${NASA_API_KEY}`;
    const donkiRes = await fetch(donkiUrl);
    if (donkiRes.ok) {
      const donkiData = await donkiRes.json();
      for (const item of donkiData) {
        await query(
          `
          INSERT INTO astronomy_events (event, date, extra_info, created_at)
          VALUES ($1, $2, $3, NOW())
        `,
          [
            item.messageType || "DONKI_NOTIFICATION",
            item.messageIssueTime,
            JSON.stringify({
              messageID: item.messageID,
              messageBody: item.messageBody,
            }),
          ],
        );
      }
      logger.info("DONKI notifications synced");
    } else {
      logger.error(`DONKI API failed: ${donkiRes.status}`);
    }
  } catch (error) {
    logger.error({ error }, "Failed to sync astronomy data");
  }

  logger.info("Astronomy sync job completed");
}

syncAstronomy().catch((err) => {
  logger.error({ err }, "Astronomy sync job unhandled error");
  process.exit(1);
});
