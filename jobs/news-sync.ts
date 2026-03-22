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
];

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
