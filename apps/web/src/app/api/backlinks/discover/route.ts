import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type SiteContext = {
  brandName: string;
  websiteUrl: string;
  niche: string;
  audience: string;
  region: string;
  voice: string;
  coreOffer: string;
};

type PostPayload = {
  id: string;
  title: string;
  excerpt?: string | null;
};

type DiscoverBody = {
  post: PostPayload;
  siteContext: SiteContext;
  existingDomains?: string[];
};

type Candidate = {
  domain: string;
  page_title: string;
  page_url: string;
  relevance_reason: string;
  outreach_angle: string;
};

function hostnameFromUrl(input: string): string {
  try {
    return new URL(input).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function extractTopic(post: PostPayload) {
  const text = `${post.title || ""} ${post.excerpt || ""}`.toLowerCase();

  if (text.includes("leadership")) return "leadership";
  if (text.includes("executive")) return "executive coaching";
  if (text.includes("marketing")) return "marketing";
  if (text.includes("ai")) return "AI business strategy";
  if (text.includes("resilience")) return "resilience";
  if (text.includes("communication")) return "communication skills";

  return post.title;
}

function buildQueries(post: PostPayload, site: SiteContext) {
  const topic = extractTopic(post);
  const region = site.region || "";
  const niche = site.niche || "";
  const audience = site.audience || "";

  const queries = [
    `"${post.title}"`,
    `${topic} ${region} blog`,
    `${topic} ${region} resources`,
    `${topic} ${audience} publication`,
    `${niche} ${topic} write for us`,
    `${topic} roundup`,
    `${topic} curated resources`,
    `${topic} guest post`,
  ];

  return Array.from(new Set(queries.map((q) => q.trim()).filter(Boolean))).slice(0, 6);
}

function buildRelevanceReason(
  title: string,
  snippet: string,
  site: SiteContext,
  post: PostPayload
) {
  const parts = [
    `This page appears relevant to "${post.title}"`,
    site.region ? `and may reach readers in ${site.region}` : "",
    site.audience ? `who match your audience of ${site.audience}` : "",
    snippet ? `The snippet suggests editorial relevance: "${snippet}"` : "",
  ].filter(Boolean);

  return parts.join(" ");
}

function buildOutreachAngle(
  title: string,
  site: SiteContext,
  post: PostPayload
) {
  const parts = [
    `Lead with the practical value of "${post.title}"`,
    site.region ? `for ${site.region}` : "",
    site.audience ? `and position it for ${site.audience}` : "",
    site.coreOffer ? `while tying it back to your broader focus on ${site.coreOffer}` : "",
  ].filter(Boolean);

  return parts.join(" ");
}

async function searchSerpApi(query: string) {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) {
    throw new Error("SERPAPI_API_KEY is missing.");
  }

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", key);
  url.searchParams.set("num", "10");

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`SerpAPI request failed: ${res.status}`);
  }

  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DiscoverBody;
    const post = body.post;
    const siteContext = body.siteContext;
    const existingDomains = new Set(
      (body.existingDomains || []).map((d) => d.trim().toLowerCase())
    );

    if (!post?.title) {
      return NextResponse.json(
        { error: "Missing post title." },
        { status: 400 }
      );
    }

    const ownHost = hostnameFromUrl(siteContext.websiteUrl || "");
    if (ownHost) existingDomains.add(ownHost);

    const queries = buildQueries(post, siteContext);

    const results = await Promise.allSettled(
      queries.map((query) => searchSerpApi(query))
    );

    const candidatesMap = new Map<string, Candidate>();

    for (const result of results) {
      if (result.status !== "fulfilled") continue;

      const organic = result.value?.organic_results || [];

      for (const item of organic) {
        const pageUrl = item?.link || "";
        const pageTitle = item?.title || "";
        const snippet = item?.snippet || "";
        const domain = hostnameFromUrl(pageUrl);

        if (!domain) continue;
        if (existingDomains.has(domain)) continue;
        if (domain.includes("google.")) continue;
        if (domain.includes("youtube.com")) continue;
        if (domain.includes("facebook.com")) continue;
        if (domain.includes("instagram.com")) continue;
        if (domain.includes("linkedin.com")) continue;

        if (!candidatesMap.has(domain)) {
          candidatesMap.set(domain, {
            domain,
            page_title: pageTitle,
            page_url: pageUrl,
            relevance_reason: buildRelevanceReason(
              pageTitle,
              snippet,
              siteContext,
              post
            ),
            outreach_angle: buildOutreachAngle(pageTitle, siteContext, post),
          });
        }
      }
    }

    const candidates = Array.from(candidatesMap.values()).slice(0, 8);

    return NextResponse.json({ candidates });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message || "Failed to discover backlink candidates.",
      },
      { status: 500 }
    );
  }
}
