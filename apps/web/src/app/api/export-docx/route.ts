import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";

export async function POST(req: Request) {
  const { id } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // use service role for server routes
  );

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: data.title,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph(data.excerpt || ""),
          new Paragraph(""),
          new Paragraph(data.content_md || ""),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${data.title}.docx"`,
    },
  });
}
