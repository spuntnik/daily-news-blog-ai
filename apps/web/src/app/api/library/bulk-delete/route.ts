// apps/web/src/app/api/library/bulk-delete/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];

    if (!ids.length) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }

    const supabase = createClient(
      mustEnv("NEXT_PUBLIC_SUPABASE_URL"),
      mustEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { error } = await supabase.from("blog_posts").delete().in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Bulk delete failed" },
      { status: 500 }
    );
  }
}
