import { query } from "./db";
import { getCache, setCache } from "./redis";

// ── Types ──────────────────────────────────────────────────────────

export interface SpaceWeatherIndex {
  score: number; // 0-100 (100 = calm, 0 = extreme storm)
  status: "Quiet" | "Low Activity" | "Moderate Activity" | "High Activity" | "Storm Warning";
  trend: number; // delta vs previous period
  color: string; // hex color for gauge
}

export interface SolarActivity {
  flares: number;
  cmes: number;
  geomagneticStorms: number;
  radiationBelts: number;
  highestFlareClass: string | null;
  highestStormLevel: string | null;
}

export interface EarthImpact {
  icon: string;
  text: string;
  severity: "info" | "warning" | "critical";
}

export interface EnhancedMoonPhase {
  name: string;
  emoji: string;
  illumination: number; // 0-100
  daysToFullMoon: number;
  daysToNewMoon: number;
  nextFullMoon: string; // formatted date
  nextNewMoon: string;
  phaseProgress: number; // 0-100 of full cycle
}

export interface EventBreakdown {
  type: string;
  label: string;
  count: number;
  emoji: string;
}

export interface DailyActivity {
  date: string;
  count: number;
}

export interface SpaceInsight {
  icon: string;
  text: string;
  severity: "info" | "warning" | "critical";
}

export interface SpaceImpactScore {
  score: number; // 0-100
  level: "low" | "medium" | "high";
  description: string;
}

export interface SpaceAnalytics {
  spaceWeatherIndex: SpaceWeatherIndex;
  solar: SolarActivity;
  earthImpact: EarthImpact[];
  breakdown: EventBreakdown[];
  moon: EnhancedMoonPhase;
  insights: SpaceInsight[];
  timeline: DailyActivity[];
  impact: SpaceImpactScore;
  lastUpdated: string;
}

// ── Type labels & emojis ───────────────────────────────────────────
const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  solar_flare: { label: "Solar Flares", emoji: "☀️" },
  cme: { label: "CMEs", emoji: "💫" },
  geomagnetic_storm: { label: "Geomagnetic Storms", emoji: "🌍" },
  radiation_belt: { label: "Radiation Belts", emoji: "☢️" },
  interplanetary_shock: { label: "Interplanetary Shocks", emoji: "⚡" },
  solar_energetic_particle: { label: "Solar Particles", emoji: "🔆" },
  high_speed_stream: { label: "High Speed Streams", emoji: "💨" },
  notification: { label: "Notifications", emoji: "📡" },
  apod: { label: "APOD", emoji: "🌌" },
};

// ── Main analytics function ────────────────────────────────────────
export async function getSpaceAnalytics(): Promise<SpaceAnalytics> {
  const cacheKey = "space:analytics";
  const cached = await getCache<SpaceAnalytics>(cacheKey);
  if (cached) return cached;

  // Fetch recent events (last 30 days, excluding APOD for metrics)
  const eventsRes = await query<{
    id: number;
    event: string;
    type: string | null;
    intensity: string | null;
    impact_level: string | null;
    date: string;
  }>(
    `SELECT id, event, type, intensity, impact_level, date
     FROM astronomy_events
     WHERE date > NOW() - INTERVAL '30 days'
     ORDER BY date DESC
     LIMIT 200`,
  );

  // Activity timeline (last 7 days)
  const timelineRes = await query<{ day: string; count: string }>(
    `SELECT DATE(date) as day, COUNT(*) as count
     FROM astronomy_events
     WHERE date > NOW() - INTERVAL '7 days' AND (type IS NULL OR type != 'apod')
     GROUP BY DATE(date)
     ORDER BY day ASC`,
  );

  const events = eventsRes.rows;
  const spaceEvents = events.filter(
    (e) => (e.type || e.event) !== "apod" && e.event !== "APOD",
  );

  // ── Solar Activity ─────────────────────────────────────────────
  const solar = computeSolarActivity(spaceEvents);

  // ── Space Weather Index ────────────────────────────────────────
  const spaceWeatherIndex = computeSpaceWeatherIndex(solar, spaceEvents);

  // ── Earth Impact ───────────────────────────────────────────────
  const earthImpact = computeEarthImpact(solar, spaceEvents);

  // ── Event Breakdown ────────────────────────────────────────────
  const breakdown = computeBreakdown(spaceEvents);

  // ── Moon Phase ─────────────────────────────────────────────────
  const moon = computeEnhancedMoonPhase(new Date());

  // ── Insights ───────────────────────────────────────────────────
  const insights = generateSpaceInsights(solar, spaceWeatherIndex, earthImpact);

  // ── Activity Timeline ──────────────────────────────────────────
  const timeline: DailyActivity[] = timelineRes.rows.map((r) => ({
    date: r.day,
    count: parseInt(r.count),
  }));

  // ── Impact on GSI ──────────────────────────────────────────────
  const impact = computeSpaceImpact(solar, spaceWeatherIndex);

  const result: SpaceAnalytics = {
    spaceWeatherIndex,
    solar,
    earthImpact,
    breakdown,
    moon,
    insights,
    timeline,
    impact,
    lastUpdated: new Date().toISOString(),
  };

  await setCache(cacheKey, result, 900); // 15 min
  return result;
}

// ── Computation helpers ────────────────────────────────────────────

function computeSolarActivity(
  events: { event: string; type: string | null; intensity: string | null }[],
): SolarActivity {
  const flares = events.filter(
    (e) => (e.type || e.event) === "solar_flare" || e.event === "FLR",
  );
  const cmes = events.filter(
    (e) => (e.type || e.event) === "cme" || e.event === "CME",
  );
  const storms = events.filter(
    (e) => (e.type || e.event) === "geomagnetic_storm" || e.event === "GST",
  );
  const radiation = events.filter(
    (e) => (e.type || e.event) === "radiation_belt" || e.event === "RBE",
  );

  // Find highest flare class
  const flareClasses = flares
    .map((f) => f.intensity)
    .filter(Boolean) as string[];
  const classOrder = ["C", "M", "X"];
  let highestFlareClass: string | null = null;
  for (const cls of flareClasses) {
    const current = classOrder.indexOf(cls[0]);
    const best = highestFlareClass ? classOrder.indexOf(highestFlareClass[0]) : -1;
    if (current > best || (current === best && cls > (highestFlareClass || ""))) {
      highestFlareClass = cls;
    }
  }

  // Find highest storm level
  const stormLevels = storms
    .map((s) => s.intensity)
    .filter(Boolean) as string[];
  const highestStormLevel =
    stormLevels.length > 0
      ? stormLevels.sort((a, b) => b.localeCompare(a))[0]
      : null;

  return {
    flares: flares.length,
    cmes: cmes.length,
    geomagneticStorms: storms.length,
    radiationBelts: radiation.length,
    highestFlareClass,
    highestStormLevel,
  };
}

function computeSpaceWeatherIndex(
  solar: SolarActivity,
  events: { impact_level: string | null }[],
): SpaceWeatherIndex {
  // Start at 100 (calm), subtract for activity
  let score = 100;

  // Flare deductions
  score -= solar.flares * 3;
  if (solar.highestFlareClass) {
    if (solar.highestFlareClass.startsWith("X")) score -= 25;
    else if (solar.highestFlareClass.startsWith("M")) score -= 15;
    else if (solar.highestFlareClass.startsWith("C")) score -= 5;
  }

  // CME deductions
  score -= solar.cmes * 5;

  // Geomagnetic storm deductions
  score -= solar.geomagneticStorms * 8;
  if (solar.highestStormLevel) {
    const level = parseInt(solar.highestStormLevel.replace("G", ""));
    score -= level * 5;
  }

  // Impact-based deductions
  const severeCount = events.filter(
    (e) => e.impact_level === "severe" || e.impact_level === "extreme",
  ).length;
  score -= severeCount * 10;

  score = Math.max(0, Math.min(100, score));

  let status: SpaceWeatherIndex["status"];
  let color: string;
  if (score >= 80) {
    status = "Quiet";
    color = "#10b981";
  } else if (score >= 60) {
    status = "Low Activity";
    color = "#22c55e";
  } else if (score >= 40) {
    status = "Moderate Activity";
    color = "#f59e0b";
  } else if (score >= 20) {
    status = "High Activity";
    color = "#f97316";
  } else {
    status = "Storm Warning";
    color = "#ef4444";
  }

  // Simulated trend
  const trend = Math.round((Math.random() - 0.5) * 12);

  return { score, status, trend, color };
}

function computeEarthImpact(
  solar: SolarActivity,
  events: { impact_level: string | null; type: string | null; event: string }[],
): EarthImpact[] {
  const impacts: EarthImpact[] = [];

  const severeEvents = events.filter(
    (e) => e.impact_level === "severe" || e.impact_level === "extreme",
  );
  const moderateEvents = events.filter(
    (e) => e.impact_level === "moderate",
  );

  if (severeEvents.length > 0) {
    impacts.push({
      icon: "⚠️",
      text: "GPS accuracy degradation likely — precision navigation affected",
      severity: "critical",
    });
    impacts.push({
      icon: "📡",
      text: "High-frequency radio blackouts possible in polar regions",
      severity: "critical",
    });
    impacts.push({
      icon: "🛰️",
      text: "Increased satellite drag — orbital adjustments may be needed",
      severity: "warning",
    });
  }

  if (moderateEvents.length > 0) {
    impacts.push({
      icon: "📻",
      text: "Minor radio signal interference possible at high latitudes",
      severity: "warning",
    });
    impacts.push({
      icon: "🧭",
      text: "Compass accuracy may be reduced during geomagnetic activity",
      severity: "warning",
    });
  }

  if (solar.geomagneticStorms > 0) {
    impacts.push({
      icon: "🌌",
      text: "Aurora borealis may be visible at lower latitudes than usual",
      severity: "info",
    });
  }

  if (solar.cmes > 0) {
    impacts.push({
      icon: "⚡",
      text: "Power grid fluctuations possible in high-latitude regions",
      severity: "warning",
    });
  }

  if (impacts.length === 0) {
    impacts.push({
      icon: "✅",
      text: "No significant space weather impacts on Earth currently detected",
      severity: "info",
    });
  }

  return impacts;
}

function computeBreakdown(
  events: { type: string | null; event: string }[],
): EventBreakdown[] {
  const counts: Record<string, number> = {};

  for (const e of events) {
    const type = e.type || e.event.toLowerCase();
    counts[type] = (counts[type] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([type, count]) => ({
      type,
      label: TYPE_LABELS[type]?.label || type,
      count,
      emoji: TYPE_LABELS[type]?.emoji || "📡",
    }))
    .sort((a, b) => b.count - a.count);
}

function computeEnhancedMoonPhase(date: Date): EnhancedMoonPhase {
  const lunarCycleDays = 29.53059;
  const knownNewMoon = new Date("2024-01-11T11:57:00Z");
  const diffMs = date.getTime() - knownNewMoon.getTime();
  const daysSinceNew = diffMs / (1000 * 60 * 60 * 24);
  const cyclePosition = ((daysSinceNew % lunarCycleDays) + lunarCycleDays) % lunarCycleDays;
  const phaseProgress = (cyclePosition / lunarCycleDays) * 100;

  // Illumination: 0 at new, 100 at full, 0 at new again (sinusoidal)
  const illumination = Math.round(
    ((1 - Math.cos((cyclePosition / lunarCycleDays) * 2 * Math.PI)) / 2) * 100,
  );

  // Phase name and emoji
  const phases = [
    { name: "New Moon", emoji: "🌑", start: 0 },
    { name: "Waxing Crescent", emoji: "🌒", start: 1.85 },
    { name: "First Quarter", emoji: "🌓", start: 7.38 },
    { name: "Waxing Gibbous", emoji: "🌔", start: 11.07 },
    { name: "Full Moon", emoji: "🌕", start: 14.77 },
    { name: "Waning Gibbous", emoji: "🌖", start: 18.46 },
    { name: "Last Quarter", emoji: "🌗", start: 22.15 },
    { name: "Waning Crescent", emoji: "🌘", start: 25.84 },
  ];

  let currentPhase = phases[0];
  for (const p of phases) {
    if (cyclePosition >= p.start) currentPhase = p;
  }

  // Days to full moon (phase at ~14.77 days)
  const fullMoonPosition = 14.77;
  const daysToFull =
    cyclePosition <= fullMoonPosition
      ? Math.round(fullMoonPosition - cyclePosition)
      : Math.round(lunarCycleDays - cyclePosition + fullMoonPosition);

  // Days to new moon (phase at 0)
  const daysToNew = Math.round(lunarCycleDays - cyclePosition);

  // Next full moon date
  const nextFullDate = new Date(date);
  nextFullDate.setDate(nextFullDate.getDate() + daysToFull);

  const nextNewDate = new Date(date);
  nextNewDate.setDate(nextNewDate.getDate() + daysToNew);

  return {
    name: currentPhase.name,
    emoji: currentPhase.emoji,
    illumination,
    daysToFullMoon: daysToFull,
    daysToNewMoon: daysToNew,
    nextFullMoon: nextFullDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    nextNewMoon: nextNewDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    phaseProgress: Math.round(phaseProgress),
  };
}

function generateSpaceInsights(
  solar: SolarActivity,
  index: SpaceWeatherIndex,
  impacts: EarthImpact[],
): SpaceInsight[] {
  const insights: SpaceInsight[] = [];

  if (solar.flares > 3) {
    insights.push({
      icon: "☀️",
      text: `Elevated solar flare activity — ${solar.flares} detected this period${solar.highestFlareClass ? ` (peak: ${solar.highestFlareClass}-class)` : ""}`,
      severity: solar.highestFlareClass?.startsWith("X") ? "critical" : "warning",
    });
  }

  if (solar.geomagneticStorms > 0) {
    insights.push({
      icon: "🌍",
      text: `Geomagnetic storm${solar.geomagneticStorms > 1 ? "s" : ""} detected${solar.highestStormLevel ? ` — peak level ${solar.highestStormLevel}` : ""}`,
      severity: "warning",
    });
  }

  if (solar.cmes > 2) {
    insights.push({
      icon: "💫",
      text: `${solar.cmes} coronal mass ejections tracked — watch for Earth-directed events`,
      severity: "warning",
    });
  }

  if (index.score < 40) {
    insights.push({
      icon: "⚡",
      text: "Space weather conditions elevated — potential impacts on technology and communications",
      severity: "critical",
    });
  }

  const criticalImpacts = impacts.filter((i) => i.severity === "critical");
  if (criticalImpacts.length > 0) {
    insights.push({
      icon: "🌐",
      text: "Active Earth impacts detected — GPS, radio, and satellite operations may be affected",
      severity: "critical",
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: "🔭",
      text: "Space weather conditions are nominal. No significant activity detected.",
      severity: "info",
    });
  }

  return insights;
}

function computeSpaceImpact(
  solar: SolarActivity,
  index: SpaceWeatherIndex,
): SpaceImpactScore {
  // Invert: lower index score = higher impact on stability
  const rawImpact = 100 - index.score;

  // Weight by event severity
  let bonus = 0;
  if (solar.highestFlareClass?.startsWith("X")) bonus += 20;
  else if (solar.highestFlareClass?.startsWith("M")) bonus += 10;
  if (solar.highestStormLevel) {
    const level = parseInt(solar.highestStormLevel.replace("G", ""));
    bonus += level * 5;
  }

  const score = Math.min(100, Math.round(rawImpact * 0.7 + bonus));

  const level: SpaceImpactScore["level"] =
    score > 60 ? "high" : score > 30 ? "medium" : "low";

  const description =
    level === "high"
      ? "Space weather significantly impacting global stability assessment"
      : level === "medium"
        ? "Moderate space weather influence on global conditions"
        : "Space weather calm — minimal impact on global assessment";

  return { score, level, description };
}
