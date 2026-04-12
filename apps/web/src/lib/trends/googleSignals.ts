export async function fetchGoogleTrendSignals(profile: any) {
  try {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      console.warn("Missing SERPAPI_API_KEY");
      return [];
    }

    const geo = mapRegionToGoogleCode(profile?.markets?.[0] || "global");

    const url = `https://serpapi.com/search.json?engine=google_trends_trending_searches&geo=${geo}&api_key=${apiKey}`;

    const res = await fetch(url);
    const json = await res.json();

    const daily = json?.trending_searches?.daily_searches || [];

    const results: any[] = [];

    for (const day of daily) {
      for (const item of day.trending_searches || []) {
        const title = item?.title?.query;
        if (!title) continue;

        results.push({
          topic: title,
          source: "google",
          relevance: 0.6,
          freshness: 1.0,
          confidence: 0.7,
          meta: {
            traffic: item?.formattedTraffic || "",
          },
        });
      }
    }

    return results.slice(0, 10);
  } catch (err) {
    console.error("Google Trends fetch failed:", err);
    return [];
  }
}

function mapRegionToGoogleCode(region: string) {
  const r = region.toLowerCase();

  if (r.includes("singapore")) return "SG";
  if (r.includes("malaysia")) return "MY";
  if (r.includes("global")) return "US";

  return "US";
}
