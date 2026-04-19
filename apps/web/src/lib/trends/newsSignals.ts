import type { SiteProfile, TrendSignal } from "./types";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function decodeHtml(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(input: string) {
  return decodeHtml(input.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getSelectedAudiences(profile: SiteProfile & { __uiSelections?: any }) {
  return profile.__uiSelections?.selectedAudiences?.length
    ? profile.__uiSelections.selectedAudiences
    : profile.audiences || [];
}

function getSelectedMarkets(profile: SiteProfile & { __uiSelections?: any }) {
  return profile.__uiSelections?.selectedMarkets?.length
    ? profile.__uiSelections.selectedMarkets
    : profile.markets || [];
}

function getSelectedTopics(profile: SiteProfile & { __uiSelections?: any }) {
  return profile.__uiSelections?.selectedTopics?.length
    ? profile.__uiSelections.selectedTopics
    : profile.topics || [];
}

const EXEC_TERMS = [
  "ceo",
  "chief executive",
  "c-suite",
  "executive",
  "leadership",
  "leader",
  "management",
  "manager",
  "hr",
  "human resources",
  "talent",
  "board",
  "corporate",
  "enterprise",
  "business",
  "company",
  "companies",
  "strategy",
  "strategic",
  "transformation",
  "innovation",
  "productivity",
  "performance",
  "workforce",
  "burnout",
  "ai",
  "future skills",
  "decision-making",
  "culture",
];

const BLOCKED_TERMS = [
  "vs ",
  "premier league",
  "nba",
  "nfl",
  "football",
  "soccer",
  "cricket",
  "tennis",
  "formula 1",
  "movie",
  "movies",
  "box office",
  "celebrity",
  "concert",
  "entertainment",
  "award show",
  "awards show",
  "lottery",
  "horoscope",
  "fashion week",
];

function isBlockedHeadline(text: string) {
  const lower = text.toLowerCase();
  return BLOCKED_TERMS.some((term) => lower.includes(term));
}

function computeBusinessFit(
  headline: string,
  summary: string,
  profile: SiteProfile & { __uiSelections?: any }
) {
  const haystack = `${headline} ${summary}`.toLowerCase();
  const selectedAudiences = getSelectedAudiences(profile);
  const selectedMarkets = getSelectedMarkets(profile);
  const selectedTopics = getSelectedTopics(profile);

  let score = 20;

  const execHits = EXEC_TERMS.filter((term) => haystack.includes(term)).length;
  score += execHits * 6;

  const audienceHits = selectedAudiences.filter((term) =>
    haystack.includes(term.toLowerCase())
  ).length;
  score += audienceHits * 16;

  const marketHits = selectedMarkets.filter((term) =>
    haystack.includes(term.toLowerCase())
  ).length;
  score += marketHits * 18;

  const topicHits = selectedTopics.filter((term) =>
    haystack.includes(term.toLowerCase())
  ).length;
  score += topicHits * 18;

  if (profile.industry && haystack.includes(profile.industry.toLowerCase())) {
    score += 12;
  }

  if (isBlockedHeadline(haystack)) {
    score -= 60;
  }

  return clamp(score, 0, 100);
}

function makeSignal(args: {
  sourceName: string;
  headline: string;
  summary?: string;
  url?: string;
  region?: string;
  profile: SiteProfile & { __uiSelections?: any };
  freshnessScore?: number;
  confidenceScore?: number;
  publishedAt?: string;
}) {
  const headline = args.headline.trim();
  const summary = (args.summary || "").trim();
  const relevanceScore = computeBusinessFit(headline, summary, args.profile);

  if (!headline || headline.length < 12) return null;
  if (relevanceScore < 45) return null;

  return {
    id: slugify(`${args.sourceName}-${headline}`),
    source: "news" as const,
    topic: headline,
    summary,
    url: args.url || "",
    audienceFit: getSelectedAudiences(args.profile),
    region: args.region || getSelectedMarkets(args.profile)[0] || "Global",
    freshnessScore: args.freshnessScore ?? 88,
    relevanceScore,
    confidenceScore: args.confidenceScore ?? 82,
    publishedAt: args.publishedAt || "",
  } satisfies TrendSignal;
}

async function fetchText(url: string) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 AGSEOStudio/1.0",
      Accept: "text/html,application/xml,text/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) return "";
  return await res.text();
}

function parseRssItems(xml: string) {
  const items: Array<{
    title: string;
    link: string;
    description: string;
    pubDate: string;
  }> = [];

  const itemRegex = /<item\b[\s\S]*?<\/item>/gi;
  const matches = xml.match(itemRegex) || [];

  for (const raw of matches) {
    const title = stripTags(raw.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");
    const link = stripTags(raw.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "");
    const description = stripTags(
      raw.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || ""
    );
    const pubDate = stripTags(raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "");

    if (title && link) {
      items.push({ title, link, description, pubDate });
    }
  }

  return items;
}

function absolutize(base: string, href: string) {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function parseHtmlAnchors(
  html: string,
  baseUrl: string
): Array<{ title: string; url: string }> {
  const results: Array<{ title: string; url: string }> = [];
  const seen = new Set<string>();

  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(html))) {
    const href = match[1] || "";
    const text = stripTags(match[2] || "");

    if (!text || text.length < 18 || text.length > 180) continue;
    if (
      /subscribe|sign in|log in|advertise|newsletter|privacy|cookies|terms|latest news|more from|home|business|ceo$/i.test(
        text
      )
    ) {
      continue;
    }

    const url = absolutize(baseUrl, href);
    const key = `${text}::${url}`;

    if (!seen.has(key)) {
      seen.add(key);
      results.push({ title: text, url });
    }
  }

  return results.slice(0, 40);
}

async function fetchCnaSignals(profile: SiteProfile & { __uiSelections?: any }) {
  const xml = await fetchText(
    "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6936"
  );
  if (!xml) return [];

  const items = parseRssItems(xml);

  return items
    .map((item) =>
      makeSignal({
        sourceName: "CNA",
        headline: item.title,
        summary: item.description,
        url: item.link,
        region: "Singapore",
        profile,
        freshnessScore: 92,
        confidenceScore: 88,
        publishedAt: item.pubDate,
      })
    )
    .filter(Boolean) as TrendSignal[];
}

async function fetchBusinessTimesSignals(
  profile: SiteProfile & { __uiSelections?: any }
) {
  const pages = [
    "https://www.businesstimes.com.sg/keywords/c-suite/",
    "https://www.businesstimes.com.sg/keywords/inside-c-suite",
  ];

  const all: TrendSignal[] = [];

  for (const pageUrl of pages) {
    const html = await fetchText(pageUrl);
    if (!html) continue;

    const anchors = parseHtmlAnchors(html, pageUrl);

    for (const anchor of anchors) {
      const signal = makeSignal({
        sourceName: "Business Times",
        headline: anchor.title,
        summary: "",
        url: anchor.url,
        region: "Singapore",
        profile,
        freshnessScore: 86,
        confidenceScore: 84,
      });

      if (signal) all.push(signal);
    }
  }

  return all;
}

async function fetchTheEdgeSignals(profile: SiteProfile & { __uiSelections?: any }) {
  const pageUrl = "https://theedgemalaysia.com/flash-categories/CEO";
  const html = await fetchText(pageUrl);
  if (!html) return [];

  const anchors = parseHtmlAnchors(html, pageUrl);

  return anchors
    .map((anchor) =>
      makeSignal({
        sourceName: "The Edge Malaysia",
        headline: anchor.title,
        summary: "",
        url: anchor.url,
        region: "Malaysia",
        profile,
        freshnessScore: 86,
        confidenceScore: 82,
      })
    )
    .filter(Boolean) as TrendSignal[];
}

async function fetchTheStarSignals(profile: SiteProfile & { __uiSelections?: any }) {
  const pageUrl = "https://www.thestar.com.my/business";
  const html = await fetchText(pageUrl);
  if (!html) return [];

  const anchors = parseHtmlAnchors(html, pageUrl);

  return anchors
    .map((anchor) =>
      makeSignal({
        sourceName: "The Star",
        headline: anchor.title,
        summary: "",
        url: anchor.url,
        region: "Malaysia",
        profile,
        freshnessScore: 84,
        confidenceScore: 80,
      })
    )
    .filter(Boolean) as TrendSignal[];
}

function dedupeSignals(items: TrendSignal[]) {
  const seen = new Set<string>();
  const out: TrendSignal[] = [];

  for (const item of items) {
    const key = slugify(item.topic);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out.sort((a, b) => {
    const scoreA =
      a.relevanceScore * 0.5 + a.confidenceScore * 0.3 + a.freshnessScore * 0.2;
    const scoreB =
      b.relevanceScore * 0.5 + b.confidenceScore * 0.3 + b.freshnessScore * 0.2;
    return scoreB - scoreA;
  });
}

export async function fetchNewsSignals(profile: SiteProfile): Promise<TrendSignal[]> {
  const richProfile = profile as SiteProfile & { __uiSelections?: any };

  const [cna, bt, edge, star] = await Promise.all([
    fetchCnaSignals(richProfile).catch(() => []),
    fetchBusinessTimesSignals(richProfile).catch(() => []),
    fetchTheEdgeSignals(richProfile).catch(() => []),
    fetchTheStarSignals(richProfile).catch(() => []),
  ]);

  return dedupeSignals([...cna, ...bt, ...edge, ...star]).slice(0, 18);
}
