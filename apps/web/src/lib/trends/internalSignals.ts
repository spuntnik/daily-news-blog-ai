import type { SiteProfile, StoredKwState, TrendSignal } from "./types";

function uniq(arr: string[]) {
  return Array.from(new Set(arr.map((x) => (x || "").trim()).filter(Boolean)));
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}

export function buildInternalSignals(profile: SiteProfile, kwState?: StoredKwState): TrendSignal[] {
  const selectedTopic = kwState?.selectedTopic || kwState?.topic || "";
  const audience = kwState?.audience || profile.audiences?.[0] || "Professionals";
  const region = kwState?.region || profile.markets?.[0] || "Global";

  const topics = uniq([
    ...(selectedTopic ? [selectedTopic] : []),
    ...(profile.topics || []),
  ]).slice(0, 12);

  return topics.map((topic, i) => ({
    id: slugify(`internal-${topic}-${i}`),
    source: i === 0 && selectedTopic ? "keywords" : "site",
    topic,
    summary: `Derived from site positioning and saved keyword context.`,
    audienceFit: [audience],
    region,
    freshnessScore: 55,
    relevanceScore: i < 4 ? 88 : 72,
    confidenceScore: i < 4 ? 85 : 68,
  }));
}
