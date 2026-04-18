import type { TrendSignal, TrendCard } from "./types";

export function toTrendCards(signals: TrendSignal[]): TrendCard[] {
  return signals.slice(0, 12).map((s) => ({
    id: s.id,
    title: s.topic,
    whyItMatters: s.summary || "This signal is relevant to your audience and current positioning.",
    suggestedAngle: `${s.topic}: practical analysis, implications, and next steps`,
    audience: s.audienceFit?.[0] || "Professionals",
    region: s.region || "Global",
    sourceTopic: s.topic,
    confidence:
      s.confidenceScore >= 80 ? "high" : s.confidenceScore >= 60 ? "medium" : "low",
    sourceLabel:
      s.source === "news"
        ? "News"
        : s.source === "google-trends"
        ? "Google Trends"
        : s.source === "reddit"
        ? "Reddit"
        : s.source === "industry"
        ? "Industry"
        : s.source === "keywords"
        ? "Keywords"
        : "Site",
    url: s.url,
  }));
}
