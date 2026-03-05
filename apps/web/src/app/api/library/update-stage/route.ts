// app/api/library/update-stage/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { id, pipeline_stage } = (await req.json()) as { id: string; pipeline_stage: string };

    const allowed = ["Draft", "Review", "Scheduled", "Published", "Archived"];
    if (!allowed.includes(pipeline_stage)) {
      return NextResponse.json({ ok: false, error: "Invalid stage" }, { status: 400 });
    }

    const statusMap: Record<string, string> = {
      Draft: "draft",
      Review: "review",
      Scheduled: "scheduled",
      Published: "published",
      Archived: "archived",
    };

    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .update({ pipeline_stage, status: statusMap[pipeline_stage], updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id,pipeline_stage,status");

    if (error) throw error;

    return NextResponse.json({ ok: true, updated: data?.[0] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
