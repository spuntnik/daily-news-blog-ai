// apps/web/src/app/api/trends/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SiteProfile = {
  siteUrl: string;
  industry: string;
  audiences: string[];
  markets: string[];
  topics: string[];
  competitors: { name: string; url: string; confidence: "low" | "medium" | "high"; note: string }[];
  needsClarification: boolean;
  suggestedPromptQuestions: string[];
};

type TrendCard = {
  id: string;
  title: string;
  whyItMatters: string;
  suggestedAngle: string;
  audience: string;
  region: string;
  sourceTopic: string;
  confidence: "low" | "medium" | "high";
};

function uniq(arr: string[]) {
  return Array.from(new Set(arr.map((x) => (x || "").trim()).filter(Boolean)));
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function buildTrendCards(profile: SiteProfile, selectedTopic?: string): TrendCard[] {
  const industry = profile.industry || "Business";
  const audiences = uniq(profile.audiences || []);
  const markets = uniq(profile.markets || []);
  const topics = uniq([
    ...(selectedTopic ? [selectedTopic] : []),
    ...(profile.topics || []),
  ]).slice(0, 12);

  const region = markets[0] || "Global";
  const fallbackAudience = audiences[0] || "Professionals";

  const angleTemplates = [
    "practical playbook",
    "common mistakes and fixes",
    "executive briefing",
    "step-by-step guide",
    "strategy framework",
    "what leaders are missing",
    "FAQ-led explainer",
    "how to apply this now",
  ];

  const whyTemplates = [
    `This aligns with ${industry.toLowerCase()} demand and current audience needs.`,
    `This is highly relevant for ${fallbackAudience.toLowerCase()} facing fast-changing priorities.`,
    `This topic supports authority-building and search intent across ${region}.`,
    `This creates a strong bridge between strategic interest and publishable content.`,
  ];

  return topics.map((topic, i) => {
    const audience = audiences[i % Math.max(audiences.length, 1)] || fallbackAudience;
    const angle = angleTemplates[i % angleTemplates.length];
    const why = whyTemplates[i % whyTemplates.length];
    const confidence: "low" | "medium" | "high" =
      i < 4 ? "high" : i < 8 ? "medium" : "low";

    return {
      id: slugify(`${topic}-${audience}-${region}-${i}`),
      title: topic,
      whyItMatters: why,
      suggestedAngle: `${topic}: ${angle}`,
      audience,
      region,
      sourceTopic: topic,
      confidence,
    };
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const selectedTopic = (url.searchParams.get("selectedTopic") || "").trim();

    const siteRes = await fetch(`${url.origin}/api/site`, {
      method: "GET",
      cache: "no-store",
    });

    const siteData = await siteRes.json();

    if (!siteRes.ok || !siteData?.profile) {
      return NextResponse.json(
        { error: "No site profile found. Run Site Setup first." },
        { status: 400 }
      );
    }

    const profile = siteData.profile as SiteProfile;
    const cards = buildTrendCards(profile, selectedTopic);

    return NextResponse.json({
      ok: true,
      trends: cards,
      profileSummary: {
        industry: profile.industry,
        audiences: profile.audiences || [],
        markets: profile.markets || [],
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to build trends" },
      { status: 500 }
    );
  }
}
