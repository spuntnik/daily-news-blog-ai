import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";

export const runtime = "nodejs";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Service role client (server-only)
    const supabase = createServerClient(
      mustEnv("NEXT_PUBLIC_SUPABASE_URL"),
      mustEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {},
        },
      }
    );

    const { data: post, error } = await supabase
      .from("blog_posts")
      .select("id,title,excerpt,content_md,created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const lines = String(post.content_md || "").split("\n");

    const children: Paragraph[] = [];

    children.push(
      new Paragraph({ text: post.title || "Untitled", heading: HeadingLevel.TITLE })
    );

    if (post.excerpt) {
      children.push(new Paragraph({ text: post.excerpt }));
      children.push(new Paragraph({ text: "" }));
    }

    // Very simple markdown-to-doc conversion:
    for (const line of lines) {
      const t = line.trim();
      if (!t) {
        children.push(new Paragraph({ text: "" }));
        continue;
      }
      if (t.startsWith("### ")) {
        children.push(new Paragraph({ text: t.replace(/^###\s+/, ""), heading: HeadingLevel.HEADING_3 }));
      } else if (t.startsWith("## ")) {
        children.push(new Paragraph({ text: t.replace(/^##\s+/, ""), heading: HeadingLevel.HEADING_2 }));
      } else if (t.startsWith("# ")) {
        children.push(new Paragraph({ text: t.replace(/^#\s+/, ""), heading: HeadingLevel.HEADING_1 }));
      } else if (t.startsWith("- ")) {
        children.push(new Paragraph({ text: "• " + t.replace(/^-+\s+/, "") }));
      } else {
        children.push(new Paragraph({ text: line }));
      }
    }

    const doc = new Document({
      sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(doc);
    const u8 = new Uint8Array(buffer); // fixes TS BodyInit issue

    const filename = `${(post.title || "blog")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}.docx`;

    return new NextResponse(u8, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
