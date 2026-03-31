"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Brain,
  TrendingUp,
  Activity,
  AlertTriangle,
  Filter,
  Radio,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";

interface NewsEvent {
  id: number;
  title: string;
  summary: string;
  category: string;
  sentiment_score: string | number; // pg numeric might come as string
  impact_score: number;
  article_count: number;
  created_at: string;
}

interface NewsArticle {
  id: number;
  source: string;
  title: string;
  description: string;
  url: string;
  published_at: string;
  category: string;
  relevance_score: number;
  sentiment_score: string | number;
  impact_score: number;
}

const CATEGORIES = [
  "All",
  "Climate",
  "Economy",
  "Politics",
  "Technology",
  "Health",
  "Disasters",
  "General",
];
const SENTIMENTS = ["All", "Positive", "Neutral", "Negative"];
const TIMEFRAMES = [
  { label: "Last hour", value: "1h" },
  { label: "24 hours", value: "24h" },
  { label: "7 days", value: "7d" },
];

export default function NewsClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    events: NewsEvent[];
    articles: NewsArticle[];
    stats: { totalArticles: number };
  }>({
    events: [],
    articles: [],
    stats: { totalArticles: 0 },
  });

  const [filterCategory, setFilterCategory] = useState("All");
  const [filterSentiment, setFilterSentiment] = useState("All");
  const [filterTime, setFilterTime] = useState("24h");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const cat = filterCategory.toLowerCase();
        const sent = filterSentiment.toLowerCase();

        const params = new URLSearchParams();
        if (cat !== "all") params.append("category", cat);
        if (sent !== "all") params.append("sentiment", sent);
        params.append("time", filterTime);

        const res = await fetch(`/api/data/news?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");

        const json = await res.json();
        setData({
          events: json.events || [],
          articles: json.articles || [],
          stats: json.stats || { totalArticles: 0 },
        });
      } catch (err) {
        console.error("News fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [filterCategory, filterSentiment, filterTime]);

  const topEvent = data.events.length > 0 ? data.events[0] : null;

  // AI Insights generation
  const aiInsights = [];
  if (data.events.length > 0) {
    const mainCat = data.events[0].category.toLowerCase();
    if (mainCat === "climate" || mainCat === "disasters") {
      aiInsights.push(
        "⚠️ Severe weather and environmental events dominating global news.",
      );
    } else if (mainCat === "economy") {
      aiInsights.push(
        "📉 Economic indicators are driving major global headlines.",
      );
    } else if (mainCat === "politics") {
      aiInsights.push(
        "🏛 Political shifts and geopolitical changes are taking center stage.",
      );
    }
  }

  // Calculate average sentiments based on articles
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  data.articles.forEach((a) => {
    const s = parseFloat(a.sentiment_score as string);
    if (s >= 0.1) positiveCount++;
    else if (s <= -0.1) negativeCount++;
    else neutralCount++;
  });

  const totalSen = Math.max(1, data.articles.length);
  const posPct = Math.round((positiveCount / totalSen) * 100);
  const negPct = Math.round((negativeCount / totalSen) * 100);
  const neuPct = Math.round((neutralCount / totalSen) * 100);

  if (negPct > 40)
    aiInsights.push("🔥 Sentiment landscape leans notably negative currently.");
  else if (posPct > 40)
    aiInsights.push(
      "✨ Global news sentiment reflects an unusually positive trend.",
    );
  else
    aiInsights.push("⚖️ Global outlook remains balanced across most regions.");

  // Get active trending topics from events
  const trendingTopics = data.events.slice(0, 4).map((e) => ({
    title: e.title,
    velocity: e.article_count * 10,
  }));

  const getSentimentColorInfo = (score: number) => {
    if (score >= 0.1)
      return {
        colorClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        icon: <ThumbsUp className="w-3 h-3" />,
        label: "Positive",
      };
    if (score <= -0.1)
      return {
        colorClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        icon: <ThumbsDown className="w-3 h-3" />,
        label: "Negative",
      };
    return {
      colorClass: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      icon: <Minus className="w-3 h-3" />,
      label: "Neutral",
    };
  };

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8">
      {/* Header & Main AI Insights */}
      <section className="space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <Brain className="w-4 h-4" />
          <span className="text-sm font-medium tracking-wide uppercase">
            AI Global Intelligence
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
          Global News{" "}
          <span className="text-transparent bg-clip-text from-indigo-400 to-purple-400">
            Analysis
          </span>
        </h1>

        <div className="rounded-2xl bg-indigo-950/30 border border-indigo-500/20 p-5 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider mb-3">
            AI Insights
          </h3>
          <ul className="space-y-2">
            {aiInsights.map((insight, idx) => (
              <li
                key={idx}
                className="text-indigo-100/80 font-medium text-lg flex items-start gap-2"
              >
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Top Global Story Highlight */}
      {topEvent && !loading && (
        <section className="relative overflow-hidden rounded-3xl bg-slate-900 border-2 border-slate-800 p-8 transition-all hover:border-indigo-500/50 group">
          <div className="absolute inset-0 from-indigo-500/10 via-transparent to-rose-500/5 opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <AlertTriangle className="w-4 h-4" /> Top Global Story
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold">
                Impact: {topEvent.impact_score}/100
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold">
                Sources: {topEvent.article_count} (Confidence:{" "}
                {topEvent.article_count > 5 ? "High" : "Medium"})
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              {topEvent.title}
            </h2>
            <p className="text-xl text-slate-400 max-w-4xl mb-6">
              {topEvent.summary}
            </p>

            <div className="flex gap-4 text-sm font-medium">
              <span className="text-indigo-400">
                Category:{" "}
                <span className="text-white capitalize">
                  {topEvent.category}
                </span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">
                Sentiment:
                <span
                  className={
                    parseFloat(topEvent.sentiment_score as string) < -0.1
                      ? "text-rose-400 ml-1"
                      : parseFloat(topEvent.sentiment_score as string) > 0.1
                        ? "text-emerald-400 ml-1"
                        : "text-slate-300 ml-1"
                  }
                >
                  {(
                    parseFloat(topEvent.sentiment_score as string) * 100
                  ).toFixed(0)}
                  %
                </span>
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Trending & Control Panel */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters Box */}
        <div className="col-span-1 lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center gap-2 text-slate-200 font-semibold mb-6">
            <Filter className="w-5 h-5" /> Filters
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-4 py-3 appearance-none font-medium focus:outline-none focus:border-indigo-500/50"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                Sentiment
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SENTIMENTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterSentiment(s)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      filterSentiment === s
                        ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                Timeframe
              </label>
              <div className="flex gap-2">
                {TIMEFRAMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setFilterTime(t.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      filterTime === t.value
                        ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trending topics */}
        <div className="col-span-1 lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center gap-2 text-slate-200 font-semibold mb-6">
            <TrendingUp className="w-5 h-5 text-purple-400" /> Trending Events
          </div>

          {loading ? (
            <div className="animate-pulse flex gap-3 flex-wrap">
              <div className="h-10 w-32 bg-slate-800 rounded-xl"></div>
              <div className="h-10 w-48 bg-slate-800 rounded-xl"></div>
            </div>
          ) : trendingTopics.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {trendingTopics.map((topic, i) => (
                <div
                  key={i}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl border-t-purple-500/30 flex items-center gap-2 group hover:bg-slate-800 transition-colors"
                >
                  <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                  <span className="text-slate-300 font-medium truncate max-w-xs">
                    {topic.title}
                  </span>
                  <span className="text-xs font-bold text-emerald-400 ml-2">
                    +{topic.velocity}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-center py-12">
              No significant events detected.
            </div>
          )}

          {/* Sentiment Mini-Chart inside trending block */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-400">
                Sentiment Distribution
              </span>
            </div>
            <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-950">
              <div className="bg-emerald-500" style={{ width: `${posPct}%` }} />
              <div className="bg-slate-500" style={{ width: `${neuPct}%` }} />
              <div className="bg-rose-500" style={{ width: `${negPct}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-2 text-slate-500 font-medium">
              <span className="text-emerald-500 px-1">{posPct}% Positive</span>
              <span className="text-slate-400 px-1">{neuPct}% Neutral</span>
              <span className="text-rose-500 px-1">{negPct}% Negative</span>
            </div>
          </div>
        </div>
      </section>

      {/* Article List */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/80 bg-slate-900/50 flex justify-between items-center backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Live Intelligence Feed
          </h2>
          <span className="text-slate-500 text-sm font-semibold">
            {data.articles.length} Articles matched
          </span>
        </div>

        <div className="divide-y divide-slate-800/50">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              Analyzing global data feeds...
            </div>
          ) : data.articles.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No articles align with the current parameters.
            </div>
          ) : (
            data.articles.map((article) => {
              const senInfo = getSentimentColorInfo(
                parseFloat(article.sentiment_score as string),
              );

              return (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener"
                  className="block p-5 sm:p-6 hover:bg-slate-800/30 transition-all border-l-4 border-transparent hover:border-indigo-500 group"
                >
                  <div className="flex flex-col sm:flex-row gap-5 items-start">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-widest">
                          {article.category}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-md border flex items-center gap-1 uppercase tracking-widest ${senInfo.colorClass}`}
                        >
                          {senInfo.icon} {senInfo.label}
                        </span>

                        <span className="text-xs font-semibold text-indigo-400/80">
                          Rel: {article.relevance_score}/100
                        </span>

                        {article.source && (
                          <span className="text-xs text-slate-500 font-medium">
                            Source: {article.source}
                          </span>
                        )}

                        <span className="text-xs text-slate-600 font-medium flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          {new Date(article.published_at).toLocaleString()}
                        </span>
                      </div>

                      <h3 className="text-slate-100 font-bold text-lg mb-2 group-hover:text-indigo-300 transition-colors">
                        {article.title}
                      </h3>

                      {article.description && (
                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                          {article.description}
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
