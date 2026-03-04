import { NextResponse } from "next/server";

export const runtime = "nodejs";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

type GenerateReq = {
  topic: string;
  audience?: string;
  region?: string;

  seo?: {
    primary_keywords?: string[];
    long_tail_keywords?: string[];
    clusters?: { name: string; keywords: string[] }[];
  };
  geo?: {
    primary_keywords?: string[];
    long_tail_keywords?: string[];
    clusters?: { name: string; keywords: string[] }[];
  };
  aeo?: {
    primary_topics?: string[];
    long_tail_questions?: string[];
    clusters?: { name: string; questions: string[] }[];
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateReq;

    if (!body?.topic) {
      return NextResponse.json({ error: "Missing topic" }, { status: 400 });
    }

    const apiKey = mustEnv("OPENAI_API_KEY");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    // pick useful keywords (avoid huge prompts)
    const seoPrimary = (body.seo?.primary_keywords || []).slice(0, 8);
    const seoLong = (body.seo?.long_tail_keywords || []).slice(0, 8);

    const geoPrimary = (body.geo?.primary_keywords || []).slice(0, 6);
    const geoLong = (body.geo?.long_tail_keywords || []).slice(0, 6);

    const aeoQs = (body.aeo?.long_tail_questions || []).slice(0, 10);

    const system = `
You are a professional SEO blog writer.

Rules:
- Output MUST be in English.
- Write for humans first, SEO second.
- Use the provided keywords naturally. Do not stuff.
- Produce Markdown only.
- Include:
  1) Title (plain text)
  2) Excerpt (1–2 sentences)
  3) Markdown article with:
     - Exactly one H1
     - 4–6 H2 sections
     - Optional H3 sub-sections where useful
     - Bullet lists when appropriate
     - A short FAQ section that answers 4–6 of the provided questions

Style:
- Clear, direct, practical.
- Use the region context naturally (if provided).
- Avoid “AI-y” phrases and generic filler.
`.trim();

    const user = `
Topic: ${body.topic}
Audience: ${body.audience || ""}
Region: ${body.region || ""}

SEO primary keywords (use 4–6 of these):
${seoPrimary.join(", ")}

SEO long-tail keywords (use 3–5 of these):
${seoLong.join(" | ")}

GEO primary keywords (use 2–4 of these):
${geoPrimary.join(", ")}

GEO long-tail keywords (use 2–4 of these):
${geoLong.join(" | ")}

AEO questions for FAQ (answer 4–6):
${aeoQs.map((q) => `- ${q}`).join("\n")}

Return JSON in this exact shape:
{
  "title": "...",
  "excerpt": "...",
  "content_md": "..."
}
`.trim();

    // simple JSON response (no json_schema to keep it robust)
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
      }),
    });

    const raw = await resp.text();

    if (!resp.ok) {
      return NextResponse.json(
        { error: "OpenAI request failed", status: resp.status, details: raw },
        { status: resp.status }
      );
    }

    const parsed = JSON.parse(raw);
    const content = parsed?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "Empty model response" }, { status: 500 });
    }

    // attempt JSON parse
    let payload: any;
    try {
      payload = JSON.parse(content);
    } catch {
      // fallback: return as markdown
      payload = { title: body.topic, excerpt: "", content_md: String(content) };
    }

    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
