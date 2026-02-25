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

export async function GET() {
  try {
    const supabase = supabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("user_sites")
      .select("site_url")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ siteUrl: data?.site_url || null });
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

    if (!siteUrl) return NextResponse.json({ error: "Missing siteUrl" }, { status: 400 });

    const { error } = await supabase
      .from("user_sites")
      .upsert({ user_id: auth.user.id, site_url: siteUrl }, { onConflict: "user_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, siteUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
