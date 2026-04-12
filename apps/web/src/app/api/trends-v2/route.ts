import { NextResponse } from "next/server";
import { buildInternalSignals } from "../../../../lib/trends/internalSignals";
import { fetchNewsSignals } from "../../../../lib/trends/newsSignals";
import { fetchGoogleTrendSignals } from "../../../../lib/trends/googleSignals";
import { rankSignals } from "../../../../lib/trends/ranker";
import { toTrendCards } from "../../../../lib/trends/toCards";
import type { SiteProfile, StoredKwState } from "../../../../lib/trends/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profile = body?.profile as SiteProfile | undefined;
    const kwState = body?.kwState as StoredKwState | undefined;

    if (!profile) {
      return NextResponse.json(
        { error: "Missing site profile" },
        { status: 400 }
      );
    }

    const internalSignals = buildInternalSignals(profile, kwState);

    const newsSignals = await fetchNewsSignals(profile).catch(() => []);
    const googleSignals = await fetchGoogleTrendSignals(profile).catch(() => []);

    const merged = [...internalSignals, ...newsSignals, ...googleSignals];
    const ranked = rankSignals(merged);
    const cards = toTrendCards(ranked);

    return NextResponse.json({
      ok: true,
      trends: cards,
      counts: {
        internal: internalSignals.length,
        news: newsSignals.length,
        google: googleSignals.length,
        total: merged.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to build Trends V2" },
      { status: 500 }
    );
  }
}
