import type { SiteProfile, TrendSignal } from "./types";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}

export async function fetchNewsSignals(profile: SiteProfile): Promise<TrendSignal[]> {
  const apiKey = mustEnv("NEWS_API_KEY");
  const region = profile.markets?.[0] || "Global";
  const query = encodeURIComponent(
    [profile.industry, ...(profile.topics || []).slice(0, 4)].filter(Boolean).join(" OR ")
  );

  const url = `https://newsapi.org/v2/everything?q=${query}&pageSize=10&sortBy=publishedAt&language=en&apiKey=${apiKey}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const json = await res.json();
  const articles = Array.isArray(json?.articles) ? json.articles : [];

  return articles.map((a: any, i: number) => ({
    id: slugify(`news-${a.title || i}`),
    source: "news",
    topic: a.title || "Untitled news topic",
    summary: a.description || "",
    url: a.url || "",
    audienceFit: profile.audiences || [],
    region,
    freshnessScore: 92,
    relevanceScore: 70,
    confidenceScore: 74,
    publishedAt: a.publishedAt || "",
  }));
}
