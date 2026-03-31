import { query } from "../src/lib/db";
import { logger } from "../src/lib/logger";

const NEWS_API_KEY = process.env.NEWS_API_KEY;

const TOPICS = [
  "world politics",
  "global economy",
  "technology ai",
  "climate change",
  "severe weather",
  "natural disaster",
  "global health",
];

const PRESTIGE_SOURCES = ["bbc news", "reuters", "associated press", "al jazeera", "npr", "bloomberg", "the wall street journal", "the new york times", "the guardian", "financial times", "cnn"];

function calculateSentimentScore(text: string): number {
  if (!text) return 0;
  const lowerText = text.toLowerCase();
  const positiveWords = ["growth", "success", "win", "good", "rise", "positive", "breakthrough", "hope", "recovery", "gain", "peace", "agreement", "cure", "innovative", "boost"];
  const negativeWords = ["crisis", "fail", "drop", "bad", "war", "negative", "decline", "loss", "disaster", "threat", "crash", "death", "killed", "attack", "catastrophe", "disease", "emergency", "risk"];

  let score = 0;
  const words = lowerText.split(/\W+/);
  for (const w of words) {
    if (positiveWords.includes(w)) score += 0.15;
    if (negativeWords.includes(w)) score -= 0.15;
  }
  return Math.max(-1, Math.min(1, score)); // clamp between -1 and 1
}

function guessCategory(text: string): string {
  if (!text) return "General";
  const lower = text.toLowerCase();
  if (/(climate|weather|warming|emission|environment|greenhouse|drought|flood|storm)/.test(lower)) return "Climate";
  if (/(earthquake|hurricane|wildfire|tsunami|volcano|disaster|tornado|cyclone)/.test(lower)) return "Disasters";
  if (/(tech|ai|software|cyber|apple|google|microsoft|algorithm|hardware|space)/.test(lower)) return "Technology";
  if (/(economy|finance|market|stock|bank|inflation|rate|gdp|business|trade)/.test(lower)) return "Economy";
  if (/(politics|election|government|president|minister|vote|policy|law|war|conflict|nato|un)/.test(lower)) return "Politics";
  if (/(health|disease|virus|pandemic|medical|cancer|vaccine|hospital|outbreak)/.test(lower)) return "Health";
  return "General";
}

function calculateScores(text: string, source: string) {
  let relevance = 40; // base score
  const lowerSource = (source || "").toLowerCase();
  
  if (PRESTIGE_SOURCES.some(s => lowerSource.includes(s))) {
    relevance += 30; // Reliable source
  } else if (lowerSource) {
    relevance += 10; // Mentioned a source at least
  }
  
  if (text.length > 80) relevance += 10;
  
  const impactKeywords = ["breaking", "urgent", "global", "crisis", "critical", "historic", "major", "world", "emergency", "deadly", "massive", "record"];
  let impactMatches = 0;
  
  impactKeywords.forEach(kw => {
    if (text.toLowerCase().includes(kw)) {
      relevance += 5;
      impactMatches++;
    }
  });

  const impact = Math.min(100, (impactMatches * 20) + 20); // Base impact 20
  
  // Normalize relevance
  return { 
    relevance: Math.min(100, relevance), 
    impact: impact 
  };
}

const STOP_WORDS = new Set(["the", "in", "and", "of", "to", "a", "for", "on", "with", "is", "at", "by", "from", "as", "it", "be", "that", "this", "are", "was", "will"]);

function findSimilarEvent(title: string, category: string, recentEvents: any[]) {
  const words = title.toLowerCase().split(/\W+/).filter(w => w.length > 4 && !STOP_WORDS.has(w));
  
  for (const ev of recentEvents) {
    if (ev.category !== category) continue;
    
    // Check keyword overlap
    const evWords = ev.title.toLowerCase().split(/\W+/).filter((w:string) => w.length > 4 && !STOP_WORDS.has(w));
    
    let overlap = 0;
    for (const w of words) {
      if (evWords.includes(w)) overlap++;
    }
    
    if (overlap >= 2 || (words.length > 0 && overlap >= words.length * 0.5)) {
      return ev; // Found matching event
    }
  }
  return null;
}


async function syncNews() {
  if (!NEWS_API_KEY) {
    logger.error("NEWS_API_KEY is not defined");
    return;
  }

  logger.info("Starting intelligent news sync job");

  try {
    // 1. Fetch recent events to memory to associate articles
    const recentEventsRes = await query(`SELECT * FROM news_events WHERE created_at > NOW() - INTERVAL '48 hours'`);
    let recentEvents = recentEventsRes.rows;

    for (const topic of TOPICS) {
      try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&pageSize=15&language=en&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) {
           logger.error(`NewsAPI failed ${response.status} for ${topic}`);
           continue;
        }

        const data = await response.json();

        for (const article of data.articles) {
          if (!article.url || article.url === "https://removed.com") continue;

          const title = article.title || "";
          const description = article.description || "";
          const combinedText = `${title} ${description}`;
          const sourceName = article.source?.name || "Unknown";
          const publishedAt = new Date(article.publishedAt);

          const category = guessCategory(combinedText);
          const sentiment = calculateSentimentScore(combinedText);
          const { relevance, impact } = calculateScores(combinedText, sourceName);

          // Find or create event
          let targetEventId = null;
          let matchingEvent = findSimilarEvent(title, category, recentEvents);
          
          if (matchingEvent) {
             targetEventId = matchingEvent.id;
             
             // Update event with running averages and higher article count
             const newCount = matchingEvent.article_count + 1;
             const newImpact = Math.max(matchingEvent.impact_score, impact); // Elevate impact to max of articles
             // weighted running average for sentiment:
             const newSentiment = ((matchingEvent.sentiment_score * matchingEvent.article_count) + sentiment) / newCount;
             
             await query(`
               UPDATE news_events 
               SET article_count = $1, impact_score = $2, sentiment_score = $3, summary = $4
               WHERE id = $5
             `, [newCount, newImpact, newSentiment, article.title, targetEventId]);
             
             // update local memory
             matchingEvent.article_count = newCount;
             matchingEvent.impact_score = newImpact;
             matchingEvent.sentiment_score = newSentiment;
          } else {
             // Create a new event
             const newEventRes = await query(`
               INSERT INTO news_events (title, summary, category, sentiment_score, impact_score, article_count, created_at)
               VALUES ($1, $2, $3, $4, $5, 1, NOW())
               RETURNING id
             `, [title, description, category, sentiment, impact]);
             
             targetEventId = newEventRes.rows[0].id;
             recentEvents.push({
               id: targetEventId,
               title: title,
               category: category,
               sentiment_score: sentiment,
               impact_score: impact,
               article_count: 1
             });
          }

          // Insert article
          await query(
            `
            INSERT INTO news_articles (
               source, author, title, description, url, image_url, published_at, category, relevance_score, event_id, impact_score, sentiment_score, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            ON CONFLICT (url) DO NOTHING;
          `,
            [
              sourceName,
              article.author || null,
              title,
              description || null,
              article.url,
              article.urlToImage || null,
              publishedAt,
              category,
              relevance,
              targetEventId,
              impact,
              sentiment
            ],
          );
        }
        logger.info({ topic, count: data.articles?.length }, "News topic intelligently synced");
      } catch (error) {
        logger.error({ topic, error }, "Failed to sync news data for topic");
      }
    }

  } catch (error) {
     logger.error({ error }, "Error in news sync infrastructure");
  }

  logger.info("News intelligent sync job completed");
}

syncNews().catch((err) => {
  logger.error({ err }, "News sync job unhandled error");
  process.exit(1);
});
