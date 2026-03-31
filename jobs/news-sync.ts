import { query } from "../src/lib/db";
import { logger } from "../src/lib/logger";
import { ExternalAPIError } from "../src/lib/errors";

const NEWS_API_KEY = process.env.NEWS_API_KEY;

// List of queries to determine disaster category
const DISASTER_KEYWORDS = [
  "earthquake",
  "flood",
  "hurricane",
  "wildfire",
  "landslide",
  "natural disaster",
  "volcano",
  "tsunami"
];

const COMMON_COUNTRIES: Record<string, [number, number]> = {
  USA: [37.0902, -95.7129],
  US: [37.0902, -95.7129],
  "United States": [37.0902, -95.7129],
  California: [36.7783, -119.4179],
  Japan: [36.2048, 138.2529],
  Mexico: [23.6345, -102.5528],
  Chile: [-35.6751, -71.543],
  Turkey: [38.9637, 35.2433],
  China: [35.8617, 104.1954],
  India: [20.5937, 78.9629],
  Philippines: [12.8797, 121.774],
  Italy: [41.8719, 12.5674],
  Greece: [39.0742, 21.8243],
  Brazil: [-14.235, -51.9253],
  Australia: [-25.2744, 133.7751],
  "New Zealand": [-40.9006, 174.886],
  Pakistan: [30.3753, 69.3451],
  Iran: [32.4279, 53.688],
  Colombia: [4.5709, -74.2973],
  Peru: [-9.19, -75.0152],
  Spain: [40.4637, -3.7492],
  France: [46.2276, 2.2137],
  Indonesia: [-0.7893, 113.9213],
};

function processDisasterEvent(title: string, description: string) {
  const text = `${title} ${description || ""}`.toLowerCase();
  
  let type = "Other";
  if (text.includes("volcan") || text.includes("eruption") || text.includes("magma")) type = "Volcano";
  else if (text.includes("huracan") || text.includes("hurricane") || text.includes("typhoon") || text.includes("cyclone") || text.includes("tornado") || text.includes("storm")) type = "Hurricane";
  else if (text.includes("flood") || text.includes("inundación") || text.includes("inundacion") || text.includes("tsunami")) type = "Flood";
  else if (text.includes("fire") || text.includes("wildfire") || text.includes("incendio") || text.includes("flames") || text.includes("fuego")) type = "Wildfire";
  else if (text.includes("earthquake") || text.includes("terremoto") || text.includes("sismo") || text.includes("quake") || text.includes("tremor")) type = "Earthquake";

  let severity = "Low";
  let impactScore = 20;

  if (text.match(/death|fatal|destroyed|killed|dead|devastating|catastrophe|critical/)) {
    severity = "Critical";
    impactScore = Math.floor(Math.random() * 20) + 80; // 80-100
  } else if (text.match(/evacuation|emergency|warning|severe|major|damages/)) {
    severity = "High";
    impactScore = Math.floor(Math.random() * 20) + 60; // 60-80
  } else if (text.match(/alert|watch|prepare|moderate|rising/)) {
    severity = "Moderate";
    impactScore = Math.floor(Math.random() * 20) + 40; // 40-60
  } else {
    impactScore = Math.floor(Math.random() * 20) + 10; // 10-30
  }

  let country = null;
  let lat: number | null = null;
  let lon: number | null = null;

  for (const [key, coords] of Object.entries(COMMON_COUNTRIES)) {
    // Basic word boundary match or inclusion
    if (text.includes(key.toLowerCase())) {
      country = (key === "California" || key === "USA" || key === "US") ? "United States" : key;
      lat = coords[0];
      lon = coords[1];
      break;
    }
  }

  return { type, severity, impactScore, country, lat, lon };
}

async function syncNews() {
  if (!NEWS_API_KEY) {
    logger.error("NEWS_API_KEY is not defined");
    return;
  }

  logger.info("Starting news sync job");
  // General queries. In a real app, query different regions and topics.
  const topics = ["world", "weather", "finance", ...DISASTER_KEYWORDS];

  for (const topic of topics) {
    try {
      // Using NewsAPI simply as an example payload.
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&pageSize=10&language=en&apiKey=${NEWS_API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new ExternalAPIError(`NewsAPI failed ${response.status}`);
      }

      const data = await response.json();

      for (const article of data.articles) {
        if (!article.url || article.url === "https://removed.com") continue;

        // Determine category
        let category = "noticia";
        if (
          DISASTER_KEYWORDS.some(
            (kw) =>
              topic.includes(kw) ||
              (article.title && article.title.toLowerCase().includes(kw)),
          )
        ) {
          category = "desastre";
        } else if (topic === "weather") {
          category = "clima";
        } else if (topic === "finance") {
          category = "finanzas";
        }

        const publishedAt = new Date(article.publishedAt);

        if (category === "desastre") {
          const nlp = processDisasterEvent(article.title, article.description);
          await query(
            `
            INSERT INTO disaster_events (
              title, description, type, severity, impact_score, location, country, latitude, longitude, source, url, published_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            ON CONFLICT (url) DO NOTHING;
            `,
            [
              article.title,
              article.description || null,
              nlp.type,
              nlp.severity,
              nlp.impactScore,
              nlp.country || "Global",
              nlp.country,
              nlp.lat,
              nlp.lon,
              article.source?.name || "News Web",
              article.url,
              publishedAt
            ]
          );
        } else {
          await query(
            `
            INSERT INTO news_articles (
               source, author, title, description, url, image_url, published_at, category, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (url) DO NOTHING;
          `,
            [
              article.source?.name,
              article.author || null,
              article.title,
              article.description || null,
              article.url,
              article.urlToImage || null,
              publishedAt,
              category,
            ],
          );
        }
      }
      logger.info({ topic, count: data.articles?.length }, "News topic synced");
    } catch (error) {
      logger.error({ topic, error }, "Failed to sync news data for topic");
    }
  }

  logger.info("News sync job completed");
}

syncNews().catch((err) => {
  logger.error({ err }, "News sync job unhandled error");
  process.exit(1);
});
