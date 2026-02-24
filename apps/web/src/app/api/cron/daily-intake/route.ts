// apps/web/src/app/api/cron/daily-intake/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // cron jobs typically need node runtime
export const dynamic = "force-dynamic"; // avoid caching

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

/**
 * Vercel Cron will call this endpoint.
 * Protect it with a secret so random people can't trigger it.
 *
 * Add in Vercel env vars:
 * - CRON_SECRET=some-long-random-string
 *
 * Then configure cron to call:
 * https://agseostudio.com/api/cron/daily-intake?secret=YOUR_SECRET
 */
export async function GET(req: Request) {
  const url = new URL(req.url);

  const secret = url.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "Missing CRON_SECRET env var" },
      { status: 500 }
    );
  }

  if (secret !== expected) return unauthorized();

  // PHASE 2 PLACEHOLDER:
  // This is where we will:
  // 1) fetch/scrape daily news sources (RSS first, then scraping)
  // 2) extract entities/topics
  // 3) generate SEO/GEO/AEO keyword sets
  // 4) store results in Supabase tables
  //
  // For now, return a success heartbeat so we can confirm cron works.

  return NextResponse.json({
    ok: true,
    job: "daily-intake",
    ranAt: new Date().toISOString(),
    next: [
      "Fetch RSS feeds -> normalize articles",
      "Extract topics/entities",
      "Generate SEO/GEO/AEO keyword clusters",
      "Upsert to Supabase",
    ],
  });
}
