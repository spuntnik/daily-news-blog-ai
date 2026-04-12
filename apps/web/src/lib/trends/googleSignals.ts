import type { SiteProfile, TrendSignal } from "./types";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function mapMarketToGeo(markets?: string[]) {
  const primary = (markets?.[0] || "").toLowerCase();

  if (primary.includes("singapore")) return "SG";
  if (primary.includes("malaysia")) return "MY";
  if (primary.includes("cambodia")) return "KH";
  if (primary.includes("australia")) return "AU";
  if (primary.includes("united kingdom") || primary === "uk") return "GB";
  if (primary.includes("united states") || primary === "us") return "US";

  return "US";
}

export async function fetchGoogleTrendSignals(
  profile: SiteProfile
): Promise<TrendSignal[]> {
  try {
    const apiKey = mustEnv("SERPAPI_API_KEY");
    const geo = mapMarketToGeo(profile.markets);
    const region = profile.markets?.[0] || "Global";

    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_trends_trending_now");
    url.searchParams.set("geo", geo);
    url.searchParams.set("hours", "24");
    url.searchParams.set("hl", "en");
    url.searchParams.set("api_key", apiKey);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return [];
    }

    const json = await res.json();

    const items = Array.isArray(json?.trending_searches)
      ? json.trending_searches
      : [];

    return items.slice(0, 10).map((item: any, i: number) => {
      const topic = item?.query || `Trending topic ${i + 1}`;
      const searchVolume =
        typeof item?.search_volume === "number"
          ? item.search_volume.toLocaleString()
          : item?.search_volume || "";
      const increase =
        typeof item?.increase_percentage === "number"
          ? `${item.increase_percentage}%`
          : "";

      const summaryParts = [
        `Google Trends shows rising interest for this topic in ${region}.`,
        searchVolume ? `Search volume: ${searchVolume}.` : "",
        increase ? `Increase: ${increase}.` : "",
      ].filter(Boolean);

      return {
        id: slugify(`google-trends-${topic}-${i}`),
        source: "google-trends",
        topic,
        summary: summaryParts.join(" "),
        url:
          item?.serpapi_google_trends_link ||
          item?.serpapi_news_link ||
          "",
        audienceFit: profile.audiences || [],
        region,
        freshnessScore: 95,
        relevanceScore: 78,
        confidenceScore: 82,
        publishedAt: "",
      } as TrendSignal;
    });
  } catch {
    return [];
  }
}
