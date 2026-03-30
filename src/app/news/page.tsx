import { Newspaper, Globe, Clock, Tag, Brain, TrendingUp, Activity } from "lucide-react";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface NewsArticle {
  id: number;
  source: string | null;
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  image_url: string | null;
  published_at: string | Date;
  category: string;
  country: string | null;
  created_at: string | Date;
}

async function getNewsData(): Promise<NewsArticle[]> {
  try {
    const res = await query<NewsArticle>(
      `SELECT * FROM news_articles
       WHERE category != 'desastre'
       ORDER BY published_at DESC LIMIT 50;`,
    );
    return res.rows;
  } catch (error) {
    console.warn("Failed to fetch news data:", error);
    return [];
  }
}

const categoryBadge: Record<string, string> = {
  Technology: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Economy: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Politics: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Science: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Environment: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  General: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

// --- Intelligence Helpers ---
function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  if (!text) return "neutral";
  const lowerText = text.toLowerCase();
  const positiveWords = ["growth", "success", "win", "good", "rise", "positive", "breakthrough", "hope", "recovery", "gain"];
  const negativeWords = ["crisis", "fail", "drop", "bad", "war", "negative", "decline", "loss", "disaster", "threat", "crash"];

  let posCount = 0;
  let negCount = 0;
  for (const word of positiveWords) {
    if (lowerText.includes(word)) posCount++;
  }
  for (const word of negativeWords) {
    if (lowerText.includes(word)) negCount++;
  }

  if (posCount > negCount) return "positive";
  if (negCount > posCount) return "negative";
  return "neutral";
}

function guessCategory(text: string): string {
  if (!text) return "General";
  const lowerText = text.toLowerCase();
  if (/(tech|ai|software|hardware|apple|google|microsoft|cyber)/.test(lowerText)) return "Technology";
  if (/(economy|finance|market|stock|bank|inflation|rate|gdp)/.test(lowerText)) return "Economy";
  if (/(politics|election|government|president|minister|vote|policy|law)/.test(lowerText)) return "Politics";
  if (/(science|space|nasa|research|study|discovery)/.test(lowerText)) return "Science";
  if (/(environment|climate|warming|green|emission|nature|weather)/.test(lowerText)) return "Environment";
  return "General";
}

function getTrendingTopics(articles: NewsArticle[]): string[] {
  const words: Record<string, number> = {};
  const stopWords = new Set(["the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up", "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time", "no", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think", "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even", "new", "want", "because", "any", "these", "give", "day", "most", "us", "are", "is", "was", "were", "has", "had", "been"]);

  articles.forEach((article) => {
    const text = `${article.title} ${article.description || ""}`.toLowerCase();
    const tokens = text.match(/\b[a-z]{4,}\b/g) || [];
    for (const token of tokens) {
      if (!stopWords.has(token)) {
        words[token] = (words[token] || 0) + 1;
      }
    }
  });

  const sortedWords = Object.entries(words).sort((a, b) => b[1] - a[1]);
  return sortedWords.slice(0, 5).map((w) => w[0].charAt(0).toUpperCase() + w[0].slice(1));
}


export default async function NewsPage() {
  const articles = await getNewsData();

  const totalArticles = articles.length;
  const sources = new Set(articles.map((a) => a.source).filter(Boolean));

  // Process data for Intelligence
  const processedArticles = articles.map((a) => {
    const combinedText = `${a.title} ${a.description || ""}`;
    return {
      ...a,
      guessedCategory: guessCategory(combinedText),
      sentiment: analyzeSentiment(combinedText),
    };
  });

  const sentiments = { positive: 0, neutral: 0, negative: 0 };
  const categoriesCount: Record<string, number> = {};
  
  processedArticles.forEach((a) => {
    sentiments[a.sentiment]++;
    categoriesCount[a.guessedCategory] = (categoriesCount[a.guessedCategory] || 0) + 1;
  });

  const total = processedArticles.length || 1;
  const sentimentPercentages = {
    positive: Math.round((sentiments.positive / total) * 100),
    neutral: Math.round((sentiments.neutral / total) * 100),
    negative: Math.round((sentiments.negative / total) * 100),
  };

  const trendingTopics =
    processedArticles.length > 0
      ? getTrendingTopics(processedArticles)
      : ["AI", "Climate", "Ukraine", "Economy", "NASA"];

  const topCategoryPair = Object.entries(categoriesCount).sort((a, b) => b[1] - a[1])[0];
  const latestCategory = topCategoryPair ? topCategoryPair[0] : "General";

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <section className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Newspaper className="w-4 h-4" />
            <span className="text-sm font-medium tracking-wide uppercase">
              Global News
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            World{" "}
            <span className="text-transparent bg-clip-text from-emerald-400 to-teal-400">
              Headlines
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            A collection of global news periodically updated from multiple
            international sources.
          </p>
        </section>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                <Newspaper className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Recent Articles
            </p>
            <p className="text-3xl font-bold text-slate-50">{totalArticles}</p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-teal-500/10 rounded-2xl text-teal-400">
                <Globe className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Active Sources
            </p>
            <p className="text-3xl font-bold text-slate-50">{sources.size}</p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400">
                <Tag className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Top Category
            </p>
            <p className="text-3xl font-bold text-slate-50 capitalize">
              {latestCategory}
            </p>
          </div>
        </div>

        {/* News Intelligence Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sentiment Analysis */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-6">
            <div className="flex items-center space-x-2 mb-6 text-indigo-400">
              <Brain className="w-5 h-5" />
              <h2 className="text-xl font-semibold">News Sentiment</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Positive</span>
                <span className="text-emerald-400 font-medium">{sentimentPercentages.positive}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${sentimentPercentages.positive}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Neutral</span>
                <span className="text-slate-400 font-medium">{sentimentPercentages.neutral}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-slate-500 h-2 rounded-full"
                  style={{ width: `${sentimentPercentages.neutral}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Negative</span>
                <span className="text-rose-400 font-medium">{sentimentPercentages.negative}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-rose-500 h-2 rounded-full"
                  style={{ width: `${sentimentPercentages.negative}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Trending Topics */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-6">
            <div className="flex items-center space-x-2 mb-6 text-purple-400">
              <TrendingUp className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Trending Topics</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {trendingTopics.map((topic, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2 rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300 font-medium flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  {topic}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Articles List */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">
              Latest News
            </h2>
          </div>
          <div className="divide-y divide-slate-800/50">
            {processedArticles.length > 0 ? (
              processedArticles.slice(0, 20).map((article, idx) => (
                <a
                  key={idx}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 sm:p-6 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                      <Newspaper className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                            categoryBadge[article.guessedCategory] ||
                            categoryBadge.General
                          }`}
                        >
                          {article.guessedCategory.toUpperCase()}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                            article.sentiment === "positive"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : article.sentiment === "negative"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          }`}
                        >
                          {article.sentiment.toUpperCase()}
                        </span>
                        {article.source && (
                          <span className="text-xs text-slate-500">
                            {article.source}
                          </span>
                        )}
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(article.published_at).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="text-slate-200 font-medium mb-1 line-clamp-2">
                        {article.title}
                      </h3>
                      {article.description && (
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {article.description}
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              ))
            ) : (
              <div className="p-12 text-center text-slate-500">
                No news available yet. Run the cron job{" "}
                <code className="text-slate-400">news-sync.ts</code> to
                collect data.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
