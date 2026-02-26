// apps/web/src/app/api/site/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "../../../utils/supabase/server";

export const runtime = "nodejs";

function normalizeUrl(input: string) {
  const raw = (input || "").trim();
  if (!raw) return "";
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) return `https://${raw}`;
  return raw;
}

function safeProfile(p: any) {
  if (!p || typeof p !== "object") return null;

  // Keep it permissive for now; just ensure it's JSON-serializable
  try {
    JSON.stringify(p);
    return p;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const supabase = supabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("user_sites")
      .select("site_url, profile")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      siteUrl: data?.site_url || null,
      profile: data?.profile || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = supabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const siteUrl = normalizeUrl(body?.siteUrl || "");
    const profile = safeProfile(body?.profile);

    if (!siteUrl) return NextResponse.json({ error: "Missing siteUrl" }, { status: 400 });

    const { data, error } = await supabase
      .from("user_sites")
      .upsert(
        {
          user_id: auth.user.id,
          site_url: siteUrl,
          profile: profile ?? null,
        },
        { onConflict: "user_id" }
      )
      .select("site_url, profile")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      siteUrl: data?.site_url || siteUrl,
      profile: data?.profile || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
