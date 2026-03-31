import { query } from "../src/lib/db";
import { logger } from "../src/lib/logger";

const NASA_API_KEY = process.env.NASA_API_KEY || "DEMO_KEY";

// ── DONKI event type normalization ─────────────────────────────────
const EVENT_TYPE_MAP: Record<string, string> = {
  FLR: "solar_flare",
  CME: "cme",
  GST: "geomagnetic_storm",
  IPS: "interplanetary_shock",
  SEP: "solar_energetic_particle",
  MPC: "magnetopause_crossing",
  RBE: "radiation_belt",
  HSS: "high_speed_stream",
  DONKI_NOTIFICATION: "notification",
  APOD: "apod",
};

// ── Intensity extraction from message body ─────────────────────────
function extractIntensity(messageType: string, messageBody: string): string | null {
  if (!messageBody) return null;

  // Solar flare class: C1.2, M2.3, X5.4
  if (messageType === "FLR") {
    const match = messageBody.match(/([BCMX]\d+\.?\d*)/i);
    return match ? match[1].toUpperCase() : null;
  }

  // Geomagnetic storm: G1-G5
  if (messageType === "GST") {
    const match = messageBody.match(/(G[1-5])/i);
    return match ? match[1].toUpperCase() : null;
  }

  // Solar radiation storm: S1-S5
  if (messageType === "SEP") {
    const match = messageBody.match(/(S[1-5])/i);
    return match ? match[1].toUpperCase() : null;
  }

  // Radio blackout: R1-R5
  const radioMatch = messageBody.match(/(R[1-5])/i);
  if (radioMatch) return radioMatch[1].toUpperCase();

  return null;
}

// ── Impact level derivation ────────────────────────────────────────
function deriveImpactLevel(messageType: string, intensity: string | null): string {
  if (!intensity) return "none";

  if (messageType === "FLR") {
    if (intensity.startsWith("X")) return "extreme";
    if (intensity.startsWith("M")) return "moderate";
    if (intensity.startsWith("C")) return "minor";
    return "none";
  }

  if (messageType === "GST") {
    const level = parseInt(intensity.replace("G", ""));
    if (level >= 4) return "severe";
    if (level >= 2) return "moderate";
    return "minor";
  }

  if (messageType === "SEP") {
    const level = parseInt(intensity.replace("S", ""));
    if (level >= 4) return "severe";
    if (level >= 2) return "moderate";
    return "minor";
  }

  if (messageType === "CME") return "moderate";

  return "minor";
}

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
        INSERT INTO astronomy_events (event, type, intensity, source, impact_level, date, extra_info, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `,
        [
          "APOD",
          "apod",
          null,
          "NASA APOD",
          "none",
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
        const rawType = item.messageType || "DONKI_NOTIFICATION";
        const normalizedType = EVENT_TYPE_MAP[rawType] || "notification";
        const messageBody = item.messageBody || "";
        const intensity = extractIntensity(rawType, messageBody);
        const impactLevel = deriveImpactLevel(rawType, intensity);

        await query(
          `
          INSERT INTO astronomy_events (event, type, intensity, source, impact_level, date, extra_info, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `,
          [
            rawType,
            normalizedType,
            intensity,
            "NASA DONKI",
            impactLevel,
            item.messageIssueTime,
            JSON.stringify({
              messageID: item.messageID,
              messageBody: item.messageBody,
            }),
          ],
        );
      }
      logger.info(`DONKI notifications synced: ${donkiData.length} events`);
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
