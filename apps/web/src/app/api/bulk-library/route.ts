// app/api/library/bulk-insert/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Draft = {
  title: string;
  content: string;
  excerpt?: string;
  seoTitle?: string;
  metaDescription?: string;
  tags?: string[];
  imagePrompt?: string;
  keyword?: string;
  angle?: string;
  hookStyle?: string;
};

export async function POST(req: Request) {
  try {
    const { drafts, user_id } = (await req.json()) as { drafts: Draft[]; user_id?: string };

    if (!Array.isArray(drafts) || drafts.length === 0) {
      return NextResponse.json({ ok: false, error: "No drafts provided" }, { status: 400 });
    }

    const rows = drafts.map((d) => ({
      title: d.title,
      content: d.content,
      excerpt: d.excerpt ?? null,
      seo_title: d.seoTitle ?? null,
      meta_description: d.metaDescription ?? null,
      tags: d.tags ?? null,
      image_prompt: d.imagePrompt ?? null,
      keyword: d.keyword ?? null,
      angle: d.angle ?? null,
      hook_style: d.hookStyle ?? null,
      status: "draft",
      pipeline_stage: "Draft",
      // optionally store owner:
      user_id: user_id ?? null,
    }));

    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .insert(rows)
      .select("id,title,pipeline_stage,status,created_at");

    if (error) throw error;

    return NextResponse.json({ ok: true, inserted: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
