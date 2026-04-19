import type { TrendSignal } from "./types";

function getSourceBoost(signal: TrendSignal) {
  if (signal.source === "news") return 18;
  if (signal.source === "industry") return 10;
  if (signal.source === "site") return 8;
  if (signal.source === "keywords") return 8;
  if (signal.source === "google-trends") return 0;
  return 0;
}

function getLowRelevancePenalty(signal: TrendSignal) {
  if (signal.relevanceScore >= 75) return 0;
  if (signal.relevanceScore >= 55) return 6;
  if (signal.relevanceScore >= 40) return 16;
  return 36;
}

function looksGenericMassTrend(topic: string) {
  const t = topic.toLowerCase();

  const blocked = [
    " vs ",
    "premier league",
    "nba",
    "nfl",
    "football",
    "soccer",
    "cricket",
    "tennis",
    "formula 1",
    "celebrity",
    "movie",
    "movies",
    "concert",
    "award",
    "awards",
    "box office",
    "lottery",
    "horoscope",
  ];

  return blocked.some((term) => t.includes(term));
}

function getGenericMassTrendPenalty(signal: TrendSignal) {
  if (signal.source !== "google-trends") return 0;
  return looksGenericMassTrend(signal.topic) ? 40 : 0;
}

export function scoreSignal(signal: TrendSignal) {
  const base =
    signal.freshnessScore * 0.24 +
    signal.relevanceScore * 0.48 +
    signal.confidenceScore * 0.28;

  const sourceBoost = getSourceBoost(signal);
  const lowRelevancePenalty = getLowRelevancePenalty(signal);
  const genericMassTrendPenalty = getGenericMassTrendPenalty(signal);

  return base + sourceBoost - lowRelevancePenalty - genericMassTrendPenalty;
}

function isHardIrrelevant(signal: TrendSignal) {
  const t = signal.topic.toLowerCase();

  const blocked = [
    "wrestlemania",
    "vs ",
    "premier league",
    "nba",
    "nfl",
    "football",
    "soccer",
    "cricket",
    "tennis",
    "formula 1",
    "celebrity",
    "movie",
    "movies",
    "concert",
    "award",
    "awards",
    "box office",
  ];

  return blocked.some((term) => t.includes(term));
}

export function rankSignals(signals: TrendSignal[]) {
  return [...signals]
    // REMOVE obvious irrelevant content completely
    .filter((signal) => !isHardIrrelevant(signal))

    // keep only meaningful business signals
    .filter((signal) => signal.relevanceScore >= 40)

    .sort((a, b) => scoreSignal(b) - scoreSignal(a));
}
