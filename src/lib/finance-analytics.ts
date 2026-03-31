import { query } from "./db";
import { getCache, setCache } from "./redis";

// ── Types ──────────────────────────────────────────────────────────
export interface FinanceIndex {
  id: number;
  index_name: string;
  value: number;
  change: number | null;
  region: string | null;
  timestamp: string | Date;
  created_at: string | Date;
}

export interface MarketSentiment {
  label: "Bullish" | "Bearish" | "Neutral";
  score: number; // 0-100
  description: string;
}

export interface MarketBreadth {
  advancers: number;
  decliners: number;
  unchanged: number;
  ratio: number; // advancers / total
}

export interface VolatilityIndex {
  level: "Low" | "Medium" | "High";
  value: number; // standard deviation
  changeVsYesterday: number; // percentage delta
}

export interface RegionalPerformance {
  region: string;
  avgChange: number;
  indices: { name: string; change: number; value: number }[];
  emoji: string;
}

export interface ChangeDistribution {
  range: string;
  count: number;
  min: number;
  max: number;
}

export interface MarketInsight {
  icon: string;
  text: string;
  severity: "info" | "warning" | "critical";
}

export interface MarketImpactScore {
  score: number; // 0-100
  level: "low" | "medium" | "high";
  description: string;
}

export interface FinanceAnalytics {
  sentiment: MarketSentiment;
  trend: { change: number; direction: "up" | "down" | "flat" };
  breadth: MarketBreadth;
  volatility: VolatilityIndex;
  topGainers: { name: string; change: number; value: number; region: string }[];
  topLosers: { name: string; change: number; value: number; region: string }[];
  regions: RegionalPerformance[];
  insights: MarketInsight[];
  distribution: ChangeDistribution[];
  impact: MarketImpactScore;
  lastUpdated: string;
}

// ── Region config ──────────────────────────────────────────────────
const REGION_MAP: Record<string, { region: string; emoji: string }> = {
  "S&P 500": { region: "US", emoji: "🇺🇸" },
  "Dow Jones": { region: "US", emoji: "🇺🇸" },
  NASDAQ: { region: "US", emoji: "🇺🇸" },
  "Nikkei (EWJ)": { region: "Asia", emoji: "🇯🇵" },
  "FTSE (EWU)": { region: "Europe", emoji: "🇬🇧" },
  "DAX (EWG)": { region: "Europe", emoji: "🇩🇪" },
};

const REGION_EMOJIS: Record<string, string> = {
  US: "🇺🇸",
  Europe: "🇪🇺",
  Asia: "🇯🇵",
};

// ── Main analytics function ────────────────────────────────────────
export async function getFinanceAnalytics(): Promise<FinanceAnalytics> {
  const cacheKey = "finance:analytics";
  const cached = await getCache<FinanceAnalytics>(cacheKey);
  if (cached) return cached;

  // Fetch latest data per index + some history
  const latestRes = await query<FinanceIndex>(
    `SELECT DISTINCT ON (index_name) id, index_name, value, change, region, timestamp, created_at
     FROM finance_indices
     ORDER BY index_name, timestamp DESC`,
  );

  const historyRes = await query<FinanceIndex>(
    `SELECT index_name, value, change, timestamp
     FROM finance_indices
     ORDER BY timestamp DESC
     LIMIT 200`,
  );

  const latestIndices = latestRes.rows;
  const allHistory = historyRes.rows;

  // Resolve region from DB column, fallback to REGION_MAP
  const withRegion = latestIndices.map((idx) => ({
    ...idx,
    value: Number(idx.value),
    change: idx.change !== null ? Number(idx.change) : 0,
    region: idx.region || REGION_MAP[idx.index_name]?.region || "Other",
  }));

  // ── Sentiment ──────────────────────────────────────────────────
  const sentiment = computeSentiment(withRegion);

  // ── Global trend ───────────────────────────────────────────────
  const changes = withRegion.map((i) => i.change);
  const avgChange =
    changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
  const trend = {
    change: parseFloat(avgChange.toFixed(4)),
    direction: (avgChange > 0.05 ? "up" : avgChange < -0.05 ? "down" : "flat") as
      | "up"
      | "down"
      | "flat",
  };

  // ── Breadth ────────────────────────────────────────────────────
  const breadth = computeBreadth(withRegion);

  // ── Volatility ─────────────────────────────────────────────────
  const volatility = computeVolatility(withRegion, allHistory);

  // ── Top movers ─────────────────────────────────────────────────
  const sorted = [...withRegion].sort((a, b) => b.change - a.change);
  const topGainers = sorted
    .filter((i) => i.change > 0)
    .slice(0, 3)
    .map((i) => ({
      name: i.index_name,
      change: i.change,
      value: i.value,
      region: i.region,
    }));
  const topLosers = sorted
    .filter((i) => i.change < 0)
    .reverse()
    .slice(0, 3)
    .map((i) => ({
      name: i.index_name,
      change: i.change,
      value: i.value,
      region: i.region,
    }));

  // ── Regional performance ───────────────────────────────────────
  const regions = computeRegionalPerformance(withRegion);

  // ── Change distribution ────────────────────────────────────────
  const distribution = computeDistribution(withRegion);

  // ── AI Insights ────────────────────────────────────────────────
  const insights = generateInsights(
    sentiment,
    trend,
    breadth,
    volatility,
    regions,
  );

  // ── Impact on GSI ──────────────────────────────────────────────
  const impact = computeMarketImpact(sentiment, volatility, trend);

  const result: FinanceAnalytics = {
    sentiment,
    trend,
    breadth,
    volatility,
    topGainers,
    topLosers,
    regions,
    insights,
    distribution,
    impact,
    lastUpdated: new Date().toISOString(),
  };

  // Cache for 15 minutes
  await setCache(cacheKey, result, 900);

  return result;
}

// ── Computation helpers ────────────────────────────────────────────

function computeSentiment(
  indices: { change: number; value: number }[],
): MarketSentiment {
  if (indices.length === 0) {
    return { label: "Neutral", score: 50, description: "No data available" };
  }

  const advancers = indices.filter((i) => i.change > 0);
  const decliners = indices.filter((i) => i.change < 0);
  const advancerPct = (advancers.length / indices.length) * 100;

  // Magnitude weighting — larger moves matter more
  const totalMagnitude = indices.reduce((s, i) => s + Math.abs(i.change), 0);
  const positiveMagnitude = advancers.reduce((s, i) => s + i.change, 0);
  const magnitudeRatio =
    totalMagnitude > 0 ? (positiveMagnitude / totalMagnitude + 1) / 2 : 0.5;

  // Blend breadth (60%) and magnitude (40%)
  const rawScore = advancerPct * 0.6 + magnitudeRatio * 100 * 0.4;
  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  let label: MarketSentiment["label"];
  let description: string;

  if (score >= 65) {
    label = "Bullish";
    description = `${advancers.length} of ${indices.length} indices advancing with strong momentum`;
  } else if (score <= 35) {
    label = "Bearish";
    description = `${decliners.length} of ${indices.length} indices declining — selling pressure detected`;
  } else {
    label = "Neutral";
    description = "Markets showing mixed signals across global indices";
  }

  return { label, score, description };
}

function computeBreadth(
  indices: { change: number }[],
): MarketBreadth {
  const advancers = indices.filter((i) => i.change > 0.01).length;
  const decliners = indices.filter((i) => i.change < -0.01).length;
  const unchanged = indices.length - advancers - decliners;
  const ratio = indices.length > 0 ? advancers / indices.length : 0.5;

  return { advancers, decliners, unchanged, ratio };
}

function computeVolatility(
  latest: { change: number }[],
  history: { change: number | null }[],
): VolatilityIndex {
  const changes = latest.map((i) => i.change);
  if (changes.length === 0) {
    return { level: "Low", value: 0, changeVsYesterday: 0 };
  }

  const mean = changes.reduce((s, c) => s + c, 0) / changes.length;
  const variance =
    changes.reduce((s, c) => s + Math.pow(c - mean, 2), 0) / changes.length;
  const stdDev = Math.sqrt(variance);

  // Historical volatility from older data
  const olderChanges = history
    .slice(latest.length)
    .map((h) => (h.change !== null ? Number(h.change) : 0));
  let oldStdDev = 0;
  if (olderChanges.length > 1) {
    const oldMean =
      olderChanges.reduce((s, c) => s + c, 0) / olderChanges.length;
    const oldVariance =
      olderChanges.reduce((s, c) => s + Math.pow(c - oldMean, 2), 0) /
      olderChanges.length;
    oldStdDev = Math.sqrt(oldVariance);
  }

  const changeVsYesterday =
    oldStdDev > 0
      ? parseFloat((((stdDev - oldStdDev) / oldStdDev) * 100).toFixed(1))
      : 0;

  const level: VolatilityIndex["level"] =
    stdDev < 0.5 ? "Low" : stdDev < 1.5 ? "Medium" : "High";

  return {
    level,
    value: parseFloat(stdDev.toFixed(2)),
    changeVsYesterday,
  };
}

function computeRegionalPerformance(
  indices: {
    index_name: string;
    change: number;
    value: number;
    region: string;
  }[],
): RegionalPerformance[] {
  const regionGroups: Record<
    string,
    { name: string; change: number; value: number }[]
  > = {};

  for (const idx of indices) {
    if (!regionGroups[idx.region]) regionGroups[idx.region] = [];
    regionGroups[idx.region].push({
      name: idx.index_name,
      change: idx.change,
      value: idx.value,
    });
  }

  const order = ["US", "Europe", "Asia", "Other"];

  return order
    .filter((r) => regionGroups[r])
    .map((region) => {
      const group = regionGroups[region];
      const avgChange =
        group.reduce((s, i) => s + i.change, 0) / group.length;
      return {
        region,
        avgChange: parseFloat(avgChange.toFixed(4)),
        indices: group,
        emoji: REGION_EMOJIS[region] || "🌍",
      };
    });
}

function computeDistribution(
  indices: { change: number }[],
): ChangeDistribution[] {
  const buckets: ChangeDistribution[] = [
    { range: "+2% or more", count: 0, min: 2, max: Infinity },
    { range: "+1% to +2%", count: 0, min: 1, max: 2 },
    { range: "0% to +1%", count: 0, min: 0, max: 1 },
    { range: "-1% to 0%", count: 0, min: -1, max: 0 },
    { range: "-2% to -1%", count: 0, min: -2, max: -1 },
    { range: "-2% or less", count: 0, min: -Infinity, max: -2 },
  ];

  for (const idx of indices) {
    for (const bucket of buckets) {
      if (idx.change >= bucket.min && idx.change < bucket.max) {
        bucket.count++;
        break;
      }
    }
  }

  return buckets;
}

function generateInsights(
  sentiment: MarketSentiment,
  trend: { change: number; direction: string },
  breadth: MarketBreadth,
  volatility: VolatilityIndex,
  regions: RegionalPerformance[],
): MarketInsight[] {
  const insights: MarketInsight[] = [];

  // Sentiment-based
  if (sentiment.label === "Bearish") {
    insights.push({
      icon: "📉",
      text: `Global markets trending downward — sentiment score at ${sentiment.score}/100`,
      severity: sentiment.score < 25 ? "critical" : "warning",
    });
  } else if (sentiment.label === "Bullish") {
    insights.push({
      icon: "📈",
      text: `Markets showing bullish momentum — sentiment score at ${sentiment.score}/100`,
      severity: "info",
    });
  }

  // Volatility
  if (volatility.level === "High") {
    insights.push({
      icon: "⚡",
      text: `Increased volatility detected (σ=${volatility.value}) — high-risk environment`,
      severity: "warning",
    });
  } else if (volatility.level === "Low") {
    insights.push({
      icon: "🔒",
      text: "Market volatility remains contained — stable trading conditions",
      severity: "info",
    });
  }

  // Breadth
  if (breadth.advancers === 0 && breadth.decliners > 0) {
    insights.push({
      icon: "🔴",
      text: "All tracked indices declining — broad-based selling pressure",
      severity: "critical",
    });
  } else if (breadth.decliners === 0 && breadth.advancers > 0) {
    insights.push({
      icon: "🟢",
      text: "All tracked indices advancing — strong broad-based rally",
      severity: "info",
    });
  }

  // Regional divergence
  if (regions.length >= 2) {
    const sorted = [...regions].sort((a, b) => b.avgChange - a.avgChange);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const spread = Math.abs(best.avgChange - worst.avgChange);

    if (spread > 1) {
      insights.push({
        icon: "🌍",
        text: `Regional divergence: ${best.emoji} ${best.region} (${best.avgChange > 0 ? "+" : ""}${best.avgChange.toFixed(2)}%) outperforming ${worst.emoji} ${worst.region} (${worst.avgChange > 0 ? "+" : ""}${worst.avgChange.toFixed(2)}%)`,
        severity: "warning",
      });
    }
  }

  // Trend magnitude
  if (Math.abs(trend.change) > 1) {
    insights.push({
      icon: trend.direction === "down" ? "⚠️" : "✨",
      text: `Average market movement of ${trend.change > 0 ? "+" : ""}${trend.change.toFixed(2)}% — ${Math.abs(trend.change) > 2 ? "significant" : "notable"} shift`,
      severity: Math.abs(trend.change) > 2 ? "critical" : "warning",
    });
  }

  // Ensure at least one insight
  if (insights.length === 0) {
    insights.push({
      icon: "📊",
      text: "Global markets operating within normal parameters. No significant anomalies detected.",
      severity: "info",
    });
  }

  return insights;
}

function computeMarketImpact(
  sentiment: MarketSentiment,
  volatility: VolatilityIndex,
  trend: { change: number },
): MarketImpactScore {
  // Impact score: how much markets are affecting global stability
  // Higher = more destabilizing
  const sentimentImpact = Math.abs(50 - sentiment.score) * 0.4; // 0-20
  const volatilityImpact =
    (volatility.level === "High" ? 30 : volatility.level === "Medium" ? 15 : 5); // 5-30
  const trendImpact = Math.min(30, Math.abs(trend.change) * 10); // 0-30
  const compositeImpact = Math.min(20, (sentimentImpact + volatilityImpact + trendImpact) / 4); // normalize to 0-20 range for weight

  const score = Math.round(
    Math.min(100, sentimentImpact + volatilityImpact + trendImpact),
  );

  const level: MarketImpactScore["level"] =
    score > 60 ? "high" : score > 30 ? "medium" : "low";

  const description =
    level === "high"
      ? "Markets significantly impacting global stability"
      : level === "medium"
        ? "Moderate market influence on global conditions"
        : "Markets stable — minimal impact on global assessment";

  return { score, level, description };
}
